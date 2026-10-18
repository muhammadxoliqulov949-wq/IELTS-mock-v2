/* Shared tolerant JSON parser for AI model responses (Task 03.9).
 *
 * The model usually answers with a bare JSON document, but occasionally
 * wraps it in a ```json fence or a sentence of preamble. Semantics are
 * identical to the former per-handler helpers in api/grade.js and
 * api/generate-mock.js:
 *   1. strip code fences, trim, try a full parse (also accepts arrays);
 *   2. otherwise parse the outermost { … } span;
 *   3. if both fail, THROW — callers rely on an exception, not a fallback,
 *      to report a broken model response to the user.
 *
 * `message` lets each caller keep its historical, user-facing error text.
 * Do NOT use this for localStorage reads, SSE/stream chunk parsing or
 * silently-optional responses — those have different failure semantics.
 */
function parseJson(raw, message = 'Invalid JSON response') {
  const s = String(raw ?? '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(s); } catch { /* fall through */ }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* fall through */ }
  }
  throw new Error(message);
}
module.exports = { parseJson };
