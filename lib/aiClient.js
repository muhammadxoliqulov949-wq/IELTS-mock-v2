'use strict';

/* One server-side client for all language-model requests in this project.
 *
 * Multi-provider, multi-key high-availability router:
 *   - Primary provider: Groq (https://api.groq.com/openai/v1)
 *     * Keys: GROQ_API_KEY (legacy single key), and numbered keys
 *       GROQ_API_KEY_1, GROQ_API_KEY_2, ... for round-robin load balancing.
 *     * Primary model:  GROQ_MODEL (default openai/gpt-oss-20b — the model
 *       Groq names as the replacement for the retired Llama 3.1 8B, and one
 *       of the models that is still served on the Free tier)
 *     * Fallback model: GROQ_FALLBACK_MODEL (default openai/gpt-oss-120b),
 *       used when the primary returns model_not_found / 404.
 *     * One request may pick its own model with options.model (the mock
 *       generator does, see api/generate-mock.js).
 *   - Fallback provider: DeepSeek (https://api.deepseek.com/v1)
 *     * Key: DEEPSEEK_API_KEY, model: deepseek-chat. Used when every Groq
 *       key is exhausted (429) or unreachable (network error).
 *
 * Rate limits (429): on the Groq Free tier a 429 is a normal event, not a
 * failure, so it never reaches the caller on the first try:
 *   1. every other key / DeepSeek is tried at once (~50 ms);
 *   2. when the whole pool answered 429 the pass is repeated after an
 *      exponential wait — 2–3 s, 4–5 s, 8–9 s — raised to Groq's own
 *      Retry-After when that is longer (see retryPolicy below).
 * Other 5xx / network errors fail over to the next entry without waiting.
 *
 * Streaming: streamChat() returns an async iterator that yields content
 * delta chunks (OpenAI-compatible SSE streaming) for real-time UI.
 */

/* ---------- Provider configuration ---------- */
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';
const DEFAULT_GROQ_FALLBACK_MODEL = 'openai/gpt-oss-120b';
const DEEPSEEK_MODEL = 'deepseek-chat';

const MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 120_000;
const STREAM_TIMEOUT_MS = 120_000;

/* Failover delay between retries — kept tiny (≤100ms total) so the user
 * never notices a provider hiccup. */
const FAILOVER_DELAY_MS = 50;

/* ---------- 429 (rate limit) retry policy ----------
 * Groq's Free tier is small (about 8K tokens per minute per model), so the
 * client waits and tries again instead of failing.
 *
 *   maxRetries   extra passes over the key pool after the first one
 *   baseDelayMs  first wait; grows by `factor` each round (2 s → 4 s → 8 s)
 *   jitterMs     random 0…jitterMs added to every wait (first wait: 2–3 s)
 *   maxDelayMs   the longest wait taken inside one request. A serverless
 *                function must not be held open for long, so when Groq asks
 *                for more (a daily quota, typically) the 429 is raised at
 *                once with `retryAfterMs` and the caller decides — the admin
 *                modal waits in the browser and asks again.
 *   sleep        injectable so tests need not wait. */
const retryPolicy = {
  maxRetries: 3,
  baseDelayMs: 2000,
  factor: 2,
  jitterMs: 1000,
  maxDelayMs: 10_000,
  sleep: ms => sleep(ms)
};

/* Groq accepts reasoning_effort only for these models; any other model returns 400. */
const REASONING_EFFORT_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
/* Provider error codes that mean the model itself cannot be used. */
const MODEL_UNAVAILABLE_CODES = ['model_not_found', 'model_decommissioned'];

/* Our own (client-side generated) error codes that must NOT be retried on
 * another key/provider — they indicate a problem with the response content,
 * not with the transport. */
const NON_RETRYABLE_CODES = new Set([
  'AI_OUTPUT_TRUNCATED',
  'GROQ_INVALID_RESPONSE',
  'GROQ_EMPTY_RESPONSE'
]);

/* ---------- Key collection & round-robin state ---------- */

