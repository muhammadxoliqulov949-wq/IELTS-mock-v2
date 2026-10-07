/* ===================================================================
 * lib/aiClient.js — the ONE AI module of this project
 * -------------------------------------------------------------------
 * Every artificial-intelligence feature of the app (AI Coach, Writing &
 * Speaking grading, the quiz generator, the 1-Click mock generator and
 * the fallback text-to-speech engine) talks to **Groq** through this
 * module and nothing else. There is a single credential —
 * `process.env.GROQ_API_KEY` — and a single base URL:
 *
 *   baseURL:  https://api.groq.com/openai/v1      (OpenAI format)
 *   model:    llama-3.3-70b-versatile             (see MODEL FALLBACK)
 *
 * Groq speaks the OpenAI wire format, so a chat call is:
 *
 *   POST /chat/completions
 *   { model, messages: [{role, content}…], temperature, max_tokens,
 *     response_format: { type: 'json_object' }? }
 *   → { choices: [{ message: { content }, finish_reason }], usage }
 *
 * Why this file exists: the model id used to be hardcoded in four
 * endpoints, so a provider retiring a model broke every AI feature at
 * once and each fix was a four-file hunt. A single module means a model
 * rotation or a provider change is a one-file edit.
 *
 * MODEL FALLBACK
 *   `llama-3.3-70b-versatile` is the model this project standardised on,
 *   but Groq shut it down for free/developer-tier keys on 2026-08-16
 *   (https://console.groq.com/docs/deprecations) and Groq's own
 *   recommended replacement is `openai/gpt-oss-120b`. Requests would
 *   therefore answer `404 model_decommissioned` on an ordinary key. So
 *   the module tries the models in order — GROQ_MODEL override first,
 *   then the project default, then the live fallback — and remembers
 *   which one worked so the retry costs nothing after the first call.
 *   An enterprise key with committed spend keeps using Llama untouched.
 *
 *   GROQ_MODEL=llama-3.3-70b-versatile   # pin any model explicitly
 *   GROQ_TTS_VOICE=hannah                # orpheus voice for listening audio
 *
 * TOKEN BUDGET
 *   Every call is sized so the answer is never cut off in the middle:
 *   `MAX_TOKENS` is 4096 for the four text calls (coach, grade, quiz and
 *   the writing/speaking generator), and the two 40-question sections
 *   (listening/reading) use `SECTION_MAX_TOKENS` (8192) because a full
 *   transcript plus 40 questions with explanations cannot fit in 4096 —
 *   a truncated answer would break the JSON payload. Truncation is
 *   detected through `finish_reason === 'length'` and reported clearly
 *   instead of being parsed as a broken answer.
 *
 * Text-to-speech (listening recordings) uses Groq's OpenAI-format speech
 * endpoint with the Orpheus English model. Orpheus accepts at most 200
 * characters per request, so lib/edgeTts.js chunks the transcript and
 * joins the returned WAV chunks into one recording.
 * =================================================================== */
'use strict';

/* ---------- provider constants ---------- */
const API_BASE = 'https://api.groq.com/openai/v1';
const CHAT_ENDPOINT = `${API_BASE}/chat/completions`;
const SPEECH_ENDPOINT = `${API_BASE}/audio/speech`;

/* The model this project asks for. Kept as the documented default even
 * though Groq retired it for free-tier keys — see MODEL FALLBACK above. */
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
/* Groq's recommended replacement (and the model that actually answers on
 * a free/developer key today): openai/gpt-oss-120b, 131K context. */
const FALLBACK_MODEL = 'openai/gpt-oss-120b';

/* Answer budget for every text call — enough for a full band breakdown. */
const MAX_TOKENS = 4096;
/* Listening/Reading sections carry a transcript/passages *and* 40
 * questions with explanations; 4096 tokens truncates them mid-JSON. */
const SECTION_MAX_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.3;

/* GPT-OSS models "think" before answering and those reasoning tokens are
 * billed and budgeted as output tokens. Keeping reasoning short protects
 * the answer budget so a 4096-token call still returns the full JSON. */
const REASONING_EFFORT = 'low';

/* ---------- text-to-speech ---------- */
const TTS_MODEL = 'canopylabs/orpheus-v1-english';
const TTS_VOICE = 'troy';
const TTS_VOICES = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'];
const TTS_MAX_CHARS = 200;      /* documented Orpheus input limit */
const TTS_FORMAT = 'wav';       /* the only format Orpheus supports */

/* ---------- env helpers ---------- */
function env(name) {
  return String((process.env && process.env[name]) || '').trim();
}

/** The one credential every AI call uses. */
function apiKey() {
  return env('GROQ_API_KEY');
}
function hasKey() {
  return !!apiKey();
}

/* ---------- model selection ---------- */
const RETIRED_MODEL_RE = /(model_decommissioned|decommissioned|decommission|does not exist or you do not have access|model_not_found|no longer available|has been deprecated|unsupported model)/i;

