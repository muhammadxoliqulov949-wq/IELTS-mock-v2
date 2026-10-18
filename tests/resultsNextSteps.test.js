/* Results page — next-step widget tests (Task 03.7).
 *
 * Verifies the compact "what to fix next" panel that renders BELOW the
 * results grid:
 *  - guest state: weakest-skill advice, NO sign-in-gated drills CTA,
 *    coach + saved-mistakes links, widget never blocks/reorders the grid
 *  - signed-in state: adaptive drills is the primary action, roadmap
 *    (progress-preserving) is offered as a secondary link
 *  - fallback: un-scored attempts → generic copy, no guessed weakness
 *  - no attempts → no widget (the existing empty state owns that case)
 *  - EN/UZ/RU translations resolve, no raw placeholders leak
 *  - responsive CSS hooks exist; existing result grid is untouched
 */
const fs = require('fs');
const path = require('path').join(__dirname, '..');

function makeEl() {
  return {
    textContent: '', innerHTML: '', value: '', disabled: false, className: '',
    style: {}, dataset: {}, onclick: null, onchange: null, oninput: null, onsubmit: null,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (f) this._s.add(c); else this._s.delete(c); } },
    addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView() {}, scrollTo() {}, focus() { this.focused = true; }, attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); }, getAttribute(name) { return this.attributes[name] ?? null; }, closest: () => null
  };
}

const els = new Map();
global.document = {
  querySelector: (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); },
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener() {}
};
global.location = { hash: '#/' };
const storage = new Map();
global.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k)
};
global.window = { IELTS_CLOUD: { getState: () => ({ status: 'ready', user: { id: 'next-user' } }), ready: new Promise(() => {}) }, addEventListener() {}, scrollY: 0, speechSynthesis: null };
global.confirm = () => true;

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

const ATTEMPTS = [
  { section: 'listening', band: 6.5, raw: 25, total: 40, date: Date.now() - 3000 },
  { section: 'reading', band: 5.0, raw: 20, total: 40, date: Date.now() - 2000 },
  { section: 'writing', band: 6.0, raw: undefined, total: undefined, date: Date.now() - 1000 }
];
const MISTAKES = [
  { section: 'listening', prompt: 'Q1', given: 'a', correct: 'b', date: Date.now() },
  { section: 'reading', prompt: 'Q2', given: 'c', correct: 'd', date: Date.now() }
];
function seedStore(overrides = {}) {
  const base = {
    attempts: ATTEMPTS, mistakes: MISTAKES, feedback: {}, coachMessages: [],
    user: null, selectedTest: 'test1', theme: 'dark', lang: 'en', vocabKnown: {}, fullMock: null, quizzes: [],
    ...overrides
  };
  storage.set('ielts-v2-store', JSON.stringify(base));
  storage.set('ielts-v2-store:supabase:next-user', storage.get('ielts-v2-store'));
}
seedStore();

const src = fs.readFileSync(path + '/script.js', 'utf8');
const fn = new Function('document', 'localStorage', 'location', 'window', 'confirm',
  src + '\n;globalThis.__render = render; globalThis.__signIn = signIn; globalThis.__signOut = signOut;'
  + ' globalThis.__setLang = (l) => { store.lang = l; save(); }; globalThis.__replaceAttempts = (a, m) => { store.attempts = a; store.mistakes = m; save(); };');