function collectGroqKeys() {
  const keys = [];
  if (process.env) {
    for (let i = 1; i <= 20; i++) {
      const val = String(process.env[`GROQ_API_KEY_${i}`] || '').trim();
      if (val) keys.push(val);
    }
    const legacy = String(process.env.GROQ_API_KEY || '').trim();
    if (legacy && !keys.includes(legacy)) keys.push(legacy);
  }
  return keys;
}

function collectDeepSeekKey() {
  if (!process.env) return '';
  return String(process.env.DEEPSEEK_API_KEY || '').trim();
}

/* Round-robin pointer for Groq primary keys. */
let _groqRR = 0;

/* The endpoint URL for a given pool entry. */
function endpointFor(entry) {
  return `${entry.baseURL}/chat/completions`;
}

/* Legacy endpoint() — returns the Groq primary URL. */
function endpoint() {
  return `${GROQ_BASE}/chat/completions`;
}

/* isConfigured is true when at least one provider key is set. */
function isConfigured() {
  return collectGroqKeys().length > 0 || !!collectDeepSeekKey();
}

function primaryModel() {
  return String((process.env && process.env.GROQ_MODEL) || '').trim() || DEFAULT_GROQ_MODEL;
}

/* The model that backs up `forModel` (default: the primary model). When
 * GROQ_FALLBACK_MODEL is unset the two defaults back each other up, so a
 * primary of gpt-oss-120b falls back to gpt-oss-20b and vice versa. A
 * fallback equal to the model it would back up is never requested twice. */
function fallbackModel(forModel) {
  const primary = String(forModel || '').trim() || primaryModel();
  const configured = String((process.env && process.env.GROQ_FALLBACK_MODEL) || '').trim();
  const model = configured
    || (primary === DEFAULT_GROQ_FALLBACK_MODEL ? DEFAULT_GROQ_MODEL : DEFAULT_GROQ_FALLBACK_MODEL);
  return model === primary ? null : model;
}

function isModelUnavailable(err) {
  if (!err) return false;
  return Number(err.status) === 404 || MODEL_UNAVAILABLE_CODES.includes(err.providerCode);
}

/* HTTP 429 from the provider (requests, tokens per minute or per day). */
function isRateLimitError(err) {
  return !!err && Number(err.status) === 429;
}

/* Decide whether an error should trigger failover to the next entry.
 *   - 429 (rate limit) from the provider → yes.
 *   - Network/timeout errors (our own GROQ_REQUEST_FAILED / STREAM_REQUEST_FAILED) → yes.
 *   - 5xx from the provider → yes (server-side outage).
 *   - Our own 502s (truncation, invalid JSON, empty response) → NO.
 *   - 4xx from the provider (except 429) → NO (bad request, auth error, etc.). */
function isRetryableError(err) {
  if (!err) return false;
  if (err.code && NON_RETRYABLE_CODES.has(err.code)) return false;
  if (err.code === 'GROQ_REQUEST_FAILED' || err.code === 'STREAM_REQUEST_FAILED') return true;
  if (Number.isInteger(err.status)) {
    if (err.status === 429) return true;
    if (err.status >= 500 && err.status <= 504) return true;
  }
  return false;
}

function makeError(message, options) {
  const err = new Error(message);
  if (options && options.status) err.status = options.status;
  if (options && options.code) err.code = options.code;
  if (options && options.providerCode) err.providerCode = options.providerCode;
  if (options && options.model) err.model = options.model;
  if (options && options.provider) err.provider = options.provider;
  if (options && Number.isFinite(options.retryAfterMs)) err.retryAfterMs = options.retryAfterMs;
  return err;
}

async function readErrorBody(response) {
  let raw = '';
  try {
    if (typeof response.text === 'function') raw = String(await response.text());
    else if (typeof response.json === 'function') raw = JSON.stringify(await response.json());
  } catch { /* retain the HTTP status */ }
  let providerCode = '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.error && parsed.error.code) providerCode = String(parsed.error.code);
  } catch { /* plain-text body */ }
  return { detail: raw.slice(0, 800), providerCode };
}

