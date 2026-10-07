/* Single source of truth for every AI call the server makes.
 *
 * Provider: Groq API (OpenAI-compatible chat completions). Every endpoint —
 * api/grade.js, api/coach.js, api/quiz.js and api/generate-mock.js — talks
 * to the model ONLY through this module, so a future provider or model
 * change is a one-file edit here, never a four-file hunt.
 *
 *   baseURL: https://api.groq.com/openai/v1
 *   model:   llama-3.3-70b-versatile
 *
 * All requests use exactly one key: process.env.GROQ_API_KEY
 * (free key: https://console.groq.com/keys).
 *
 * Optional override (handy when a key is pinned to a different model):
 *   GROQ_MODEL=llama-3.3-70b-versatile
 * Read lazily on every request, so a rotation never needs a code change.
 *
 * Every call sends max_tokens 4096, so long answers (a graded Task 2, a
 * 40-question mock section) are never cut off mid-JSON.
 */
'use strict';

const API_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_MAX_TOKENS = 4096;
const KEY_MISSING_CODE = 'GROQ_KEY_MISSING';
const GROQ_KEYS_URL = 'https://console.groq.com/keys';
const GROQ_MODELS_URL = 'https://console.groq.com/docs/models';

function envString(name) {
  return String((process.env && process.env[name]) || '').trim();
}

/* The single API key every AI request uses. */
function apiKey() {
  return envString('GROQ_API_KEY');
}

/* The chat model every endpoint uses right now. */
function model() {
  return envString('GROQ_MODEL') || DEFAULT_MODEL;
}

/* https://api.groq.com/openai/v1/chat/completions */
function endpoint() {
  return `${API_BASE}/chat/completions`;
}

function headers(key) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key || apiKey()}`
  };
}

/* Groq answers 401 for a missing/invalid key, 404 when the model id is no
 * longer served, and 429 when the rate limit is hit. The hosted endpoints
 * surface these verbatim, so make each one actionable. */
function groqErrorHint(status, body) {
  const text = String(body || '');
  const code = Number(status);
  if (code === 401 || /invalid api key|unauthorized|authentication/i.test(text)) {
    return ' — the GROQ_API_KEY is missing or invalid. '
      + `Check it in your hosting environment (Vercel → Project → Settings → Environment Variables). Free key: ${GROQ_KEYS_URL}`;
  }
  if (code === 404 || /model.*not found|model.*does not exist|decommissioned/i.test(text)) {
    return ` — the model id "${model()}" is not available to this API key. `
      + 'Set GROQ_MODEL in your hosting environment to a served model, '
      + `or update lib/aiClient.js. Current models: ${GROQ_MODELS_URL}`;
  }
  if (code === 429 || /rate limit|too many requests/i.test(text)) {
    return ' — Groq rate limit reached. Wait a moment and try again.';
  }
  return '';
}

/* The model sometimes wraps JSON in ```json fences or adds a preamble. */
function parseJson(raw) {
  const s = String(raw || '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(s); } catch { /* fall through */ }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* fall through */ }
  }
  throw new Error('The model did not return valid JSON');
}

/**
 * Low-level chat call. `messages` uses the OpenAI shape:
 * [{ role: 'system'|'user'|'assistant', content: '…' }, …].
 * @returns {Promise<{ content: string, usage: object|null, raw: object }>}
 */
async function chat(messages, options) {
  const opts = options || {};
  const key = opts.apiKey || apiKey();
  if (!key) {
    const err = new Error(
      'GROQ_API_KEY is not set on the server. Add it in your hosting environment '
      + `(Vercel → Settings → Environment Variables) — get a free key at ${GROQ_KEYS_URL}`
    );
    err.code = KEY_MISSING_CODE;
    err.status = 500;
    throw err;
  }
  const body = {
    model: opts.model || model(),
    messages: Array.isArray(messages) ? messages : [],
    temperature: opts.temperature === undefined ? 0.4 : Number(opts.temperature),
    max_tokens: opts.maxTokens === undefined ? DEFAULT_MAX_TOKENS : Number(opts.maxTokens)
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 500);
    const err = new Error(`Groq API error (${res.status}): ${text}${groqErrorHint(res.status, text)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const content = data && data.choices && data.choices[0]
    && data.choices[0].message && data.choices[0].message.content;
  if (!content || !String(content).trim()) {
    const reason = (data && data.choices && data.choices[0] && data.choices[0].finish_reason) || 'unknown';
    throw new Error(`Groq returned no content (finish_reason: ${reason}). Please try again.`);
  }
  return { content: String(content), usage: (data && data.usage) || null, raw: data };
}

/* System + user prompt answered as parsed JSON (grade, quiz, generator). */
async function completeJson(systemPrompt, userContent, options) {
  const opts = options || {};
  const { content, usage } = await chat(
    [
      { role: 'system', content: String(systemPrompt || '') },
      { role: 'user', content: String(userContent || '') }
    ],
    { temperature: opts.temperature, maxTokens: opts.maxTokens, jsonMode: true }
  );
  return { parsed: parseJson(content), usage };
}

/* System + user prompt answered as plain text (the AI Coach). */
async function completeText(systemPrompt, userContent, options) {
  const opts = options || {};
  const { content, usage } = await chat(
    [
      { role: 'system', content: String(systemPrompt || '') },
      { role: 'user', content: String(userContent || '') }
    ],
    { temperature: opts.temperature, maxTokens: opts.maxTokens }
  );
  return { text: content, usage };
}

module.exports = {
  API_BASE,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  KEY_MISSING_CODE,
  GROQ_KEYS_URL,
  GROQ_MODELS_URL,
  apiKey,
  model,
  endpoint,
  headers,
  groqErrorHint,
  parseJson,
  chat,
  completeJson,
  completeText
};
