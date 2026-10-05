/* Mascot regression test.
 *
 * Bandly is the brand and the face of the AI, so he is part of the product
 * surface — not decoration. This suite locks in that he is present and
 * consistent everywhere he is supposed to be:
 *
 *  - the logo tile in the header, the mobile menu and the footer
 *  - the hero greeting on the home page
 *  - every AI reply in the coach chat
 *  - the empty states that would otherwise be dead ends
 *  - the sign-in card
 *  - a floating companion with a tip that changes per page
 *  - a settings switch so he can be turned off
 *
 * It also verifies the asset files referenced by the app really exist, and
 * that every mascot string is translated into all three languages.
 */
const fs = require('fs');
const pathRoot = require('path').join(__dirname, '..');

function makeEl() {
  return {
    textContent: '', innerHTML: '', value: '', disabled: false, className: '',
    style: {}, dataset: {}, onclick: null, onchange: null, oninput: null, onsubmit: null,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (f) this._s.add(c); else this._s.delete(c); }
    },
    addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView() {}, scrollTo() {}, focus() {},
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
global.window = {
  IELTS_CLOUD: { getState: () => ({ status: 'ready', user: null }), ready: new Promise(() => {}) },
  addEventListener() {}, scrollY: 0, speechSynthesis: null
};
global.confirm = () => true;

storage.set('ielts-v2-store', JSON.stringify({
  attempts: [], mistakes: [], feedback: {}, coachMessages: [],
  selectedTest: 'test1', theme: 'dark', lang: 'en',
  vocabKnown: {}, fullMock: null, quizzes: [], mascotMuted: false, mascotSeen: {}
}));

const src = fs.readFileSync(pathRoot + '/script.js', 'utf8');
const fn = new Function('document', 'localStorage', 'location', 'window', 'confirm',
  src + '\n;globalThis.__render = render;'
  + ' globalThis.__store = () => store;'
  + ' globalThis.__save = () => save();'
  + ' globalThis.__warn = (s, m) => warningModal(s, m);'
  + ' globalThis.__completed = (s, a) => completedView(s, a);');

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}
const read = (p) => fs.readFileSync(pathRoot + p, 'utf8');