/* "7.66s", "2m59.56s", "250ms", "1h2m3s" → milliseconds (NaN if unreadable). */
function parseDurationMs(text) {
  const units = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 };
  const source = String(text || '').toLowerCase();
  const pattern = /(\d+(?:\.\d+)?)(ms|h|m|s)/g;
  let total = 0;
  let found = false;
  let match;
  while ((match = pattern.exec(source))) {
    total += parseFloat(match[1]) * units[match[2]];
    found = true;
  }
  return found ? Math.round(total) : NaN;
}

/* How long Groq asked us to wait after a 429: the Retry-After header
 * (seconds, or an HTTP date), else the "Please try again in 7.66s" sentence
 * of the error text. undefined when neither is present. */
function parseRetryAfterMs(response, detail) {
  let raw = null;
  try {
    const headers = response && response.headers;
    raw = headers && typeof headers.get === 'function' ? headers.get('retry-after') : null;
  } catch { raw = null; }
  if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
    const date = Date.parse(String(raw));
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  const sentence = /try again in\s+((?:\d+(?:\.\d+)?(?:ms|h|m|s))+)/i.exec(String(detail || ''));
  if (sentence) {
    const ms = parseDurationMs(sentence[1]);
    if (Number.isFinite(ms)) return ms;
  }
  return undefined;
}

async function readJson(response) {
  if (typeof response.json === 'function') return response.json();
  if (typeof response.text === 'function') return JSON.parse(await response.text());
  throw new Error('Provider returned an unreadable response');
}

function textFromContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter(part => part && (part.type === 'text' || typeof part.text === 'string'))
      .map(part => String(part.text || ''))
      .join('\n')
      .trim();
  }
  return '';
}

