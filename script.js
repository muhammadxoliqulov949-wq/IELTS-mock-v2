const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const CONTENT = window.IELTS_CONTENT;
const SERVICES = window.IELTS_SERVICES;
const I18N = window.IELTS_I18N || { t: (k) => k, current: () => 'en', setLang() {} };
const t = (k) => I18N.t(k);
const CLOUD = window.IELTS_CLOUD || null;
const STORAGE = 'ielts-v2-store';
/* Local storage is a results cache, never an authentication authority.
   Only Supabase's restored/verified session can activate an account. */
let activeUser = null;
localStorage.removeItem('ielts-v2-user'); // retire the old demo identity
const BAND_LABEL = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

/* ---------------- MASCOT — "Bandly" ----------------
 * Bandly is the single face of the brand and of the AI that guides every
 * learner: he is the logo, he greets on the home page, he explains each
 * section before it starts, he sits next to every AI reply and he rides
 * along as a floating companion with a contextual tip for each page.
 * Every appearance renders from the same three assets, so the mascot is
 * always recognisably the same character.
 */
const MASCOT = {
  full: 'assets/mascot.png',       /* transparent, full body — hero & empty states */
  head: 'assets/mascot-head.png',  /* transparent head — logos, chat avatar, FAB   */
  badge: 'icons/mascot-192.png'    /* circular badge on the brand gradient         */
};
const MASCOT_NAME = 'Bandly';
/* Which tip Bandly shows on which route (route -> i18n key). */
const MASCOT_TIPS = {
  '/': 'mascot_tip_home',
  '/mock': 'mascot_tip_mock',
  '/fullmock': 'mascot_tip_mock',
  '/listening': 'mascot_tip_listening',
  '/reading': 'mascot_tip_reading',
  '/writing': 'mascot_tip_writing',
  '/speaking': 'mascot_tip_speaking',
  '/results': 'mascot_tip_results',
  '/mistakes': 'mascot_tip_mistakes',
  '/coach': 'mascot_tip_coach',
  '/dashboard': 'mascot_tip_dashboard',
  '/lessons': 'mascot_tip_lessons',
  '/vocabulary': 'mascot_tip_vocabulary',
  '/quiz': 'mascot_tip_quiz',
  '/roadmap': 'mascot_tip_roadmap',
  '/leaderboard': 'mascot_tip_leaderboard',
  '/settings': 'mascot_tip_settings',
  '/login': 'mascot_tip_login',
  '/signup': 'mascot_tip_signup'
};
/* WebP with a PNG fallback: the mascot is on every page, so the two-line
   <picture> is worth it (the hero mascot drops from 575 KB to ~62 KB).
   `picture { display: contents }` in the stylesheet keeps every img rule
   below working exactly as if the wrapper were not there. */
/* `load`: 'high' = above the fold and top priority (the hero, only),
   'eager' = visible immediately but not competing with the hero,
   anything else = lazy. Three images marked "high" would cancel each other
   out, so only the hero gets it. */
function mascotPicture(src, cls, alt, load) {
  const attrs = load === 'high' ? ' fetchpriority="high"'
    : load === 'eager' ? ''
    : ' loading="lazy"';
  return `<picture><source srcset="${src.replace(/\.png$/, '.webp')}" type="image/webp">`
    + `<img class="${cls}" src="${src}" alt="${esc(alt)}"${attrs} decoding="async"></picture>`;
}
function mascotImg(kind, cls, load) {
  return mascotPicture(MASCOT[kind] || MASCOT.head,
    `mascot mascot--${kind}${cls ? ' ' + cls : ''}`, MASCOT_NAME, load);
}
/* Round avatar that sits next to anything Bandly "says". */
function mascotAvatar(cls) {
  return `<span class="mascot-avatar${cls ? ' ' + cls : ''}" aria-hidden="true">`
    + mascotPicture(MASCOT.head, '', '', 'eager') + `</span>`;
}
/* A speech bubble with an optional action button. */
function mascotBubble(text, opts) {
  const o = opts || {};
  return `<div class="mascot-say${o.cls ? ' ' + o.cls : ''}">
      ${mascotAvatar('mascot-avatar--say')}
      <div class="mascot-bubble">
        ${o.title ? `<strong>${esc(o.title)}</strong>` : ''}
        <p>${esc(text)}</p>
        ${o.action ? `<button class="btn btn-primary btn-sm" data-go="${esc(o.action)}">${esc(o.label || t('mascot_ask'))} ↗</button>` : ''}
      </div>
    </div>`;
}
/* The persistent floating companion: a tip bubble plus a button to the coach. */
function mascotCompanion() {
  if (store.mascotMuted) return '';
  const key = MASCOT_TIPS[route()] || MASCOT_TIPS['/'];
  const seen = store.mascotSeen && store.mascotSeen[key];
  return `<div class="mascot-dock">
    ${seen ? '' : `<div class="mascot-tip" id="mascotTip" role="status">
      <button class="mascot-tip-close" data-mascot-dismiss="${esc(key)}" aria-label="${esc(t('mascot_hide_tip'))}">×</button>
      <p>${esc(t(key))}</p>
      <button class="mascot-tip-cta" data-go="/coach">${esc(t('mascot_ask'))} ↗</button>
    </div>`}
    <button class="mascot-fab" id="mascotFab" data-go="/coach" aria-label="${esc(t('mascot_ask'))}" title="${esc(t('mascot_ask'))}">
      ${mascotPicture(MASCOT.head, '', '', 'eager')}
    </button>
  </div>`;
}

function sessionUser() { return activeUser; }
function storageKey() {
  return activeUser ? `${STORAGE}:supabase:${activeUser.id}` : STORAGE;
}
let store = load();
function storeDefaults() {
  return { attempts: [], mistakes: [], feedback: {}, coachMessages: [], selectedTest: 'test1', theme: 'dark', lang: 'en', vocabKnown: {}, fullMock: null, quizzes: [], mascotMuted: false, mascotSeen: {} };
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey())) || {};
    return { ...storeDefaults(), ...raw, user: sessionUser() };
  } catch {
    return { ...storeDefaults(), user: sessionUser() };
  }
}
function save(skipCloud = false) {
  const { user, ...data } = store;
  localStorage.setItem(storageKey(), JSON.stringify(data));
  if (!skipCloud && CLOUD) scheduleCloudSync();
}
/* Stop any in-flight recording when leaving a Listening page, changing test,
   submitting, or switching accounts. */
function stopListeningAudio() {
  const audio = listeningState && listeningState.audio;
  if (audio) {
    try { audio.pause(); audio.currentTime = 0; } catch {}
    listeningState.audio = null;
  }
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
}
/* Switch account: persist the current scope, swap the session, reload data. */
function resetSectionStates() {
  stopListeningAudio();
  listeningState = { partIndex: 0, answers: {}, played: {}, deadline: null, audio: null };
  readingState = { passageIndex: 0, answers: {}, deadline: null };
  writingState = { answers: {}, deadline: null };
  speakingState = { partIndex: 0, transcripts: { sp1: [], sp2: '', sp3: [] } };
}
function signIn(user) {
  const state = CLOUD && CLOUD.getState();
  if (!state || state.status !== 'ready' || !state.user || state.user.id !== user.id || user.auth !== 'supabase') {
    throw new Error('A valid Supabase session is required.');
  }
  save();
  activeUser = user;
  store = load();
  save();
  resetSectionStates();
}
function signOut() {
  save();
  activeUser = null;
  store = load();
  resetSectionStates();
}
let pendingRoute = null; /* where to return after a successful sign-in */
function go(path) { location.hash = path; }
function route() { return location.hash.slice(1) || '/'; }

