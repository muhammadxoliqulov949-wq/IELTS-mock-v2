/* Navigation regression test.
 *
 * Verifies the focused nav structure:
 *  - exactly 3 primary links centred in the top bar (Mock Test, Results, AI Coach)
 *  - the remaining features live behind the hamburger menu, not the top bar
 *  - user chip (with sign-out button) renders when logged in
 *  - hamburger + menu always present; desktop menu hides the 3 primaries
 *  - footer is translated and carries the year + disclaimer
 *  - lesson modal can be opened/closed
 */
const fs = require('fs');
const path = require('path').join(__dirname, '..');

function makeEl() {
  return {
    textContent: '', innerHTML: '', value: '', disabled: false, className: '',
    style: {}, dataset: {}, onclick: null, onchange: null, oninput: null, onsubmit: null,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (f) this._s.add(c); else this._s.delete(c); } },
    addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView() {}, scrollTo() {}, focus: {},
    setAttribute() {}, getAttribute: () => null, closest: () => null
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
global.window = { addEventListener() {}, scrollY: 0, speechSynthesis: null };
global.confirm = () => true;

storage.set('ielts-v2-store', JSON.stringify({
  attempts: [{ section: 'listening', band: 6.5, raw: 25, total: 40, date: Date.now() }],
  mistakes: [], feedback: {}, coachMessages: [],
  user: { name: 'Aziz Karimov', email: 'aziz@example.com', picture: 'https://example.com/a"b.png' },
  selectedTest: 'test1', theme: 'dark', lang: 'uz', vocabKnown: {}, fullMock: null, quizzes: []
}));

const src = fs.readFileSync(path + '/script.js', 'utf8');
const fn = new Function('document', 'localStorage', 'location', 'window', 'confirm',
  src + '\n;globalThis.__render = render;'
  + ' globalThis.__lesson = (id) => { lessonModalId = id; };'
  + ' globalThis.__setLang = (l) => { store.lang = l; store.user = null; save(); };');
let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

try {
  eval(fs.readFileSync(path + '/data.js', 'utf8'));
  eval(fs.readFileSync(path + '/i18n.js', 'utf8'));
  eval(fs.readFileSync(path + '/content2.js', 'utf8'));
  eval(fs.readFileSync(path + '/services.js', 'utf8'));
  fn(global.document, global.localStorage, global.location, global.window, global.confirm);
  const render = globalThis.__render;

  global.location.hash = '#/';
  render();
  const html = document.querySelector('#app').innerHTML;

  const navLinksBlock = (html.match(/<div class="nav-links">([\s\S]*?)<\/div>\s*<div class="nav-actions">/) || [])[1] || '';
  check('nav: exactly 3 primary links in the top bar (Mock/Results/Coach)',
    (navLinksBlock.match(/<a /g) || []).length === 3
    && navLinksBlock.includes('#/mock') && navLinksBlock.includes('#/results') && navLinksBlock.includes('#/coach')
    && !navLinksBlock.includes('#/dashboard') && !navLinksBlock.includes('#/fullmock')
    && !navLinksBlock.includes('#/settings') && !navLinksBlock.includes('#/vocabulary'));
  check('nav: no "More" dropdown in the top bar', !html.includes('id="moreMenu"') && !html.includes('nav-more-btn'));
  check('nav: hamburger present with remaining features in menu', html.includes('id="hamburgerBtn"')
    && html.includes('id="mobileMenu"') && html.includes('mm-rest')
    && /mm-rest[\s\S]*#\/settings/.test(html) && /mm-rest[\s\S]*#\/vocabulary/.test(html) && /mm-rest[\s\S]*#\/quiz/.test(html)
    && /mm-rest[\s\S]*#\/dashboard/.test(html) && /mm-rest[\s\S]*#\/mistakes/.test(html) && /mm-rest[\s\S]*#\/lessons/.test(html));
  check('nav: user chip with dropdown sign-out (no confirm dialog)', html.includes('id="userChip"')
    && html.includes('user-menu') && html.includes('Aziz') && !html.includes('confirm('));
  check('nav: user picture escaped (XSS-safe)', !html.includes('src="https://example.com/a"b.png"'));
  check('nav: theme + language toggles in header', html.includes('data-toggle-theme') && html.includes('data-toggle-lang'));
  check('footer: translated + year + disclaimer', html.includes('Bandly AI tomonidan')
    && html.includes(String(new Date().getFullYear())) && html.includes('IELTS, British Council, IDP'));
  check('home: hero copy is localized (uz)', !html.includes('Know your level')
    && html.includes('Darajangizni biling') && html.includes('hero-stats'));
  check('home: band ring renders with attempts', html.includes('ring-arc') && html.includes('skill-rows'));
  check('home: sections use reveal class', html.includes('class="section reveal"'));

  /* lesson modal open/close */
  global.location.hash = '#/lessons';
  render();
  const lessonId = (window.IELTS_CONTENT.lessons || [])[0].id;
  globalThis.__lesson(lessonId);
  render();
  check('lesson modal: opens with content', document.querySelector('#app').innerHTML.includes('modal-backdrop')
    && document.querySelector('#app').innerHTML.includes('lessonModalTitle'));
  globalThis.__lesson(null);
  render();
  check('lesson modal: closes', !document.querySelector('#app').innerHTML.includes('modal-backdrop'));

  /* english variant + logged-out CTA still correct */
  globalThis.__setLang('en');
  global.location.hash = '#/mock';
  render();
  const en = document.querySelector('#app').innerHTML;
  check('en: sign-in CTA shown when logged out', en.includes('nav-login') && en.includes('Sign in'));
  check('mock hub: unified page with guided steps + combined result', en.includes('mock-flow')
    && en.includes('mock-step') && !en.includes('nav_fullmock'));

  console.log(failed === 0 ? 'NAV TESTS OK ✓' : `NAV TESTS FAILED: ${failed}`);
} catch (e) {
  console.log('NAV TEST CRASH:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'))
  ;process.exit(1);
}
process.exit(failed === 0 ? 0 : 1);