/* Learned at runtime: the model that last answered, and the ids Groq told
 * us to stop calling. Reset per serverless instance, so a cold start may
 * pay for one extra round trip and nothing more. */
let activeModel = '';
const retiredModels = new Set();

/** The configured model (GROQ_MODEL wins over the project default). */
function model() {
  return env('GROQ_MODEL') || DEFAULT_MODEL;
}

/** Models to try, best first: last known-good, override, default, fallback. */
function modelChain() {
  const out = [];
  const push = (id) => {
    const value = String(id || '').trim();
    if (value && !retiredModels.has(value) && !out.includes(value)) out.push(value);
  };
  push(activeModel);
  push(env('GROQ_MODEL'));
  push(DEFAULT_MODEL);
  push(FALLBACK_MODEL);
  return out;
}

/** True when Groq says this model id must not be used any more. */
function isRetiredModelError(status, body) {
  const code = Number(status);
  if (code !== 400 && code !== 404) return false;
  return RETIRED_MODEL_RE.test(String(body || ''));
}

/** GPT-OSS models accept `reasoning_effort`; Llama/Qwen chat models do not,
 *  so the parameter is only sent where the provider documents it. */
function isReasoningModel(id) {
  return /gpt-oss/i.test(String(id || ''));
}

/* ---------- error surfacing ---------- */

/** The 500 body every endpoint returns when the key is missing. */
function missingKey() {
  return {
    code: 'GROQ_KEY_MISSING',
    error: 'GROQ_API_KEY is not set on the server.',
    message: 'Iltimos, avval GROQ_API_KEY sozlang — AI funksiyalari ishlashi uchun Groq API kaliti kerak.',
    hint: 'Add GROQ_API_KEY in Vercel → Project → Settings → Environment Variables (free key: https://console.groq.com/keys), then redeploy.'
  };
}

/** Short form for endpoints that answer `{ error: string }`. */
function missingKeyError() {
  return 'GROQ_API_KEY is not set on the server. Add it in your hosting environment '
    + '(Vercel → Settings → Environment Variables) — get a free key at https://console.groq.com/keys';
}

/** Turn Groq's own error text into something the operator can act on. */
function modelHint(status, body) {
  if (!isRetiredModelError(status, body)) return '';
  return ` — the model "${model()}" is not available to this API key. Groq retired llama-3.3-70b-versatile `
    + `for free/developer keys on 2026-08-16 and the module falls back to ${FALLBACK_MODEL}; pin a model `
    + 'with GROQ_MODEL (for example GROQ_MODEL=' + FALLBACK_MODEL + ') or see '
    + 'https://console.groq.com/docs/deprecations.';
}

/** Groq errors arrive as { error: { message, type, code } } — keep the text. */
function errorText(status, raw) {
  const text = String(raw || '').slice(0, 400);
  try {
    const parsed = JSON.parse(text);
    const message = parsed && parsed.error && (parsed.error.message || parsed.error);
    if (typeof message === 'string' && message) return message.slice(0, 300);
  } catch { /* not JSON — use the raw body */ }
  return text;
}

/* ---------- JSON helpers ---------- */

/** The model may wrap JSON in ```json fences or add a sentence around it. */
function parseJson(raw) {
  const s = String(raw == null ? '' : raw).replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(s); } catch { /* fall through */ }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* fall through */ }
  }
  throw new Error('The AI did not return valid JSON — please try again.');
}

/* ---------- messages ---------- */
/* OpenAI format: the system prompt is the first message, then the
 * conversation. Adjacent same-role turns are merged so strict providers
 * (and the Harmony chat format behind GPT-OSS) never reject the request. */
function buildMessages(options) {
  const opts = options || {};
  const messages = [];
  const system = String(opts.system || '').trim();
  if (system) messages.push({ role: 'system', content: system });
  const push = (role, content) => {
    const text = String(content == null ? '' : content);
    if (!text.trim()) return;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += `\n${text}`;
    else messages.push({ role, content: text });
  };
  if (Array.isArray(opts.messages)) {
    for (const m of opts.messages) {
      const role = m && (m.role === 'assistant' || m.role === 'model') ? 'assistant' : 'user';
      push(role, m && (m.content != null ? m.content : m.text));
    }
  }
  if (opts.user != null) push('user', opts.user);
  return messages;
}

/* ---------- the one chat call ---------- */

/**
 * Send one chat completion to Groq and return the answer text.
 *
 * @param {object} options
 *   system      system prompt (the guardrail + task instruction)
 *   user        single user message, or
 *   messages    [{ role, content }] conversation history
 *   temperature sampling temperature (default 0.3)
 *   maxTokens   answer budget (default MAX_TOKENS = 4096)
 *   json        ask Groq for JSON object mode
 *   model       pin one model id (skips the fallback chain)
 * @returns {Promise<{text: string, model: string, finishReason: string, usage: object|null}>}
 */