const ROADMAP_STAGES = [
  { id: 'A1-A2', title: 'roadmap_stage_a1a2', name: 'roadmap_stage_a1a2_name', hint: 'roadmap_stage_a1a2_hint' },
  { id: 'A2-B1', title: 'roadmap_stage_a2b1', name: 'roadmap_stage_a2b1_name', hint: 'roadmap_stage_a2b1_hint' },
  { id: 'B1-B2', title: 'roadmap_stage_b1b2', name: 'roadmap_stage_b1b2_name', hint: 'roadmap_stage_b1b2_hint' },
  { id: 'B2-C1', title: 'roadmap_stage_b2c1', name: 'roadmap_stage_b2c1_name', hint: 'roadmap_stage_b2c1_hint' }
];
let roadmapState = {
  topics: [], progress: {}, activeStage: 'A1-A2', loadedUser: null,
  loading: false, error: '', submitError: '', topicId: null, answers: [], result: null, saving: false
};
let leaderboardState = { rows: [], loading: false, error: '', loadedUser: null };
function currentCoins() {
  const state = CLOUD && CLOUD.getState ? CLOUD.getState() : null;
  const profile = state && state.profile;
  if (store.user && Number.isFinite(Number(store.user.coins))) return Math.max(0, Number(store.user.coins) || 0);
  if (profile && store.user && profile.id === store.user.id) return Math.max(0, Number(profile.coins) || 0);
  return 0;
}
function formatCoins(value) {
  const count = Math.max(0, Number(value) || 0);
  try { return count.toLocaleString(store.lang === 'uz' ? 'uz-UZ' : store.lang === 'ru' ? 'ru-RU' : 'en-US'); }
  catch { return String(count); }
}
/* Apply persisted preferences on every render so the whole app reflects them. */
function applyPrefs() {
  const lang = store.lang || 'en';
  if (I18N.setLang) I18N.setLang(lang);
  if (document.documentElement) document.documentElement.lang = lang;
  if (document.body) { document.body.dataset.lang = lang; document.body.dataset.theme = store.theme || 'dark'; }
  /* keep the browser UI (address bar / PWA) in sync with the active theme */
  if (typeof document !== 'undefined' && document.getElementById) {
    const meta = document.getElementById('themeColorMeta');
    if (meta) meta.setAttribute('content', (store.theme === 'light') ? '#f6f7fb' : '#0b0d12');
  }
}
const t2 = (k, vars) => (I18N.t2 ? I18N.t2(k, vars) : t(k));
function esc(v) { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function notify(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }
function fmtTime(seconds) { const m = Math.floor(Math.max(0, seconds) / 60); const s = Math.max(0, seconds) % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
/* Persist a per-user, per-test deadline so a page refresh cannot reset the
   timer and a timed-out test stays locked. */
function deadlineKey(section) { return `${storageKey()}:deadline:${section}:${store.selectedTest}`; }
function rawDeadline(section) { return Number(localStorage.getItem(deadlineKey(section))) || 0; }
function loadDeadline(section, minutes) {
  const fresh = Date.now() + minutes * 60000;
  localStorage.setItem(deadlineKey(section), String(fresh));
  return fresh;
}
function clearDeadline(section) { localStorage.removeItem(deadlineKey(section)); }
/* Latest attempt for a section within the selected practice test. */
function attemptFor(section, testId) {
  return [...store.attempts].reverse().find(a => a.section === section && (a.test || 'test1') === testId) || null;
}
function sectionDone(section, testId) { return !!attemptFor(section, testId); }

function bandAverage() {
  const sections = ['listening', 'reading', 'writing', 'speaking'];
  const bands = sections.map(s => {
    const attempts = store.attempts.filter(a => a.section === s);
    if (!attempts.length) return null;
    return attempts[attempts.length - 1].band;
  }).filter(b => b !== null);
  if (!bands.length) return null;
  return Math.round((bands.reduce((s, b) => s + b, 0) / bands.length) * 2) / 2;
}
function weakestSkill() {
  const sections = ['listening', 'reading', 'writing', 'speaking'];
  const scored = sections.map(s => {
    const attempts = store.attempts.filter(a => a.section === s);
    return { s, band: attempts.length ? attempts[attempts.length - 1].band : null };
  }).filter(x => x.band !== null);
  if (!scored.length) return null;
  return scored.sort((a, b) => a.band - b.band)[0].s;
}

/* ---------------- SHELL / NAV ---------------- */
/* Focused navigation: exactly three primary actions centred in the top bar
   (Mock Test, Results, AI Coach). Everything else — Dashboard, Mistakes,
   Lessons, Vocabulary, Quiz, Settings — lives behind the hamburger menu,
   so the top bar stays calm on desktop and mobile alike. */
/* True only when the signed-in account carries role='admin' in Postgres.
   Used purely to decide what to show — access itself is enforced by row
   level security, never by this flag.
   It reads the session rather than window.IELTS_ADMIN because script.js
   renders once before admin.js has executed (script tags run in order): a
   deep link to #/admin must not be bounced to the dashboard on that first
   paint just because the panel file has not arrived yet. */
function isAdminUser() {
  const state = CLOUD && CLOUD.getState ? CLOUD.getState() : null;
  if (state && state.user) return !!state.isAdmin;
  return !!(window.IELTS_ADMIN && window.IELTS_ADMIN.isAdmin());
}

/* Admin-authored tests live in Supabase. They are registered into
   IELTS_CONTENT under the same testN ids the router already understands, so a
   published test simply appears in the switcher with no other changes. */
let dynamicTestsRevision = 0;
function clearDynamicTests() {
  const c = window.IELTS_CONTENT;
  if (!c) return;
  (c._dynamicKeys || []).forEach(k => { delete c[k]; });
  c._dynamicKeys = [];
  if (c._builtInTestIds && c.testMeta && Array.isArray(c.testMeta.tests)) {
    c.testMeta.tests = c.testMeta.tests.filter(x => c._builtInTestIds.includes(x.id));
  }
}
async function loadDynamicTests() {
  const revision = ++dynamicTestsRevision;
  const state = CLOUD && CLOUD.getState ? CLOUD.getState() : null;
  if (!CLOUD || typeof CLOUD.loadPublishedTests !== 'function' || !state || state.status !== 'ready' || !state.user) {
    clearDynamicTests();
    return;
  }
  /* A user change/reload must never keep another account's dynamic payloads
     visible if the network request fails. A custom selected test stays
     selected temporarily but resolves to "unavailable", never Test 1. */
  clearDynamicTests();
  let res;
  try { res = await CLOUD.loadPublishedTests(); } catch { return; }
  const latest = CLOUD && CLOUD.getState ? CLOUD.getState() : null;
  if (revision !== dynamicTestsRevision || !latest || !latest.user || latest.user.id !== state.user.id) return;
  const c = window.IELTS_CONTENT;
  if (!c) return;
  if (!c._builtInTestIds) {
    c._builtInTestIds = ((c.testMeta && c.testMeta.tests) || []).map(x => x.id);
  }
  clearDynamicTests();
  /* Do not expose a partially-authored custom test: otherwise the legacy
     skill fallback could accidentally show Test 1 content under Test 5.
     A published admin test becomes selectable only once all four skills are
     present and published. */
  const rows = res.rows || [];
  const completeMeta = (res.meta || []).filter(m => {
    const available = new Set(rows.filter(row => row.test_id === m.test_id && row.payload).map(row => row.skill));
    return SKILLS.every(skill => available.has(skill));
  });
  const readyIds = new Set(completeMeta.map(m => m.test_id));
  completeMeta.forEach(m => {
    c.testMeta = c.testMeta || { tests: [] };
    if (!c.testMeta.tests.some(x => x.id === m.test_id)) {
      c.testMeta.tests.push({ id: m.test_id, label: m.label, labelUz: m.label_uz || m.label });
    }
  });
  rows.forEach(row => {
    const n = /^test(\d+)$/.exec(String(row.test_id || ''));
    if (!n || !row.payload || !readyIds.has(row.test_id) || !SKILLS.includes(row.skill)) return;
    const suffix = n[1] === '1' ? '' : n[1];
    const key = row.skill + suffix;
    c[key] = row.payload;
    c._dynamicKeys.push(key);
  });
  if (!c.testMeta.tests.some(test => test.id === store.selectedTest)) {
    store.selectedTest = 'test1';
    save(true);
  }
  render();
}

function navLinks(active) {
  const isMock = ['mock', 'fullmock', 'listening', 'reading', 'writing', 'speaking'].includes(active);
  return {
    primary: [
      { key: 'mock', label: t('nav_mock'), active: isMock },
      { key: 'results', label: t('nav_results'), active: active === 'results' },
      { key: 'coach', label: t('nav_coach'), active: active === 'coach' }
    ],
    rest: [
      ...(isAdminUser() ? [{ key: 'admin', label: '⚙ ' + t('admin_title'), active: active === 'admin' }] : []),
      { key: 'dashboard', label: t('nav_dashboard'), active: active === 'dashboard' },
      { key: 'roadmap', label: t('nav_roadmap'), active: active === 'roadmap' },
      { key: 'leaderboard', label: t('nav_leaderboard'), active: active === 'leaderboard' },
      { key: 'mistakes', label: t('nav_mistakes'), active: active === 'mistakes' },
      { key: 'lessons', label: t('nav_lessons'), active: active === 'lessons' },
      { key: 'vocabulary', label: t('nav_vocabulary'), active: active === 'vocabulary' },
      { key: 'quiz', label: t('nav_quiz'), active: active === 'quiz' },
      { key: 'settings', label: t('nav_settings'), active: active === 'settings' }
    ]
  };
}
function shell(body, active) {
  const user = store.user;
  const { primary, rest } = navLinks(active);
  const langShort = (store.lang || 'en').toUpperCase();
  const nextLang = store.lang === 'en' ? 'UZ' : store.lang === 'uz' ? 'RU' : 'EN';
  const displayName = String(user ? (user.name || user.email || 'User') : 'User');
  const firstName = displayName.split(' ')[0];
  return `<header class="site-header" id="siteHeader">
  <nav class="nav" id="mainNav" aria-label="Main navigation">
    <a class="brand" href="#/" aria-label="IELTS Mock — ${esc(MASCOT_NAME)}"><span class="brand-mark brand-mark--mascot">${mascotPicture(MASCOT.head, '', '', 'eager')}</span><span class="brand-name">IELTS Mock</span></a>
    <div class="nav-links">
      ${primary.map(l => `<a class="${l.active ? 'active' : ''}" href="#/${l.key}" ${l.active ? 'aria-current="page"' : ''}>${l.label}</a>`).join('')}
    </div>
    <div class="nav-actions">
      ${isAdminUser() ? `<a class="admin-chip" href="#/admin">⚙ ${t('admin_title')}</a>` : ''}
      <button class="icon-btn" data-toggle-theme aria-label="Toggle theme" title="${store.theme === 'light' ? t('theme_dark') : t('theme_light')}">${store.theme === 'light' ? '☀' : '☾'}</button>
      <button class="icon-btn lang-btn" data-toggle-lang aria-label="Switch language" title="EN / UZ / RU">${langShort}</button>
      ${user ? `<div class="nav-user">
        <span class="coin-wallet" data-coin-wallet role="status" aria-live="polite" aria-label="${esc(t('coins_balance_label'))}: ${esc(formatCoins(currentCoins()))}" title="${esc(t('coins_balance_label'))}"><span aria-hidden="true">🪙</span><strong>${esc(formatCoins(currentCoins()))}</strong></span>
        <button class="user-chip" id="userChip" aria-expanded="false" aria-haspopup="true">
          ${user.picture ? `<img src="${esc(user.picture)}" alt=""/>` : `<span class="avatar">${esc(firstName[0].toUpperCase())}</span>`}
          <span class="user-name">${esc(firstName)}</span><span class="caret">▾</span>
        </button>
        <div class="dropdown-menu user-menu" id="userMenu">
          <div class="user-menu-head"><strong>${esc(user.name || 'User')}</strong><span>${esc(user.email || '')}</span></div>
          ${isAdminUser() ? `<a href="#/admin">⚙ ${t('admin_title')}</a>` : ''}
          <a href="#/dashboard">${t('nav_dashboard')}</a>
          <a href="#/roadmap">${t('nav_roadmap')}</a>
          <a href="#/leaderboard">${t('nav_leaderboard')}</a>
          <a href="#/settings">${t('nav_settings')}</a>
          <button class="user-logout" data-logout>${t('nav_logout')}</button>
        </div>
      </div>` : `<a class="btn btn-primary btn-sm nav-login" href="#/login">${t('nav_login')}</a>`}
      <button class="hamburger" id="hamburgerBtn" aria-label="${t('menu')}" aria-expanded="false" title="${t('menu')}"><span></span><span></span><span></span></button>
    </div>
  </nav>
</header>
<div class="shell"><div class="page-fade">${body}</div></div>
<div class="mobile-menu" id="mobileMenu">
  <button class="close-menu" id="closeMenuBtn" aria-label="${t('modal_close')}">×</button>
  <div class="mm-brand"><span class="brand-mark brand-mark--mascot lg">${mascotPicture(MASCOT.head, '', '', 'eager')}</span> IELTS Mock</div>
  <div class="mm-links mm-primaries">
    ${primary.map(l => `<a class="${l.active ? 'active' : ''}" href="#/${l.key}">${l.label}</a>`).join('')}
  </div>
  <div class="mm-links mm-rest">
    ${rest.map(l => `<a class="${l.active ? 'active' : ''}" href="#/${l.key}">${l.label}</a>`).join('')}
  </div>
  <div class="mm-actions">
    <button class="btn btn-ghost" data-toggle-theme>${store.theme === 'light' ? '☀ ' + t('theme_dark') : '☾ ' + t('theme_light')}</button>
    <button class="btn btn-ghost" data-toggle-lang>${langShort} → ${nextLang}</button>
    ${user ? `<button class="btn btn-ghost" data-logout>${t('nav_logout')}</button>` : `<a class="btn btn-primary" href="#/login">${t('nav_login')}</a>`}
  </div>
</div>
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand"><span class="brand-mark brand-mark--mascot sm">${mascotPicture(MASCOT.head, '', '', false)}</span><span>IELTS Mock <em>${t('footer_by')}</em></span></div>
    <nav class="footer-links" aria-label="Footer">
      <a href="#/">${t('nav_home')}</a>
      <a href="#/dashboard">${t('nav_dashboard')}</a>
      <a href="#/roadmap">${t('nav_roadmap')}</a>
      <a href="#/leaderboard">${t('nav_leaderboard')}</a>
      <a href="#/mock">${t('nav_mock')}</a>
      <a href="#/results">${t('nav_results')}</a>
      <a href="#/mistakes">${t('nav_mistakes')}</a>
      <a href="#/coach">${t('nav_coach')}</a>
    </nav>
    <p class="footer-legal"><span>© ${new Date().getFullYear()} Bandly AI</span><span>${t('disclaimer')}</span></p>
  </div>
</footer>
${mascotCompanion()}`;
}

/* ---------------- HOME ---------------- */
function bandRing(value, pct) {
  const r = 54, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const label = (value === null || value === undefined) ? '—' : value;
  return `<svg class="ring" viewBox="0 0 132 132" role="img" aria-label="${label} / 9">
    <defs>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--cyan)"/>
        <stop offset="100%" stop-color="var(--primary)"/>
      </linearGradient>
    </defs>
    <circle class="ring-track" cx="66" cy="66" r="${r}"/>
    <circle class="ring-arc" cx="66" cy="66" r="${r}" stroke="url(#ringGrad)" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    <text class="ring-num" x="66" y="70">${label}</text>
    <text class="ring-den" x="66" y="90">/ 9</text>
  </svg>`;
}

function sectionCards() {
  const cards = [
    { key: 'listening', title: 'Listening', metaKey: 'meta_listening', href: '/listening' },
    { key: 'reading', title: 'Reading', metaKey: 'meta_reading', href: '/reading' },
    { key: 'writing', title: 'Writing', metaKey: 'meta_writing', href: '/writing' },
    { key: 'speaking', title: 'Speaking', metaKey: 'meta_speaking', href: '/speaking' }
  ];
  return cards.map(c => `
    <article class="test-card ${sectionDone(c.key, store.selectedTest) ? 'is-done' : ''}">
      <div class="test-meta"><span>${c.title}</span><span>${sectionDone(c.key, store.selectedTest) ? '✓ ' + t('test_done') : t('not_started')}</span></div>
      <h3>${c.title}</h3>
      <span class="pill">${t(c.metaKey)}</span>
      <div class="test-meta" style="margin-top:20px"><span></span><button class="btn btn-primary btn-sm" data-go="${c.href}">${t('start')} ↗</button></div>
    </article>`).join('');
}

function home() {
  const overall = bandAverage();
  const weakest = weakestSkill();
  const sections = ['listening', 'reading', 'writing', 'speaking'];
  const latest = {};
  store.attempts.forEach(a => { latest[a.section] = a; });
  const doneCount = sections.filter(s => latest[s]).length;
  const heroLines = t('hero_title').split('\n');
  return shell(`
    <section class="hero">
      <div>
        <div class="eyebrow">${t('hero_eyebrow')}</div>
        <h1>${heroLines[0] || ''}<br>${heroLines.length > 1 ? `<span>${heroLines[1]}</span>` : ''}${heroLines.length > 2 ? `<br>${heroLines[2]}` : ''}</h1>
        <p class="hero-copy">${t('hero_subtitle')}</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-go="/mock">${t('start_full_mock')}</button>
          <button class="btn btn-ghost" data-go="/mistakes">${t('see_mistakes')}</button>
        </div>
        <div class="hero-stats">
          <span>⏱ ${t('home_stat1')}</span>
          <span>🤖 ${t('home_stat2')}</span>
          <span>🌐 ${t('home_stat3')}</span>
        </div>
      </div>
      <div class="preview-wrap">
        <div class="hero-guide">
          <div class="hero-guide-bubble">
            <strong>${esc(MASCOT_NAME)}</strong>
            <p>${esc(t('mascot_hero_greet'))} ${esc(t('mascot_hero_greet2'))}</p>
            <button class="btn btn-primary btn-sm" data-go="/coach">${esc(t('mascot_ask'))} ↗</button>
          </div>
          ${mascotImg('full', 'mascot--hero', 'high')}
        </div>
        <div class="glass score-card">
          <div class="score-label"><span>${t('overall_band')}</span><span>${doneCount}/4</span></div>
          ${bandRing(overall, overall ? (overall / 9) * 100 : 0)}
          <div class="skill-rows">
            ${sections.map(s => `
              <div class="skill-row">
                <span class="skill-dot ${latest[s] ? 'on' : ''}"></span>
                <span class="skill-name cap">${s}</span>
                <span class="skill-band">${latest[s] ? latest[s].band : '—'}</span>
              </div>`).join('')}
          </div>
          ${weakest ? `<p class="micro" style="margin-top:12px">${t('weakest_skill')}: <strong class="cap" style="color:var(--coral)">${weakest}</strong></p>` : ''}
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="section-header"><div><div class="eyebrow">${t('home_how_eyebrow')}</div><h2>${t('home_how_title')}</h2></div></div>
      <div class="feature-grid">
        <article class="feature"><div class="feature-icon">①</div><h3>${t('home_step1_t')}</h3><p>${t('home_step1_d')}</p></article>
        <article class="feature"><div class="feature-icon">②</div><h3>${t('home_step2_t')}</h3><p>${t('home_step2_d')}</p></article>
        <article class="feature"><div class="feature-icon">③</div><h3>${t('home_step3_t')}</h3><p>${t('home_step3_d')}</p></article>
        <article class="feature"><div class="feature-icon">④</div><h3>${t('home_step4_t')}</h3><p>${t('home_step4_d')}</p></article>
      </div>
    </section>

    <section class="section reveal">
      <div class="section-header"><div><div class="eyebrow">${t('home_mock_eyebrow')}</div><h2>${t('home_mock_title')}</h2></div><div class="test-switch">${testSwitch()}</div></div>
      <div class="library">${sectionCards()}</div>
    </section>

    <section class="section reveal">
      <div class="section-header"><div><div class="eyebrow">${t('home_learn_eyebrow')}</div><h2>${t('home_learn_title')}</h2></div></div>
      <div class="feature-grid">
        <article class="feature"><div class="feature-icon">◆</div><h3>${t('home_feat_expl_t')}</h3><p>${t('home_feat_expl_d')}</p></article>
        <article class="feature"><div class="feature-icon">◈</div><h3>${t('home_feat_lesson_t')}</h3><p>${t('home_feat_lesson_d')}</p></article>
        <article class="feature"><div class="feature-icon">◉</div><h3>${t('home_feat_vocab_t')}</h3><p>${t('home_feat_vocab_d')}</p></article>
        <article class="feature"><div class="feature-icon">◎</div><h3>${t('home_feat_quiz_t')}</h3><p>${t('home_feat_quiz_d')}</p></article>
      </div>
    </section>

    <section class="section reveal">
      <div class="plans">
        <article class="plan plan-free">
          <div class="test-meta"><span>${t('free_plan')}</span><span>£0</span></div>
          <h3>${t('free_title')}</h3>
          <ul>
            <li>${t('free_f1')}</li>
            <li>${t('free_f2')}</li>
            <li>${t('free_f3')}</li>
            <li>${t('free_f4')}</li>
          </ul>
          <button class="btn btn-primary" data-go="/mock">${t('free_cta')} ↗</button>
        </article>
        <article class="plan plan-premium">
          <div class="test-meta"><span>${t('premium_plan')}</span><span class="pill">${t('nav_coming_soon')}</span></div>
          <h3>${t('prem_title')}</h3>
          <ul>
            <li>${t('prem_p1')}</li>
            <li>${t('prem_p2')}</li>
            <li>${t('prem_p3')}</li>
            <li>${t('prem_p4')}</li>
          </ul>
          <p class="micro">${t('premium_note')}</p>
          <button class="btn btn-ghost" data-go="/dashboard">${t('prem_cta')} ↗</button>
        </article>
      </div>
    </section>

    <section class="section reveal">
      <div class="glass next-step">
        <div>
          <div class="eyebrow">${t('home_next_eyebrow')}</div>
          <h2>${weakest ? t2('home_next_a', { skill: weakest[0].toUpperCase() + weakest.slice(1) }) : t('home_next_b')}</h2>
          <p>${store.mistakes.length ? t2('home_next_mistakes', { n: store.mistakes.length }) : t('home_next_empty')}</p>
        </div>
        <button class="btn btn-primary" data-go="/coach">${t('home_talk_coach')} ↗</button>
      </div>
    </section>`, '');
}

/* ---------------- MOCK HUB ---------------- */
function testSwitch() {
  const meta = CONTENT.testMeta || { tests: [{ id: 'test1', label: 'Practice Test 1' }, { id: 'test2', label: 'Practice Test 2', premium: true }] };
  const labels = ['listening', 'reading', 'writing', 'speaking'].map(s => SERVICES.getSkillContent(s, store.selectedTest));
  return `<div class="seg" role="tablist">
    ${meta.tests.map(tb => `<button class="seg-btn ${store.selectedTest === tb.id ? 'active' : ''}" data-test="${tb.id}" ${tb.premium ? `title="${t('test2_free')}"` : ''}>${tb.premium ? '⭐ ' : ''}${esc(SERVICES.testLabel(tb.id, store.lang))}</button>`).join('')}
  </div>`;
}

/* Single entry point for practice: "Mock Test" and the old "Full Mock" are
   now one page — a guided four-step flow with per-test completion states and
   a combined band panel. (#/fullmock is kept as an alias for old links.) */
function mockHub() {
  const steps = [
    { key: 'listening', title: 'Listening', max: 40 },
    { key: 'reading', title: 'Reading', max: 40 },
    { key: 'writing', title: 'Writing', max: 9 },
    { key: 'speaking', title: 'Speaking', max: 9 }
  ];
  const overall = SERVICES.overallBand(store.attempts);
  const activeTest = SERVICES.getSkillContent('listening', store.selectedTest);
  return shell(`
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">${t('home_mock_eyebrow')}</div><h1 style="font-family:var(--font-display);font-size:30px;margin:10px 0 0">${t('fullmock_title')}</h1><p class="micro">${t('fullmock_subtitle')}</p></div><div class="test-switch">${testSwitch()}</div></div>
      <p class="micro" style="margin:14px 0 20px">${esc(SERVICES.testLabel(store.selectedTest, store.lang))} — ${activeTest && activeTest.difficulty ? esc(activeTest.difficulty) : ''}</p>
      <div class="mock-flow">
        ${steps.map((s, i) => {
          const a = attemptFor(s.key, store.selectedTest);
          const done = !!a;
          return `<a class="mock-step ${done ? 'done' : ''}" href="#/${s.key}"><span class="step-num">${done ? '✓' : i + 1}</span><div><strong>${s.title}</strong><p class="micro">${done ? `${t('test_done')} · ${a.band != null ? a.band + '/9' : ''}` : t('not_started')} · ${s.max}</p></div>${done ? '' : '↗'}</a>`;
        }).join('')}
      </div>
      <div class="glass" style="margin-top:20px">
        <div class="panel-title">${t('combined_result')}</div>
        <div class="big" style="margin:10px 0">${overall ?? '—'} <small>/ 9</small></div>
        <p class="micro">${t2('sections_attempted', { n: steps.filter(s => sectionDone(s.key, store.selectedTest)).length })}</p>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-primary" data-go="/listening">${t('start_with_listening')} ↗</button>
          <button class="btn btn-ghost" data-go="/dashboard">${t('nav_dashboard')} ↗</button>
        </div>
      </div>
    </section>`, 'mock');
}

/* ---------------- LISTENING ---------------- */
function currentTest(skill) { return SERVICES.getSkillContent(skill, store.selectedTest); }
function unavailableTestContent(skill) {
  return shell(`<section class="section"><div class="glass center-card test-unavailable">
    <div class="warn-icon">◷</div><h1>${esc(t('test_content_unavailable'))}</h1>
    <p class="micro">${esc(t('test_content_unavailable_hint'))}</p>
    <button class="btn btn-primary" data-go="/mock">${esc(t('test_back_to_mock'))} ↗</button>
  </div></section>`, skill);
}
let listeningState = { partIndex: 0, answers: {}, played: {}, deadline: null, audio: null };
/* Flat index of the first question of the current part. Real IELTS numbers
   questions 1–40 across the four parts; a legacy part may hold a different
   count, so the offset is computed from the data, never assumed. */
function listeningOffset() {
  const test = currentTest('listening');
  return (test.parts || []).slice(0, listeningState.partIndex)
    .reduce((sum, p) => sum + ((p && p.questions ? p.questions.length : 0)), 0);
}
/* Shared question body for the Listening and Reading runners.
   Index-answer types (multiple choice, matching, map/plan labelling,
   matching headings) render lettered option buttons; multi-answer MC lets
   several stay selected; TRUE/FALSE/NOT GIVEN (and its YES/NO variant)
   renders the fixed three; everything else is a text gap with the IELTS
   word limit shown above it. */
function questionInputHtml(q, current, attrs, small) {
  const type = q.type || 'sentence-completion';
  if (type === 'true-false-not-given' || type === 'yes-no-not-given') {
    const set = (q.answerSet === 'yes-no' || type === 'yes-no-not-given') ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN'];
    return `<div class="opt-row${small ? ' opt-row--small' : ''}">${set.map(v =>
      `<button class="btn btn-ghost opt-btn ${String(current == null ? '' : current).trim().toUpperCase() === v ? 'selected' : ''}" ${attrs.answer} data-value="${v}">${v}</button>`).join('')}</div>`;
  }
  if (SERVICES.isIndexType(type) || type === 'multiple-choice-multi') {
    const multi = type === 'multiple-choice-multi';
    const picked = multi ? SERVICES.toIndexList(current) : [];
    const letterOnly = type === 'multiple-choice' && !!small; /* compact legacy reading layout */
    return `<div class="opt-row${small ? ' opt-row--small' : ''}">${(q.options || []).map((opt, oi) => {
      const isSel = multi ? picked.includes(oi) : (current != null && current !== '' && String(current) === String(oi));
      return `<button class="btn btn-ghost opt-btn ${isSel ? 'selected' : ''}" ${attrs.answer} data-value="${oi}"${multi ? ' data-multi="1"' : ''}>${String.fromCharCode(65 + oi)}${letterOnly ? '' : '. ' + esc(opt)}</button>`;
    }).join('')}</div>`;
  }
  return `${q.wordLimit ? `<p class="word-limit-chip">${esc(q.wordLimit)}</p>` : ''}
    <input class="btn btn-ghost q-text" style="text-align:left" ${attrs.text} value="${esc(current == null ? '' : current)}" placeholder="Your answer">`;
}
function listening() {
  const test = currentTest('listening');
  const lDl = rawDeadline('listening');
  listeningState.deadline = lDl > Date.now() ? lDl : null; /* timer only after an explicit start */
  const part = test.parts[listeningState.partIndex];
  const played = listeningState.played[part.id];
  const offset = listeningOffset();
  const hasAudio = !!part.audioUrl;
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Listening · ${esc(part.title)}</span><span class="timer" data-timer role="timer" aria-live="off">--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 20px">Part ${part.partNumber} of ${test.parts.length}</h1>
      <div class="glass" style="padding:24px;margin-bottom:20px">
        <p style="color:var(--muted);font-size:14px;margin-bottom:14px">${esc(part.instructions)}</p>
        <button class="btn ${played ? 'btn-ghost' : 'btn-primary'}" data-play-part ${played ? 'disabled' : ''}>${played ? '✓ ' + t('played') : (hasAudio ? '▶ ' + t('play_mp3') : '▶ ' + t('play_recording'))}</button>
        <p class="micro">${hasAudio ? esc(t('audio_once_hint')) : 'You can answer while listening or after — the recording plays once, like the real test.'}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">${(part.questions || []).map((q, i) => `
        <div class="glass q-card">
          ${q.group ? `<p class="q-group">${esc(q.group)}</p>` : ''}
          ${q.imageUrl ? `<img class="q-image" src="${esc(q.imageUrl)}" alt="${esc(q.group || 'Map or plan')}" loading="lazy">` : ''}
          <p class="q-prompt">Q${offset + i + 1}. ${esc(q.prompt)}</p>
          ${questionInputHtml(q, listeningState.answers[offset + i], { answer: `data-l-answer="${i}"`, text: `data-l-text="${i}"` })}
        </div>`).join('')}</div>
      <div style="margin-top:24px;display:flex;gap:12px">
        ${listeningState.partIndex > 0 ? `<button class="btn btn-ghost" data-l-prev>← ${t('prev_part')}</button>` : ''}
        ${listeningState.partIndex < test.parts.length - 1 ? `<button class="btn btn-primary" data-l-next>${t('next_part')} ↗</button>` : `<button class="btn btn-primary" data-l-submit>${t('submit_listening')} ↗</button>`}
      </div>
    </section>`, 'listening');
}

/* ---------------- READING ---------------- */
let readingState = { passageIndex: 0, answers: {}, deadline: null };
/* Passage body: labelled paragraphs (A, B, C …) when the content has them —
   required for matching-headings questions — otherwise the raw text. */
function passageTextHtml(passage) {
  const paras = (passage.paragraphs || []).filter(p => p && String(p.text || '').trim());
  if (paras.length) {
    return paras.map(p => `<div class="reading-paragraph"${p.label ? ` id="para-${esc(String(p.label).toLowerCase())}"` : ''}>
      ${p.label ? `<span class="paragraph-label">${esc(p.label)}</span>` : ''}
      <p>${esc(p.text)}</p>
    </div>`).join('');
  }
  return esc(passage.text || '');
}
function reading() {
  const test = currentTest('reading');
  const rDl = rawDeadline('reading');
  readingState.deadline = rDl > Date.now() ? rDl : null;
  const passage = test.passages[readingState.passageIndex];
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Reading · Passage ${passage.passageNumber} of ${test.passages.length} · ${esc(passage.difficulty || '')}</span><span class="timer" data-timer role="timer" aria-live="off">--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:26px;margin:10px 0 20px">${esc(passage.title)}</h1>
      <div class="reading-grid" style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:20px">
        <div class="glass reading-text" style="padding:22px;max-height:560px;overflow-y:auto;font-size:14px;line-height:1.7;white-space:pre-line">${passageTextHtml(passage)}</div>
        <div style="display:flex;flex-direction:column;gap:12px;max-height:560px;overflow-y:auto">
          ${(passage.questions || []).map((q, i) => `
            <div class="glass q-card q-card--reading">
              ${q.group ? `<p class="q-group">${esc(q.group)}</p>` : ''}
              <p class="q-prompt q-prompt--reading">${esc(q.prompt)}</p>
              ${questionInputHtml(q, readingState.answers[`${readingState.passageIndex}-${i}`], { answer: `data-r-answer="${i}"`, text: `data-r-text="${i}"` }, true)}
            </div>`).join('')}
        </div>
      </div>
      <div style="margin-top:24px;display:flex;gap:12px">
        ${readingState.passageIndex > 0 ? `<button class="btn btn-ghost" data-r-prev>← ${t('prev_passage')}</button>` : ''}
        ${readingState.passageIndex < test.passages.length - 1 ? `<button class="btn btn-primary" data-r-next>${t('next_passage')} ↗</button>` : `<button class="btn btn-primary" data-r-submit>${t('submit_reading')} ↗</button>`}
      </div>
    </section>`, 'reading');
}/* ---------------- WRITING ---------------- */
let writingState = { answers: {}, deadline: null };
function writing() {
  const test = currentTest('writing');
  const wDl = rawDeadline('writing');
  writingState.deadline = wDl > Date.now() ? wDl : null;
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Writing · Task 1 & Task 2</span><span class="timer" data-timer role="timer" aria-live="off">--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 24px">60 minutes total</h1>
      ${test.tasks.map((task, i) => {
        const words = (writingState.answers[i] || '').trim() ? (writingState.answers[i] || '').trim().split(/\s+/).length : 0;
        return `
        <div class="glass writing-task" style="padding:22px;margin-bottom:18px">
          <p class="eyebrow" style="margin-bottom:8px">${esc(task.title)} · ${task.minutes} min · min ${task.minWords} words</p>
          <p style="font-size:14.5px;line-height:1.6">${esc(task.prompt)}</p>
          ${task.imageUrl ? `<figure class="task-image"><img src="${esc(task.imageUrl)}" alt="${esc(task.visualType ? task.visualType + ' for Task ' + task.taskNumber : 'Writing task visual')}" loading="lazy">${task.visualType ? `<figcaption class="micro">${esc(task.visualType)}</figcaption>` : ''}</figure>` : ''}
          ${task.chartData ? `<pre style="white-space:pre-wrap;font-size:12.5px;color:var(--muted);background:rgba(255,255,255,0.03);padding:12px;border-radius:10px">${esc(task.chartData)}</pre>` : ''}
          ${task.criteria ? `<details class="criteria-box"><summary>${esc(t('writing_criteria'))}</summary><p>${esc(task.criteria)}</p></details>` : ''}
          <textarea data-w-text="${i}" data-min-words="${task.minWords || 0}" placeholder="Write your response here..." style="width:100%;min-height:180px;margin-top:14px;background:rgba(255,255,255,0.03);border:1px solid var(--panel-border);border-radius:12px;color:var(--text);padding:14px;font-family:var(--font-body);font-size:14px">${esc(writingState.answers[i] || '')}</textarea>
          <p class="micro word-count-${i}${task.minWords && words < task.minWords ? ' word-count--short' : ''}">${t2('words', { n: words })}${task.minWords ? ` · min ${task.minWords}` : ''}</p>
        </div>`;
      }).join('')}
      <button class="btn btn-primary" data-w-submit>${t('submit_writing')} ↗</button>
      <div id="writing-result"></div>
    </section>`, 'writing');
}

