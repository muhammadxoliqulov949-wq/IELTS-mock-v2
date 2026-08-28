const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const CONTENT = window.IELTS_CONTENT;
const SERVICES = window.IELTS_SERVICES;
const I18N = window.IELTS_I18N || { t: (k) => k, current: () => 'en', setLang() {} };
const t = (k) => I18N.t(k);
const STORAGE = 'ielts-v2-store';
const GOOGLE_CLIENT_ID = '644107198192-45nq6hr0g5qp0ubjr795uu07s0oi9ij6.apps.googleusercontent.com';
const BAND_LABEL = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

let store = load();
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE)) || {};
    return {
      attempts: [], mistakes: [], feedback: {}, coachMessages: [], user: null,
      selectedTest: 'test1', theme: 'dark', lang: 'en', vocabKnown: {}, fullMock: null, quizzes: [], ...raw
    };
  } catch {
    return { attempts: [], mistakes: [], feedback: {}, coachMessages: [], user: null, selectedTest: 'test1', theme: 'dark', lang: 'en', vocabKnown: {}, fullMock: null, quizzes: [] };
  }
}
function save() { localStorage.setItem(STORAGE, JSON.stringify(store)); }
function go(path) { location.hash = path; }
function route() { return location.hash.slice(1) || '/'; }
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
/* persist a per-section deadline so a page refresh does not reset the timer */
function deadlineKey(section) { return `${STORAGE}:deadline:${section}`; }
function loadDeadline(section, minutes) {
  const key = deadlineKey(section);
  const saved = Number(localStorage.getItem(key)) || 0;
  if (saved > Date.now()) return saved;
  const fresh = Date.now() + minutes * 60000;
  localStorage.setItem(key, String(fresh));
  return fresh;
}
function clearDeadline(section) { localStorage.removeItem(deadlineKey(section)); }

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
/* Premium navigation: 5 primary links + "More" dropdown + user menu.
   Everything else (secondary pages, theme, language, auth) lives in
   dropdowns or the mobile menu — never crammed into the top bar. */
