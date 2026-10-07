'use strict';

/* One server-side client for all language-model requests in this project.
 * Every call goes to Groq's OpenAI-compatible Chat Completions endpoint and
 * uses the single GROQ_API_KEY secret. Keep the model and output budget here
 * so endpoint implementations cannot drift apart.
 */
const API_BASE = 'https://api.groq.com/openai/v1';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 120_000;

function endpoint() {
  return `${API_BASE}/chat/completions`;
}

function apiKey() {
  return String((process.env && process.env.GROQ_API_KEY) || '').trim();
}

function isConfigured() {
  return !!apiKey();
}

function makeError(message, options) {
  const err = new Error(message);
  if (options && options.status) err.status = options.status;
  if (options && options.code) err.code = options.code;
  return err;
}

async function readErrorBody(response) {
  try {
    if (typeof response.text === 'function') return (await response.text()).slice(0, 800);
    if (typeof response.json === 'function') return JSON.stringify(await response.json()).slice(0, 800);
  } catch { /* retain the HTTP status even if the body is unreadable */ }
  return '';
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

/**
 * Send chat messages to Groq.
 *
 * `max_tokens` is intentionally not configurable: all endpoints use the
 * same 4096-token output budget. Large generator sections are split into
 * focused requests by api/generate-mock.js. A length-finished answer is
 * rejected so a partial JSON object or truncated response is never returned
 * as a successful result.
 *
 * @param {{role: 'system'|'user'|'assistant', content: string}[]} messages
 * @param {{temperature?: number, responseFormat?: 'json_object'}} [options]
 * @returns {Promise<{content: string, usage: object|null, finishReason: string|null}>}
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
  const payload = {
    model: MODEL,
    messages: messages.map(message => ({
      role: message && message.role,
      content: String(message && message.content || '')
    })),
    temperature: Number.isFinite(Number(opts.temperature))
      ? Math.max(0, Math.min(2, Number(opts.temperature)))
      : 0.2,
    max_tokens: MAX_TOKENS
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
      code: 'GROQ_REQUEST_FAILED'
    });
    err.cause = cause;
    throw err;
  }

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw makeError(`Groq API error (${response.status})${detail ? `: ${detail}` : ''}`, {
      status: response.status,
      code: 'GROQ_API_ERROR'
    });
  }

  let data;
  try {
    data = await readJson(response);
  } catch (cause) {
    const err = makeError('Groq returned an invalid JSON response', {
      status: 502,
      code: 'GROQ_INVALID_RESPONSE'
    });
    err.cause = cause;
    throw err;
  }

  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  const finishReason = choice && choice.finish_reason ? String(choice.finish_reason) : null;
  if (finishReason === 'length') {
    throw makeError('Groq output reached the 4096-token limit; the partial answer was discarded. Try a smaller input or generate a smaller section.', {
      status: 502,
      code: 'AI_OUTPUT_TRUNCATED'
    });
  }

  const content = textFromContent(choice && choice.message && choice.message.content);
  if (!content) {
    throw makeError(`Groq returned no content${finishReason ? ` (finish_reason: ${finishReason})` : ''}`, {
      status: 502,
      code: 'GROQ_EMPTY_RESPONSE'
    });
  }

  return {
    content,
    usage: data && data.usage && typeof data.usage === 'object' ? data.usage : null,
    finishReason
  };
}

module.exports = {
  API_BASE,
  MODEL,
  MAX_TOKENS,
  endpoint,
  isConfigured,
  chatCompletion
};
