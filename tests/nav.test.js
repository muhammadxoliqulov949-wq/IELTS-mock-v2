/* Navigation regression test.
 *
 * Verifies the focused nav structure:
 *  - exactly 4 primary links centred in the top bar (Mock Test, Roadmap, Results, AI Coach)
 *  - the remaining features live behind the hamburger menu, not the top bar
 *  - user chip (with sign-out button) renders when logged in
 *  - hamburger + menu always present; desktop menu hides the 4 primaries
 *  - phone dock destinations, translations, focus behavior and exam layout
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
global.window = { IELTS_CLOUD: { getState: () => ({ status: 'ready', user: { id: 'nav-user' } }), ready: new Promise(() => {}) }, addEventListener() {}, scrollY: 0, speechSynthesis: null };
global.confirm = () => true;

storage.set('ielts-v2-store', JSON.stringify({
  attempts: [{ section: 'listening', band: 6.5, raw: 25, total: 40, date: Date.now() }],
  mistakes: [], feedback: {}, coachMessages: [],
  user: { name: 'Aziz Karimov', email: 'aziz@example.com', picture: 'https://example.com/a"b.png' },
  selectedTest: 'test1', theme: 'dark', lang: 'uz', vocabKnown: {}, fullMock: null, quizzes: []
}));

storage.set('ielts-v2-store:supabase:nav-user', storage.get('ielts-v2-store'));

const src = fs.readFileSync(path + '/script.js', 'utf8');
const fn = new Function('document', 'localStorage', 'location', 'window', 'confirm',
  src + `\n;signIn({ id: 'nav-user', auth: 'supabase', name: 'Aziz Karimov', email: 'aziz@example.com', picture: 'https://example.com/a\"b.png' }); globalThis.__render = render;`
  + ' globalThis.__lesson = (id) => { lessonModalId = id; };'
  + ' globalThis.__setLang = (l) => { signOut(); store.lang = l; save(); };');
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
  check('nav: exactly 4 primary links in the top bar (Mock/Roadmap/Results/Coach)',
    (navLinksBlock.match(/<a /g) || []).length === 4
    && navLinksBlock.includes('#/mock') && navLinksBlock.includes('#/roadmap') && navLinksBlock.includes('#/results') && navLinksBlock.includes('#/coach')
    && !navLinksBlock.includes('#/dashboard') && !navLinksBlock.includes('#/fullmock')
    && !navLinksBlock.includes('#/settings') && !navLinksBlock.includes('#/vocabulary'));
  check('nav: no "More" dropdown in the top bar', !html.includes('id="moreMenu"') && !html.includes('nav-more-btn'));
  check('nav: hamburger present with remaining features in menu', html.includes('id="hamburgerBtn"')
    && html.includes('id="mobileMenu"') && html.includes('mm-rest')
    && /mm-primaries[\s\S]*#\/roadmap/.test(html)
    && /mm-rest[\s\S]*#\/settings/.test(html) && /mm-rest[\s\S]*#\/vocabulary/.test(html) && /mm-rest[\s\S]*#\/quiz/.test(html)
    && /mm-rest[\s\S]*#\/dashboard/.test(html) && /mm-rest[\s\S]*#\/mistakes/.test(html) && /mm-rest[\s\S]*#\/lessons/.test(html)
    && /mm-rest[\s\S]*#\/leaderboard/.test(html));
  check('nav: user chip with dropdown sign-out (no confirm dialog)', html.includes('id="userChip"')
    && html.includes('user-menu') && html.includes('Aziz') && !html.includes('confirm('));
  check('nav: user picture escaped (XSS-safe)', !html.includes('src="https://example.com/a"b.png"'));
  check('nav: signed-in profile shows the coin wallet', html.includes('data-coin-wallet') && html.includes('🪙'));
  check('nav: Roadmap and Leaderboard links are available from the user menu', html.includes('#/roadmap') && html.includes('#/leaderboard'));
  check('nav: theme + language toggles in header', html.includes('data-toggle-theme') && html.includes('data-toggle-lang'));
  const phoneNavStart = html.indexOf('<nav class="phone-tabbar"');
  const phoneNavEnd = phoneNavStart < 0 ? -1 : html.indexOf('</nav>', phoneNavStart);
  const phoneTabbar = phoneNavStart < 0 || phoneNavEnd < 0 ? '' : html.slice(phoneNavStart, phoneNavEnd + 6);
  check('phone nav: four high-frequency destinations and an accessible More control',
    (phoneTabbar.match(/<a /g) || []).length === 4
    && phoneTabbar.includes('href="#/mock"') && phoneTabbar.includes('href="#/roadmap"')
    && phoneTabbar.includes('href="#/drills"') && phoneTabbar.includes('href="#/dashboard"')
    && phoneTabbar.includes('id="phoneMenuBtn"') && phoneTabbar.includes('aria-controls="mobileMenu"')
    && phoneTabbar.includes('Tezkor navigatsiya') && phoneTabbar.includes('Mashq'));
  const phoneCss = fs.readFileSync(path + '/styles.css', 'utf8');
  check('phone nav: fluid five-column dock has safe-area padding and touch-sized controls',
    phoneCss.includes('grid-template-columns: repeat(5, minmax(0, 1fr))')
    && phoneCss.includes('min-height: 50px') && phoneCss.includes('env(safe-area-inset-bottom)'));
  const phoneMore = document.querySelector('#phoneMenuBtn');
  const mobileMenu = document.querySelector('#mobileMenu');
  phoneMore.onclick();
  check('phone nav: More opens the menu, updates its expanded state, and moves focus inside',
    mobileMenu.classList.contains('open') && phoneMore.getAttribute('aria-expanded') === 'true'
    && document.querySelector('#closeMenuBtn').focused === true);
  document.querySelector('#closeMenuBtn').onclick();
  check('phone nav: close returns focus and resets the expanded state',
    !mobileMenu.classList.contains('open') && phoneMore.getAttribute('aria-expanded') === 'false' && phoneMore.focused === true);
  global.location.hash = '#/reading';
  render();
  const examHtml = document.querySelector('#app').innerHTML;
  check('phone nav: timed exams keep the compact header menu but omit persistent tabs',
    !examHtml.includes('class="phone-tabbar"') && examHtml.includes('site-header--exam') && examHtml.includes('id="hamburgerBtn"'));
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
  check('en: phone navigation labels are translated', en.includes('Quick navigation') && en.includes('Drills') && en.includes('Progress'));
  globalThis.__setLang('ru');
  render();
  const ru = document.querySelector('#app').innerHTML;
  check('ru: phone navigation labels are translated', ru.includes('Быстрая навигация') && ru.includes('Трен.') && ru.includes('Стат.'));

  console.log(failed === 0 ? 'NAV TESTS OK ✓' : `NAV TESTS FAILED: ${failed}`);
} catch (e) {
  console.log('NAV TEST CRASH:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'))
  ;process.exit(1);
}
process.exit(failed === 0 ? 0 : 1);