function shell(body, active) {
  const isMock = ['mock', 'listening', 'reading', 'writing', 'speaking'].includes(active);
  const user = store.user;
  const primary = [
    { key: 'dashboard', label: t('nav_dashboard'), active: active === 'dashboard' },
    { key: 'mock', label: t('nav_mock'), active: isMock },
    { key: 'fullmock', label: t('nav_fullmock'), active: active === 'fullmock' },
    { key: 'results', label: t('nav_results'), active: active === 'results' },
    { key: 'coach', label: t('nav_coach'), active: active === 'coach' }
  ];
  const more = [
    { key: 'mistakes', label: t('nav_mistakes'), active: active === 'mistakes' },
    { key: 'lessons', label: t('nav_lessons'), active: active === 'lessons' },
    { key: 'vocabulary', label: t('nav_vocabulary'), active: active === 'vocabulary' },
    { key: 'quiz', label: t('nav_quiz'), active: active === 'quiz' },
    { key: 'settings', label: t('nav_settings'), active: active === 'settings' }
  ];
  const allLinks = [...primary, ...more];
  const moreActive = more.find(l => l.active) || null;
  const langShort = (store.lang || 'en').toUpperCase();
  const nextLang = store.lang === 'en' ? 'UZ' : store.lang === 'uz' ? 'RU' : 'EN';
  const displayName = String(user ? (user.name || user.email || 'User') : 'User');
  const firstName = displayName.split(' ')[0];
  return `<header class="site-header" id="siteHeader">
  <nav class="nav" id="mainNav" aria-label="Main navigation">
    <a class="brand" href="#/"><span class="brand-mark">B</span><span class="brand-name">IELTS Mock</span></a>
    <div class="nav-links">
      ${primary.map(l => `<a class="${l.active ? 'active' : ''}" href="#/${l.key}" ${l.active ? 'aria-current="page"' : ''}>${l.label}</a>`).join('')}
      <div class="nav-more">
        <button class="nav-more-btn ${moreActive ? 'active' : ''}" id="moreBtn" aria-expanded="false" aria-haspopup="true" title="${t('nav_more')}">
          ${moreActive ? moreActive.label : t('nav_more')}<span class="caret">▾</span>
        </button>
        <div class="dropdown-menu" id="moreMenu">
          ${more.map(l => `<a class="${l.active ? 'active' : ''}" href="#/${l.key}">${l.label}</a>`).join('')}
        </div>
      </div>
    </div>
    <div class="nav-actions">
      <button class="icon-btn" data-toggle-theme aria-label="Toggle theme" title="${store.theme === 'light' ? t('theme_dark') : t('theme_light')}">${store.theme === 'light' ? '☀' : '☾'}</button>
      <button class="icon-btn lang-btn" data-toggle-lang aria-label="Switch language" title="EN / UZ / RU">${langShort}</button>
      ${user ? `<div class="nav-user">
        <button class="user-chip" id="userChip" aria-expanded="false" aria-haspopup="true">
          ${user.picture ? `<img src="${esc(user.picture)}" alt=""/>` : `<span class="avatar">${esc(firstName[0].toUpperCase())}</span>`}
          <span class="user-name">${esc(firstName)}</span><span class="caret">▾</span>
        </button>
        <div class="dropdown-menu user-menu" id="userMenu">
          <div class="user-menu-head"><strong>${esc(user.name || 'User')}</strong><span>${esc(user.email || '')}</span></div>
          <a href="#/dashboard">${t('nav_dashboard')}</a>
          <a href="#/settings">${t('nav_settings')}</a>
          <button class="user-logout" data-logout>${t('nav_logout')}</button>
        </div>
      </div>` : `<a class="btn btn-primary btn-sm nav-login" href="#/login">${t('nav_login')}</a>`}
      <button class="hamburger" id="hamburgerBtn" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </nav>
</header>
<div class="shell"><div class="page-fade">${body}</div></div>
<div class="mobile-menu" id="mobileMenu">
  <button class="close-menu" id="closeMenuBtn" aria-label="${t('modal_close')}">×</button>
  <div class="mm-brand"><span class="brand-mark">B</span> IELTS Mock</div>
  <div class="mm-links">
    ${allLinks.map(l => `<a class="${l.active ? 'active' : ''}" href="#/${l.key}">${l.label}</a>`).join('')}
  </div>
  <div class="mm-actions">
    <button class="btn btn-ghost" data-toggle-theme>${store.theme === 'light' ? '☀ ' + t('theme_dark') : '☾ ' + t('theme_light')}</button>
    <button class="btn btn-ghost" data-toggle-lang>${langShort} → ${nextLang}</button>
    ${user ? `<button class="btn btn-ghost" data-logout>${t('nav_logout')}</button>` : `<a class="btn btn-primary" href="#/login">${t('nav_login')}</a>`}
  </div>
</div>
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand"><span class="brand-mark sm">B</span><span>IELTS Mock <em>${t('footer_by')}</em></span></div>
    <nav class="footer-links" aria-label="Footer">
      <a href="#/">${t('nav_home')}</a>
      <a href="#/dashboard">${t('nav_dashboard')}</a>
      <a href="#/mock">${t('nav_mock')}</a>
      <a href="#/results">${t('nav_results')}</a>
      <a href="#/mistakes">${t('nav_mistakes')}</a>
      <a href="#/coach">${t('nav_coach')}</a>
    </nav>
    <p class="footer-legal"><span>© ${new Date().getFullYear()} Bandly AI</span><span>${t('disclaimer')}</span></p>
  </div>
</footer>`;
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
    <article class="test-card">
      <div class="test-meta"><span>${c.title}</span><span>${store.attempts.some(a => a.section === c.key) ? t('test_done') : t('not_started')}</span></div>
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
    ${meta.tests.map(tb => `<button class="seg-btn ${store.selectedTest === tb.id ? 'active' : ''}" data-test="${tb.id}" ${tb.premium ? `title="${t('test2_free')}"` : ''}>${tb.premium ? '⭐ ' : ''}${tb.id === 'test2' ? t('test2') : t('test1')}</button>`).join('')}
  </div>`;
}

function mockHub() {
  const activeTest = SERVICES.getSkillContent('listening', store.selectedTest);
  return shell(`
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">${t('home_mock_eyebrow')}</div><h1 style="font-family:var(--font-display);font-size:30px;margin:10px 0 0">${t('home_mock_title')}</h1></div><div class="test-switch">${testSwitch()}</div></div>
      <p class="micro" style="margin:14px 0 20px">${esc(SERVICES.testLabel(store.selectedTest, store.lang))} — ${activeTest && activeTest.difficulty ? esc(activeTest.difficulty) : ''}</p>
      <div class="library">${sectionCards()}</div>
    </section>`, 'mock');
}

/* ---------------- LISTENING ---------------- */
function currentTest(skill) { return SERVICES.getSkillContent(skill, store.selectedTest); }
let listeningState = { partIndex: 0, answers: {}, played: {}, deadline: null };
function listening() {
  const test = currentTest('listening');
  if (!listeningState.deadline) listeningState.deadline = loadDeadline('listening:' + store.selectedTest, 30);
  const part = test.parts[listeningState.partIndex];
  const played = listeningState.played[part.id];
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Listening · ${esc(part.title)}</span><span class="timer" data-timer role="timer" aria-live="off">--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 20px">Part ${part.partNumber} of 4</h1>
      <div class="glass" style="padding:24px;margin-bottom:20px">
        <p style="color:var(--muted);font-size:14px;margin-bottom:14px">${esc(part.instructions)}</p>
        <button class="btn ${played ? 'btn-ghost' : 'btn-primary'}" data-play-part ${played ? 'disabled' : ''}>${played ? '✓ ' + t('played') : '▶ ' + t('play_recording')}</button>
        <p class="micro">You can answer while listening or after — the recording plays once, like the real test.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">${part.questions.map((q, i) => `
        <div class="glass" style="padding:18px 20px">
          <p style="margin:0 0 10px;font-size:14.5px">Q${i + 1 + (part.partNumber - 1) * 10}. ${q.prompt}</p>
          ${q.type === 'multiple-choice'
            ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${q.options.map((opt, oi) => `<button class="btn btn-ghost opt-btn ${String(listeningState.answers[(part.partNumber - 1) * 10 + i]) === String(oi) ? 'selected' : ''}" style="font-size:13px" data-l-answer="${i}" data-value="${oi}">${String.fromCharCode(65 + oi)}. ${opt}</button>`).join('')}</div>`
            : `<input class="btn btn-ghost" style="width:220px;text-align:left" data-l-text="${i}" value="${esc(listeningState.answers[(part.partNumber - 1) * 10 + i] || '')}" placeholder="Your answer">`}
        </div>`).join('')}</div>
      <div style="margin-top:24px;display:flex;gap:12px">
        ${listeningState.partIndex > 0 ? `<button class="btn btn-ghost" data-l-prev>← ${t('prev_part')}</button>` : ''}
        ${listeningState.partIndex < 3 ? `<button class="btn btn-primary" data-l-next>${t('next_part')} ↗</button>` : `<button class="btn btn-primary" data-l-submit>${t('submit_listening')} ↗</button>`}
      </div>
    </section>`, 'listening');
}

/* ---------------- READING ---------------- */
let readingState = { passageIndex: 0, answers: {}, deadline: null };
function reading() {
  const test = currentTest('reading');
  if (!readingState.deadline) readingState.deadline = loadDeadline('reading:' + store.selectedTest, 60);
  const passage = test.passages[readingState.passageIndex];
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Reading · Passage ${passage.passageNumber} of 3 · ${esc(passage.difficulty)}</span><span class="timer" data-timer role="timer" aria-live="off">--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:26px;margin:10px 0 20px">${passage.title}</h1>
      <div class="reading-grid" style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:20px">
        <div class="glass" style="padding:22px;max-height:560px;overflow-y:auto;font-size:14px;line-height:1.7;white-space:pre-line">${passage.text}</div>
        <div style="display:flex;flex-direction:column;gap:12px;max-height:560px;overflow-y:auto">
          ${passage.questions.map((q, i) => `
            <div class="glass" style="padding:14px 16px">
              <p style="margin:0 0 8px;font-size:13.5px">${q.prompt}</p>
              ${q.type === 'true-false-not-given'
                ? `<div style="display:flex;gap:6px">${['TRUE', 'FALSE', 'NOT GIVEN'].map(v => `<button class="btn btn-ghost opt-btn ${readingState.answers[`${readingState.passageIndex}-${i}`] === v ? 'selected' : ''}" style="font-size:11.5px;padding:6px 10px" data-r-answer="${i}" data-value="${v}">${v}</button>`).join('')}</div>`
                : q.type === 'multiple-choice'
                ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${q.options.map((opt, oi) => `<button class="btn btn-ghost opt-btn ${String(readingState.answers[`${readingState.passageIndex}-${i}`]) === String(oi) ? 'selected' : ''}" style="font-size:11.5px" data-r-answer="${i}" data-value="${oi}">${String.fromCharCode(65 + oi)}</button>`).join('')}</div>`
                : `<input class="btn btn-ghost" style="width:100%;text-align:left" data-r-text="${i}" value="${esc(readingState.answers[`${readingState.passageIndex}-${i}`] || '')}" placeholder="Your answer">`}
            </div>`).join('')}
        </div>
      </div>
      <div style="margin-top:24px;display:flex;gap:12px">
        ${readingState.passageIndex > 0 ? `<button class="btn btn-ghost" data-r-prev>← ${t('prev_passage')}</button>` : ''}
        ${readingState.passageIndex < 2 ? `<button class="btn btn-primary" data-r-next>${t('next_passage')} ↗</button>` : `<button class="btn btn-primary" data-r-submit>${t('submit_reading')} ↗</button>`}
      </div>
    </section>`, 'reading');
}/* ---------------- WRITING ---------------- */
let writingState = { answers: {}, deadline: null };
function writing() {
  const test = currentTest('writing');
  if (!writingState.deadline) writingState.deadline = loadDeadline('writing:' + store.selectedTest, 60);
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Writing · Task 1 & Task 2</span><span class="timer" data-timer role="timer" aria-live="off">--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 24px">60 minutes total</h1>
      ${test.tasks.map((t, i) => `
        <div class="glass" style="padding:22px;margin-bottom:18px">
          <p class="eyebrow" style="margin-bottom:8px">${esc(t.title)} · ${t.minutes} min · min ${t.minWords} words</p>
          <p style="font-size:14.5px;line-height:1.6">${esc(t.prompt)}</p>
          ${t.chartData ? `<pre style="white-space:pre-wrap;font-size:12.5px;color:var(--muted);background:rgba(255,255,255,0.03);padding:12px;border-radius:10px">${esc(t.chartData)}</pre>` : ''}
          <textarea data-w-text="${i}" placeholder="Write your response here..." style="width:100%;min-height:180px;margin-top:14px;background:rgba(255,255,255,0.03);border:1px solid var(--panel-border);border-radius:12px;color:var(--text);padding:14px;font-family:var(--font-body);font-size:14px">${esc(writingState.answers[i] || '')}</textarea>
          <p class="micro word-count-${i}">${t2('words', { n: (writingState.answers[i] || '').trim() ? writingState.answers[i].trim().split(/\s+/).length : 0 })}</p>
        </div>`).join('')}
      <button class="btn btn-primary" data-w-submit>${t('submit_writing')} ↗</button>
      <div id="writing-result"></div>
    </section>`, 'writing');
}

