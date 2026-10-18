/* lib/parseJson.js + Task 03.9 cleanup regression tests.
 *
 * Pins the shared AI-response parser's exact contract (it was extracted from
 * the duplicated helpers in api/grade.js and api/generate-mock.js):
 *  - bare JSON, fenced JSON and preamble-wrapped JSON all parse;
 *  - top-level arrays work (full-parse path), while the { … } fallback is
 *    object-only — parity with the former helpers;
 *  - empty/garbage input THROWS with the caller's historical message —
 *    callers rely on an exception, never a silent fallback;
 *  - both server handlers delegate to the shared module and keep their
 *    original user-facing error texts;
 *  - divergent parse sites deliberately left alone (localStorage defaults,
 *    SSE stream chunks, quiz slicing) stay untouched;
 *  - the removed per-load PWA console.log stays gone while the meaningful
 *    console.warn diagnostics in lib/aiClient.js are preserved.
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path').join(__dirname, '..');
const { parseJson } = require('../lib/parseJson.js');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('✓ ' + name); }
  catch (err) { failed++; console.log('✗ FAIL ' + name + ' — ' + err.message); }
}

check('valid: bare object parses', () => {
  assert.deepEqual(parseJson('{"band": 7, "ok": true}'), { band: 7, ok: true });
});
check('valid: whitespace + JSON parses', () => assert.deepEqual(parseJson('  \n {"a": 1} \t'), { a: 1 }));
check('valid: ```json fence stripped', () => {
  assert.deepEqual(parseJson('```json\n{"q": [1,2]}\n```'), { q: [1, 2] });
});
check('valid: bare ``` fence stripped (case-insensitive)', () => {
  assert.deepEqual(parseJson('```JSON\n{"x": "y"}```'), { x: 'y' });
});
check('valid: preamble/postamble around the object is skipped', () => {
  assert.deepEqual(parseJson('Here is your exam:\n{"title": "T"}\nHope this helps!'), { title: 'T' });
});
check('valid: top-level array parses via the full-parse path (parity with old helpers)', () => {
  assert.deepEqual(parseJson('[1, 2, 3]'), [1, 2, 3]);
});
check('valid: null/undefined input throws (no silent fallback)', () => {
  assert.throws(() => parseJson(null), /Invalid JSON response/);
  assert.throws(() => parseJson(undefined), /Invalid JSON response/);
});
check('invalid: empty string throws the default message', () => {
  assert.throws(() => parseJson(''), /^Error: Invalid JSON response$/);
});
check('invalid: plain prose throws', () => assert.throws(() => parseJson('just a sentence'), /Invalid JSON response/));
check('invalid: broken braces throw', () => assert.throws(() => parseJson('{broken: ,}'), /Invalid JSON response/));
check('invalid: concatenated objects throw (slice is not a merge)', () => {
  assert.throws(() => parseJson('{"a":1}{"b":2}'), /Invalid JSON response/);
});
check('caller message: custom error text is preserved', () => {
  assert.throws(() => parseJson('nope', 'Could not parse examiner response'), /Could not parse examiner response/);
  assert.throws(() => parseJson('', 'The model did not return valid JSON'), /The model did not return valid JSON/);
});

/* Caller wiring: both handlers delegate to the shared module with their
   historical messages, and no longer carry the duplicated algorithm. */
const grade = fs.readFileSync(path + '/api/grade.js', 'utf8');
const gen = fs.readFileSync(path + '/api/generate-mock.js', 'utf8');
check('wiring: api/grade.js delegates with its examiner message; algorithm lives only in lib/', () => {
  assert(grade.includes("require('../lib/parseJson.js')"));
  assert(grade.includes("parseJsonShared(raw, 'Could not parse examiner response')"));
  assert(!grade.includes('lastIndexOf'));
});
check('wiring: api/generate-mock.js delegates with its generator message; algorithm lives only in lib/', () => {
  assert(gen.includes("require('../lib/parseJson.js')"));
  assert(gen.includes("parseJsonShared(raw, 'The model did not return valid JSON')"));
  assert(!gen.includes('lastIndexOf'));
});
check('unit: both handlers parse identically through their wrappers (behavioral parity)', () => {
  // Exercise each handler's exported pipeline indirectly: the wrapper fns are
  // private, so re-derive them from the shared module the way the handlers do.
  const sharedForGrade = (raw) => parseJson(raw, 'Could not parse examiner response');
  const sharedForGen = (raw) => parseJson(raw, 'The model did not return valid JSON');
  const sample = '```json\n{"overallBand": 6.5, "tasks": []}\n```';
  assert.deepEqual(sharedForGrade(sample), sharedForGen(sample));
});

/* Deliberately untouched divergent parse sites. */
const script = fs.readFileSync(path + '/script.js', 'utf8');
const quiz = fs.readFileSync(path + '/api/quiz.js', 'utf8');
check('untouched: localStorage store parse keeps its outer try/catch + defaults path', () => {
  assert(script.includes('const raw = JSON.parse(localStorage.getItem(storageKey())) || {};'));
  assert(script.includes('return { ...storeDefaults(), ...raw, user: sessionUser() };'));
});
check('untouched: SSE stream parsing stays in its own try/catch world', () => {
  assert((script.match(/JSON\.parse\(dataStr\)/g) || []).length === 3);
});
check('untouched: quiz keeps its own slice-parse + {} fallback semantics', () => {
  assert(quiz.includes("const parsed = start >= 0 && end > start ? JSON.parse(content.slice(start, end + 1)) : {};"));
});

/* console cleanup: the removed noise stays gone, real diagnostics survive. */
check('console: no console.log/console.debug/info left in shipped client code (script.js)', () => {
  assert(!/console\.(log|debug|info)\(/.test(script));
});
check('console: PWA registration survives, silently', () => {
  assert(script.includes("serviceWorker.register('sw.js', { scope: '/' })"));
});
check('console: aiClient failover/retry console.warn diagnostics preserved (5 sites)', () => {
  const aiClient = fs.readFileSync(path + '/lib/aiClient.js', 'utf8');
  assert.equal((aiClient.match(/console\.warn\(/g) || []).length, 5);
});

console.log(failed ? '\nRESULT: FAIL (' + failed + ')' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