/* ---------------- SPEAKING ---------------- */
let speakingState = { partIndex: 0, transcripts: { sp1: [], sp2: '', sp3: [] } };
/* Part 1 may carry grouped topics ({ title, questions[] }) or the legacy
   flat questions[] list. This flattens both into [{ topic, q }] so record
   buttons and the AI grading payload share one index space. */
function speakingPart1Flat(part) {
  if (Array.isArray(part.topics) && part.topics.length) {
    return part.topics.flatMap(tp => (tp.questions || []).map(q => ({ topic: tp.title || '', q })));
  }
  return (part.questions || []).map(q => ({ topic: '', q }));
}
function spQuestionRow(q, i) {
  return `<div class="sp-question">
      <p style="font-size:14.5px;margin-bottom:8px">${esc(q)}</p>
      <button class="btn btn-primary" data-sp-record="${i}">● Record answer</button>
      <p class="micro sp-transcript-${i}"></p>
    </div>`;
}
function speaking() {
  const test = currentTest('speaking');
  const part = test.parts[speakingState.partIndex];
  const prepSec = Number(part.prepSeconds) > 0 ? Number(part.prepSeconds) : 60;
  const talkSec = Number(part.talkSeconds) > 0 ? Number(part.talkSeconds) : 120;
  let part1Idx = 0; /* running flattened index while rendering topics */
  return shell(`
    <section class="section">
      <div class="eyebrow">Speaking · ${esc(part.title)} · ${esc(part.minutes || '')} min</div>
      <h1 style="font-family:var(--font-display);font-size:26px;margin:10px 0 20px">Part ${part.partNumber} of ${test.parts.length}</h1>
      <div class="glass" style="padding:24px">
        ${part.partNumber === 2 ? `
          <p class="cue-card-label">${esc(t('cue_card'))}</p>
          <p style="font-size:15.5px;margin-bottom:10px">${esc(part.topic || '')}</p>
          <ul style="color:var(--muted);font-size:13.5px;line-height:1.8">${(part.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
          <p class="micro cue-timer-hint">${t2('cue_timer_hint', { prep: Math.max(1, Math.round(prepSec / 60)), talk: Math.max(1, Math.round(talkSec / 60)) })}</p>
          <div id="speaking-cue-flow"></div>
        ` : `
          ${part.partNumber === 3 && part.linkedTopic ? `<p class="micro sp-linked">${esc(t('sp_linked_topic'))}: <strong>${esc(part.linkedTopic)}</strong></p>` : ''}
          <div style="display:flex;flex-direction:column;gap:16px">${
            part.partNumber === 1 && Array.isArray(part.topics) && part.topics.length
              ? part.topics.map(tp => `
                <div class="sp-topic">
                  <p class="sp-topic-title">${esc(tp.title || '')}</p>
                  ${(tp.questions || []).map(q => spQuestionRow(q, part1Idx++)).join('')}
                </div>`).join('')
              : (part.questions || []).map((q, i) => spQuestionRow(q, i)).join('')
          }</div>
        `}
      </div>
      <div style="margin-top:24px;display:flex;gap:12px">
        ${speakingState.partIndex < test.parts.length - 1 ? `<button class="btn btn-primary" data-sp-next>${t('next_part')} ↗</button>` : `<button class="btn btn-primary" data-sp-submit>${t('finish_speaking')} ↗</button>`}
      </div>
      <div id="speaking-result"></div>
    </section>`, 'speaking');
}

/* ---------------- RESULTS ---------------- */
function resultsPage() {
  const attempts = [...store.attempts].sort((a, b) => b.date - a.date);
  return shell(`
    <section class="section">
      <div class="eyebrow">${t('results_eyebrow')}</div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 10px">${t('results_title')}</h1>
      <p style="color:var(--muted);font-size:14.5px;margin-bottom:26px">${t('results_sub')}</p>
      ${cloudResultsPanel()}
      ${attempts.length ? `
        <div class="result-grid">
          ${attempts.map((a, i) => {
            const fb = a.feedback || store.feedback[a.section];
            const icon = a.raw !== undefined ? `<span class="result-raw">${a.raw}/${a.total} correct</span>` : '';
            const arrow = i > 0 ? `<span class="result-arrow">${a.band > attempts[i - 1].band ? '▲' : a.band < attempts[i - 1].band ? '▼' : '—'}</span>` : '';
            return `
            <article class="test-card result-card">
              <div class="test-meta"><span>${BAND_LABEL[a.section] || a.section}</span><span>${new Date(a.date).toLocaleDateString()}</span></div>
              <div class="result-band">${a.band}<small> / 9 ${arrow}</small></div>
              ${icon}
              ${fb && fb.tasks ? `<div style="margin-top:10px;font-size:12.5px;color:var(--muted)">${fb.tasks.map(t => `${esc(t.title)}: <strong style="color:var(--cyan)">${t.band}</strong>`).join(' · ')}</div>` : ''}
              <button class="btn btn-ghost" style="margin-top:14px;font-size:12.5px;padding:7px 12px" data-detail="${i}">${t('view_feedback')} ↗</button>
            </article>`;
          }).join('')}
        </div>
        <div id="result-detail" style="margin-top:18px"></div>` : `
        <div class="glass empty-state">
          ${mascotImg('full', 'mascot--empty')}
          <p>${esc(t('mascot_empty_results'))}</p>
          <button class="btn btn-primary" style="margin-top:14px" data-go="/mock">${t('start')} ↗</button>
        </div>`}
    </section>`, 'results');
}

/* ---------------- MISTAKES ---------------- */
function mistakes() {
  const groups = { listening: [], reading: [] };
  store.mistakes.forEach(m => { if (groups[m.section]) groups[m.section].push(m); });
  const sections = ['listening', 'reading'];
  return shell(`
    <section class="section">
      <div class="eyebrow">${t('mistakes_eyebrow')}</div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 10px">${t('mistakes_title')}</h1>
      <p style="color:var(--muted);font-size:14.5px;margin-bottom:26px">${t('mistakes_sub')}</p>
      ${sections.every(s => groups[s].length === 0) ? `
        <div class="glass empty-state">
          ${mascotImg('full', 'mascot--empty')}
          <p>${esc(t('mascot_empty_mistakes'))}</p>
          <button class="btn btn-primary" style="margin-top:14px" data-go="/mock">${t('start')} ↗</button>
        </div>` : sections.map(s => groups[s].length ? `
        <h2 style="font-family:var(--font-display);font-size:19px;margin:24px 0 12px;text-transform:capitalize">${s} (${groups[s].length})</h2>
        <div style="display:flex;flex-direction:column;gap:10px">${groups[s].map(m => `
          <div class="glass" style="padding:16px 18px">
            <p style="margin:0 0 8px;font-size:14px">${esc(m.prompt)}</p>
            <p style="margin:0;font-size:13px;color:var(--muted)">${t('your_answer')}: <span style="color:var(--coral)">${esc(m.given || '(no answer)')}</span> · ${t('correct_answer')}: <span style="color:var(--cyan)">${esc(m.correct)}</span></p>
            ${m.explanation ? `<p class="explain-box" style="margin:10px 0 0;font-size:12.5px">${esc(m.explanation)}</p>` : ''}
            <p style="margin:8px 0 0;font-size:12.5px;color:var(--muted)">${new Date(m.date || Date.now()).toLocaleDateString()}</p>
            <button class="btn btn-ghost" style="margin-top:10px;font-size:12px;padding:6px 10px" data-remove-mistake="${esc(m.sig)}">${t('remove_mistake')}</button>
          </div>`).join('')}</div>` : '').join('')}
    </section>`, 'mistakes');
}

/* ---------------- AI COACH ---------------- */
let coachSending = false;
function coach() {
  const overall = bandAverage();
  const weakest = weakestSkill();
  return shell(`
    <section class="section">
      <div class="coach-head">
        ${mascotAvatar('mascot-avatar--xl')}
        <div>
          <div class="eyebrow">${t('nav_coach')} · ${esc(MASCOT_NAME)}</div>
          <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 20px">${t('coach_title')}</h1>
        </div>
      </div>
      <div class="glass" style="padding:10px 18px;margin-bottom:16px;font-size:13.5px;color:var(--muted)">
        ${t('coach_overall')}: <strong style="color:var(--text)">${overall ?? t('not_assessed')}</strong> · ${t('coach_weakest')}: <strong style="color:var(--text);text-transform:capitalize">${weakest ?? t('not_assessed')}</strong> · ${t('coach_mistakes')}: <strong style="color:var(--text)">${store.mistakes.length}</strong>
      </div>
      <div class="glass" style="padding:20px;display:flex;flex-direction:column;gap:14px;max-height:420px;overflow-y:auto" id="coach-messages">
        ${store.coachMessages.length ? store.coachMessages.map(m => `
          <div class="coach-msg ${m.role === 'user' ? 'coach-msg--user' : 'coach-msg--ai'}">
            ${m.role === 'ai' ? mascotAvatar('mascot-avatar--msg') : ''}
            <div class="coach-msg-body">${esc(m.text)}</div>
          </div>`).join('')
        : `<div class="coach-empty">
             ${mascotImg('full', 'mascot--empty')}
             <p>${esc(t('mascot_coach_hi'))}</p>
           </div>`}
      </div>
      <form id="coach-form" style="display:flex;gap:10px;margin-top:14px">
        <input id="coach-input" class="btn btn-ghost" style="flex:1;text-align:left" placeholder="Ask about your IELTS practice..." />
        <button class="btn btn-primary" type="submit">Send ↗</button>
      </form>
    </section>`, 'coach');
}

function aiFeedbackBlock(feedback) {
  if (!feedback) return '';
  const str = (feedback.strengths || []).map(s => `<li>${esc(s)}</li>`).join('');
  const imp = (feedback.improvements || []).map(s => `<li>${esc(s)}</li>`).join('');
  const criteriaRows = Object.entries(feedback.criteria || {}).map(([k, v]) => `<div class="score-label"><span>${k.replace(/([A-Z])/g, ' $1')}</span><strong>${v}</strong></div>`).join('');
  const tasks = (feedback.tasks || []).map(t => `
    <div class="glass" style="padding:16px 20px;margin-top:14px">
      <div class="score-label"><span>${esc(t.title)}</span><strong class="result-band" style="font-size:20px">${t.band}<small style="font-size:12px"> / 9</small></strong></div>
      ${Object.entries(t.criteria || {}).map(([k, v]) => `<div class="score-label"><span>${k.replace(/([A-Z])/g, ' $1')}</span><strong>${v}</strong></div>`).join('')}
      <p style="color:var(--muted);font-size:14px;margin:12px 0">${esc(t.summary || '')}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div><p class="eyebrow">Strengths</p><ul style="font-size:13px;line-height:1.6;margin:0;padding-left:18px">${(t.strengths || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
        <div><p class="eyebrow">To improve</p><ul style="font-size:13px;line-height:1.6;margin:0;padding-left:18px">${(t.improvements || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
      </div>
    </div>`).join('');
  return `<div class="glass" style="padding:24px;margin-top:20px">
    <p class="eyebrow">AI Examiner Result</p>
    <div class="big" style="margin:10px 0">${feedback.band} <small>/ 9</small></div>
    ${criteriaRows}
    ${tasks}
    <p style="color:var(--muted);font-size:14px;margin:16px 0">${esc(feedback.summary || '')}</p>
    ${!feedback.tasks ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div><p class="eyebrow">Strengths</p><ul style="font-size:13.5px;line-height:1.7">${str}</ul></div>
      <div><p class="eyebrow">To improve</p><ul style="font-size:13.5px;line-height:1.7">${imp}</ul></div>
    </div>` : ''}
  </div>`;
}

function recordMistakes(section, questions, answers, keyFn) {
  questions.forEach((q, i) => {
    const given = answers[keyFn(i)];
    if (!SERVICES.isCorrect(q, given)) {
      const sig = `${section}:${q.prompt}:${SERVICES.normalizeAnswer(Array.isArray(q.answer) ? q.answer.join(',') : q.answer)}`;
      if (store.mistakes.some(m => m.sig === sig)) return; /* avoid duplicates across attempts */
      store.mistakes.push({
        sig, section, prompt: q.prompt,
        given: SERVICES.answerLabel(q, given),
        correct: SERVICES.answerLabel(q, q.answer),
        explanation: q.explanation || SERVICES.explanationFor(q, section, i),
        date: Date.now()
      });
    }
  });
}

/* ---------------- TIMERS ---------------- */
let timerInterval;
function startTimer(deadlineGetter, onExpire) {
  clearInterval(timerInterval);
  const el = document.querySelector('[data-timer]');
  if (!el) return;
  const tick = () => {
    const remaining = Math.floor((deadlineGetter() - Date.now()) / 1000);
    el.textContent = fmtTime(remaining);
    /* warn (pulse) during the final 5 minutes */
    if (remaining <= 300) el.classList.add('timer-danger');
    if (remaining <= 0) {
      clearInterval(timerInterval);
      notify(t('time_up'));
      onExpire();
    }
  };
  tick();
  timerInterval = setInterval(tick, 1000);
}
/* ---------------- BIND ---------------- */
function bind() {
  /* Stop any timer left over from a previous page so it cannot
     auto-submit in the background while the user is elsewhere. */
  clearInterval(timerInterval);
  document.querySelectorAll('[data-go]').forEach(el => el.onclick = () => go(el.dataset.go));

  /* Warning modal: the timer only starts on an explicit confirmation. */
  const warnStart = document.querySelector('[data-warn-start]');
  if (warnStart) warnStart.onclick = () => {
    const [sec, mins] = String(warnStart.dataset.warnStart).split(':');
    const dl = loadDeadline(sec, Number(mins));
    if (sec === 'listening') listeningState.deadline = dl;
    if (sec === 'reading') readingState.deadline = dl;
    if (sec === 'writing') writingState.deadline = dl;
    render();
  };
  const warnCancel = document.querySelector('[data-warn-cancel]');
  if (warnCancel) warnCancel.onclick = () => go('/mock');

  const r = route();
  if (r !== '/listening') stopListeningAudio();
  if (r === '/roadmap') bindRoadmap();
  if (r === '/leaderboard') bindLeaderboard();

  /* The admin panel binds its own handlers for #/admin. */
  if (window.IELTS_ADMIN && typeof window.IELTS_ADMIN.bind === 'function') window.IELTS_ADMIN.bind();

  if (r === '/listening') {
    if (listeningState.deadline) startTimer(() => listeningState.deadline, submitListening);
    const playBtn = document.querySelector('[data-play-part]');
    if (playBtn) playBtn.onclick = () => {
      const part = currentTest('listening').parts[listeningState.partIndex];
      const idleLabel = part.audioUrl ? '▶ ' + t('play_mp3') : '▶ ' + t('play_recording');
      /* A real uploaded MP3 (Supabase Storage) plays once, like the exam. */
      if (part.audioUrl) {
        if (typeof Audio === 'undefined') return notify('Audio playback is not supported in this browser');
        if (listeningState.audio) { try { listeningState.audio.pause(); } catch {} }
        const audio = new Audio(part.audioUrl);
        listeningState.audio = audio;
        playBtn.disabled = true; playBtn.textContent = 'Playing…';
        audio.onplay = () => { listeningState.played[part.id] = true; };
        audio.onended = () => { listeningState.played[part.id] = true; playBtn.textContent = '✓ ' + t('played'); };
        audio.onerror = () => { playBtn.disabled = false; playBtn.textContent = idleLabel; notify('Playback issue — the audio file could not be loaded'); };
        const started = audio.play();
        if (started && started.catch) started.catch(() => { playBtn.disabled = false; playBtn.textContent = idleLabel; notify('Playback blocked by the browser — press play again'); });
        return;
      }
      /* Fallback for tests without an MP3: the transcript is read aloud. */
      if (!window.speechSynthesis) return notify('Audio not supported in this browser');
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(part.transcript);
      utter.rate = 0.95;
      playBtn.disabled = true; playBtn.textContent = 'Playing…';
      utter.onstart = () => { listeningState.played[part.id] = true; };
      utter.onend = () => { listeningState.played[part.id] = true; playBtn.textContent = '✓ ' + t('played'); };
      utter.onerror = () => { playBtn.disabled = false; playBtn.textContent = idleLabel; notify('Playback issue — try again'); };
      window.speechSynthesis.speak(utter);
    };
    document.querySelectorAll('[data-l-answer]').forEach(el => el.onclick = () => {
      const globalIndex = listeningOffset() + Number(el.dataset.lAnswer);
      if (el.dataset.multi === '1') {
        /* multi-answer MC: toggle membership, several buttons stay selected */
        const list = Array.isArray(listeningState.answers[globalIndex]) ? [...listeningState.answers[globalIndex]] : [];
        const v = Number(el.dataset.value);
        const at = list.indexOf(v);
        if (at >= 0) list.splice(at, 1); else list.push(v);
        listeningState.answers[globalIndex] = list;
        el.classList.toggle('selected', at < 0);
        return;
      }
      listeningState.answers[globalIndex] = el.dataset.value;
      /* select in place — no full re-render, scroll position and focus are kept */
      el.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.toggle('selected', b === el));
    });
    document.querySelectorAll('[data-l-text]').forEach(el => el.onchange = () => {
      const globalIndex = listeningOffset() + Number(el.dataset.lText);
      listeningState.answers[globalIndex] = el.value;
    });
    const lNext = document.querySelector('[data-l-next]');
    if (lNext) lNext.onclick = () => { stopListeningAudio(); listeningState.partIndex++; render(); };
    const lPrev = document.querySelector('[data-l-prev]');
    if (lPrev) lPrev.onclick = () => { stopListeningAudio(); listeningState.partIndex--; render(); };
    const lSubmit = document.querySelector('[data-l-submit]');
    if (lSubmit) lSubmit.onclick = submitListening;
  }

  if (r === '/reading') {
    if (readingState.deadline) startTimer(() => readingState.deadline, submitReading);
    document.querySelectorAll('[data-r-answer]').forEach(el => el.onclick = () => {
      const key = `${readingState.passageIndex}-${el.dataset.rAnswer}`;
      if (el.dataset.multi === '1') {
        const list = Array.isArray(readingState.answers[key]) ? [...readingState.answers[key]] : [];
        const v = Number(el.dataset.value);
        const at = list.indexOf(v);
        if (at >= 0) list.splice(at, 1); else list.push(v);
        readingState.answers[key] = list;
        el.classList.toggle('selected', at < 0);
        return;
      }
      readingState.answers[key] = el.dataset.value;
      el.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.toggle('selected', b === el));
    });
    document.querySelectorAll('[data-r-text]').forEach(el => el.onchange = () => {
      const key = `${readingState.passageIndex}-${el.dataset.rText}`;
      readingState.answers[key] = el.value;
    });
    const rNext = document.querySelector('[data-r-next]');
    if (rNext) rNext.onclick = () => { readingState.passageIndex++; render(); };
    const rPrev = document.querySelector('[data-r-prev]');
    if (rPrev) rPrev.onclick = () => { readingState.passageIndex--; render(); };
    const rSubmit = document.querySelector('[data-r-submit]');
    if (rSubmit) rSubmit.onclick = submitReading;
  }

  if (r === '/writing') {
    if (writingState.deadline) startTimer(() => writingState.deadline, () => document.querySelector('[data-w-submit]')?.click());
    document.querySelectorAll('[data-w-text]').forEach(el => el.oninput = () => {
      writingState.answers[el.dataset.wText] = el.value;
      const words = el.value.trim() ? el.value.trim().split(/\s+/).length : 0;
      const minWords = Number(el.dataset.minWords) || 0;
      const label = document.querySelector(`.word-count-${el.dataset.wText}`);
      if (label) {
        label.textContent = t2('words', { n: words }) + (minWords ? ` · min ${minWords}` : '');
        label.classList.toggle('word-count--short', !!(minWords && words < minWords));
      }
    });
    const wSubmit = document.querySelector('[data-w-submit]');
    if (wSubmit) wSubmit.onclick = async () => {
      const submissionScope = storageKey();
      const submissionTest = store.selectedTest;
      const tasks = currentTest('writing').tasks;
      const payload = { mode: 'writing', tasks: tasks.map((t, i) => ({ title: t.title, prompt: t.prompt, response: writingState.answers[i] || '', minWords: t.minWords, criteria: t.criteria || '' })) };
      wSubmit.disabled = true; wSubmit.textContent = t('grading');
      try {
        const res = await fetch('/api/grade', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Grading failed');
        if (storageKey() !== submissionScope || store.selectedTest !== submissionTest) return;
        store.attempts.push({ section: 'writing', test: submissionTest, band: data.band, date: Date.now(), feedback: data });
        store.feedback.writing = data;
        save();
        clearTimerAndDeadline('writing');
        resetSectionStates();
        const resultBox = document.querySelector('#writing-result');
        if (resultBox) resultBox.innerHTML = aiFeedbackBlock(data);
        wSubmit.disabled = true; wSubmit.textContent = '✓ ' + t('test_done');
      } catch (err) {
        notify(`Error: ${err.message}`);
        wSubmit.disabled = false; wSubmit.textContent = t('submit_writing') + ' ↗';
      }
    };
  }

  if (r === '/speaking') {
    document.querySelectorAll('[data-sp-record]').forEach(el => el.onclick = () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return notify('Speech recognition not supported — try Chrome or Edge');
      const recognition = new SR();
      recognition.lang = 'en-US'; recognition.interimResults = false;
      el.textContent = '● Recording…'; el.disabled = true;
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        const part = currentTest('speaking').parts[speakingState.partIndex];
        if (part.partNumber === 1) speakingState.transcripts.sp1[el.dataset.spRecord] = text;
        if (part.partNumber === 3) speakingState.transcripts.sp3[el.dataset.spRecord] = text;
        const label = document.querySelector(`.sp-transcript-${el.dataset.spRecord}`);
        if (label) label.textContent = `You said: "${text}"`;
        el.textContent = '✓ Recorded'; el.disabled = false;
      };
      recognition.onerror = () => { el.textContent = '● Record answer'; el.disabled = false; notify('Recording error, try again'); };
      recognition.start();
    });
    const spNext = document.querySelector('[data-sp-next]');
    if (spNext) spNext.onclick = () => { speakingState.partIndex++; render(); };
    const spSubmit = document.querySelector('[data-sp-submit]');
    if (spSubmit) spSubmit.onclick = async () => {
      const submissionScope = storageKey();
      const submissionTest = store.selectedTest;
      const test = currentTest('speaking');
      const parts = test.parts.map((p) => ({
        title: p.title,
        qa: p.partNumber === 1
          ? speakingPart1Flat(p).map((x, i) => ({ q: x.topic ? `${x.topic}: ${x.q}` : x.q, a: speakingState.transcripts.sp1[i] || '' }))
          : p.partNumber === 2
            ? [{ q: p.topic, a: speakingState.transcripts.sp2 || '' }]
            : (p.questions || []).map((q, i) => ({ q, a: speakingState.transcripts.sp3[i] || '' }))
      }));
      const hasAny = parts.some(p => p.qa.some(x => x.a));
      if (!hasAny) return notify('Please record at least one answer first');
      spSubmit.disabled = true; spSubmit.textContent = t('grading');
      try {
        const res = await fetch('/api/grade', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'speaking', parts })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Grading failed');
        if (storageKey() !== submissionScope || store.selectedTest !== submissionTest) return;
        store.attempts.push({ section: 'speaking', test: submissionTest, band: data.band, date: Date.now(), feedback: data });
        store.feedback.speaking = data;
        save();
        clearTimerAndDeadline('speaking');
        resetSectionStates();
        const resultBox = document.querySelector('#speaking-result');
        if (resultBox) resultBox.innerHTML = aiFeedbackBlock(data);
        spSubmit.disabled = true; spSubmit.textContent = '✓ ' + t('test_done');
      } catch (err) {
        notify(`Error: ${err.message}`);
        spSubmit.disabled = false; spSubmit.textContent = t('finish_speaking') + ' ↗';
      }
    };
    const cueFlow = document.querySelector('#speaking-cue-flow');
    if (cueFlow) {
      /* Real IELTS Part 2 timings come from the content (default 60s prep,
         120s talk) so an admin-authored cue card keeps its own rules. */
      const cuePart = currentTest('speaking').parts[speakingState.partIndex] || {};
      const cuePrep = Number(cuePart.prepSeconds) > 0 ? Number(cuePart.prepSeconds) : 60;
      const cueTalk = Number(cuePart.talkSeconds) > 0 ? Number(cuePart.talkSeconds) : 120;
      let sp2Timers = [];
      let sp2Recognition = null;
      let sp2Phase = 'idle'; /* idle → prep → recording → done */
      const sp2Btn = document.createElement('button');
      sp2Btn.className = 'btn btn-primary';
      sp2Btn.style.marginTop = '16px';
      sp2Btn.textContent = `Start ${cuePrep >= 60 ? Math.round(cuePrep / 60) + '-minute' : cuePrep + '-second'} prep`;
      cueFlow.appendChild(sp2Btn);
      const status = document.createElement('p');
      status.className = 'micro';
      cueFlow.appendChild(status);
      function stopSp2Timers() { while (sp2Timers.length) clearInterval(sp2Timers.pop()); }
      function setSp2Phase(p) {
        sp2Phase = p;
        sp2Btn.disabled = (p === 'prep' || p === 'recording');
        sp2Btn.textContent = p === 'done' ? '↻ Re-record answer' : p === 'recording' ? 'Recording…' : `Start ${cuePrep >= 60 ? Math.round(cuePrep / 60) + '-minute' : cuePrep + '-second'} prep`;
      }
      function startRecordingPart2() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { notify('Speech recognition not supported — try Chrome or Edge'); setSp2Phase('idle'); return; }
        let talkLeft = cueTalk;
        let restarts = 0;
        let prevSeg = ''; /* committed transcript of previous recognition sessions */
        const DONE = '✓ Recorded. Click Next part when ready.';
        function makeRecognition() {
          const recognition = new SR();
          sp2Recognition = recognition;
          recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = false;
          recognition.onresult = (e) => {
            /* final results only; committed text grows monotonically within a session */
            let committed = '';
            for (let i = 0; i < e.results.length; i++) if (e.results[i].isFinal) committed += e.results[i][0].transcript + ' ';
            speakingState.transcripts.sp2 = (prevSeg + ' ' + committed).trim();
          };
          recognition.onend = () => {
            if (sp2Phase !== 'recording') return; /* user stopped or moved on */
            let committed = '';
            try {
              for (let i = 0; i < recognition.results.length; i++) if (recognition.results[i].isFinal) committed += recognition.results[i][0].transcript + ' ';
            } catch {}
            prevSeg = (prevSeg + ' ' + committed).trim();
            speakingState.transcripts.sp2 = prevSeg;
            if (talkLeft > 2 && restarts < 5) {
              /* Chrome stops continuous recognition after ~60s — restart it so the full
                 2 minutes are captured, keeping the already-committed transcript. */
              restarts++;
              try { recognition.start(); status.textContent = `🔴 Recording… ${talkLeft}s left`; }
              catch { setSp2Phase('done'); status.textContent = DONE; }
            } else {
              setSp2Phase('done'); status.textContent = DONE;
            }
          };
          recognition.onerror = (e) => {
            if (sp2Phase === 'recording' && e && e.error === 'not-allowed') {
              setSp2Phase('idle');
              status.textContent = 'Microphone access was denied — click to try again.';
            }
            /* other errors: onend fires next and handles the restart */
          };
          try { recognition.start(); } catch { setSp2Phase('idle'); }
        }
        makeRecognition();
        setSp2Phase('recording');
        status.textContent = `🔴 Recording… speak now (${cueTalk >= 60 ? Math.round(cueTalk / 60) + ' minutes' : cueTalk + ' seconds'})`;
        sp2Timers.push(setInterval(() => {
          talkLeft--;
          if (talkLeft <= 0) {
            stopSp2Timers();
            try { if (sp2Recognition) sp2Recognition.stop(); } catch {}
            setSp2Phase('done');
            status.textContent = DONE;
          } else if (sp2Phase === 'recording') {
            status.textContent = `🔴 Recording… ${talkLeft}s left`;
          }
        }, 1000));
      }
      sp2Btn.onclick = () => {
        if (sp2Recognition && sp2Phase === 'recording') { try { sp2Recognition.stop(); } catch {} }
        stopSp2Timers();
        setSp2Phase('prep');
        let prep = cuePrep;
        status.textContent = `Prep time: ${prep}s`;
        sp2Timers.push(setInterval(() => {
          prep--;
          if (prep <= 0) { stopSp2Timers(); startRecordingPart2(); }
          else status.textContent = `Prep time: ${prep}s`;
        }, 1000));
      };
    }
  }

  if (r === '/coach') {
    const form = document.querySelector('#coach-form');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      if (coachSending) return;
      const input = document.querySelector('#coach-input');
      const text = input.value.trim();
      if (!text) return;
      store.coachMessages.push({ role: 'user', text });
      save(); render();
      coachSending = true;
      try {
        const res = await fetch('/api/coach', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            profile: { band: bandAverage(), weakest: weakestSkill(), mistakeCount: store.mistakes.length },
            history: store.coachMessages
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Coach error');
        store.coachMessages.push({ role: 'ai', text: data.reply });
      } catch (err) {
        store.coachMessages.push({ role: 'ai', text: `Sorry, I couldn't respond: ${err.message}` });
      } finally {
        coachSending = false;
        save(); render();
      }
    };
  }

  /* Results page: show saved AI feedback for an attempt */
  document.querySelectorAll('[data-detail]').forEach(el => el.onclick = () => {
    const i = Number(el.dataset.detail);
    const attempt = [...store.attempts].sort((a, b) => b.date - a.date)[i];
    const box = document.querySelector('#result-detail');
    if (!attempt || !box) return;
    const fb = attempt.feedback || store.feedback[attempt.section];
    box.innerHTML = fb
      ? aiFeedbackBlock(fb)
      : `<div class="glass" style="padding:20px"><p class="micro" style="margin:0">${t('no_feedback')}</p></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* Mistakes page: remove a single mistake */
  document.querySelectorAll('[data-remove-mistake]').forEach(el => el.onclick = () => {
    const sig = el.dataset.removeMistake;
    const idx = store.mistakes.findIndex(m => m.sig === sig);
    if (idx >= 0) { store.mistakes.splice(idx, 1); save(); render(); }
  });

  const cloudRefresh = document.querySelector('[data-cloud-refresh]');
  if (cloudRefresh) cloudRefresh.onclick = () => syncCloudResults(true);
  bindNavExtras();
  bindPremium();
}

function bindPremium() {
  const r = route();

  /* Test switch: change the selected practice test and reset section state. */
  document.querySelectorAll('[data-test]').forEach(el => el.onclick = () => {
    const id = el.dataset.test;
    if (store.selectedTest === id) return;
    stopListeningAudio();
    store.selectedTest = id;
    save();
    listeningState = { partIndex: 0, answers: {}, played: {}, deadline: null, audio: null };
    readingState = { passageIndex: 0, answers: {}, deadline: null };
    writingState = { answers: {}, deadline: null };
    speakingState = { partIndex: 0, transcripts: { sp1: [], sp2: '', sp3: [] } };
    render();
  });

  /* Theme + language toggles (available from the nav on every page). */
  document.querySelectorAll('[data-toggle-theme]').forEach(el => el.onclick = () => {
    store.theme = store.theme === 'light' ? 'dark' : 'light';
    save(); applyPrefs(); render();
  });
  document.querySelectorAll('[data-toggle-lang]').forEach(el => el.onclick = () => {
    store.lang = store.lang === 'en' ? 'uz' : store.lang === 'uz' ? 'ru' : 'en';
    save(); applyPrefs(); render();
  });
  document.querySelectorAll('[data-set-lang]').forEach(el => el.onclick = () => {
    store.lang = el.dataset.setLang; save(); applyPrefs(); render();
  });
  document.querySelectorAll('[data-set-theme]').forEach(el => el.onclick = () => {
    store.theme = el.dataset.setTheme; save(); applyPrefs(); render();
  });
  /* Bandly: hide/show the floating companion, and dismiss a single tip. */
  document.querySelectorAll('[data-set-mascot]').forEach(el => el.onclick = () => {
    store.mascotMuted = el.dataset.setMascot === 'off'; save(); render();
  });
  document.querySelectorAll('[data-mascot-dismiss]').forEach(el => el.onclick = () => {
    store.mascotSeen = store.mascotSeen || {};
    store.mascotSeen[el.dataset.mascotDismiss] = true; save(); render();
  });

  /* Lessons filters. */
  document.querySelectorAll('[data-filter-lesson]').forEach(el => el.onclick = () => {
    const cat = el.dataset.filterLesson;
    document.querySelectorAll('.lesson-card').forEach(card => {
      card.style.display = (cat && card.dataset.cat !== cat) ? 'none' : '';
    });
    document.querySelectorAll('[data-filter-lesson]').forEach(b => b.classList.toggle('active', b === el));
  });
  document.querySelectorAll('[data-lesson-open]').forEach(el => el.onclick = () => {
    const id = el.dataset.lessonOpen;
    if (!(CONTENT.lessons || []).some(x => x.id === id)) return;
    lessonModalId = id;
    render();
  });
  /* Lesson modal: close via button, backdrop click (or Escape in bindNavExtras). */
  document.querySelectorAll('[data-lesson-close]').forEach(el => el.onclick = () => {
    lessonModalId = null; render();
  });
  const lessonBackdrop = document.querySelector('#lessonBackdrop');
  if (lessonBackdrop) lessonBackdrop.onclick = (e) => {
    if (e.target === lessonBackdrop) { lessonModalId = null; render(); }
  };
  document.querySelectorAll('[data-lesson-goto-quiz]').forEach(el => el.onclick = () => {
    lessonModalId = null; go('/quiz');
  });

  /* Vocabulary mastery toggle. */
  document.querySelectorAll('[data-vocab-word]').forEach(el => el.onclick = () => {
    const w = el.dataset.vocabWord;
    if (store.vocabKnown[w]) delete store.vocabKnown[w]; else store.vocabKnown[w] = true;
    save(); render();
  });

  /* Quiz interactions. */
  document.querySelectorAll('[data-quiz-answer]').forEach(el => el.onclick = () => {
    quizState.answers[quizState.index] = el.dataset.quizAnswer;
    render();
  });
  const qBack = document.querySelector('[data-quiz-back]');
  if (qBack) qBack.onclick = () => { quizState.index = Math.max(0, quizState.index - 1); render(); };
  const qNext = document.querySelector('[data-quiz-next]');
  if (qNext) qNext.onclick = () => {
    const q = quizState.questions[quizState.index];
    if (q && String(quizState.answers[quizState.index]) === String(q.answer)) quizState.score++;
    quizState.index++; render();
  };
  const qFinish = document.querySelector('[data-quiz-finish]');
  if (qFinish) qFinish.onclick = () => {
    const q = quizState.questions[quizState.index];
    if (q && String(quizState.answers[quizState.index]) === String(q.answer)) quizState.score++;
    quizState.done = true; render();
  };
  const qRestart = document.querySelector('[data-quiz-restart]');
  if (qRestart) qRestart.onclick = () => {
    quizState = { questions: [], index: 0, answers: {}, done: false, score: 0 };
    render();
  };

  /* All authentication goes through Supabase — never a local/demo fallback. */
  const authForm = document.querySelector('#auth-form');
  if (authForm) authForm.onsubmit = async (e) => {
    e.preventDefault();
    if (authBusy) return;
    if (!CLOUD || CLOUD.getState().status !== 'ready') {
      setAuthNotice('error', t('auth_unavailable'));
      return;
    }
    const fd = new FormData(authForm);
    const mode = authForm.dataset.authMode;
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const name = String(fd.get('name') || '').trim() || email.split('@')[0] || 'User';
    const sourceRoute = route();
    authBusy = true;
    setAuthNotice('loading', t('auth_wait'));
    updateAuthControls();
    try {
      const data = await CLOUD.authenticate({ mode, email, password, name });
      if (route() !== sourceRoute) return;
      if (mode === 'signup' && !data.session) {
        setAuthNotice('success', t('auth_confirm_sent'));
        const passwordInput = authForm.querySelector('[name="password"]');
        if (passwordInput) passwordInput.value = '';
      } else if (data.session && data.user) {
        const target = pendingRoute; pendingRoute = null;
        applyCloudUser(data.user);
        // If Confirm Email is off in Supabase, don't claim an email was sent.
        if (mode === 'signup') setAuthNotice('success', t('auth_created'));
        else { authNotice = null; go(target || '/dashboard'); }
      }
    } catch (error) {
      if (route() === sourceRoute) setAuthNotice('error', error.message || t('auth_request_failed'));
    } finally {
      authBusy = false;
      updateAuthControls();
    }
  };
  const googleBtn = document.querySelector('[data-google-auth]');
  if (googleBtn) googleBtn.onclick = async () => {
    if (authBusy) return;
    if (!CLOUD || CLOUD.getState().status !== 'ready') return setAuthNotice('error', t('auth_unavailable'));
    authBusy = true; updateAuthControls();
    try { await CLOUD.googleSignIn(); }
    catch (error) { setAuthNotice('error', error.message || t('auth_request_failed')); }
    finally { authBusy = false; updateAuthControls(); }
  };

}

function bindNavExtras() {
  const hamburger = document.querySelector('#hamburgerBtn');
  const mobileMenu = document.querySelector('#mobileMenu');
  const closeMenu = document.querySelector('#closeMenuBtn');

  const userChip = document.querySelector('#userChip');
  const userMenu = document.querySelector('#userMenu');
  if (userChip && userMenu) {
    userChip.onclick = (e) => {
      e.stopPropagation();
      setMenu(userMenu, !userMenu.classList.contains('open'), userChip);
    };
  }

  if (hamburger && mobileMenu) {
    const close = () => { mobileMenu.classList.remove('open'); if (hamburger) hamburger.setAttribute('aria-expanded', 'false'); };
    hamburger.onclick = () => { mobileMenu.classList.add('open'); hamburger.setAttribute('aria-expanded', 'true'); };
    if (closeMenu) closeMenu.onclick = close;
    mobileMenu.querySelectorAll('a').forEach(a => a.onclick = close);
  }

  bindDocOnce();

  /* Explicit sign-out from the user menu / mobile menu — no native confirm(). */
  document.querySelectorAll('[data-logout]').forEach(el => {
    el.onclick = async () => {
      pendingRoute = null;
      if (!CLOUD || logoutBusy) return;
      logoutBusy = true; el.disabled = true;
      try {
        await CLOUD.logout();
        applyCloudUser(null);
        authNotice = null;
        go('/login');
        notify(t('auth_signed_out'));
      } catch (error) { notify(error.message || t('auth_request_failed')); }
      finally { logoutBusy = false; el.disabled = false; }
    };
  });
}

function setMenu(menu, open, trigger) {
  if (!menu || !menu.classList || !menu.classList.toggle) return;
  menu.classList.toggle('open', open);
  if (trigger && trigger.setAttribute) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/* Document-level listeners bound exactly once (elements are queried per event,
   so they stay valid across re-renders). */
let docListenersBound = false;
function bindDocOnce() {
  if (docListenersBound || typeof document === 'undefined' || !document.addEventListener) return;
  docListenersBound = true;

  /* sticky header shadow on scroll */
  if (typeof window !== 'undefined' && window.addEventListener) {
    const onScroll = () => {
      const header = document.querySelector('#siteHeader');
      if (header && header.classList && header.classList.toggle) {
        header.classList.toggle('scrolled', window.scrollY > 8);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* close the user dropdown when clicking anywhere outside it */
  document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('#userMenu');
    if (userMenu && userMenu.classList.contains('open') && !e.target.closest('.nav-user')) {
      setMenu(userMenu, false, document.querySelector('#userChip'));
    }
  });

  /* Escape closes menus and the lesson modal */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const mm = document.querySelector('#mobileMenu');
    if (mm) mm.classList.remove('open');
    const hb = document.querySelector('#hamburgerBtn');
    if (hb) hb.setAttribute('aria-expanded', 'false');
    if (lessonModalId) { lessonModalId = null; render(); }
    if (roadmapState.topicId) { roadmapState.topicId = null; roadmapState.answers = []; roadmapState.result = null; roadmapState.submitError = ''; roadmapState.saving = false; render(); }
  });
}

/* ---------------- SUBMIT HANDLERS ---------------- */
function clearTimerAndDeadline(section) {
  clearInterval(timerInterval);
  clearDeadline(section);
}

/* Grade the current in-memory answers and return the attempt object
   (does not persist — callers decide when to record it). */
function gradeListening() {
  const allQuestions = currentTest('listening').parts.flatMap(p => p.questions);
  recordMistakes('listening', allQuestions, listeningState.answers, i => i);
  const correct = allQuestions.filter((q, i) => SERVICES.isCorrect(q, listeningState.answers[i])).length;
  const band = SERVICES.bandFromRaw(correct, allQuestions.length);
  return { section: 'listening', test: store.selectedTest, band, raw: correct, total: allQuestions.length, date: Date.now() };
}
function gradeReading() {
  let correct = 0, total = 0;
  currentTest('reading').passages.forEach((p, pi) => {
    recordMistakes('reading', p.questions, readingState.answers, qi => `${pi}-${qi}`);
    p.questions.forEach((q, qi) => { total++; if (SERVICES.isCorrect(q, readingState.answers[`${pi}-${qi}`])) correct++; });
  });
  const band = SERVICES.bandFromRaw(correct, total);
  return { section: 'reading', test: store.selectedTest, band, raw: correct, total, date: Date.now() };
}

function submitListening() {
  stopListeningAudio();
  const a = gradeListening();
  store.attempts.push(a);
  save();
  clearTimerAndDeadline('listening');
  notify(t2('complete_listening', { band: a.band, raw: a.raw, total: a.total }));
  resetSectionStates();
  go('/results');
}

function submitReading() {
  const a = gradeReading();
  store.attempts.push(a);
  save();
  clearTimerAndDeadline('reading');
  notify(t2('complete_reading', { band: a.band, raw: a.raw, total: a.total }));
  resetSectionStates();
  go('/results');
}

/* ---------------- TEST FLOW: gate → warning → live → locked ---------------- */
/* A test section can be in one of four states for the signed-in user and the
   selected practice test:
     locked     – an attempt already exists → results-only view, no retake;
     gated      – not signed in → sign-in card;
     warned     – no deadline yet → page renders under a warning modal and the
                  timer only starts after an explicit "Start";
     live       – deadline saved → timer runs; on expiry the attempt is
                  recorded automatically and the section locks.            */
function warningModal(section, minutes) {
  return `
  <div class="modal-backdrop" id="warnBackdrop">
    <div class="modal glass" role="dialog" aria-modal="true" aria-labelledby="warnTitle">
      ${mascotBubble(t('mascot_tip_' + section), { cls: 'mascot-say--warn', title: MASCOT_NAME })}
      <div class="warn-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
      <h2 id="warnTitle" style="font-family:var(--font-display);font-size:22px;margin:12px 0 10px">${t('warn_title')}</h2>
      <p style="color:var(--muted);font-size:14.5px;line-height:1.7;margin:0 0 22px">${t2('warn_body', { minutes, start: t('warn_start') })}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" data-warn-start="${section}:${minutes}">${t('warn_start')} ↗</button>
        <button class="btn btn-ghost" data-warn-cancel>${t('warn_cancel')}</button>
      </div>
    </div>
  </div>`;
}

function gateView() {
  return shell(`
    <section class="section auth-wrap">
      <div class="glass auth-card center-card">
        ${mascotImg('head', 'mascot--gate')}
        <div class="warn-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
        <h1 style="font-family:var(--font-display);font-size:22px;margin:12px 0 8px">${t('gate_title')}</h1>
        <p class="micro" style="margin-bottom:20px">${t('gate_body')}</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a class="btn btn-primary" href="#/login">${t('nav_login')} ↗</a>
          <a class="btn btn-ghost" href="#/signup">${t('auth_signup_title')}</a>
        </div>
      </div>
    </section>`, 'auth');
}

function completedView(section, attempt) {
  const fb = store.feedback ? store.feedback[section] : null;
  const a = attempt || {};
  return shell(`
    <section class="section">
      <div class="glass center-card" style="max-width:680px;margin:34px auto;padding:34px;text-align:center">
        <div class="warn-icon ok">✓</div>
        <h1 style="font-family:var(--font-display);font-size:26px;margin:14px 0 6px">${t('done_title')}</h1>
        <p class="micro" style="margin-bottom:18px">${t('done_body')}</p>
        <div class="result-band">${a.band != null ? a.band : '—'}<small> / 9</small></div>
        ${mascotBubble(t('mascot_done'), { cls: 'mascot-say--done' })}
        ${a.raw !== undefined ? `<p class="micro" style="margin-top:6px">${a.raw}/${a.total} · ${new Date(a.date).toLocaleDateString()}</p>` : `<p class="micro" style="margin-top:6px">${new Date(a.date || Date.now()).toLocaleDateString()}</p>`}
        <p class="micro">${BAND_LABEL[section] || section} · ${esc(SERVICES.testLabel(a.test || store.selectedTest, store.lang))}</p>
        <div style="text-align:left">${aiFeedbackBlock(fb)}</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:22px;flex-wrap:wrap">
          <button class="btn btn-primary" data-go="/results">${t('nav_results')} ↗</button>
          <button class="btn btn-ghost" data-go="/mock">${t('nav_mock')} ↗</button>
        </div>
      </div>
    </section>`, section);
}

/* Time ran out (either live on the page or while the user was away):
   record the attempt from whatever answers exist and lock the section. */
function finalizeTimeout(section) {
  clearInterval(timerInterval);
  let attempt = null;
  if (section === 'listening') attempt = gradeListening();
  else if (section === 'reading') attempt = gradeReading();
  else if (section === 'speaking') {
    attempt = { section: 'speaking', test: store.selectedTest, band: null, date: Date.now(), timedOut: true };
  }
  else if (section === 'writing') {
    attempt = { section: 'writing', test: store.selectedTest, band: null, date: Date.now(), timedOut: true };
    const tasks = currentTest('writing').tasks;
    const submissionScope = storageKey();
    const payload = { mode: 'writing', tasks: tasks.map((tk, i) => ({ title: tk.title, prompt: tk.prompt, response: writingState.answers[i] || '' })) };
    fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data || storageKey() !== submissionScope) return;
        attempt.band = data.band;
        attempt.feedback = data;
        store.feedback.writing = data;
        save();
        if (route() === '/writing') render();
      })
      .catch(() => {});
  }
  if (attempt) { store.attempts.push(attempt); save(); }
  clearDeadline(section);
  resetSectionStates();
  notify(t('time_up'));
  return completedView(section, attempt);
}

function testGate(section, minutes, pageFn) {
  if (!CLOUD || CLOUD.getState().status !== 'ready') {
    return shell(`<section class="section"><div class="glass auth-notice auth-notice--error" role="status">${esc(CLOUD && CLOUD.getState().status === 'loading' ? t('auth_connecting') : t('auth_unavailable'))}</div></section>`, section);
  }
  if (!cloudUserActive()) { pendingRoute = '/' + section; return gateView(); }
  if (!currentTest(section)) return unavailableTestContent(section);
  const done = attemptFor(section, store.selectedTest);
  if (done) return completedView(section, done);
  const raw = rawDeadline(section);
  if (raw) return raw > Date.now() ? pageFn() : finalizeTimeout(section);
  return pageFn() + warningModal(section, minutes);
}

/* ---------------- DASHBOARD ---------------- */
function bandSvg(trend) {
  const w = 560, h = 180, pad = 30;
  const max = 9, min = 0;
  const xs = trend.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, trend.length - 1));
  const ys = trend.map(p => h - pad - ((p.band - min) / (max - min)) * (h - pad * 2));
  const poly = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const last = xs.length ? { x: xs[xs.length - 1], y: ys[ys.length - 1] } : null;
  return `<svg class="band-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${t('band_trend')}">
    <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="var(--panel-border)" />
    ${[0, 3, 6, 9].map(v => { const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2); return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="var(--panel-border)" stroke-dasharray="4 5"/><text x="8" y="${y + 4}" fill="var(--muted)" font-size="11">${v}</text>`; }).join('')}
    <polyline points="${poly}" fill="none" stroke="var(--cyan)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="4" fill="var(--cyan)"><title>${trend[i].section}: ${trend[i].band} (${trend[i].label})</title></circle>`).join('')}
    ${last ? `<circle cx="${last.x}" cy="${last.y}" r="6" fill="var(--coral)" />` : ''}
  </svg>`;
}

function dashboard() {
  const overall = SERVICES.overallBand(store.attempts);
  const weakest = weakestSkill();
  const trend = SERVICES.bandTrend(store.attempts);
  const week = SERVICES.weeklyActivity(store.attempts);
  const plan = SERVICES.personalPlan(store.attempts);
  const minutes = SERVICES.studyMinutes(store.attempts);
  const user = store.user;
  return shell(`
    <section class="section">
      <div class="section-header">
        <div><div class="eyebrow">${t('nav_dashboard')}</div><h1 style="margin:8px 0 6px">${t('dashboard_title')}</h1><p class="micro">${t('dashboard_subtitle')}</p></div>
        ${user ? `<div class="glass user-panel"><img src="${esc(user.picture || '')}" alt=""/><div><h3>${esc(user.name || 'User')}</h3><p class="micro">${esc(user.email || '')}</p></div></div>` : `<a class="btn btn-primary" href="#/login">${t('nav_login')} ↗</a>`}
      </div>
      <div class="stat-grid">
        <div class="stat"><span>${t('overall_band')}</span><strong>${overall ?? '—'}<small> /9</small></strong></div>
        <div class="stat"><span>${t('weakest_skill')}</span><strong class="cap">${weakest || '—'}</strong></div>
        <div class="stat"><span>${t('study_minutes')}</span><strong>${minutes}<small> min</small></strong></div>
        <div class="stat"><span>${t('attempts_stat')}</span><strong>${store.attempts.length}</strong></div>
      </div>
      <div class="dash-grid">
        <div class="glass dash-panel">
          <div class="panel-title">${t('band_trend')}</div>
          ${trend.length ? bandSvg(trend) : `<div class="panel-empty">${mascotImg('head', 'mascot--mini')}<p class="micro">${esc(t('mascot_empty_trend'))}</p></div>`}
        </div>
        <div class="glass dash-panel">
          <div class="panel-title">${t('weekly_activity')}</div>
          <div class="week">${week.map(d => `<div class="bar-col"><i style="height:${Math.max(6, d.pct)}%"></i><span>${d.count}</span><em>${esc(d.label)}</em></div>`).join('')}</div>
        </div>
      </div>
      <div class="glass">
        <div class="panel-title">${t('personalized_plan')}</div>
        <div class="plan-list">${plan.map(p => `<div class="plan-item"><span class="pill">${esc(p.day)}</span><div><strong>${esc(p.title)}</strong><p class="micro">${esc(p.detail)}</p></div></div>`).join('')}</div>
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
          <button class="btn btn-primary" data-go="/mock">${t('start_full_mock')} ↗</button>
          <button class="btn btn-ghost" data-go="/quiz">${t('nav_quiz')} ↗</button>
          <button class="btn btn-ghost" data-go="/lessons">${t('lesson_list')} ↗</button>
        </div>
      </div>
    </section>`, 'dashboard');
}

/* ---------------- LESSONS ---------------- */
let lessonModalId = null;
function lessonModalHtml() {
  const l = (CONTENT.lessons || []).find(x => x.id === lessonModalId);
  if (!l) return '';
  return `
  <div class="modal-backdrop" id="lessonBackdrop">
    <div class="modal glass" role="dialog" aria-modal="true" aria-labelledby="lessonModalTitle">
      <button class="modal-close" data-lesson-close aria-label="${t('modal_close')}">×</button>
      <div class="test-meta"><span>${esc(l.category)}</span><span>${esc(l.level)}</span><span>${l.minutes} min</span></div>
      <h2 id="lessonModalTitle" style="font-family:var(--font-display);font-size:22px;margin:12px 0 14px">${esc(l.title)}</h2>
      <ul class="lesson-bullets" style="margin-top:0">${l.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap">
        <button class="btn btn-primary" data-lesson-goto-quiz>${t('lesson_practice')} ↗</button>
        <button class="btn btn-ghost" data-lesson-close>${t('modal_close')}</button>
      </div>
    </div>
  </div>`;
}
function lessons() {
  const list = CONTENT.lessons || [];
  const cats = [...new Set(list.map(l => l.category))];
  return shell(`
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">${t('lesson_list')}</div><h1 style="margin:8px 0 0">${t('lesson_list')}</h1></div></div>
      <div class="filter-pills">${cats.map(c => `<button class="pill" data-filter-lesson="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="lesson-grid">${list.map(lessonCard).join('')}</div>
    </section>`, 'lessons');
}
function lessonCard(l) {
  return `<article class="test-card lesson-card" data-cat="${esc(l.category)}"><div class="test-meta"><span>${esc(l.category)}</span><span>${esc(l.level)}</span></div><h3>${esc(l.title)}</h3><p class="micro">${l.minutes} min</p><ul class="lesson-bullets">${l.bullets.slice(0, 3).map(b => `<li>${esc(b)}</li>`).join('')}</ul><button class="btn btn-ghost btn-sm" data-lesson-open="${esc(l.id)}">Read ↗</button></article>`;
}

/* ---------------- ROADMAP + GAMIFICATION ---------------- */
function gamificationGate() {
  const state = CLOUD && CLOUD.getState ? CLOUD.getState() : null;
  if (!state || state.status !== 'ready') {
    const message = state && state.status === 'loading'
      ? t('gamification_connecting')
      : state && state.status === 'error'
        ? t('gamification_unavailable')
        : t('gamification_supabase_required');
    return shell(`<section class="section auth-wrap"><div class="glass center-card gamification-gate">
      <div class="warn-icon">🪙</div><h1>${esc(t('gamification_title'))}</h1>
      <p class="micro">${esc(message)}</p>
      <p class="micro">${esc(t('gamification_setup_hint'))}</p>
    </div></section>`, route().slice(1));
  }
  if (!cloudUserActive()) {
    return shell(`<section class="section auth-wrap"><div class="glass center-card gamification-gate">
      <div class="warn-icon">🔐</div><h1>${esc(t('gamification_signin_title'))}</h1>
      <p class="micro">${esc(t('gamification_signin_body'))}</p>
      <div class="roadmap-actions"><a class="btn btn-primary" href="#/login">${esc(t('nav_login'))} ↗</a><a class="btn btn-ghost" href="#/signup">${esc(t('auth_signup_title'))}</a></div>
    </div></section>`, route().slice(1));
  }
  return null;
}

async function loadRoadmapData(force = false) {
  if (!CLOUD || typeof CLOUD.loadRoadmap !== 'function' || !cloudUserActive()) return;
  const owner = store.user.id;
  if (!force && roadmapState.loadedUser === owner) return;
  if (roadmapState.loading) return;
  roadmapState.loading = true;
  roadmapState.error = '';
  try {
    const data = await CLOUD.loadRoadmap();
    if (!store.user || store.user.id !== owner) return;
    const stageOrder = new Map(ROADMAP_STAGES.map((stage, i) => [stage.id, i]));
    roadmapState.topics = (data.topics || []).slice().sort((a, b) =>
      (stageOrder.get(a.stage) ?? 99) - (stageOrder.get(b.stage) ?? 99)
      || Number(a.order_index || 0) - Number(b.order_index || 0));
    roadmapState.progress = Object.fromEntries((data.progress || []).map(row => [row.topic_id, row]));
    roadmapState.loadedUser = owner;
  } catch (error) {
    if (store.user && store.user.id === owner) roadmapState.error = String(error.message || t('roadmap_load_error'));
  } finally {
    if (store.user && store.user.id === owner) roadmapState.loading = false;
    if (route() === '/roadmap' && store.user && store.user.id === owner) render();
  }
}

function roadmapTopicProgress(id) {
  const progress = roadmapState.progress[id];
  return {
    score: Math.max(0, Math.min(100, Number(progress && progress.score_percentage) || 0)),
    completed: !!(progress && progress.is_completed)
  };
}

function roadmapTopicCard(topic) {
  const progress = roadmapTopicProgress(topic.id);
  const firstLine = String(topic.summary || '').split(/\n/)[0];
  return `<article class="test-card roadmap-topic-card ${progress.completed ? 'is-complete' : ''}">
    <div class="roadmap-topic-top"><span class="roadmap-topic-stage">${esc(topic.stage)}</span>
      ${progress.completed ? `<span class="roadmap-complete-badge"><span aria-hidden="true">✓</span> ${esc(t('roadmap_completed'))}</span>` : ''}
    </div>
    <h3>${esc(topic.title)}</h3><p class="micro roadmap-summary-preview">${esc(firstLine)}</p>
    <div class="roadmap-topic-meta"><span class="roadmap-reward">🪙 <strong>+${esc(topic.reward_coins)}</strong> ${esc(t('roadmap_coins'))}</span>
      <span class="micro">${esc(t('roadmap_mastery'))} <strong>${progress.score}%</strong></span>
    </div>
    <div class="roadmap-progress" role="progressbar" aria-label="${esc(t('roadmap_mastery'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.score}"><i style="width:${progress.score}%"></i></div>
    <button class="btn ${progress.completed ? 'btn-ghost' : 'btn-primary'} btn-sm" data-roadmap-open="${esc(topic.id)}">${esc(progress.completed ? t('roadmap_review_topic') : t('roadmap_start_topic'))} ↗</button>
  </article>`;
}

function roadmapPage() {
  const gated = gamificationGate();
  if (gated) return gated;
  const active = ROADMAP_STAGES.find(stage => stage.id === roadmapState.activeStage) || ROADMAP_STAGES[0];
  const stageTopics = roadmapState.topics.filter(topic => topic.stage === active.id);
  const completeCount = roadmapState.topics.filter(topic => roadmapTopicProgress(topic.id).completed).length;
  const average = roadmapState.topics.length
    ? Math.round(roadmapState.topics.reduce((sum, topic) => sum + roadmapTopicProgress(topic.id).score, 0) / roadmapState.topics.length)
    : 0;
  const stageReward = stageTopics.length ? Number(stageTopics[0].reward_coins) || 0
    : active.id === 'A1-A2' ? 10 : active.id === 'A2-B1' ? 20 : active.id === 'B1-B2' ? 35 : 50;
  const stageTabs = ROADMAP_STAGES.map(stage => {
    const topics = roadmapState.topics.filter(topic => topic.stage === stage.id);
    const done = topics.filter(topic => roadmapTopicProgress(topic.id).completed).length;
    return `<button class="roadmap-tab ${stage.id === active.id ? 'active' : ''}" role="tab" aria-selected="${stage.id === active.id}" data-roadmap-stage="${stage.id}">
      <strong>${esc(t(stage.title))}</strong><span>${esc(t(stage.name))}</span><small>${done}/${topics.length} ${esc(t('roadmap_topics_short'))}</small>
    </button>`;
  }).join('');
  let topicList = '';
  if (roadmapState.error) {
    topicList = `<div class="glass roadmap-state roadmap-state--error" role="alert"><strong>${esc(t('roadmap_load_error'))}</strong><p class="micro">${esc(roadmapState.error)}</p><p class="micro">${esc(t('roadmap_migration_hint'))}</p><button class="btn btn-ghost" data-roadmap-retry>${esc(t('roadmap_retry'))} ↻</button></div>`;
  } else if (roadmapState.loading || roadmapState.loadedUser !== store.user.id) {
    topicList = `<div class="glass roadmap-state" role="status">${esc(t('roadmap_loading'))}</div>`;
  } else if (!stageTopics.length) {
    topicList = `<div class="glass roadmap-state"><p class="micro">${esc(t('roadmap_empty'))}</p><button class="btn btn-ghost" data-roadmap-retry>${esc(t('roadmap_retry'))} ↻</button></div>`;
  } else {
    topicList = `<div class="roadmap-topic-grid">${stageTopics.map(roadmapTopicCard).join('')}</div>`;
  }
  return shell(`<section class="section roadmap-page">
    <div class="section-header roadmap-header"><div><div class="eyebrow">${esc(t('roadmap_eyebrow'))}</div><h1 style="margin:8px 0 6px">${esc(t('roadmap_title'))}</h1><p class="micro">${esc(t('roadmap_subtitle'))}</p></div>
      <div class="roadmap-wallet-summary glass"><span class="wallet-coin" aria-hidden="true">🪙</span><div><strong>${esc(formatCoins(currentCoins()))}</strong><span>${esc(t('coins_balance_label'))}</span></div></div>
    </div>
    <div class="roadmap-overview glass"><div><span>${esc(t('roadmap_overall_progress'))}</span><strong>${average}%</strong></div><div class="roadmap-overview-bar"><i style="width:${average}%"></i></div><p class="micro">${completeCount}/${roadmapState.topics.length} ${esc(t('roadmap_topics_completed'))}</p></div>
    <div class="roadmap-tabs" role="tablist" aria-label="${esc(t('roadmap_levels'))}">${stageTabs}</div>
    <div class="roadmap-stage-heading"><div><div class="eyebrow">${esc(t(active.title))}</div><h2>${esc(t(active.name))}</h2><p class="micro">${esc(t(active.hint))}</p></div><span class="roadmap-stage-reward">🪙 +${esc(stageReward)} ${esc(t('roadmap_each_topic'))}</span></div>
    ${topicList}
  </section>`, 'roadmap');
}

function roadmapQuestionHtml(question, index) {
  const answer = roadmapState.answers[index];
  const title = `${t('roadmap_question')} ${index + 1}`;
  if (question.type === 'input') {
    return `<div class="roadmap-question"><label for="roadmap-answer-${index}"><span class="roadmap-question-num">${index + 1}</span><strong>${esc(question.prompt || '')}</strong></label>
      <input id="roadmap-answer-${index}" class="roadmap-answer-input" type="text" autocomplete="off" maxlength="160" placeholder="${esc(question.placeholder || t('roadmap_your_answer'))}" data-roadmap-answer="${index}" value="${esc(answer ?? '')}"/></div>`;
  }
  const options = Array.isArray(question.options) ? question.options : [];
  return `<fieldset class="roadmap-question"><legend><span class="roadmap-question-num">${index + 1}</span>${esc(question.prompt || title)}</legend>
    <div class="roadmap-options">${options.map((option, optionIndex) => `<label class="roadmap-option ${String(answer) === String(optionIndex) ? 'selected' : ''}">
      <input type="radio" name="roadmap-answer-${index}" value="${optionIndex}" data-roadmap-choice="${index}" ${String(answer) === String(optionIndex) ? 'checked' : ''}/>
      <span class="roadmap-option-letter">${String.fromCharCode(65 + optionIndex)}</span><span>${esc(option)}</span>
    </label>`).join('')}</div>
  </fieldset>`;
}

function roadmapQuizResultHtml(topic) {
  const result = roadmapState.result;
  if (!result) return '';
  const passed = Number(result.score_percentage) >= 80;
  const message = result.coins_awarded > 0
    ? t2('roadmap_reward_earned', { n: formatCoins(result.coins_awarded) })
    : result.is_completed ? t('roadmap_already_completed')
      : passed ? t('roadmap_no_new_reward') : t('roadmap_try_again');
  return `<div class="roadmap-quiz-result ${passed ? 'passed' : 'needs-practice'}" role="status">
    <div class="roadmap-result-score"><strong>${esc(result.score_percentage)}%</strong><span>${esc(t('roadmap_quiz_score'))}</span></div>
    <div><strong>${esc(passed ? t('roadmap_quiz_passed') : t('roadmap_quiz_not_passed'))}</strong><p class="micro">${esc(t2('roadmap_correct_count', { correct: result.correct_count, total: result.total_questions }))} · ${esc(t('roadmap_best_score'))}: ${esc(result.best_score_percentage)}%</p><p class="micro">${esc(message)}</p></div>
  </div>`;
}

function roadmapTopicModalHtml() {
  const topic = roadmapState.topics.find(item => item.id === roadmapState.topicId);
  if (!topic) return '';
  const progress = roadmapTopicProgress(topic.id);
  const questions = Array.isArray(topic.questions) ? topic.questions : [];
  return `<div class="modal-backdrop roadmap-modal-backdrop" id="roadmapBackdrop">
    <div class="modal glass roadmap-modal" role="dialog" aria-modal="true" aria-labelledby="roadmapModalTitle">
      <button class="modal-close" data-roadmap-close aria-label="${esc(t('modal_close'))}">×</button>
      <div class="test-meta"><span>${esc(topic.stage)}</span><span>🪙 +${esc(topic.reward_coins)} ${esc(t('roadmap_coins'))}</span>${progress.completed ? `<span class="roadmap-complete-badge">✓ ${esc(t('roadmap_completed'))}</span>` : ''}</div>
      <h2 id="roadmapModalTitle">${esc(topic.title)}</h2>
      <section class="roadmap-cheatsheet"><h3>${esc(t('roadmap_cheatsheet'))}</h3><div>${esc(topic.summary).replace(/\r?\n/g, '<br>')}</div></section>
      <section class="roadmap-ai-block"><div><div class="eyebrow">${esc(t('roadmap_ai_practice'))}</div><h3>${esc(t('roadmap_ai_title'))}</h3><p class="micro">${esc(t('roadmap_ai_hint'))}</p></div>
        <textarea class="roadmap-prompt" readonly aria-label="${esc(t('roadmap_ai_prompt'))}">${esc(topic.ai_prompt)}</textarea>
        <button class="btn btn-ghost btn-sm" data-roadmap-copy="${esc(topic.id)}">${esc(t('roadmap_copy_prompt'))} ⧉</button>
      </section>
      <section class="roadmap-quiz"><div class="roadmap-quiz-head"><div><div class="eyebrow">${esc(t('roadmap_quiz'))}</div><h3>${esc(t('roadmap_quiz_hint'))}</h3></div><span class="pill">${questions.length} ${esc(t('roadmap_questions_short'))}</span></div>
        ${progress.score ? `<p class="micro">${esc(t('roadmap_best_score'))}: <strong>${progress.score}%</strong></p>` : ''}
        <div class="roadmap-question-list">${questions.map(roadmapQuestionHtml).join('')}</div>
        ${roadmapState.submitError ? `<p class="roadmap-submit-error" role="alert">${esc(roadmapState.submitError)}</p>` : ''}
        ${roadmapQuizResultHtml(topic)}
        <div class="roadmap-actions"><button class="btn btn-primary" data-roadmap-submit ${roadmapState.saving ? 'disabled' : ''}>${esc(t(roadmapState.saving ? 'roadmap_submitting' : 'roadmap_submit'))} ${roadmapState.saving ? '…' : '↗'}</button><button class="btn btn-ghost" data-roadmap-close>${esc(t('modal_close'))}</button></div>
      </section>
    </div>
  </div>`;
}

function bindRoadmap() {
  document.querySelectorAll('[data-roadmap-stage]').forEach(button => button.onclick = () => {
    roadmapState.activeStage = button.dataset.roadmapStage;
    render();
  });
  document.querySelectorAll('[data-roadmap-open]').forEach(button => button.onclick = () => {
    roadmapState.topicId = button.dataset.roadmapOpen;
    roadmapState.answers = [];
    roadmapState.result = null;
    roadmapState.submitError = '';
    roadmapState.saving = false;
    render();
  });
  document.querySelectorAll('[data-roadmap-retry]').forEach(button => button.onclick = () => loadRoadmapData(true));
  document.querySelectorAll('[data-roadmap-choice]').forEach(input => input.onchange = () => {
    roadmapState.answers[Number(input.dataset.roadmapChoice)] = input.value;
    const group = input.closest('.roadmap-options');
    if (group) group.querySelectorAll('.roadmap-option').forEach(label => label.classList.toggle('selected', label.contains(input) && input.checked));
  });
  document.querySelectorAll('[data-roadmap-answer]').forEach(input => input.oninput = () => {
    roadmapState.answers[Number(input.dataset.roadmapAnswer)] = input.value;
  });
  document.querySelectorAll('[data-roadmap-copy]').forEach(button => button.onclick = async () => {
    const topic = roadmapState.topics.find(item => item.id === button.dataset.roadmapCopy);
    if (!topic) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(topic.ai_prompt);
      } else {
        const area = document.createElement('textarea');
        area.value = topic.ai_prompt;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed'; area.style.opacity = '0';
        document.body.appendChild(area); area.select();
        const copied = document.execCommand && document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      notify(t('roadmap_prompt_copied'));
    } catch { notify(t('roadmap_copy_failed')); }
  });
  document.querySelectorAll('[data-roadmap-close]').forEach(button => button.onclick = () => {
    roadmapState.topicId = null; roadmapState.answers = []; roadmapState.result = null; roadmapState.submitError = ''; roadmapState.saving = false; render();
  });
  const backdrop = document.querySelector('#roadmapBackdrop');
  if (backdrop) backdrop.onclick = event => {
    if (event.target === backdrop) {
      roadmapState.topicId = null; roadmapState.answers = []; roadmapState.result = null; roadmapState.submitError = ''; roadmapState.saving = false; render();
    }
  };
  const submit = document.querySelector('[data-roadmap-submit]');
  if (submit) submit.onclick = async () => {
    if (roadmapState.saving) return;
    const topic = roadmapState.topics.find(item => item.id === roadmapState.topicId);
    if (!topic) return;
    const answers = topic.questions.map((_, index) => String(roadmapState.answers[index] ?? '').trim());
    if (answers.length !== 5 || answers.some(answer => !answer)) return notify(t('roadmap_answer_all'));
    if (!CLOUD || typeof CLOUD.submitRoadmapQuiz !== 'function') return notify(t('gamification_unavailable'));
    const owner = store.user && store.user.id;
    roadmapState.submitError = '';
    roadmapState.saving = true; render();
    try {
      const result = await CLOUD.submitRoadmapQuiz(topic.id, answers);
      if (!store.user || store.user.id !== owner || roadmapState.topicId !== topic.id) return;
      roadmapState.result = result;
      const previous = roadmapTopicProgress(topic.id);
      roadmapState.progress[topic.id] = {
        topic_id: topic.id,
        score_percentage: Math.max(previous.score, Number(result.best_score_percentage ?? result.score_percentage) || 0),
        is_completed: previous.completed || !!result.is_completed
      };
      roadmapState.saving = false;
      await loadRoadmapData(true);
      if (Number(result.coins_awarded) > 0) celebrateCoinReward(result.coins_awarded, result.coins_balance);
      render();
    } catch (error) {
      if (store.user && store.user.id === owner) {
        roadmapState.submitError = String(error.message || t('roadmap_submit_error'));
        notify(t('roadmap_submit_error'));
      }
    } finally {
      if (store.user && store.user.id === owner) { roadmapState.saving = false; render(); }
    }
  };
  if (cloudUserActive() && roadmapState.loadedUser !== store.user.id && !roadmapState.loading) loadRoadmapData();
}

function celebrateCoinReward(amount, balance) {
  const earned = Math.max(0, Number(amount) || 0);
  if (store.user && Number.isFinite(Number(balance))) {
    store.user = { ...store.user, coins: Math.max(0, Number(balance) || 0) };
    if (activeUser && activeUser.id === store.user.id) activeUser = { ...activeUser, coins: store.user.coins };
  }
  if (earned > 0) notify(t2('coins_earned_toast', { n: formatCoins(earned) }));
  render();
  setTimeout(() => {
    const wallet = document.querySelector('[data-coin-wallet]');
    if (!wallet) return;
    wallet.classList.add('coin-wallet--earned');
    setTimeout(() => wallet.classList.remove('coin-wallet--earned'), 850);
  }, 0);
}

/* ---------------- LEADERBOARD ---------------- */
function safeAvatarUrl(value) {
  try {
    const url = new URL(String(value || ''), window.location && window.location.origin || 'https://example.invalid');
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
function localizeLeaderboardBadge(value) {
  const badge = String(value || '');
  const key = {
    'A1 Starter': 'leaderboard_badge_a1',
    'A2 Explorer': 'leaderboard_badge_a2',
    'B1 Builder': 'leaderboard_badge_b1',
    'B2 Achiever': 'leaderboard_badge_b2',
    'C1 Master': 'leaderboard_badge_c1'
  }[badge];
  return key ? t(key) : badge || t('leaderboard_default_level');
}

async function loadLeaderboardData(force = false) {
  if (!CLOUD || typeof CLOUD.loadLeaderboard !== 'function' || !cloudUserActive()) return;
  const owner = store.user.id;
  if (!force && leaderboardState.loadedUser === owner) return;
  if (leaderboardState.loading) return;
  leaderboardState.loading = true; leaderboardState.error = '';
  try {
    const rows = await CLOUD.loadLeaderboard(100);
    if (!store.user || store.user.id !== owner) return;
    leaderboardState.rows = Array.isArray(rows) ? rows : [];
    leaderboardState.loadedUser = owner;
  } catch (error) {
    if (store.user && store.user.id === owner) leaderboardState.error = String(error.message || t('leaderboard_load_error'));
  } finally {
    if (store.user && store.user.id === owner) leaderboardState.loading = false;
    if (route() === '/leaderboard' && store.user && store.user.id === owner) render();
  }
}

function leaderboardPage() {
  const gated = gamificationGate();
  if (gated) return gated;
  const current = leaderboardState.rows.find(row => row.is_you);
  let content = '';
  if (leaderboardState.error) {
    content = `<div class="glass roadmap-state roadmap-state--error" role="alert"><strong>${esc(t('leaderboard_load_error'))}</strong><p class="micro">${esc(leaderboardState.error)}</p><p class="micro">${esc(t('roadmap_migration_hint'))}</p><button class="btn btn-ghost" data-leaderboard-retry>${esc(t('roadmap_retry'))} ↻</button></div>`;
  } else if (leaderboardState.loading || leaderboardState.loadedUser !== store.user.id) {
    content = `<div class="glass roadmap-state" role="status">${esc(t('leaderboard_loading'))}</div>`;
  } else if (!leaderboardState.rows.length) {
    content = `<div class="glass roadmap-state"><p class="micro">${esc(t('leaderboard_empty'))}</p></div>`;
  } else {
    content = `<div class="glass leaderboard-table-wrap"><table class="leaderboard-table">
      <thead><tr><th>${esc(t('leaderboard_rank'))}</th><th>${esc(t('leaderboard_learner'))}</th><th>${esc(t('leaderboard_coins'))}</th><th>${esc(t('leaderboard_level'))}</th></tr></thead>
      <tbody>${leaderboardState.rows.map(row => {
        const place = Number(row.rank_position) || 0;
        const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '';
        const name = String(row.display_name || 'Learner');
        const avatar = safeAvatarUrl(row.avatar_url);
        const me = !!row.is_you;
        return `<tr class="leaderboard-row ${me ? 'is-you' : ''} ${place <= 3 ? `podium-${place}` : ''}" ${me ? 'aria-current="true"' : ''}>
          <td><span class="leaderboard-rank"><span class="leaderboard-medal" aria-label="${place === 1 ? esc(t('leaderboard_gold')) : place === 2 ? esc(t('leaderboard_silver')) : place === 3 ? esc(t('leaderboard_bronze')) : ''}">${medal}</span>${place}</span></td>
          <td><span class="leaderboard-person">${avatar ? `<img src="${esc(avatar)}" alt="" loading="lazy"/>` : `<span class="leaderboard-avatar" aria-hidden="true">${esc(name.trim().charAt(0).toUpperCase() || '?')}</span>`}<span><strong>${esc(name)}</strong>${me ? `<small>${esc(t('leaderboard_you'))}</small>` : ''}</span></span></td>
          <td><span class="leaderboard-coins">🪙 ${esc(formatCoins(row.coins))}</span></td>
          <td><span class="roadmap-level-badge">${esc(localizeLeaderboardBadge(row.level_badge))}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }
  return shell(`<section class="section leaderboard-page">
    <div class="section-header roadmap-header"><div><div class="eyebrow">${esc(t('leaderboard_eyebrow'))}</div><h1 style="margin:8px 0 6px">${esc(t('leaderboard_title'))}</h1><p class="micro">${esc(t('leaderboard_subtitle'))}</p></div>
      <div class="leaderboard-your-rank glass"><span>${esc(t('leaderboard_your_rank'))}</span><strong>${current ? `#${esc(current.rank_position)}` : '—'}</strong><small>🪙 ${esc(formatCoins(currentCoins()))}</small></div>
    </div>
    <div class="leaderboard-toolbar"><p class="micro">${esc(t('leaderboard_public_note'))}</p><button class="btn btn-ghost btn-sm" data-leaderboard-retry ${leaderboardState.loading ? 'disabled' : ''}>${esc(t('roadmap_retry'))} ↻</button></div>
    ${content}
  </section>`, 'leaderboard');
}

function bindLeaderboard() {
  document.querySelectorAll('[data-leaderboard-retry]').forEach(button => button.onclick = () => loadLeaderboardData(true));
  if (cloudUserActive() && leaderboardState.loadedUser !== store.user.id && !leaderboardState.loading) loadLeaderboardData();
}

/* ---------------- VOCABULARY ---------------- */
function vocabulary() {
  const sets = CONTENT.vocabulary || {};
  const ids = Object.keys(sets);
  let known = 0, total = 0;
  ids.forEach(k => sets[k].words.forEach(w => { total++; if (store.vocabKnown[w.word]) known++; }));
  const mastery = SERVICES.vocabMastery(known, total);
  return shell(`
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">${t('vocabulary_title')}</div><h1 style="margin:8px 0 6px">${t('vocabulary_title')}</h1></div></div>
      <div class="progress"><i style="width:${mastery}%"></i><span>${mastery}% ${t('vocab_mastery')}</span></div>
      ${ids.map(id => {
        const set = sets[id];
        return `<div class="glass vocab-set"><div class="panel-title">${esc(set.title)} <span class="pill">${esc(set.level)}</span></div>
          <div class="vocab-grid">${set.words.map(w => {
            const knownVocab = !!store.vocabKnown[w.word];
            return `<div class="vocab-card ${knownVocab ? 'known' : ''}"><div class="vocab-head"><strong>${esc(w.word)}</strong><span class="micro">${esc(w.pos)}</span></div><p class="micro">${esc(w.meaning)}</p><p class="micro vocab-ex">“${esc(w.example)}”</p><button class="btn btn-ghost btn-sm ${knownVocab ? 'is-known' : ''}" data-vocab-word="${esc(w.word)}">${knownVocab ? '✓ Known' : 'Mark known'}</button></div>`;
          }).join('')}</div>
        </div>`;
      }).join('')}
    </section>`, 'vocabulary');
}

/* ---------------- QUIZ ---------------- */
let quizState = { questions: [], index: 0, answers: {}, done: false, score: 0 };
function quizPage() {
  if (!quizState.questions.length) quizState.questions = SERVICES.quizFrom(CONTENT.quiz || {}, 4);
  if (quizState.done) {
    const pct = Math.round((quizState.score / quizState.questions.length) * 100);
    return shell(`<section class="section"><div class="glass center-card"><div class="result-band">${pct}<small>%</small></div><h2>${t('quiz_your_score')}</h2><p class="micro">${quizState.score}/${quizState.questions.length}</p><button class="btn btn-primary" data-quiz-restart>Retry ↗</button><button class="btn btn-ghost" data-go="/vocabulary">${t('nav_vocabulary')} ↗</button></div></section>`, 'quiz');
  }
  const q = quizState.questions[quizState.index];
  return shell(`
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">${t('quiz_title')}</div><h1 style="margin:8px 0 0">${t('quiz_title')}</h1></div></div>
      <div class="quiz-progress"><i style="width:${((quizState.index + 1) / quizState.questions.length) * 100}%"></i></div>
      <div class="glass quiz-card">
        <div class="test-meta"><span>Question ${quizState.index + 1}/${quizState.questions.length}</span><span class="pill">${q.type || 'mcq'}</span></div>
        <h3 style="margin:14px 0 18px">${esc(q.prompt)}</h3>
        <div class="quiz-opts">${(q.options || []).map((o, oi) => `<button class="btn btn-ghost opt-btn ${String(quizState.answers[quizState.index]) === String(oi) ? 'selected' : ''}" data-quiz-answer="${oi}">${String.fromCharCode(65 + oi)}. ${esc(o)}</button>`).join('')}</div>
        ${quizState.answers[quizState.index] !== undefined ? `<div class="explain-box"><span class="label">${t('explanation')}:</span> ${esc(q.explanation || '')}</div>` : ''}
        <div style="display:flex;gap:10px;margin-top:20px">
          ${quizState.index > 0 ? '<button class="btn btn-ghost" data-quiz-back>← Back</button>' : ''}
          ${quizState.index < quizState.questions.length - 1 ? '<button class="btn btn-primary" data-quiz-next>'+t('quiz_next')+' ↗</button>' : '<button class="btn btn-primary" data-quiz-finish>'+t('quiz_finish')+' ↗</button>'}
        </div>
      </div>
    </section>`, 'quiz');
}

/* ---------------- SETTINGS ---------------- */
function settings() {
  const user = store.user;
  return shell(`
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">${t('settings_title')}</div><h1 style="margin:8px 0 0">${t('settings_title')}</h1></div></div>
      <div class="glass setting-card">
        <div class="setting-row"><span>${t('language')}</span><div class="seg">${['en', 'uz', 'ru'].map(l => `<button class="seg-btn ${(store.lang || 'en') === l ? 'active' : ''}" data-set-lang="${l}">${l.toUpperCase()}</button>`).join('')}</div></div>
        <div class="setting-row"><span>Theme</span><div class="seg">${['dark', 'light'].map(th => `<button class="seg-btn ${store.theme === th ? 'active' : ''}" data-set-theme="${th}">${th === 'light' ? t('theme_light') : t('theme_dark')}</button>`).join('')}</div></div>
        <div class="setting-row"><span>Practice test</span><div class="test-switch">${testSwitch()}</div></div>
        <div class="setting-row"><span>${esc(t('mascot_setting'))}</span><div class="seg"><button class="seg-btn ${!store.mascotMuted ? 'active' : ''}" data-set-mascot="on">${esc(t('mascot_unmute'))}</button><button class="seg-btn ${store.mascotMuted ? 'active' : ''}" data-set-mascot="off">${esc(t('mascot_mute'))}</button></div></div>
        <div class="setting-row"><span>Account</span>${user ? `<button class="btn btn-ghost btn-sm" data-logout>${t('nav_logout')}</button>` : `<button class="btn btn-ghost btn-sm" data-go="/login">${t('nav_login')}</button>`}</div>
      </div>
    </section>`, 'settings');
}

/* Auth notices stay visible instead of disappearing with a short toast. */
let authNotice = null;
let authBusy = false;
let logoutBusy = false;
function authControlsDisabled() { return authBusy || !CLOUD || CLOUD.getState().status !== 'ready'; }
function authNoticeHtml() {
  const state = CLOUD && CLOUD.getState();
  const notice = !state || state.status !== 'ready'
    ? { type: state && state.status === 'loading' ? 'loading' : 'error', message: t(state && state.status === 'loading' ? 'auth_connecting' : 'auth_unavailable') }
    : authNotice && authNotice.route === route() ? authNotice : null;
  if (!notice) return '';
  const label = notice.type === 'error' ? t('auth_error_title') : notice.type === 'success' ? t('auth_success_title') : t('auth_wait');
  return `<div class="auth-notice auth-notice--${notice.type}" role="${notice.type === 'error' ? 'alert' : 'status'}" aria-live="polite"><strong>${esc(label)}</strong><p>${esc(notice.message)}</p></div>`;
}
function setAuthNotice(type, message) {
  authNotice = { type, message, route: route() };
  const box = document.querySelector('#auth-feedback');
  if (box) box.innerHTML = authNoticeHtml();
}
function updateAuthControls() {
  const form = document.querySelector('#auth-form');
  if (form) {
    form.setAttribute('aria-busy', String(authBusy));
    const submit = form.querySelector('[type="submit"]');
    if (submit) { submit.disabled = authControlsDisabled(); submit.textContent = t(authBusy ? 'auth_wait' : 'auth_submit'); }
  }
  const google = document.querySelector('[data-google-auth]');
  if (google) google.disabled = authControlsDisabled();
}

/* ---------------- AUTH ---------------- */
function authPage(mode) {
  const isSignup = mode === 'signup';
  return shell(`
    <section class="section auth-wrap">
      <div class="glass auth-card center-card">
        <div class="auth-mascot">
          ${mascotImg('full', 'mascot--auth', 'eager')}
          <p>${esc(t('mascot_auth_hi'))}</p>
        </div>
        <h1 style="margin:0 0 6px">${isSignup ? t('auth_signup_title') : t('auth_title')}</h1>
        <p class="micro">${t('auth_secure_note')}</p>
        <div id="auth-feedback">${authNoticeHtml()}</div>
        <form id="auth-form" data-auth-mode="${isSignup ? 'signup' : 'login'}">
          ${isSignup ? `<label class="field"><span>${t('auth_name')}</span><input name="name" class="btn btn-ghost" autocomplete="name" maxlength="200" required placeholder="Aziz"/></label>` : ''}
          <label class="field"><span>${t('auth_email')}</span><input name="email" type="email" class="btn btn-ghost" autocomplete="email" required placeholder="you@gmail.com"/></label>
          <label class="field"><span>${t('auth_password')}</span><input name="password" type="password" class="btn btn-ghost" autocomplete="${isSignup ? 'new-password' : 'current-password'}" ${isSignup ? 'minlength="6"' : ''} required placeholder="••••••••"/></label>
          <button class="btn btn-primary" type="submit" ${authControlsDisabled() ? 'disabled' : ''} style="width:100%">${t(authBusy ? 'auth_wait' : 'auth_submit')} ↗</button>
        </form>
        <button class="btn btn-ghost google-btn" data-google-auth ${authControlsDisabled() ? 'disabled' : ''} style="width:100%;margin-top:12px">${t('auth_google')}</button>
        <p class="micro">${isSignup ? `<a href="#/login">${t('auth_switch')}</a>` : `<a href="#/signup">${t('auth_switch_signup')}</a>`}</p>
      </div>
    </section>`, 'auth');
}

/* ---------------- RENDER / ROUTER ---------------- */
/* Admin area. Anyone who is not an admin is redirected to the dashboard —
   the hash changes too, so a refresh or a shared link cannot bounce them
   back into the panel. The real check is row level security in Postgres. */
function adminPage() {
  if (!isAdminUser()) {
    if (location.hash !== '#/dashboard') location.hash = '#/dashboard';
    return dashboard();
  }
  const A = window.IELTS_ADMIN;
  /* Signed in as an admin but admin.js has not executed yet — show a shell
     rather than bouncing, so a refresh on #/admin stays where it is. */
  if (!A) {
    return shell(`<section class="section">
      <div class="glass" style="padding:30px;text-align:center">
        <p style="color:var(--muted);margin:0">${esc(t('admin_loading'))}</p>
      </div>
    </section>`, 'admin');
  }
  A.ensure(A.state.tab);
  return shell(A.body(), 'admin');
}

function render() {
  applyPrefs();
  const r = route();
  let html;
  if (r === '/') html = home();
  else if (r === '/mock' || r === '/fullmock') html = mockHub();
  else if (r === '/listening') html = testGate('listening', 30, listening);
  else if (r === '/reading') html = testGate('reading', 60, reading);
  else if (r === '/writing') html = testGate('writing', 60, writing);
  else if (r === '/speaking') html = testGate('speaking', 14, speaking);
  else if (r === '/results') html = resultsPage();
  else if (r === '/mistakes') html = mistakes();
  else if (r === '/coach') html = coach();
  else if (r === '/dashboard') html = dashboard();
  else if (r === '/roadmap') html = roadmapPage();
  else if (r === '/leaderboard') html = leaderboardPage();
  else if (r === '/lessons') html = lessons();
  else if (r === '/vocabulary') html = vocabulary();
  else if (r === '/quiz') html = quizPage();
  else if (r === '/fullmock') html = fullmock();
  else if (r === '/settings') html = settings();
  else if (r === '/admin') html = adminPage();
  else if (r === '/login') html = authPage('login');
  else if (r === '/signup') html = authPage('signup');
  else html = home();
  if (lessonModalId) html += lessonModalHtml();
  if (r === '/roadmap' && roadmapState.topicId) html += roadmapTopicModalHtml();
  const adminModal = window.IELTS_ADMIN && window.IELTS_ADMIN.modalHtml ? window.IELTS_ADMIN.modalHtml() : '';
  if (adminModal) html += adminModal;
  app.innerHTML = html;
  bind();
  initReveal();
  if (r === '/results' && CLOUD) scheduleCloudSync();
  const msgBox = document.querySelector('#coach-messages');
  if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
}

/* Scroll-reveal for .reveal sections — subtle, and disabled for reduced motion. */
function initReveal() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  let reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
  if (reduce) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  els.forEach(el => io.observe(el));
}

/* ---------------- SUPABASE RESULTS / AUTH ---------------- */
let cloudSyncTask = null;
let cloudSyncTimer = null;
let cloudSyncAgain = false;
let cloudLastLoad = 0;
let cloudRows = [];
let cloudStatus = 'idle';
let cloudError = '';

function cloudText(key) {
  const messages = {
    en: { title: 'Supabase mock results', loading: 'Connecting to Supabase…', auth: 'Secure account with Supabase. Your results are private.', confirm: 'Check your email to confirm your account, then sign in.', disabled: 'Supabase is not configured. Sign-in and tests are unavailable.', configError: 'Supabase is unavailable or misconfigured. Reload after checking the server settings.', login: 'Sign in to your Supabase account to save and load cloud results.', syncing: 'Synchronizing results…', synced: 'Results synchronized with Supabase.', error: 'Cloud sync failed. Local results are kept; use Retry after checking your connection and database setup.', refresh: 'Refresh / Retry', empty: 'No cloud results yet. Finish a test section to save your progress.', pending: 'Incomplete / awaiting grading', name: 'Name', overall: 'Overall band' },
    uz: { title: 'Supabase’dagi mock natijalari', loading: 'Supabase’ga ulanmoqda…', auth: 'Supabase orqali xavfsiz akkaunt. Natijalaringiz faqat sizga ko‘rinadi.', confirm: 'Emailingizdagi tasdiqlash havolasini oching, keyin akkauntga kiring.', disabled: 'Supabase sozlanmagan. Tizimga kirish va testlar vaqtincha mavjud emas.', configError: 'Supabase ulanmagan yoki sozlamalarda xato bor. Server sozlamalarini tekshirib, sahifani yangilang.', login: 'Natijalarni bulutda saqlash va ko‘rish uchun Supabase akkauntingizga kiring.', syncing: 'Natijalar sinxronlanmoqda…', synced: 'Natijalar Supabase bilan sinxronlandi.', error: 'Bulutga ulanishda xato. Local natijalar saqlangan; internet va baza sozlamalarini tekshirib, qayta urining.', refresh: 'Yangilash / Qayta urinish', empty: 'Hozircha bulutda natijalar yo‘q. Saqlash uchun test bo‘limini yakunlang.', pending: 'Tugallanmagan / baholash kutilmoqda', name: 'Ism', overall: 'Umumiy band' },
    ru: { title: 'Результаты mock в Supabase', loading: 'Подключение к Supabase…', auth: 'Защищённый аккаунт Supabase. Результаты доступны только вам.', confirm: 'Подтвердите адрес по ссылке в письме, затем войдите.', disabled: 'Supabase не настроен. Вход и тесты временно недоступны.', configError: 'Supabase недоступен или настроен неверно. Проверьте настройки сервера и обновите страницу.', login: 'Войдите в аккаунт Supabase для сохранения и загрузки результатов.', syncing: 'Синхронизация результатов…', synced: 'Результаты синхронизированы с Supabase.', error: 'Ошибка синхронизации. Локальные результаты сохранены; проверьте подключение и базу, затем повторите.', refresh: 'Обновить / Повторить', empty: 'Облачных результатов пока нет. Завершите раздел теста.', pending: 'Не завершён / ожидает оценки', name: 'Имя', overall: 'Общий балл' }
  };
  return (messages[store.lang] || messages.en)[key] || messages.en[key] || key;
}

function cloudUserActive() {
  const state = CLOUD && CLOUD.getState();
  return state && state.status === 'ready' && state.user && store.user &&
    store.user.auth === 'supabase' && store.user.id === state.user.id;
}
function applyCloudUser(user) {
  const previous = store.user && store.user.auth === 'supabase' ? store.user.id : null;
  if (user && previous === user.id) { if (!cloudLastLoad) syncCloudResults(true); return; }
  if (!user && !store.user) return;
  clearDynamicTests();
  cloudRows = []; cloudLastLoad = 0; cloudStatus = 'idle'; cloudError = '';
  roadmapState = { topics: [], progress: {}, activeStage: 'A1-A2', loadedUser: null, loading: false, error: '', submitError: '', topicId: null, answers: [], result: null, saving: false };
  leaderboardState = { rows: [], loading: false, error: '', loadedUser: null };
  if (user) {
    const metadata = user.user_metadata || {};
    const cloudProfile = CLOUD && CLOUD.getState ? CLOUD.getState().profile : null;
    signIn({
      id: user.id, email: user.email || '',
      name: cloudProfile?.name || metadata.name || metadata.full_name || user.email?.split('@')[0] || 'User',
      picture: cloudProfile?.avatar_url || metadata.avatar_url || '',
      coins: Number(cloudProfile?.coins) || 0, auth: 'supabase'
    });
  } else signOut();
  render();
  if (user) syncCloudResults(true);
}
function scheduleCloudSync() {
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => syncCloudResults(), 150);
}
function cloudResultsPanel() {
  if (!CLOUD) return '';
  const state = CLOUD.getState();
  let message = state.status === 'disabled' ? 'disabled' : state.status === 'error' ? 'configError' : state.status === 'loading' ? 'loading' : !cloudUserActive() ? 'login' : cloudStatus === 'idle' ? 'loading' : cloudStatus;
  return `<div class="glass" style="padding:22px;margin-bottom:24px">
    <h2 style="font-size:19px">${esc(cloudText('title'))}</h2>
    <p class="micro" role="status">${esc(cloudText(message))}</p>
    ${cloudError ? `<p class="micro">${esc(cloudError)}</p>` : ''}
    ${cloudUserActive() ? `<button class="btn btn-ghost" data-cloud-refresh ${cloudStatus === 'syncing' ? 'disabled' : ''}>${esc(cloudText('refresh'))}</button>
      ${cloudRows.length ? `<div class="result-grid" style="margin-top:16px">${cloudRows.map(row => `<article class="test-card">
        <strong>${esc(SERVICES.testLabel(row.test_id, store.lang))}</strong>
        <p class="micro">${esc(cloudText('name'))}: ${esc(row.name)} · ${esc(new Date(row.updated_at).toLocaleDateString())}</p>
        <p>${['listening','reading','writing','speaking'].map(skill => `${BAND_LABEL[skill]}: <strong>${esc(row[skill] ?? '—')}</strong>`).join(' · ')}</p>
        <p>${esc(cloudText('overall'))}: <strong>${esc(row.overall_band ?? '—')}</strong></p>
        ${row.overall_band === null ? `<p class="micro">${esc(cloudText('pending'))}</p>` : ''}
      </article>`).join('')}</div>` : `<p class="micro">${esc(cloudText('empty'))}</p>`}` : ''}
  </div>`;
}
async function syncCloudResults(force = false) {
  if (!cloudUserActive()) return;
  if (cloudSyncTask) { cloudSyncAgain = true; return cloudSyncTask; }
  if (!force && cloudStatus === 'error' && Date.now() - cloudLastLoad < 60000) return;
  const owner = store.user.id;
  const localStore = store;
  const stillCurrent = () => cloudUserActive() && store.user.id === owner;
  const latest = new Map(localStore.attempts.map(a => [CLOUD.sectionKey(a), a]));
  const synced = localStore.cloudSynced || {};
  const pending = [...latest.values()].filter(a => synced[CLOUD.sectionKey(a)] !== CLOUD.fingerprint(a));
  if (!force && !pending.length && Date.now() - cloudLastLoad < 60000) return;
  cloudLastLoad = Date.now();
  cloudStatus = 'syncing'; cloudError = '';
  cloudSyncTask = (async () => {
    try {
      let mockCoinsUpdated = false;
      for (const attempt of pending) {
        if (!stillCurrent()) return;
        const version = CLOUD.fingerprint(attempt);
        await CLOUD.saveMockSection(CLOUD.sectionPayload(attempt, localStore.user.name), owner);
        if (!stillCurrent()) return;
        /* Award only when this local mock section is first synchronized. The
           RPC derives the band from the saved row; a unique ledger key makes
           retries safe without re-awarding historical results on every boot. */
        if (['listening', 'reading'].includes(attempt.section) && typeof CLOUD.addUserCoins === 'function') {
          const reward = await CLOUD.addUserCoins('mock', `${attempt.test || 'test1'}:${attempt.section}`);
          if (!stillCurrent()) return;
          if (Number(reward && reward.awarded_coins) > 0) {
            mockCoinsUpdated = true;
            celebrateCoinReward(reward.awarded_coins, reward.coins_balance);
          }
        }
        store.cloudSynced = { ...store.cloudSynced, [CLOUD.sectionKey(attempt)]: version };
        save(true);
      }
      if (mockCoinsUpdated && typeof CLOUD.loadProfile === 'function') await CLOUD.loadProfile(true);
      if (!stillCurrent()) return;
      const rows = await CLOUD.loadMockResults();
      if (!stillCurrent()) return;
      const remoteAttempts = CLOUD.rowsToAttempts(rows);
      cloudRows = rows;
      const merged = new Map(store.attempts.map(a => [CLOUD.sectionKey(a), a]));
      for (const remote of remoteAttempts) {
        const key = CLOUD.sectionKey(remote);
        const local = merged.get(key);
        // Never replace an unsent local change with a stale remote copy.
        const dirty = local && (store.cloudSynced || {})[key] !== CLOUD.fingerprint(local);
        if (!dirty && (!local || remote.date >= local.date)) {
          merged.set(key, remote);
          store.cloudSynced = { ...store.cloudSynced, [key]: CLOUD.fingerprint(remote) };
          if (remote.feedback) store.feedback[remote.section] = remote.feedback;
        }
      }
      store.attempts = [...merged.values()].sort((a, b) => a.date - b.date);
      save(true);
      cloudStatus = 'synced';
    } catch (error) {
      if (stillCurrent()) { cloudStatus = 'error'; cloudError = String(error.message || error); }
    } finally {
      cloudSyncTask = null;
      if (stillCurrent() && ['/results', '/dashboard', '/mock', '/fullmock'].includes(route())) render();
      if (cloudSyncAgain) { cloudSyncAgain = false; scheduleCloudSync(); }
    }
  })();
  if (route() === '/results') render();
  return cloudSyncTask;
}

/* ---------------- BOOT ---------------- */
function registerPWA() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const done = () => navigator.serviceWorker.register('sw.js', { scope: '/' }).then(() => {
    if (typeof console !== 'undefined') console.log('PWA service worker registered');
  }).catch(() => {});
  if (document && document.readyState === 'complete') done();
  else if (window && typeof window.addEventListener === 'function') window.addEventListener('load', done);
}

/* What the admin panel needs from the app: re-render itself, show a toast,
   and republish test content after an admin saves a change. */
if (typeof window !== 'undefined') {
  window.IELTS_ADMIN_HOOKS = { render, notify, go, reloadTests: loadDynamicTests };
}

applyPrefs();
registerPWA();
window.addEventListener('hashchange', render);
render();
/* A Google sign-in bounces the user back to this site's origin with a
 * one-time ?code=. The SDK exchanges it into a real Supabase session on this
 * page load, so remember the return before the URL is cleaned up and land the
 * user on their account (or back on the test they came from). */
const oauthReturn = typeof window !== 'undefined' && window.location &&
  /[?&]code=/.test(String(window.location.search || ''));
if (CLOUD) {
  CLOUD.ready.then(() => {
    const afterOAuthReturn = () => {
      if (!oauthReturn) return;
      const state = CLOUD.getState();
      if (!state.user) return;
      const target = pendingRoute; pendingRoute = null;
      go(target || '/dashboard');
    };
    const oauthError = CLOUD.getState().oauthError || '';
    if (oauthError) {
      // Google or Supabase refused the sign-in (Cancel, provider disabled…).
      pendingRoute = null;
      go('/login');
      setAuthNotice('error', oauthError);
    }
    CLOUD.subscribe(state => {
      if (state.status !== 'ready') return;
      applyCloudUser(state.user);
      const profile = state.profile;
      if (state.user && profile && store.user && store.user.id === state.user.id) {
        const before = `${store.user.coins || 0}:${store.user.name || ''}:${store.user.picture || ''}`;
        store.user = {
          ...store.user,
          name: profile.name || store.user.name,
          picture: profile.avatar_url || store.user.picture,
          coins: Number(profile.coins) || 0
        };
        if (activeUser && activeUser.id === state.user.id) activeUser = { ...activeUser, ...store.user };
        const after = `${store.user.coins || 0}:${store.user.name || ''}:${store.user.picture || ''}`;
        if (before !== after) render();
      }
      afterOAuthReturn();
      /* The admin role is read here rather than from the auth listener so a
         profile request is never left in flight while the page is closing. */
      if (CLOUD.loadProfile) CLOUD.loadProfile();
      loadDynamicTests();
    });
    const state = CLOUD.getState();
    if (state.status === 'ready') { applyCloudUser(state.user); afterOAuthReturn(); }
    loadDynamicTests();
    render();
  });
  window.addEventListener('online', () => syncCloudResults(true));
}