try {
  eval(read('/data.js'));
  eval(read('/i18n.js'));
  eval(read('/content2.js'));
  eval(read('/content3.js'));
  eval(read('/content4.js'));
  eval(read('/services.js'));
  fn(global.document, global.localStorage, global.location, global.window, global.confirm);
  const render = globalThis.__render;
  const html = () => document.querySelector('#app').innerHTML;

  /* ---------- 1. the assets the app points at really exist ---------- */
  ['/assets/mascot.png', '/assets/mascot.webp', '/assets/mascot-head.png', '/assets/mascot-head.webp',
    '/assets/favicon.png', '/assets/og-mascot.jpg',
    '/icons/mascot-192.png', '/icons/mascot-512.png', '/icons/mascot-180.png'
  ].forEach(p => check('asset exists: ' + p, fs.existsSync(pathRoot + p)));
  /* the mascot is on every page — keep the two heaviest assets small */
  [['/assets/mascot.png', 120], ['/assets/mascot.webp', 120], ['/assets/mascot-head.png', 40]].forEach(([p, maxKb]) => {
    const kb = fs.statSync(pathRoot + p).size / 1024;
    check('asset is light enough: ' + p + ' (' + Math.round(kb) + ' KB < ' + maxKb + ' KB)', kb < maxKb);
  });

  const htmlSrc = read('/index.html');
  check('index.html: favicon is the mascot', htmlSrc.includes('href="assets/favicon.png"'));
  check('index.html: apple-touch-icon is the mascot', htmlSrc.includes('href="icons/mascot-180.png"'));
  check('index.html: og:image + twitter:image are the mascot',
    htmlSrc.includes('assets/og-mascot.jpg') && htmlSrc.includes('twitter:image'));
  check('index.html: preloads the two mascot images as WebP',
    htmlSrc.includes('rel="preload" as="image" href="assets/mascot-head.webp"')
    && htmlSrc.includes('rel="preload" as="image" href="assets/mascot.webp"'));
  const manifest = JSON.parse(read('/manifest.webmanifest'));
  check('manifest: mascot PNG is the app icon',
    manifest.icons.some(i => i.src === '/icons/mascot-192.png') &&
    manifest.icons.some(i => i.src === '/icons/mascot-512.png'));
  check('service worker precaches the mascot (png + webp)',
    read('/sw.js').includes("'/assets/mascot.png'") && read('/sw.js').includes("'/assets/mascot.webp'")
    && read('/sw.js').includes("'/icons/mascot-192.png'"));
  check('build copies the assets folder', read('/scripts/build.js').includes("'assets'"));
  check('preview server serves /assets/', /icons\|assets/.test(read('/server.js')));

  /* ---------- 2. the logo tile, on every page ---------- */
  const routes = ['/', '/mock', '/results', '/mistakes', '/coach', '/dashboard',
    '/lessons', '/vocabulary', '/quiz', '/settings', '/login', '/signup'];
  let logoOk = true, dockOk = true, tipOk = true;
  routes.forEach(r => {
    global.location.hash = '#' + r;
    render();
    const h = html();
    if (!h.includes('brand-mark--mascot') || !h.includes('assets/mascot-head.png')
      || !h.includes('assets/mascot-head.webp')) logoOk = false;
    if (!h.includes('mascot-dock') || !h.includes('mascot-fab')) dockOk = false;
    if (!h.includes('mascot-tip')) tipOk = false;
  });
  check('logo: mascot tile renders on all ' + routes.length + ' routes', logoOk);
  check('companion: floating dock + button render on every route', dockOk);
  check('companion: a tip bubble renders on every route', tipOk);

  /* the brand tile also appears in the mobile menu and the footer */
  global.location.hash = '#/';
  render();
  check('logo: mascot in the mobile menu brand', /mm-brand[\s\S]*?brand-mark--mascot/.test(html()));
  check('logo: mascot in the footer brand', /footer-brand[\s\S]*?brand-mark--mascot/.test(html()));
  check('logo: the old letter "B" tile is gone', !/brand-mark">B</.test(html()));

  /* ---------- 3. the hero greeting ---------- */
  check('hero: full-body mascot + greeting bubble',
    html().includes('mascot--hero') && html().includes('assets/mascot.png')
    && html().includes('hero-guide-bubble') && html().includes('<strong>Bandly</strong>'));
  check('hero: served as WebP with a PNG fallback',
    /<picture><source srcset="assets\/mascot\.webp" type="image\/webp"><img class="mascot mascot--full mascot--hero" src="assets\/mascot\.png"/.test(html()));
  check('hero: the above-the-fold mascot is not lazy-loaded',
    /mascot--hero[^>]*fetchpriority="high"/.test(html()) && !/mascot--hero[^>]*loading="lazy"/.test(html()));

  /* ---------- 4. the tip is contextual, not a static line ---------- */
  const tips = {};
  ['/', '/mock', '/listening', '/reading', '/writing', '/speaking', '/coach', '/results'].forEach(r => {
    global.location.hash = '#' + r;
    render();
    const m = html().match(/<div class="mascot-tip"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/);
    tips[r] = m ? m[1].trim() : '';
  });
  const tipValues = Object.values(tips).filter(Boolean);
  check('companion: every page has a tip', tipValues.length === 8);
  check('companion: tips are contextual (all different)', new Set(tipValues).size === tipValues.length);
  check('companion: listening tip is about the recording', /recording/i.test(tips['/listening']));
  check('companion: coach tip is about the coach', /band|session|plan/i.test(tips['/coach']));

  /* ---------- 5. dismissing a tip sticks; muting hides the whole dock ---------- */
  global.location.hash = '#/coach';
  render();
  const tipKey = (html().match(/data-mascot-dismiss="([^"]+)"/) || [])[1];
  check('companion: tip carries its dismiss key', tipKey === 'mascot_tip_coach');
  globalThis.__store().mascotSeen[tipKey] = true;
  globalThis.__save();
  render();
  check('companion: a dismissed tip stays dismissed', !html().includes('mascot-tip'));
  check('companion: the button itself survives dismissal', html().includes('mascot-fab'));

  globalThis.__store().mascotMuted = true;
  globalThis.__save();
  render();
  check('companion: muting removes the whole dock', !html().includes('mascot-dock'));
  check('companion: muting does not remove the logo', html().includes('brand-mark--mascot'));
  globalThis.__store().mascotMuted = false;
  globalThis.__save();

  /* ---------- 6. the coach chat is the mascot talking ---------- */
  globalThis.__store().coachMessages = [
    { role: 'user', text: 'why am I stuck?' },
    { role: 'ai', text: 'Your reading is the bottleneck.' }
  ];
  globalThis.__save();
  global.location.hash = '#/coach';
  render();
  check('coach: page header carries the mascot', html().includes('mascot-avatar--xl') && html().includes('coach-head'));
  check('coach: AI reply is wrapped in a mascot row',
    /coach-msg--ai[\s\S]*?mascot-avatar--msg[\s\S]*?Your reading is the bottleneck/.test(html()));
  const hcoach = html();
  const uFrom = hcoach.indexOf('coach-msg--user');
  const uTo = hcoach.indexOf('coach-msg--ai', uFrom);
  const userBlock = uFrom === -1 ? '' : hcoach.slice(uFrom, uTo === -1 ? hcoach.length : uTo);
  check('coach: user reply gets no mascot avatar',
    uFrom !== -1 && userBlock.includes('why am I stuck?') && !userBlock.includes('mascot-avatar'));
  globalThis.__store().coachMessages = [];
  globalThis.__save();
  render();
  check('coach: empty state shows the mascot', html().includes('mascot--empty') && html().includes('coach-empty'));

  /* ---------- 7. empty states are not dead ends ---------- */
  global.location.hash = '#/results';
  render();
  check('results: empty state shows the mascot with a next step',
    html().includes('empty-state') && html().includes('mascot--empty') && html().includes('data-go="/mock"'));
  global.location.hash = '#/mistakes';
  render();
  check('mistakes: empty state shows the mascot', html().includes('empty-state') && html().includes('mascot--empty'));
  global.location.hash = '#/dashboard';
  render();
  check('dashboard: empty band trend shows the mascot',
    html().includes('panel-empty') && html().includes('mascot--mini'));

  /* ---------- 8. sign-in card ---------- */
  global.location.hash = '#/login';
  render();
  check('auth: mascot welcomes on sign in',
    html().includes('mascot--auth') && html().includes('auth-mascot'));
  global.location.hash = '#/signup';
  render();
  check('auth: mascot welcomes on sign up', html().includes('mascot--auth'));

  /* ---------- 8b. the moments a learner actually needs guidance ---------- */
  global.location.hash = '#/listening';
  render();
  check('gate: sign-in required card shows the mascot', html().includes('mascot--gate'));
  const warn = globalThis.__warn('listening', 30);
  check('briefing: the pre-test modal is briefed by Bandly',
    warn.includes('mascot-say--warn') && warn.includes('mascot-avatar') && /recording/i.test(warn));
  check('briefing: the briefing is specific to the section',
    !/recording/i.test(globalThis.__warn('reading', 60)));
  const done = globalThis.__completed('listening', { band: 6.5, date: Date.now() });
  check('finished: Bandly debriefs the result',
    done.includes('mascot-say--done') && done.includes('mascot-avatar'));

  /* ---------- 9. the settings switch ---------- */
  global.location.hash = '#/settings';
  render();
  check('settings: Bandly companion can be switched on/off',
    html().includes('data-set-mascot="on"') && html().includes('data-set-mascot="off"'));

  /* ---------- 10. every mascot string exists in all three languages ---------- */
  const dict = window.IELTS_I18N.dict;
  const mascotKeys = Object.keys(dict.en).filter(k => k.startsWith('mascot_'));
  check('i18n: mascot strings defined (' + mascotKeys.length + ')', mascotKeys.length >= 25);
  ['en', 'uz', 'ru'].forEach(lang => {
    const missing = mascotKeys.filter(k => !dict[lang][k] || dict[lang][k] === k);
    check('i18n: ' + lang + ' has every mascot string', missing.length === 0);
  });

  /* ---------- 11. the stylesheet actually styles him ---------- */
  const css = read('/styles.css');
  ['.brand-mark--mascot', '.mascot-avatar', '.mascot--hero', '.mascot-dock',
    '.mascot-fab', '.mascot-tip', '.coach-msg--ai', '.empty-state', '.mascot--auth',
    '.mascot-say--warn', '.mascot-say--done', '.mascot--gate'
  ].forEach(sel => check('css: styles ' + sel, css.includes(sel)));
  check('css: the <picture> wrapper stays out of the layout', /picture\s*\{\s*display:\s*contents/.test(css));
  check('css: mascot motion respects prefers-reduced-motion',
    /prefers-reduced-motion[\s\S]*\.mascot--hero[\s\S]*animation: none/.test(css));

  console.log(failed === 0 ? 'MASCOT TESTS OK ✓' : `MASCOT TESTS FAILED: ${failed}`);
} catch (e) {
  console.log('MASCOT TEST CRASH:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}
process.exit(failed === 0 ? 0 : 1);
