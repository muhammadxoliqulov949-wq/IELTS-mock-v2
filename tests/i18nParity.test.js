/* i18n parity smoke test: the three shipped languages (en, uz, ru) must carry
 * the SAME set of keys after all dictionary merges. A missing key silently
 * renders as the raw key name (t() falls back to the key), which shipped as
 * a real regression more than once (e.g. results_next_* / retake_test keys
 * added on one branch while another branch added its own keys). This pins
 * parity across both dictionary layers (dict + learningCopy).
 *
 * Loading the real i18n.js in a vm with a stub window/localStorage/document
 * exercises the merged runtime dictionary exactly as the browser sees it.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

const sandbox = {
  window: {},
  console,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  document: { documentElement: null, body: null }
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'i18n.js' });

const I18N = sandbox.window.IELTS_I18N;
check('i18n runtime exposes the dictionary API', !!(I18N && I18N.dict && I18N.t && I18N.t2));

const langs = Object.keys(I18N.dict).sort();
check('exactly three languages ship (en, ru, uz)', langs.join(',') === 'en,ru,uz');

const keySets = Object.fromEntries(langs.map((l) => [l, Object.keys(I18N.dict[l]).sort()]));
const enKeys = keySets.en;
check('english dictionary is non-trivial (' + enKeys.length + ' keys)', enKeys.length >= 500);

for (const lang of ['uz', 'ru']) {
  const missing = enKeys.filter((k) => !Object.prototype.hasOwnProperty.call(I18N.dict[lang], k));
  const extra = Object.keys(I18N.dict[lang]).filter((k) => !Object.prototype.hasOwnProperty.call(I18N.dict.en, k));
  check(lang + ' has no missing keys vs en' + (missing.length ? ' → MISSING: ' + missing.slice(0, 8).join(',') + (missing.length > 8 ? '…' : '') : ''),
    missing.length === 0);
  check(lang + ' has no orphan keys missing from en' + (extra.length ? ' → ORPHAN: ' + extra.slice(0, 8).join(',') + (extra.length > 8 ? '…' : '') : ''),
    extra.length === 0);
}

/* Every key resolves to a non-empty string in every language. */
const empty = [];
for (const lang of langs) {
  for (const k of Object.keys(I18N.dict[lang])) {
    const v = I18N.dict[lang][k];
    if (typeof v !== 'string' || v.trim() === '' || v.trim() === k) empty.push(lang + ':' + k);
  }
}
check('every key resolves to non-empty translated copy in all languages' + (empty.length ? ' → BAD: ' + empty.slice(0, 8).join(',') : ''),
  empty.length === 0);

/* {n}-style placeholders must survive translation consistently. */
const ph = [];
const phRe = /\{[a-zA-Z]+\}/g;
for (const lang of ['uz', 'ru']) {
  for (const k of enKeys) {
    const a = (I18N.dict.en[k].match(phRe) || []).sort().join('|');
    const b = ((I18N.dict[lang][k] || '').match(phRe) || []).sort().join('|');
    if (a !== b) ph.push(lang + ':' + k + ' (' + a + ' != ' + b + ')');
  }
}
check('placeholder sets match across languages' + (ph.length ? ' → MISMATCH: ' + ph.slice(0, 6).join('; ') : ''),
  ph.length === 0);

/* t() falls back to English for the currently tested copy, never to undefined. */
for (const k of ['nav_home', 'results_next_eyebrow', 'retake_test']) {
  check('t("' + k + '") resolves real copy', typeof I18N.t(k) === 'string' && I18N.t(k).length > 0 && I18N.t(k) !== k);
}

if (failed) {
  console.error('\n' + failed + ' FAILURE(S) — tests/i18nParity.test.js');
  process.exit(1);
}
console.log('\nALL CHECKS PASSED — tests/i18nParity.test.js');