/* ---------------- SPEAKING ---------------- */
let speakingState = { partIndex: 0, transcripts: { sp1: [], sp2: '', sp3: [] } };
function speaking() {
  const test = currentTest('speaking');
  const part = test.parts[speakingState.partIndex];
  return shell(`
    <section class="section">
      <div class="eyebrow">Speaking · ${part.title} · ${part.minutes} min</div>
      <h1 style="font-family:var(--font-display);font-size:26px;margin:10px 0 20px">Part ${part.partNumber} of 3</h1>
      <div class="glass" style="padding:24px">
        ${part.partNumber === 2 ? `
          <p style="font-size:15.5px;margin-bottom:10px">${part.topic}</p>
          <ul style="color:var(--muted);font-size:13.5px;line-height:1.8">${part.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
          <div id="speaking-cue-flow"></div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:16px">${part.questions.map((q, i) => `
            <div>
              <p style="font-size:14.5px;margin-bottom:8px">${q}</p>
              <button class="btn btn-primary" data-sp-record="${i}">● Record answer</button>
              <p class="micro sp-transcript-${i}"></p>
            </div>`).join('')}</div>
        `}
      </div>
      <div style="margin-top:24px;display:flex;gap:12px">
        ${speakingState.partIndex < 2 ? `<button class="btn btn-primary" data-sp-next>${t('next_part')} ↗</button>` : `<button class="btn btn-primary" data-sp-submit>${t('finish_speaking')} ↗</button>`}
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
      ${attempts.length ? `
        <div class="result-grid">
          ${attempts.map((a, i) => {
            const fb = store.feedback[a.section];
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
        <div class="glass" style="padding:30px;text-align:center">
          <p style="color:var(--muted)">${t('no_attempts')}</p>
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
        <div class="glass" style="padding:30px;text-align:center">
          <p style="color:var(--muted)">${t('no_mistakes')}</p>
        </div>` : sections.map(s => groups[s].length ? `
        <h2 style="font-family:var(--font-display);font-size:19px;margin:24px 0 12px;text-transform:capitalize">${s} (${groups[s].length})</h2>
        <div style="display:flex;flex-direction:column;gap:10px">${groups[s].map(m => `
          <div class="glass" style="padding:16px 18px">
            <p style="margin:0 0 8px;font-size:14px">${esc(m.prompt)}</p>
            <p style="margin:0;font-size:13px;color:var(--muted)">${t('your_answer')}: <span style="color:var(--coral)">${esc(m.given || '(no answer)')}</span> · ${t('correct_answer')}: <span style="color:var(--cyan)">${esc(m.correct)}</span></p>
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
      <div class="eyebrow">${t('nav_coach')}</div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 20px">${t('coach_title')}</h1>
      <div class="glass" style="padding:10px 18px;margin-bottom:16px;font-size:13.5px;color:var(--muted)">
        ${t('coach_overall')}: <strong style="color:var(--text)">${overall ?? t('not_assessed')}</strong> · ${t('coach_weakest')}: <strong style="color:var(--text);text-transform:capitalize">${weakest ?? t('not_assessed')}</strong> · ${t('coach_mistakes')}: <strong style="color:var(--text)">${store.mistakes.length}</strong>
      </div>
      <div class="glass" style="padding:20px;display:flex;flex-direction:column;gap:14px;max-height:420px;overflow-y:auto" id="coach-messages">
        ${store.coachMessages.length ? store.coachMessages.map(m => `<div style="align-self:${m.role === 'user' ? 'flex-end' : 'flex-start'};max-width:80%;background:${m.role === 'user' ? 'var(--primary-soft)' : 'rgba(255,255,255,0.04)'};padding:12px 16px;border-radius:14px;font-size:14px;line-height:1.5">${esc(m.text)}</div>`).join('')
        : `<div style="color:var(--muted);font-size:14px">Ask me anything — "Why am I stuck at this band?", "Give me a 30-minute study session", or "Create a 7-day plan".</div>`}
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
      const sig = `${section}:${q.prompt}:${SERVICES.normalizeAnswer(q.answer)}`;
      if (store.mistakes.some(m => m.sig === sig)) return; /* avoid duplicates across attempts */
      store.mistakes.push({ sig, section, prompt: q.prompt, given, correct: q.options ? q.options[q.answer] : q.answer, date: Date.now() });
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

  const r = route();

  if (r === '/listening') {
    startTimer(() => listeningState.deadline, submitListening);
    const playBtn = document.querySelector('[data-play-part]');
    if (playBtn) playBtn.onclick = () => {
      if (!window.speechSynthesis) return notify('Audio not supported in this browser');
      const part = currentTest('listening').parts[listeningState.partIndex];
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(part.transcript);
      utter.rate = 0.95;
      playBtn.disabled = true; playBtn.textContent = 'Playing…';
      utter.onend = () => { listeningState.played[part.id] = true; playBtn.textContent = '✓ ' + t('played'); };
      utter.onerror = () => { playBtn.disabled = false; playBtn.textContent = '▶ ' + t('play_recording'); notify('Playback issue — try again'); };
      window.speechSynthesis.speak(utter);
    };
    document.querySelectorAll('[data-l-answer]').forEach(el => el.onclick = () => {
      const part = currentTest('listening').parts[listeningState.partIndex];
      const globalIndex = (part.partNumber - 1) * 10 + Number(el.dataset.lAnswer);
      listeningState.answers[globalIndex] = el.dataset.value;
      /* select in place — no full re-render, scroll position and focus are kept */
      el.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.toggle('selected', b === el));
    });
    document.querySelectorAll('[data-l-text]').forEach(el => el.onchange = () => {
      const part = currentTest('listening').parts[listeningState.partIndex];
      const globalIndex = (part.partNumber - 1) * 10 + Number(el.dataset.lText);
      listeningState.answers[globalIndex] = el.value;
    });
    const lNext = document.querySelector('[data-l-next]');
    if (lNext) lNext.onclick = () => { listeningState.partIndex++; render(); };
    const lPrev = document.querySelector('[data-l-prev]');
    if (lPrev) lPrev.onclick = () => { listeningState.partIndex--; render(); };
    const lSubmit = document.querySelector('[data-l-submit]');
    if (lSubmit) lSubmit.onclick = submitListening;
  }

  if (r === '/reading') {
    startTimer(() => readingState.deadline, submitReading);
    document.querySelectorAll('[data-r-answer]').forEach(el => el.onclick = () => {
      const key = `${readingState.passageIndex}-${el.dataset.rAnswer}`;
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
    startTimer(() => writingState.deadline, () => document.querySelector('[data-w-submit]')?.click());
    document.querySelectorAll('[data-w-text]').forEach(el => el.oninput = () => {
      writingState.answers[el.dataset.wText] = el.value;
      const words = el.value.trim() ? el.value.trim().split(/\s+/).length : 0;
      const label = document.querySelector(`.word-count-${el.dataset.wText}`);
      if (label) label.textContent = t2('words', { n: words });
    });
    const wSubmit = document.querySelector('[data-w-submit]');
    if (wSubmit) wSubmit.onclick = async () => {
      const tasks = currentTest('writing').tasks;
      const payload = { mode: 'writing', tasks: tasks.map((t, i) => ({ title: t.title, prompt: t.prompt, response: writingState.answers[i] || '' })) };
      wSubmit.disabled = true; wSubmit.textContent = t('grading');
      try {
        const res = await fetch('/api/grade', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Grading failed');
        store.attempts.push({ section: 'writing', band: data.band, date: Date.now() });
        store.feedback.writing = data;
        save();
        clearTimerAndDeadline('writing');
        document.querySelector('#writing-result').innerHTML = aiFeedbackBlock(data);
      } catch (err) {
        notify(`Error: ${err.message}`);
      } finally {
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
      const test = currentTest('speaking');
      const parts = test.parts.map((p) => ({
        title: p.title,
        qa: p.partNumber === 1
          ? (p.questions || []).map((q, i) => ({ q, a: speakingState.transcripts.sp1[i] || '' }))
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
        store.attempts.push({ section: 'speaking', band: data.band, date: Date.now() });
        store.feedback.speaking = data;
        save();
        document.querySelector('#speaking-result').innerHTML = aiFeedbackBlock(data);
      } catch (err) {
        notify(`Error: ${err.message}`);
      } finally {
        spSubmit.disabled = false; spSubmit.textContent = t('finish_speaking') + ' ↗';
      }
    };
    const cueFlow = document.querySelector('#speaking-cue-flow');
    if (cueFlow) {
      let sp2Timers = [];
      let sp2Recognition = null;
      let sp2Phase = 'idle'; /* idle → prep → recording → done */
      const sp2Btn = document.createElement('button');
      sp2Btn.className = 'btn btn-primary';
      sp2Btn.style.marginTop = '16px';
      sp2Btn.textContent = 'Start 1-minute prep';
      cueFlow.appendChild(sp2Btn);
      const status = document.createElement('p');
      status.className = 'micro';
      cueFlow.appendChild(status);
      function stopSp2Timers() { while (sp2Timers.length) clearInterval(sp2Timers.pop()); }
      function setSp2Phase(p) {
        sp2Phase = p;
        sp2Btn.disabled = (p === 'prep' || p === 'recording');
        sp2Btn.textContent = p === 'done' ? '↻ Re-record answer' : p === 'recording' ? 'Recording…' : 'Start 1-minute prep';
      }
      function startRecordingPart2() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { notify('Speech recognition not supported — try Chrome or Edge'); setSp2Phase('idle'); return; }
        let talkLeft = 120;
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
        status.textContent = '🔴 Recording… speak now (2 minutes)';
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
        let prep = 60;
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
    const fb = store.feedback[attempt.section];
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

  bindNavExtras();
  bindPremium();
}

function bindPremium() {
  const r = route();

  /* Test switch: change the selected practice test and reset section state. */
  document.querySelectorAll('[data-test]').forEach(el => el.onclick = () => {
    const id = el.dataset.test;
    if (store.selectedTest === id) return;
    store.selectedTest = id;
    save();
    listeningState = { partIndex: 0, answers: {}, played: {}, deadline: null };
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

  /* Auth form (demo auth stored locally; swap to Supabase/Firebase in prod). */
  const authForm = document.querySelector('#auth-form');
  if (authForm) authForm.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(authForm);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const name = String(fd.get('name') || '').trim() || email.split('@')[0] || 'User';
    if (!email || password.length < 4) return notify('Enter a valid email and a password (4+ chars).');
    store.user = { name, email, picture: '', auth: 'demo' };
    save();
    notify(`Welcome, ${name.split(' ')[0]}!`);
    go('/dashboard');
  };
  const googleBtn = document.querySelector('[data-google-auth]');
  if (googleBtn) googleBtn.onclick = () => {
    const g = window.google && window.google.accounts && window.google.accounts.id;
    if (g) g.prompt(); else notify('Google sign-in available in Chrome/Edge.');
  };
}

function bindNavExtras() {
  const hamburger = document.querySelector('#hamburgerBtn');
  const mobileMenu = document.querySelector('#mobileMenu');
  const closeMenu = document.querySelector('#closeMenuBtn');

  const moreBtn = document.querySelector('#moreBtn');
  const moreMenu = document.querySelector('#moreMenu');
  if (moreBtn && moreMenu) {
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      setMenu(document.querySelector('#userMenu'), false, document.querySelector('#userChip'));
      setMenu(moreMenu, !moreMenu.classList.contains('open'), moreBtn);
    };
  }

  const userChip = document.querySelector('#userChip');
  const userMenu = document.querySelector('#userMenu');
  if (userChip && userMenu) {
    userChip.onclick = (e) => {
      e.stopPropagation();
      setMenu(document.querySelector('#moreMenu'), false, document.querySelector('#moreBtn'));
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

  const loginContainer = document.querySelector('#google-login-btn');
  if (loginContainer && window.google && GOOGLE_CLIENT_ID !== 'YOUR_CLIENT_ID_HERE') {
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleLogin });
    window.google.accounts.id.renderButton(loginContainer, { theme: 'filled_black', size: 'medium', shape: 'pill' });
  }

  /* Explicit sign-out from the user menu / mobile menu — no native confirm(). */
  document.querySelectorAll('[data-logout]').forEach(el => {
    el.onclick = () => { store.user = null; save(); render(); };
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

  /* close open dropdowns when clicking anywhere outside them */
  document.addEventListener('click', (e) => {
    const moreMenu = document.querySelector('#moreMenu');
    if (moreMenu && moreMenu.classList.contains('open') && !e.target.closest('.nav-more')) {
      setMenu(moreMenu, false, document.querySelector('#moreBtn'));
    }
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
  });
}

function handleGoogleLogin(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]));
  store.user = { name: payload.name, email: payload.email, picture: payload.picture };
  save();
  notify(`Welcome, ${payload.name.split(' ')[0]}!`);
  render();
}
window.handleGoogleLogin = handleGoogleLogin;

/* ---------------- SUBMIT HANDLERS ---------------- */
function clearTimerAndDeadline(section) {
  clearInterval(timerInterval);
  clearDeadline(section);
}

function submitListening() {
  const allQuestions = currentTest('listening').parts.flatMap(p => p.questions);
  recordMistakes('listening', allQuestions, listeningState.answers, i => i);
  const correct = allQuestions.filter((q, i) => SERVICES.isCorrect(q, listeningState.answers[i])).length;
  const band = SERVICES.bandFromRaw(correct, allQuestions.length);
  store.attempts.push({ section: 'listening', band, raw: correct, total: allQuestions.length, date: Date.now() });
  save();
  clearTimerAndDeadline('listening');
  notify(t2('complete_listening', { band, raw: correct, total: allQuestions.length }));
  listeningState = { partIndex: 0, answers: {}, played: {}, deadline: null };
  go('/results');
}

function submitReading() {
  let correct = 0, total = 0;
  currentTest('reading').passages.forEach((p, pi) => {
    recordMistakes('reading', p.questions, readingState.answers, qi => `${pi}-${qi}`);
    p.questions.forEach((q, qi) => { total++; if (SERVICES.isCorrect(q, readingState.answers[`${pi}-${qi}`])) correct++; });
  });
  const band = SERVICES.bandFromRaw(correct, total);
  store.attempts.push({ section: 'reading', band, raw: correct, total, date: Date.now() });
  save();
  clearTimerAndDeadline('reading');
  notify(t2('complete_reading', { band, raw: correct, total }));
  readingState = { passageIndex: 0, answers: {}, deadline: null };
  go('/results');
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
          ${trend.length ? bandSvg(trend) : `<p class="micro">Complete a section to see your band trend.</p>`}
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
          <button class="btn btn-primary" data-go="/fullmock">${t('start_full_mock')} ↗</button>
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

/* ---------------- FULL MOCK ---------------- */
function fullmock() {
  const steps = [
    { key: 'listening', title: 'Listening', color: 'var(--cyan)', max: 40 },
    { key: 'reading', title: 'Reading', color: 'var(--cyan)', max: 40 },
    { key: 'writing', title: 'Writing', color: 'var(--coral)', max: 9 },
    { key: 'speaking', title: 'Speaking', color: 'var(--coral)', max: 9 }
  ];
  const overall = SERVICES.overallBand(store.attempts);
  return shell(`
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">${t('fullmock_title')}</div><h1 style="margin:8px 0 6px">${t('fullmock_title')}</h1><p class="micro">${t('fullmock_subtitle')}</p></div><div class="test-switch">${testSwitch()}</div></div>
      <div class="mock-flow">
        ${steps.map((s, i) => {
          const done = store.attempts.some(a => a.section === s.key);
          return `<a class="mock-step ${done ? 'done' : ''}" href="#/${s.key}"><span class="step-num">${i + 1}</span><div><strong>${s.title}</strong><p class="micro">${done ? '✓ Completed' : t('not_started')} · ${s.max}</p></div>${done ? '' : '↗'}</a>`;
        }).join('')}
      </div>
      <div class="glass" style="margin-top:20px">
        <div class="panel-title">Combined result</div>
        <div class="big" style="margin:10px 0">${overall ?? '—'} <small>/ 9</small></div>
        <p class="micro">${store.attempts.length}/4 sections attempted.</p>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-primary" data-go="/listening">Start with Listening ↗</button>
          <button class="btn btn-ghost" data-go="/dashboard">${t('nav_dashboard')} ↗</button>
        </div>
      </div>
    </section>`, 'fullmock');
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
        <div class="setting-row"><span>Account</span>${user ? `<button class="btn btn-ghost btn-sm" data-logout>${t('nav_logout')}</button>` : `<button class="btn btn-ghost btn-sm" data-go="/login">${t('nav_login')}</button>`}</div>
      </div>
    </section>`, 'settings');
}

/* ---------------- AUTH ---------------- */
function authPage(mode) {
  const isSignup = mode === 'signup';
  return shell(`
    <section class="section auth-wrap">
      <div class="glass auth-card center-card">
        <h1 style="margin:0 0 6px">${isSignup ? t('auth_signup_title') : t('auth_title')}</h1>
        <p class="micro">${t('auth_demo_note')}</p>
        <form id="auth-form" data-auth-mode="${isSignup ? 'signup' : 'login'}">
          ${isSignup ? `<label class="field"><span>${t('auth_name')}</span><input name="name" class="btn btn-ghost" required placeholder="Aziz"/></label>` : ''}
          <label class="field"><span>${t('auth_email')}</span><input name="email" type="email" class="btn btn-ghost" required placeholder="you@example.com"/></label>
          <label class="field"><span>${t('auth_password')}</span><input name="password" type="password" class="btn btn-ghost" required placeholder="••••••••"/></label>
          <button class="btn btn-primary" type="submit" style="width:100%">${t('auth_submit')} ↗</button>
        </form>
        <button class="btn btn-ghost google-btn" data-google-auth style="width:100%;margin-top:12px">${t('auth_google')}</button>
        <div id="google-login-btn" style="margin-top:12px"></div>
        <p class="micro">${isSignup ? `<a href="#/login">${t('auth_switch')}</a>` : `<a href="#/signup">${t('auth_switch_signup')}</a>`}</p>
      </div>
    </section>`, 'auth');
}

/* ---------------- RENDER / ROUTER ---------------- */
function render() {
  applyPrefs();
  const r = route();
  let html;
  if (r === '/') html = home();
  else if (r === '/mock') html = mockHub();
  else if (r === '/listening') html = listening();
  else if (r === '/reading') html = reading();
  else if (r === '/writing') html = writing();
  else if (r === '/speaking') html = speaking();
  else if (r === '/results') html = resultsPage();
  else if (r === '/mistakes') html = mistakes();
  else if (r === '/coach') html = coach();
  else if (r === '/dashboard') html = dashboard();
  else if (r === '/lessons') html = lessons();
  else if (r === '/vocabulary') html = vocabulary();
  else if (r === '/quiz') html = quizPage();
  else if (r === '/fullmock') html = fullmock();
  else if (r === '/settings') html = settings();
  else if (r === '/login') html = authPage('login');
  else if (r === '/signup') html = authPage('signup');
  else html = home();
  if (lessonModalId) html += lessonModalHtml();
  app.innerHTML = html;
  bind();
  initReveal();
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

/* ---------------- BOOT ---------------- */
function registerPWA() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const done = () => navigator.serviceWorker.register('sw.js', { scope: '/' }).then(() => {
    if (typeof console !== 'undefined') console.log('PWA service worker registered');
  }).catch(() => {});
  if (document && document.readyState === 'complete') done();
  else if (window && typeof window.addEventListener === 'function') window.addEventListener('load', done);
}

applyPrefs();
registerPWA();
window.addEventListener('hashchange', render);
render();