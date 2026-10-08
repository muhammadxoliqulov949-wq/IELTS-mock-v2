'use strict';

/* One server-side client for all language-model requests in this project.
 * Every call goes to Groq's OpenAI-compatible Chat Completions endpoint and
 * uses the single GROQ_API_KEY secret. Keep the model and output budget here
 * so endpoint implementations cannot drift apart.
 *
 * Model choice: GROQ_MODEL (default openai/gpt-oss-120b). If Groq reports that
 * the primary model is not available (any HTTP 404, or the error code
 * model_not_found / model_decommissioned), the same request is retried once on
 * GROQ_FALLBACK_MODEL (default openai/gpt-oss-20b).
 */
const API_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_FALLBACK_MODEL = 'openai/gpt-oss-20b';
const MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 120_000;
/* Groq accepts reasoning_effort only for these models; any other model returns 400. */
const REASONING_EFFORT_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
/* Groq error codes meaning that the model itself cannot be used. */
const MODEL_UNAVAILABLE_CODES = ['model_not_found', 'model_decommissioned'];

function endpoint() {
  return `${API_BASE}/chat/completions`;
}

function apiKey() {
  return String((process.env && process.env.GROQ_API_KEY) || '').trim();
}

function isConfigured() {
  return !!apiKey();
}

/* Read per call, like the API key, so the running environment always decides. */
function primaryModel() {
  return String((process.env && process.env.GROQ_MODEL) || '').trim() || DEFAULT_MODEL;
}

/* Returns the fallback model, or null when it would repeat the primary model. */
function fallbackModel() {
  const model = String((process.env && process.env.GROQ_FALLBACK_MODEL) || '').trim() || DEFAULT_FALLBACK_MODEL;
  return model === primaryModel() ? null : model;
}

/* True when the model is the problem rather than the request or the service:
 * any HTTP 404, or Groq's model_not_found / model_decommissioned codes.
 * Rate limits, outages, bad requests and truncated answers do not qualify. */
function isModelUnavailable(err) {
  if (!err) return false;
  return Number(err.status) === 404 || MODEL_UNAVAILABLE_CODES.includes(err.providerCode);
}

function makeError(message, options) {
  const err = new Error(message);
  if (options && options.status) err.status = options.status;
  if (options && options.code) err.code = options.code;
  if (options && options.providerCode) err.providerCode = options.providerCode;
  if (options && options.model) err.model = options.model;
  return err;
}

/* Returns the start of the error body for the message, plus Groq's error code
 * (for example "model_not_found") when the body has the standard JSON shape. */
async function readErrorBody(response) {
  let raw = '';
  try {
    if (typeof response.text === 'function') raw = String(await response.text());
    else if (typeof response.json === 'function') raw = JSON.stringify(await response.json());
  } catch { /* retain the HTTP status even if the body is unreadable */ }
  let providerCode = '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.error && parsed.error.code) providerCode = String(parsed.error.code);
  } catch { /* plain-text body: the HTTP status alone decides */ }
  return { detail: raw.slice(0, 800), providerCode };
}