function reasoningOptions(model) {
  return REASONING_EFFORT_MODELS.includes(model)
    ? { reasoning_effort: 'low', include_reasoning: false }
    : {};
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ---------- Build the list of endpoints to try for one request.
 * Returns an ordered array of { baseURL, key, model, isGroq, isDeepSeek, isFallback }.
 *
 * Order policy:
 *   1. Groq primary keys (round-robin start) — for every request.
 *   2. Groq fallback model on the SAME key that hit model_unavailable
 *      (injected on the fly in callWithFailover, not pre-built here).
 *   3. DeepSeek — tried when every Groq key is rate-limited / down.
 */
function buildPrimaryPool(modelOverride) {
  const pool = [];
  const groqKeys = collectGroqKeys();
  const primary = String(modelOverride || '').trim() || primaryModel();
  for (const key of groqKeys) {
    pool.push({ name: 'groq', baseURL: GROQ_BASE, key, model: primary, isGroq: true });
  }
  const dsKey = collectDeepSeekKey();
  if (dsKey) {
    pool.push({ name: 'deepseek', baseURL: DEEPSEEK_BASE, key: dsKey, model: DEEPSEEK_MODEL, isDeepSeek: true });
  }
  return pool;
}

/* Build a Groq fallback-model entry from a given Groq primary entry. */
function makeFallbackEntry(primaryEntry) {
  const fb = fallbackModel(primaryEntry.model);
  if (!fb) return null;
  return { name: 'groq-fallback', baseURL: GROQ_BASE, key: primaryEntry.key, model: fb, isGroq: true, isFallback: true };
}

/* ---------- One-shot (non-streaming) single-provider request ---------- */
async function requestOnce(entry, messages, opts) {
  const payload = {
    model: entry.model,
    messages: messages.map(message => ({
      role: message && message.role,
      content: String(message && message.content || '')
    })),
    temperature: Number.isFinite(Number(opts.temperature))
      ? Math.max(0, Math.min(2, Number(opts.temperature)))
      : 0.2,
    max_completion_tokens: MAX_TOKENS,
    ...reasoningOptions(entry.model)
  };
  if (opts.responseFormat === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }

  let response;
  try {
    response = await fetch(endpointFor(entry), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${entry.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (cause) {
    const err = makeError(`${entry.name} request failed: ${cause && cause.message ? cause.message : 'network error'}`, {
      status: 502,
      code: 'GROQ_REQUEST_FAILED',
      model: entry.model,
      provider: entry.name
    });
    err.cause = cause;
    throw err;
  }

  if (!response.ok) {
    const { detail, providerCode } = await readErrorBody(response);
    const label = entry.isDeepSeek ? 'DeepSeek API error' : 'Groq API error';
    throw makeError(`${label} (${response.status})${detail ? `: ${detail}` : ''}`, {
      status: response.status,
      code: 'GROQ_API_ERROR',
      providerCode,
      retryAfterMs: response.status === 429 ? parseRetryAfterMs(response, detail) : undefined,
      model: entry.model,
      provider: entry.name
    });
  }

  let data;
  try {
    data = await readJson(response);
  } catch (cause) {
    throw makeError(`${entry.name} returned an invalid JSON response`, {
      status: 502,
      code: 'GROQ_INVALID_RESPONSE',
      model: entry.model,
      provider: entry.name
    });
  }

  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  const finishReason = choice && choice.finish_reason ? String(choice.finish_reason) : null;
  if (finishReason === 'length') {
    throw makeError('Output reached the 4096-token limit; the partial answer was discarded.', {
      status: 502,
      code: 'AI_OUTPUT_TRUNCATED',
      model: entry.model,
      provider: entry.name
    });
  }

  const content = textFromContent(choice && choice.message && choice.message.content);
  if (!content) {
    throw makeError(`${entry.name} returned no content${finishReason ? ` (finish_reason: ${finishReason})` : ''}`, {
      status: 502,
      code: 'GROQ_EMPTY_RESPONSE',
      model: entry.model,
      provider: entry.name
    });
  }

  return {
    content,
    usage: data && data.usage && typeof data.usage === 'object' ? data.usage : null,
    finishReason,
    model: entry.model,
    provider: entry.name
  };
}

/* ---------- Streaming (async generator) single-provider request ---------- */
async function* streamOnce(entry, messages, opts) {
  const payload = {
    model: entry.model,
    stream: true,
    messages: messages.map(message => ({
      role: message && message.role,
      content: String(message && message.content || '')
    })),
    temperature: Number.isFinite(Number(opts.temperature))
      ? Math.max(0, Math.min(2, Number(opts.temperature)))
      : 0.6,
    max_completion_tokens: MAX_TOKENS,
    ...reasoningOptions(entry.model)
  };

  let response;
  try {
    response = await fetch(endpointFor(entry), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${entry.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(STREAM_TIMEOUT_MS)
    });
  } catch (cause) {
    const err = makeError(`${entry.name} stream request failed: ${cause && cause.message ? cause.message : 'network error'}`, {
      status: 502,
      code: 'STREAM_REQUEST_FAILED',
      model: entry.model,
      provider: entry.name
    });
    err.cause = cause;
    throw err;
  }

  if (!response.ok) {
    const { detail, providerCode } = await readErrorBody(response);
    throw makeError(`${entry.name} stream error (${response.status})${detail ? `: ${detail}` : ''}`, {
      status: response.status,
      code: 'GROQ_API_ERROR',
      providerCode,
      retryAfterMs: response.status === 429 ? parseRetryAfterMs(response, detail) : undefined,
      model: entry.model,
      provider: entry.name
    });
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    throw makeError(`${entry.name} did not return a readable stream`, {
      status: 502,
      code: 'STREAM_NO_BODY',
      model: entry.model,
      provider: entry.name
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullContent = '';
  let finishReason = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx;
      while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
        const rawLine = buffer.slice(0, newlineIdx).replace(/\r$/, '');
        buffer = buffer.slice(newlineIdx + 1);
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') { finishReason = 'stop'; break; }
        let parsed;
        try { parsed = JSON.parse(data); } catch { continue; }
        const choice = parsed && Array.isArray(parsed.choices) ? parsed.choices[0] : null;
        if (!choice) continue;
        if (choice.finish_reason) finishReason = String(choice.finish_reason);
        const delta = choice.delta && choice.delta.content
          ? String(choice.delta.content)
          : '';
        if (delta) {
          fullContent += delta;
          yield { done: false, delta, provider: entry.name };
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }

  yield { done: true, content: fullContent, finishReason, model: entry.model, provider: entry.name };
}

/* The pool for one request, Groq keys first (starting from a rotating
 * pointer so concurrent requests spread over the keys), DeepSeek last.
 * opts.model overrides the primary model for this request only. */
function orderedPool(opts) {
  const primaryPool = buildPrimaryPool(opts && opts.model);
  if (!primaryPool.length) {
    throw makeError('No AI provider key is configured. Set GROQ_API_KEY (and optionally GROQ_API_KEY_1, GROQ_API_KEY_2, DEEPSEEK_API_KEY) in your environment.', {
      status: 500,
      code: 'GROQ_KEY_MISSING'
    });
  }
  const groqCount = primaryPool.filter(p => p.isGroq && !p.isDeepSeek).length;
  if (groqCount === 0) return primaryPool.slice();
  const startIdx = _groqRR % groqCount;
  const groqEntries = [];
  for (let i = 0; i < groqCount; i++) groqEntries.push(primaryPool[(startIdx + i) % groqCount]);
  _groqRR = (_groqRR + 1) % Math.max(1, groqCount);
  return [...groqEntries, ...primaryPool.filter(p => p.isDeepSeek)];
}

/* ---------- 429 bookkeeping: what one pass over the pool learned ---------- */
function newPass() {
  return { rateLimited: false, rateLimitError: null, retryAfterMs: 0, emitted: false };
}

function notePassError(pass, err) {
  if (!isRateLimitError(err)) return;
  pass.rateLimited = true;
  if (!pass.rateLimitError) pass.rateLimitError = err;
  if (Number.isFinite(err.retryAfterMs)) pass.retryAfterMs = Math.max(pass.retryAfterMs, err.retryAfterMs);
}

/* Milliseconds to wait before pass number `round + 2`, or null when the
 * error must be surfaced instead (no 429 involved, retries used up, or Groq
 * asked for longer than one request may wait). */
function planRateLimitWait(pass, err, round) {
  if (!pass.rateLimited || !isRetryableError(err)) return null;
  if (round >= retryPolicy.maxRetries) return null;
  const grown = retryPolicy.baseDelayMs * Math.pow(retryPolicy.factor, round);
  const jitter = retryPolicy.jitterMs > 0 ? Math.floor(Math.random() * (retryPolicy.jitterMs + 1)) : 0;
  let wait = Math.min(retryPolicy.maxDelayMs, grown + jitter);
  if (pass.retryAfterMs > 0) {
    if (pass.retryAfterMs > retryPolicy.maxDelayMs) return null;
    wait = Math.max(wait, pass.retryAfterMs + 250);   // Groq's own number, plus a margin
  }
  return wait;
}

/* The error handed to the caller when retrying is over. A 429 wins over the
 * error of a later fallback entry, and carries the longest wait Groq asked
 * for (`retryAfterMs`) so the caller can decide how long to hold off. */
function finalError(pass, err) {
  const out = pass.rateLimited && isRetryableError(err) && !isRateLimitError(err) && pass.rateLimitError
    ? pass.rateLimitError
    : err;
  if (isRateLimitError(out) && pass.retryAfterMs > 0) {
    out.retryAfterMs = Math.max(pass.retryAfterMs, Number(out.retryAfterMs) || 0);
  }
  return out;
}

function warnRateLimitWait(wait, round) {
  console.warn(`[aiClient] rate limited (429) — waiting ${(wait / 1000).toFixed(1)}s, then retrying (${round + 1}/${retryPolicy.maxRetries}).`);
}

/* ---------- Failover driver (shared by chatCompletion & streamChat) ----------
 *
 * Tries entries in order. On model_unavailable (404/model_not_found) from
 * a Groq primary, immediately tries the Groq fallback model on the same key
 * before moving to the next key/provider. On 429 / 5xx / network errors,
 * skips the fallback (same key, same problem) and goes to the next entry.
 *
 * When the whole pool failed and at least one answer was a 429, the pass is
 * repeated after an exponential wait (retryPolicy), so a rate limit is
 * absorbed here instead of being shown to the user.
 */
async function runWithFailover(callOne, messages, opts) {
  const ordered = orderedPool(opts);
  for (let round = 0; ; round++) {
    const pass = newPass();
    try {
      return await runPass(callOne, ordered, messages, opts, pass);
    } catch (err) {
      const wait = planRateLimitWait(pass, err, round);
      if (wait === null) throw finalError(pass, err);
      warnRateLimitWait(wait, round);
      await retryPolicy.sleep(wait);
    }
  }
}

/* One pass over the ordered pool: the first entry that answers wins. A
 * retryable failure moves on to the next key / provider at once; when the
 * last entry fails too, the last error is thrown (runWithFailover then
 * decides whether a 429 deserves another pass). */
async function runPass(callOne, ordered, messages, opts, pass) {
  let lastErr = null;
  for (let i = 0; i < ordered.length; i++) {
    const entry = ordered[i];
    try {
      return await callOne(entry, messages, opts);
    } catch (err) {
      lastErr = err;
      notePassError(pass, err);

      // Model-unavailable on a Groq primary → try the fallback model on the same key.
      let triedFallback = false;
      if (entry.isGroq && !entry.isFallback && isModelUnavailable(err)) {
        const fbEntry = makeFallbackEntry(entry);
        if (fbEntry) {
          triedFallback = true;
          try {
            console.warn(`[aiClient] ${entry.name} model "${entry.model}" is unavailable (HTTP ${err.status}${err.providerCode ? `, ${err.providerCode}` : ''}); retrying with "${fbEntry.model}".`);
            return await callOne(fbEntry, messages, opts);
          } catch (fbErr) {
            lastErr = fbErr;
            notePassError(pass, fbErr);
            // If the fallback's error is NOT retryable AND NOT another
            // model-unavailable signal (which would mean the fallback
            // model itself doesn't exist), surface it as the final error.
            if (!isRetryableError(fbErr) && !isModelUnavailable(fbErr)) {
              throw fbErr;
            }
            // Otherwise fall through: if retryable, try the next primary
            // key/DeepSeek; if model-unavailable (on the fallback too)
            // and no more entries remain, the throw at the loop bottom
            // reports lastErr (the fallback error).
          }
        }
      }

      // Decide whether to continue to the next entry. We test lastErr
      // (which may be the fallback error) — if it is retryable, keep going.
      if (!isRetryableError(lastErr)) {
        // Model-unavailable errors (404 / model_not_found) reach this
        // point when we tried the fallback and it also returned a model
        // error. If there are more entries left (e.g. DeepSeek), continue;
        // otherwise throw the last error.
        if (triedFallback && isModelUnavailable(lastErr) && i < ordered.length - 1) {
          // fall through to next entry
        } else {
          throw lastErr;
        }
      }
      if (i === ordered.length - 1) break;
      console.warn(`[aiClient] ${entry.name} (${entry.model}) failed: ${lastErr.message} — failing over to next provider...`);
      if (FAILOVER_DELAY_MS > 0) await sleep(FAILOVER_DELAY_MS);
    }
  }
  throw lastErr;
}

/* Non-streaming wrapper. */
async function requestWithFailover(messages, opts) {
  return runWithFailover(requestOnce, messages, opts);
}

/* Streaming wrapper. We need to detect early failures before the first
 * chunk so the client doesn't see garbled partial output: if the first
 * chunk errors we transparently try the next provider — and, when every
 * provider answered 429, wait and run the whole pass again. Once chunks
 * start flowing we stay on that provider (and never restart the stream). */
async function* streamWithFailover(messages, opts) {
  const ordered = orderedPool(opts);
  for (let round = 0; ; round++) {
    const pass = newPass();
    try {
      yield* streamPass(ordered, messages, opts, pass);
      return;
    } catch (err) {
      if (pass.emitted) throw err;   // output already reached the caller
      const wait = planRateLimitWait(pass, err, round);
      if (wait === null) throw finalError(pass, err);
      warnRateLimitWait(wait, round);
      await retryPolicy.sleep(wait);
    }
  }
}

async function* streamPass(ordered, messages, opts, pass) {
  let lastErr = null;
  for (let i = 0; i < ordered.length; i++) {
    const entry = ordered[i];
    let iterator;
    try {
      iterator = streamOnce(entry, messages, opts);
      // Peek at the first value to detect pre-stream failures (429, network, etc.).
      const first = await iterator.next();
      if (first.done) {
        if (first.value) { pass.emitted = true; yield first.value; }
        return;
      }
      // First chunk arrived — drain the rest on this provider.
      pass.emitted = true;
      yield first.value;
      yield* iterator;
      return;
    } catch (err) {
      lastErr = err;
      notePassError(pass, err);
      if (iterator && typeof iterator.return === 'function') {
        try { await iterator.return(); } catch { /* ignore */ }
      }

      // Model-unavailable on Groq primary → try the fallback model immediately.
      if (entry.isGroq && !entry.isFallback && isModelUnavailable(err)) {
        const fbEntry = makeFallbackEntry(entry);
        if (fbEntry) {
          let fbIt;
          try {
            console.warn(`[aiClient] ${entry.name} model "${entry.model}" is unavailable; retrying stream with "${fbEntry.model}".`);
            fbIt = streamOnce(fbEntry, messages, opts);
            const firstFb = await fbIt.next();
            if (firstFb.done) { if (firstFb.value) { pass.emitted = true; yield firstFb.value; } return; }
            pass.emitted = true;
            yield firstFb.value;
            yield* fbIt;
            return;
          } catch (fbErr) {
            lastErr = fbErr;
            notePassError(pass, fbErr);
            if (fbIt && typeof fbIt.return === 'function') {
              try { await fbIt.return(); } catch {}
            }
            if (!isRetryableError(fbErr) && !isModelUnavailable(fbErr)) throw fbErr;
          }
        }
      }

      if (!isRetryableError(err) && !(entry.isGroq && !entry.isFallback && isModelUnavailable(err))) {
        // Non-retryable error that wasn't a model issue → surface.
        if (!isRetryableError(err)) throw err;
      }
      if (i === ordered.length - 1) break;
      if (isRetryableError(err) || (entry.isGroq && !entry.isFallback && isModelUnavailable(err))) {
        console.warn(`[aiClient] ${entry.name} (${entry.model}) stream failed: ${err.message} — failing over...`);
        if (FAILOVER_DELAY_MS > 0) await sleep(FAILOVER_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

/**
 * Send chat messages to the AI provider pool with automatic failover.
 *
 * @param {{role, content}[]} messages
 * @param {{temperature?: number, responseFormat?: 'json_object', model?: string}} [options]
 *        `model` replaces the primary Groq model for this one request.
 * @returns {Promise<{content, usage, finishReason, model, provider}>}
 */
async function chatCompletion(messages, options) {
  if (!Array.isArray(messages) || !messages.length) {
    throw new TypeError('At least one chat message is required');
  }
  return requestWithFailover(messages, options || {});
}

/**
 * Stream chat responses. Returns an async iterator yielding content deltas.
 *
 *   for await (const chunk of aiClient.streamChat(messages, opts)) {
 *     if (chunk.done) { /* chunk.content is the full text *\/ }
 *     else { /* chunk.delta — new text *\/ }
 *   }
 */
async function* streamChat(messages, options) {
  if (!Array.isArray(messages) || !messages.length) {
    throw new TypeError('At least one chat message is required');
  }
  yield* streamWithFailover(messages, options || {});
}

module.exports = {
  API_BASE: GROQ_BASE,
  DEEPSEEK_BASE,
  DEFAULT_MODEL: DEFAULT_GROQ_MODEL,
  DEFAULT_FALLBACK_MODEL: DEFAULT_GROQ_FALLBACK_MODEL,
  DEEPSEEK_MODEL,
  MAX_TOKENS,
  endpoint,
  isConfigured,
  primaryModel,
  fallbackModel,
  isModelUnavailable,
  isRateLimitError,
  chatCompletion,
  streamChat,
  // Exposed for tests / diagnostics:
  _buildPrimaryPool: buildPrimaryPool,
  _collectGroqKeys: collectGroqKeys,
  _collectDeepSeekKey: collectDeepSeekKey,
  _FAILOVER_DELAY_MS: FAILOVER_DELAY_MS,
  _isRetryableError: isRetryableError,
  _retryPolicy: retryPolicy,
  _parseRetryAfterMs: parseRetryAfterMs
};
Object.defineProperty(module.exports, 'MODEL', { enumerable: true, get: primaryModel });