try {
  eval(fs.readFileSync(path + '/data.js', 'utf8'));
  eval(fs.readFileSync(path + '/i18n.js', 'utf8'));
  eval(fs.readFileSync(path + '/content2.js', 'utf8'));
  eval(fs.readFileSync(path + '/services.js', 'utf8'));
  fn(global.document, global.localStorage, global.location, global.window, global.confirm);
  const render = globalThis.__render;
  const appHtml = () => document.querySelector('#app').innerHTML;
  const widgetHtml = (html) => {
    const i = html.indexOf('results-next-step');
    if (i < 0) return '';
    return html.slice(i, html.indexOf('</section>', i));
  };

  /* ---------- 1) guest state ---------- */
  global.location.hash = '#/results';
  render();
  const guest = appHtml();
  const widget = widgetHtml(guest);
  check('guest: widget renders below the results grid with semantic landmark + heading',
    widget !== ''
    && guest.indexOf('result-grid') > -1
    && guest.indexOf('result-grid') < guest.indexOf('results-next-step')
    && widget.includes('aria-labelledby="results-next-title"')
    && widget.includes('<h2 id="results-next-title">What to fix next</h2>'));
  check('guest: weakest scored skill (reading, 5.0) drives the advice — no guessing',
    widget.includes('Reading is your lowest band'));
  check('guest: sign-in-gated drills are NOT offered to guests', !widget.includes('#/drills'));
  check('guest: primary action is the public roadmap, secondary are coach + saved mistakes (≤2 secondary)',
    /\bbtn btn-primary" href="#\/roadmap"/.test(widget)
    && widget.includes('href="#/coach"')
    && widget.includes('Review 2 saved mistakes')
    && (widget.match(/<a /g) || []).length === 3);
  check('guest: no raw i18n placeholders leak into the UI', !widget.includes('{skill}') && !widget.includes('{n}'));
  check('guest: existing result grid is untouched (3 cards, detail buttons kept)',
    (guest.match(/class="test-card result-card"/g) || []).length === 3
    && (guest.match(/data-detail="/g) || []).length === 3
    && guest.includes('results_eyebrow') === false); // resolved to translated copy

  /* ---------- 2) signed-in state ---------- */
  globalThis.__signIn({ id: 'next-user', auth: 'supabase', name: 'Aziz Karimov', email: 'aziz@example.com', picture: '' });
  render();
  const signed = widgetHtml(appHtml());
  check('signed-in: adaptive drills become the primary action for the weakest skill',
    /\bbtn btn-primary" href="#\/drills"/.test(signed) && signed.includes('Adaptive Reading drills'));
  check('signed-in: coach + progress-preserving roadmap are the two secondary links',
    signed.includes('href="#/coach"') && /\bbtn btn-ghost" href="#\/roadmap"/.test(signed)
    && (signed.match(/<a /g) || []).length === 3);

  /* ---------- 3) fallback: nothing scored yet ---------- */
  globalThis.__replaceAttempts([{ section: 'writing', band: null, date: Date.now() }], []);
  render();
  const fallback = widgetHtml(appHtml());
  check('fallback: un-scored attempts get generic copy (no invented weakness)',
    fallback.includes('Nothing scored yet') && !fallback.match(/(Listening|Reading|Writing|Speaking) is your lowest band/));
  check('fallback: primary is still the safe roadmap link; drills/mistakes not offered, coach stays available',
    /\bbtn btn-primary" href="#\/roadmap"/.test(fallback)
    && !fallback.includes('#/drills') && !fallback.includes('#/mistakes')
    && fallback.includes('href="#/coach"'));

  /* ---------- 4) no attempts → no widget (empty state owns it) ---------- */
  globalThis.__replaceAttempts([], []);
  render();
  const empty = appHtml();
  check('zero attempts: existing empty state renders and the widget stays out of the way',
    empty.includes('empty-state') && !empty.includes('results-next-step'));

  /* ---------- 5) i18n: UZ + RU resolve fully (guest actions again) ---------- */
  globalThis.__signOut();
  globalThis.__replaceAttempts(ATTEMPTS, MISTAKES);
  globalThis.__setLang('uz');
  render();
  const uz = widgetHtml(appHtml());
  check('uz: fully translated copy (eyebrow/title/weakest line/buttons)',
    uz.includes('Keyingi qadam') && uz.includes('Keyin nimani tuzatish kerak')
    && uz.includes('O‘qish') && uz.includes('O‘quv rejamni ochish')
    && uz.includes('2 ta saqlangan xatoni') && !uz.includes('{skill}'));
  check('uz: guest-visible actions only (no drills)', !uz.includes('#/drills') && uz.includes('href="#/roadmap"'));
  globalThis.__setLang('ru');
  render();
  const ru = widgetHtml(appHtml());
  check('ru: fully translated copy (eyebrow/title/weakest line/buttons)',
    ru.includes('Следующий шаг') && ru.includes('Что исправить дальше')
    && ru.includes('Чтение') && ru.includes('Открыть мой учебный план')
    && ru.includes('сохранённые ошибки (2)') && !ru.includes('{skill}'));

  /* ---------- 6) static: responsive CSS hooks ---------- */
  const css = fs.readFileSync(path + '/styles.css', 'utf8');
  check('css: widget has responsive layout hooks (fullscreen actions on small screens)',
    css.includes('.results-next-step') && css.includes('.next-step-actions')
    && /@media \(max-width: 700px\) \{[\s\S]*?\.next-step-actions/.test(css));

  /* ---------- 7) static: every new key exists in all 3 dictionaries ---------- */
  const i18nSrc = fs.readFileSync(path + '/i18n.js', 'utf8');
  const newKeys = ['results_next_eyebrow', 'results_next_title', 'results_next_lead_skill',
    'results_next_lead_generic', 'results_next_practice', 'results_next_roadmap', 'results_next_mistakes'];
  check('i18n: all 7 new keys exist exactly once per language (en/uz/ru)',
    newKeys.every(k => (i18nSrc.match(new RegExp('\\b' + k + ":", 'g')) || []).length === 3));

} catch (err) {
  console.error('FATAL', err && err.stack || err);
  failed++;
}

console.log(failed ? '\nRESULT: FAIL (' + failed + ')' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