async function readJson(response) {
  if (typeof response.json === 'function') return response.json();
  if (typeof response.text === 'function') return JSON.parse(await response.text());
  throw new Error('Groq returned an unreadable response');
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

/* GPT-OSS models reason before they answer, and those reasoning tokens use the
 * same 4096-token budget as the answer. Groq's default effort is "medium", so
 * these models are pinned to "low", and their reasoning is kept out of the
 * answer text that the JSON parsers read. */
function reasoningOptions(model) {
  return REASONING_EFFORT_MODELS.includes(model)
    ? { reasoning_effort: 'low', include_reasoning: false }
    : {};
}

/* One request to one model. Throws a GROQ_* error on any failure. */
async function requestCompletion(key, model, messages, opts) {
  const payload = {
    model,
    messages: messages.map(message => ({
      role: message && message.role,
      content: String(message && message.content || '')
    })),
    temperature: Number.isFinite(Number(opts.temperature))
      ? Math.max(0, Math.min(2, Number(opts.temperature)))
      : 0.2,
    max_completion_tokens: MAX_TOKENS,
    ...reasoningOptions(model)
  };
  if (opts.responseFormat === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }

  let response;
  try {
    response = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (cause) {
    const err = makeError(`Groq request failed: ${cause && cause.message ? cause.message : 'network error'}`, {
      status: 502,
      code: 'GROQ_REQUEST_FAILED',
      model
    });
    err.cause = cause;
    throw err;
  }

  if (!response.ok) {
    const { detail, providerCode } = await readErrorBody(response);
    throw makeError(`Groq API error (${response.status})${detail ? `: ${detail}` : ''}`, {
      status: response.status,
      code: 'GROQ_API_ERROR',
      providerCode,
      model
    });
  }

  let data;
  try {
    data = await readJson(response);
  } catch (cause) {
    const err = makeError('Groq returned an invalid JSON response', {
      status: 502,
      code: 'GROQ_INVALID_RESPONSE',
      model
    });
    err.cause = cause;
    throw err;
  }

  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  const finishReason = choice && choice.finish_reason ? String(choice.finish_reason) : null;
  if (finishReason === 'length') {
    throw makeError('Groq output reached the 4096-token limit; the partial answer was discarded. Try a smaller input or generate a smaller section.', {
      status: 502,
      code: 'AI_OUTPUT_TRUNCATED',
      model
    });
  }

  const content = textFromContent(choice && choice.message && choice.message.content);
  if (!content) {
    throw makeError(`Groq returned no content${finishReason ? ` (finish_reason: ${finishReason})` : ''}`, {
      status: 502,
      code: 'GROQ_EMPTY_RESPONSE',
      model
    });
  }

  return {
    content,
    usage: data && data.usage && typeof data.usage === 'object' ? data.usage : null,
    finishReason,
    model
  };
}

/**
 * Send chat messages to Groq.
 *
 * `max_completion_tokens` is intentionally not configurable: all endpoints use
 * the same 4096-token output budget. Large generator sections are split into
 * focused requests by api/generate-mock.js. A length-finished answer is
 * rejected so a partial JSON object or truncated response is never returned
 * as a successful result.
 *
 * If the primary model is unavailable (see isModelUnavailable), the same
 * request is sent once more with the fallback model. `model` in the result
 * names the model that answered.
 *
 * @param {{role: 'system'|'user'|'assistant', content: string}[]} messages
 * @param {{temperature?: number, responseFormat?: 'json_object'}} [options]
 * @returns {Promise<{content: string, usage: object|null, finishReason: string|null, model: string}>}
 */
async function chatCompletion(messages, options) {
  const key = apiKey();
  if (!key) {
    throw makeError('GROQ_API_KEY is not set on the server. Add it in your hosting environment (Vercel → Settings → Environment Variables) — get a key at https://console.groq.com/keys', {
      status: 500,
      code: 'GROQ_KEY_MISSING'
    });
  }
  if (!Array.isArray(messages) || !messages.length) {
    throw new TypeError('At least one chat message is required');
  }

  const opts = options || {};
  const primary = primaryModel();
  try {
    return await requestCompletion(key, primary, messages, opts);
  } catch (err) {
    const fallback = fallbackModel();
    if (!fallback || !isModelUnavailable(err)) throw err;
    console.warn(`[aiClient] Groq model "${primary}" is unavailable (HTTP ${err.status}${err.providerCode ? `, ${err.providerCode}` : ''}); retrying once with "${fallback}".`);
    return requestCompletion(key, fallback, messages, opts);
  }
}

module.exports = {
  API_BASE,
  DEFAULT_MODEL,
  DEFAULT_FALLBACK_MODEL,
  MAX_TOKENS,
  endpoint,
  isConfigured,
  primaryModel,
  fallbackModel,
  isModelUnavailable,
  chatCompletion
};
/* MODEL is the effective primary model (GROQ_MODEL, or the default). */
Object.defineProperty(module.exports, 'MODEL', { enumerable: true, get: primaryModel });
