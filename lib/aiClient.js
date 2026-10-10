'use strict';

/* One server-side client for all language-model requests in this project.
 *
 * Multi-provider, multi-key high-availability router:
 *   - Primary provider: Groq (https://api.groq.com/openai/v1)
 *     * Keys: GROQ_API_KEY (legacy single key), and numbered keys
 *       GROQ_API_KEY_1, GROQ_API_KEY_2, ... for round-robin load balancing.
 *     * Primary model:  GROQ_MODEL (default openai/gpt-oss-120b)
 *     * Fallback model: GROQ_FALLBACK_MODEL (default openai/gpt-oss-20b),
 *       used when the primary returns model_not_found / 404.
 *   - Fallback provider: DeepSeek (https://api.deepseek.com/v1)
 *     * Key: DEEPSEEK_API_KEY, model: deepseek-chat. Used when every Groq
 *       key is exhausted (429) or unreachable (network error).
 *
 * On 429 (rate limit) or network failure, the router automatically
 * fails over within ~100ms without surfacing an error to the caller.
 *
 * Streaming: streamChat() returns an async iterator that yields content
 * delta chunks (OpenAI-compatible SSE streaming) for real-time UI.
 */

/* ---------- Provider configuration ---------- */
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_GROQ_FALLBACK_MODEL = 'openai/gpt-oss-20b';
const DEEPSEEK_MODEL = 'deepseek-chat';

const MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 120_000;
const STREAM_TIMEOUT_MS = 120_000;

/* Failover delay between retries — kept tiny (≤100ms total) so the user
 * never notices a provider hiccup. */
const FAILOVER_DELAY_MS = 50;

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

function fallbackModel() {
  const model = String((process.env && process.env.GROQ_FALLBACK_MODEL) || '').trim() || DEFAULT_GROQ_FALLBACK_MODEL;
  return model === primaryModel() ? null : model;
}

function isModelUnavailable(err) {
  if (!err) return false;
  return Number(err.status) === 404 || MODEL_UNAVAILABLE_CODES.includes(err.providerCode);
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
function buildPrimaryPool() {
  const pool = [];
  const groqKeys = collectGroqKeys();
  const primary = primaryModel();
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
  const fb = fallbackModel();
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

/* ---------- Failover driver (shared by chatCompletion & streamChat) ----------
 *
 * Tries entries in order. On model_unavailable (404/model_not_found) from
 * a Groq primary, immediately tries the Groq fallback model on the same key
 * before moving to the next key/provider. On 429 / 5xx / network errors,
 * skips the fallback (same key, same problem) and goes to the next entry.
 */
async function runWithFailover(callOne, messages, opts) {
  const primaryPool = buildPrimaryPool();
  if (!primaryPool.length) {
    throw makeError('No AI provider key is configured. Set GROQ_API_KEY (and optionally GROQ_API_KEY_1, GROQ_API_KEY_2, DEEPSEEK_API_KEY) in your environment.', {
      status: 500,
      code: 'GROQ_KEY_MISSING'
    });
  }

  // Re-order the pool starting from the round-robin pointer for fairness
  // across concurrent requests.
  const groqCount = primaryPool.filter(p => p.isGroq && !p.isDeepSeek).length;
  let ordered;
  if (groqCount > 0) {
    const startIdx = _groqRR % groqCount;
    const groqEntries = [];
    for (let i = 0; i < groqCount; i++) groqEntries.push(primaryPool[(startIdx + i) % groqCount]);
    _groqRR = (_groqRR + 1) % Math.max(1, groqCount);
    ordered = [...groqEntries, ...primaryPool.filter(p => p.isDeepSeek)];
  } else {
    ordered = primaryPool.slice();
  }

  let lastErr = null;
  for (let i = 0; i < ordered.length; i++) {
    const entry = ordered[i];
    try {
      return await callOne(entry, messages, opts);
    } catch (err) {
      lastErr = err;

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
 * chunk errors we transparently try the next provider. Once chunks start
 * flowing we stay on that provider. */
async function* streamWithFailover(messages, opts) {
  // Build a queue of entries using the same ordering logic as
  // runWithFailover, but consume them lazily.
  const primaryPool = buildPrimaryPool();
  if (!primaryPool.length) {
    throw makeError('No AI provider key is configured.', {
      status: 500,
      code: 'GROQ_KEY_MISSING'
    });
  }

  const groqCount = primaryPool.filter(p => p.isGroq && !p.isDeepSeek).length;
  let ordered;
  if (groqCount > 0) {
    const startIdx = _groqRR % groqCount;
    const groqEntries = [];
    for (let i = 0; i < groqCount; i++) groqEntries.push(primaryPool[(startIdx + i) % groqCount]);
    _groqRR = (_groqRR + 1) % Math.max(1, groqCount);
    ordered = [...groqEntries, ...primaryPool.filter(p => p.isDeepSeek)];
  } else {
    ordered = primaryPool.slice();
  }

  let lastErr = null;
  for (let i = 0; i < ordered.length; i++) {
    const entry = ordered[i];
    let iterator;
    try {
      iterator = streamOnce(entry, messages, opts);
      // Peek at the first value to detect pre-stream failures (429, network, etc.).
      const first = await iterator.next();
      if (first.done) {
        if (first.value) yield first.value;
        return;
      }
      // First chunk arrived — drain the rest on this provider.
      yield first.value;
      yield* iterator;
      return;
    } catch (err) {
      lastErr = err;
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
            if (firstFb.done) { if (firstFb.value) yield firstFb.value; return; }
            yield firstFb.value;
            yield* fbIt;
            return;
          } catch (fbErr) {
            lastErr = fbErr;
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
 * @param {{temperature?: number, responseFormat?: 'json_object'}} [options]
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
  chatCompletion,
  streamChat,
  // Exposed for tests / diagnostics:
  _buildPrimaryPool: buildPrimaryPool,
  _collectGroqKeys: collectGroqKeys,
  _collectDeepSeekKey: collectDeepSeekKey,
  _FAILOVER_DELAY_MS: FAILOVER_DELAY_MS,
  _isRetryableError: isRetryableError
};
Object.defineProperty(module.exports, 'MODEL', { enumerable: true, get: primaryModel });