async function chat(options) {
  const opts = options || {};
  const key = apiKey();
  if (!key) {
    const err = new Error(missingKeyError());
    err.status = 500;
    err.code = missingKey().code;
    throw err;
  }

  const messages = buildMessages(opts);
  if (!messages.length || !messages.some((m) => m.role !== 'system')) {
    throw new Error('aiClient.chat: a user message is required');
  }
  const temperature = Number.isFinite(Number(opts.temperature)) ? Number(opts.temperature) : DEFAULT_TEMPERATURE;
  const maxTokens = Number(opts.maxTokens) > 0 ? Math.floor(Number(opts.maxTokens)) : MAX_TOKENS;

  const chain = opts.model ? [String(opts.model)] : modelChain();
  let lastError = null;

  for (const id of chain) {
    const body = { model: id, messages, temperature, max_tokens: maxTokens };
    if (opts.json) body.response_format = { type: 'json_object' };
    if (isReasoningModel(id)) body.reasoning_effort = opts.reasoningEffort || REASONING_EFFORT;

    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const raw = typeof res.text === 'function' ? await res.text() : '';
      const err = new Error(`Groq API error (${res.status}): ${errorText(res.status, raw)}${modelHint(res.status, raw)}`);
      err.status = res.status;
      /* A model that Groq itself retired must not break the request: drop
         it from the chain and try the next (live) model immediately. */
      if (isRetiredModelError(res.status, raw) && chain.length > 1) {
        retiredModels.add(id);
        if (activeModel === id) activeModel = '';
        lastError = err;
        continue;
      }
      throw err;
    }

    const data = await res.json();
    const choice = (data && Array.isArray(data.choices) && data.choices[0]) || {};
    const text = String((choice.message && choice.message.content) || '').trim();
    const finishReason = String(choice.finish_reason || '');

    if (!text) {
      const block = data && data.error && data.error.message;
      throw new Error(`Groq returned no content (finish_reason: ${finishReason || 'unknown'})`
        + `${block ? `: ${block}` : ''} — please try again.`);
    }
    /* The answer was cut off at the token ceiling. Non-JSON callers can
       still use the partial text; JSON callers must not parse it. */
    if (finishReason === 'length') {
      if (opts.json) {
        throw new Error(`Groq stopped at the ${maxTokens}-token limit before the JSON was complete — `
          + 'please try again (or request a smaller section).');
      }
    }

    activeModel = id;
    return { text, model: id, finishReason, usage: (data && data.usage) || null };
  }

  throw lastError || new Error('Groq request failed');
}

/** Same as chat(), but the answer is parsed as JSON. */
async function chatJson(options) {
  const result = await chat(Object.assign({}, options, { json: true }));
  return { data: parseJson(result.text), model: result.model, finishReason: result.finishReason, usage: result.usage, text: result.text };
}

/* ---------- text-to-speech (OpenAI format) ---------- */

/**
 * One Orpheus speech request (≤ TTS_MAX_CHARS characters) — returns
 * `{ buffer, mime, ext }`. lib/edgeTts.js chunks and joins the results.
 */
async function speech(text, options) {
  const opts = options || {};
  const key = apiKey();
  if (!key) {
    const err = new Error('GROQ_API_KEY is not set — Groq TTS is unavailable.');
    err.status = 500;
    throw err;
  }
  const input = String(text == null ? '' : text).trim();
  if (!input) throw new Error('Nothing to synthesise');
  if (input.length > TTS_MAX_CHARS) {
    throw new Error(`Groq TTS accepts at most ${TTS_MAX_CHARS} characters per request (got ${input.length}).`);
  }
  const voice = String(opts.voice || env('GROQ_TTS_VOICE') || TTS_VOICE);

  const res = await fetch(SPEECH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts.model || TTS_MODEL,
      input,
      voice,
      response_format: opts.format || TTS_FORMAT
    })
  });
  if (!res.ok) {
    const raw = typeof res.text === 'function' ? await res.text() : '';
    const err = new Error(`Groq TTS error (${res.status}): ${errorText(res.status, raw)}`);
    err.status = res.status;
    throw err;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error('Groq TTS returned an empty recording');
  return { buffer, mime: 'audio/wav', ext: 'wav' };
}

module.exports = {
  /* provider */
  API_BASE,
  CHAT_ENDPOINT,
  SPEECH_ENDPOINT,
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  MAX_TOKENS,
  SECTION_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  /* tts */
  TTS_MODEL,
  TTS_VOICE,
  TTS_VOICES,
  TTS_MAX_CHARS,
  TTS_FORMAT,
  /* credentials + model wiring */
  apiKey,
  hasKey,
  model,
  modelChain,
  isRetiredModelError,
  isReasoningModel,
  /* errors */
  missingKey,
  missingKeyError,
  modelHint,
  /* helpers */
  buildMessages,
  parseJson,
  /* the calls */
  chat,
  chatJson,
  speech,
  /* test seam: forget the runtime model choice */
  _resetModelState() {
    activeModel = '';
    retiredModels.clear();
  }
};
