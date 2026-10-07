/* Single source of truth for every Gemini model id the server talks to.
 *
 * Why this file exists: the text model used to be hardcoded as the literal
 * `gemini-2.5-flash` in api/grade.js, api/coach.js, api/quiz.js and
 * api/generate-mock.js, and the TTS model in lib/edgeTts.js. Google rotated
 * access to that model ("models/gemini-2.5-flash is no longer available to
 * new users") and every endpoint started answering 404 at once. Keeping the
 * ids in one place means the next rotation is a one-line change here (or a
 * GEMINI_MODEL environment variable), never a four-file hunt.
 *
 * Overrides (handy when a hosted key is pinned to a different model):
 *   GEMINI_MODEL=gemini-3.8-flash
 *   GEMINI_TTS_MODELS=gemini-3.8-flash-tts,gemini-3.8-flash-lite-tts
 *
 * Both are read lazily on every request, so changing them never needs a code
 * edit — and a stale model id can be swapped without a redeploy of the code.
 */
'use strict';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/* Current Gemini Flash text model (GA). See:
 * https://ai.google.dev/gemini-api/docs/deprecations — `gemini-2.5-flash`
 * is access-restricted for new keys and `gemini-2.0-flash` was shut down on
 * 1 June 2026, so neither is a safe default any more. */
const DEFAULT_MODEL = 'gemini-3.8-flash';

/* TTS models tried in order by lib/edgeTts.js. Gemini 3.8 TTS replaces the
 * retired `gemini-2.5-*-preview-tts` pair. */
const DEFAULT_TTS_MODELS = [
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts'
];

function envString(name) {
  return String((process.env && process.env[name]) || '').trim();
}

/* The text model every endpoint should use right now. */
function model() {
  return envString('GEMINI_MODEL') || DEFAULT_MODEL;
}

/* TTS models (parsed from a comma-separated override when present). */
function ttsModels() {
  const raw = envString('GEMINI_TTS_MODELS');
  if (!raw) return DEFAULT_TTS_MODELS.slice();
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_TTS_MODELS.slice();
}

/* https://…/v1beta/models/<id>:generateContent */
function endpoint(id) {
  return `${API_BASE}/${id || model()}:generateContent`;
}

/* The same URL with ?key=… for the REST API. The key is URL-encoded so an
 * unusual key can never truncate the query string. */
function url(key, id) {
  const base = endpoint(id);
  return key ? `${base}?key=${encodeURIComponent(key)}` : base;
}

/* Google answers 404 when a model id no longer exists or is no longer served
 * to this key. The hosted endpoints surface that verbatim, which is exactly
 * the message that started this migration, so make it actionable. */
function modelNotFoundHint(status, body) {
  if (Number(status) !== 404) return '';
  const text = String(body || '');
  if (!/not found|no longer available|is not supported|does not exist|is not found for API version/i.test(text)) return '';
  return ` — the model id "${model()}" is not available to this API key. `
    + 'Set GEMINI_MODEL (for example GEMINI_MODEL=gemini-3.8-flash) in your hosting '
    + 'environment, or update lib/geminiModel.js. Current models: '
    + 'https://ai.google.dev/gemini-api/docs/models';
}

module.exports = {
  API_BASE,
  DEFAULT_MODEL,
  DEFAULT_TTS_MODELS,
  model,
  ttsModels,
  endpoint,
  url,
  modelNotFoundHint
};
