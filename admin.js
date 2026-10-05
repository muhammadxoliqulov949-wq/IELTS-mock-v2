/* ===================================================================
 * Admin panel — data layer + views for #/admin
 *
 * Design notes
 * ------------
 * • The client never decides who is an admin for access-control purposes.
 *   Every admin query goes to Postgres, where row level security re-checks
 *   public.is_admin(). The role in the client only decides what to show and
 *   lets us fail fast with an honest message.
 * • Nothing here is reachable without the migration in
 *   supabase/migrations/202610050001_admin.sql. When the tables are missing
 *   the panel says so plainly instead of pretending the platform is empty.
 * • All admin-authored content is escaped before it reaches innerHTML.
 * =================================================================== */
(function () {
  'use strict';

  /* ---------- tiny helpers (kept local so this file stands alone) ---------- */
  const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ENT[c]); }
  function t(key) { return window.IELTS_I18N ? window.IELTS_I18N.t(key) : key; }
  function t2(key, vars) {
    let out = t(key);
    Object.keys(vars || {}).forEach(k => { out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    return out;
  }
  function hooks() { return window.IELTS_ADMIN_HOOKS || {}; }
  function rerender() { const h = hooks(); if (typeof h.render === 'function') h.render(); }
  function toast(msg) { const h = hooks(); if (typeof h.notify === 'function') h.notify(msg); }
  function fmtDate(v) {
    if (!v) return '—';
    try { return new Date(v).toLocaleDateString(); } catch { return '—'; }
  }
  function fmtBand(v) { return (v === null || v === undefined) ? '—' : Number(v).toFixed(1); }
  function initials(name, email) {
    const src = String(name || email || '?').trim();
    return src.charAt(0).toUpperCase();
  }
  function avatar(p, cls) {
    if (p && p.avatar_url) return `<img class="admin-avatar${cls ? ' ' + cls : ''}" src="${esc(p.avatar_url)}" alt="" loading="lazy">`;
    return `<span class="admin-avatar admin-avatar--fallback${cls ? ' ' + cls : ''}">${esc(initials(p && p.name, p && p.email))}</span>`;
  }

  const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
  const Q_TYPES = [
    'sentence-completion', 'form-completion', 'note-completion', 'table-completion', 'summary-completion',
    'multiple-choice', 'multiple-choice-multi', 'true-false-not-given', 'yes-no-not-given',
    'matching', 'matching-headings', 'map-labelling'
  ];
  const Q_TYPE_LABEL = {
    'sentence-completion': 'Sentence completion', 'form-completion': 'Form completion',
    'note-completion': 'Note completion', 'table-completion': 'Table completion',
    'summary-completion': 'Summary completion', 'multiple-choice': 'Multiple choice · one answer',
    'multiple-choice-multi': 'Multiple choice · choose TWO',
    'true-false-not-given': 'True / False / Not Given', 'yes-no-not-given': 'Yes / No / Not Given',
    matching: 'Matching', 'matching-headings': 'Matching headings', 'map-labelling': 'Map / plan labelling'
  };
  const SKILL_LABEL = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

  /* ---------- state ---------- */
  const state = {
    tab: 'overview',
    stats: null,
    profiles: [],
    submissions: [],
    tests: null,        /* { rows: [...], meta: [...] } */
    loading: null,      /* which tab is busy */
    error: '',
    notice: '',
    search: { users: '', submissions: '' },
    editor: null,       /* { kind: 'meta'|'skill', ... } */
    confirm: null,      /* { title, body, danger, onConfirm } */
    jsonMode: false,
    jsonDraft: '',
    jsonError: '',
    uploadError: '',
    setup: null         /* null | { missing: bool, message } */
  };
  const loaded = { overview: false, users: false, submissions: false, tests: false };

  function cloud() { return window.IELTS_CLOUD || null; }
  function api() {
    const c = cloud();
    if (!c) throw new Error(t('admin_no_cloud'));
    if (!c.getState || c.getState().status !== 'ready') throw new Error(t('admin_no_cloud'));
    return c;
  }
  function isAdmin() {
    const c = cloud();
    if (!c || !c.getState) return false;
    const s = c.getState();
    return !!(s && s.user && s.isAdmin);
  }

  /* ---------- data ---------- */
  async function refresh(tab) {
    state.error = '';
    state.loading = tab;
    rerender();
    try {
      const c = api();
      if (tab === 'overview') {
        state.stats = await c.adminStats();
        loaded.overview = true;
      } else if (tab === 'users') {
        const [profiles, submissions] = await Promise.all([
          c.adminListProfiles({ search: state.search.users }),
          loaded.submissions && !state.search.submissions
            ? Promise.resolve(state.submissions)
            : c.adminListSubmissions()
        ]);
        state.profiles = profiles;
        state.submissions = submissions;
        loaded.users = true;
        loaded.submissions = true;
      } else if (tab === 'submissions') {
        state.submissions = await c.adminListSubmissions({ search: state.search.submissions });
        loaded.submissions = true;
      } else if (tab === 'tests') {
        state.tests = await c.adminListTests();
        loaded.tests = true;
      }
      state.setup = null;
    } catch (err) {
      state.error = message(err);
      /* 42P01 undefined_table / PGRST205 missing table → the migration is absent */
      if (/42P01|relation .* does not exist|Could not find the table|permission denied/i.test(state.error)) {
        state.setup = { missing: true };
      }
    } finally {
      state.loading = null;
      rerender();
    }
  }

  function message(err) {
    if (!err) return t('admin_error');
    const raw = err.message || err.error_description || String(err);
    /* Supabase sends JSON hints we do not want to show verbatim. */
    if (/^Admin access required/.test(raw)) return t('admin_not_admin');
    if (/JWT|token/i.test(raw)) return t('admin_session_expired');
    return raw.length > 240 ? raw.slice(0, 240) + '…' : raw;
  }

  function ensure(tab) {
    if (loaded[tab] || state.loading === tab) return;
    refresh(tab);
  }

  /* ---------- derived ---------- */
  function testsByUser() {
    const map = new Map();
    (state.submissions || []).forEach(s => {
      const cur = map.get(s.user_id) || { total: 0, completed: 0 };
      cur.total += 1;
      if (s.overall_band !== null && s.overall_band !== undefined) cur.completed += 1;
      map.set(s.user_id, cur);
    });
    return map;
  }
  function testsBySkill() {
    const map = new Map();
    (state.tests && state.tests.rows ? state.tests.rows : []).forEach(r => {
      map.set(r.test_id + '::' + r.skill, r);
    });
    return map;
  }

  /* ===================================================================
   * VIEW
   * =================================================================== */
  function body() {
    if (!isAdmin()) return denied();
    const tab = state.tab;
    return `
    <section class="section admin">
      ${headerHtml()}
      ${tabsHtml(tab)}
      ${state.error ? noticeHtml('error', state.error, state.setup) : ''}
      ${state.notice ? noticeHtml('ok', state.notice) : ''}
      <div class="admin-panel">
        ${tab === 'overview' ? overviewHtml() : ''}
        ${tab === 'users' ? usersHtml() : ''}
        ${tab === 'tests' ? testsHtml() : ''}
        ${tab === 'submissions' ? submissionsHtml() : ''}
      </div>
    </section>`;
  }

  function denied() {
    return `
    <section class="section">
      <div class="glass center-card admin-denied">
        <div class="warn-icon">🔒</div>
        <h1 style="font-family:var(--font-display);font-size:24px;margin:14px 0 8px">${esc(t('admin_not_admin_title'))}</h1>
        <p class="micro">${esc(t('admin_not_admin_body'))}</p>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
          <button class="btn btn-primary" data-go="/dashboard">${esc(t('nav_dashboard'))} ↗</button>
        </div>
      </div>
    </section>`;
  }

  function headerHtml() {
    return `
      <div class="admin-head">
        <div>
          <div class="eyebrow">${esc(t('admin_eyebrow'))}</div>
          <h1 class="admin-title">${esc(t('admin_title'))}</h1>
          <p class="micro">${esc(t('admin_subtitle'))}</p>
        </div>
        <div class="admin-head-side">
          <span class="admin-badge">◆ ${esc(t('admin_badge'))}</span>
          <button class="btn btn-ghost btn-sm" data-admin-refresh>${esc(t('admin_refresh'))}</button>
        </div>
      </div>`;
  }

  function tabsHtml(tab) {
    const tabs = [
      { key: 'overview', label: t('admin_tab_overview') },
      { key: 'users', label: t('admin_tab_users') },
      { key: 'tests', label: t('admin_tab_tests') },
      { key: 'submissions', label: t('admin_tab_submissions') }
    ];
    return `<nav class="admin-tabs" aria-label="${esc(t('admin_title'))}">
      ${tabs.map(x => `<button class="admin-tab${x.key === tab ? ' active' : ''}" data-admin-tab="${x.key}"${x.key === tab ? ' aria-current="page"' : ''}>${esc(x.label)}</button>`).join('')}
    </nav>`;
  }

  function noticeHtml(kind, text, setup) {
    return `<div class="admin-notice admin-notice--${kind}" role="${kind === 'error' ? 'alert' : 'status'}" aria-live="polite">
      <div>
        <strong>${esc(kind === 'error' ? t('admin_error') : t('admin_saved'))}</strong>
        <p>${esc(text)}</p>
        ${setup ? `<p class="admin-setup">${esc(t('admin_setup_hint'))}</p>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" data-admin-refresh>${esc(t('admin_retry'))}</button>
    </div>`;
  }

  /* ---------- Overview ---------- */
  function overviewHtml() {
    if (state.loading === 'overview') return skeleton(6);
    const s = state.stats || {};
    const cards = [
      { label: t('admin_stat_users'), value: s.users ?? '—', hint: t2('admin_stat_new_users', { n: s.newUsers7d ?? 0 }) },
      { label: t('admin_stat_submissions'), value: s.submissions ?? '—', hint: t2('admin_stat_completed', { n: s.completed ?? 0 }) },
      { label: t('admin_stat_avg_band'), value: s.avgBand != null ? fmtBand(s.avgBand) : '—', hint: t('admin_stat_avg_hint') },
      { label: t('admin_stat_admins'), value: s.admins ?? '—', hint: t('admin_stat_admins_hint') },
      { label: t('admin_stat_tests'), value: s.tests ?? '—', hint: t('admin_stat_tests_hint') }
    ];
    return `
      <div class="admin-stats">
        ${cards.map(c => `
          <div class="glass admin-stat">
            <span class="admin-stat-label">${esc(c.label)}</span>
            <strong class="admin-stat-value">${esc(c.value)}</strong>
            <span class="admin-stat-hint">${esc(c.hint)}</span>
          </div>`).join('')}
      </div>
      <div class="glass admin-block">
        <div class="panel-title">${esc(t('admin_recent_submissions'))}</div>
        ${recentSubmissionsHtml()}
      </div>`;
  }

  function recentSubmissionsHtml() {
    const rows = (state.submissions || []).slice(0, 8);
    if (!rows.length) return `<p class="micro">${esc(t('admin_submissions_empty'))}</p>`;
    return `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr>
        <th>${esc(t('admin_col_user'))}</th>
        <th>${esc(t('admin_col_test'))}</th>
        <th>${esc(t('admin_col_overall'))}</th>
        <th>${esc(t('admin_col_date'))}</th>
      </tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${avatar(r.profile)}<span>${esc((r.profile && (r.profile.name || r.profile.email)) || r.name || '—')}</span></td>
        <td>${esc(r.test_id)}</td>
        <td><strong>${fmtBand(r.overall_band)}</strong></td>
        <td>${esc(fmtDate(r.updated_at || r.created_at))}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  function skeleton(n) {
    return `<div class="admin-stats">${Array.from({ length: n }, () => `<div class="glass admin-stat admin-stat--skeleton"><span></span><strong></strong><span></span></div>`).join('')}</div>`;
  }

  /* ---------- Users ---------- */
  function usersHtml() {
    const counts = testsByUser();
    const rows = state.profiles || [];
    return `
      <div class="glass admin-block">
        <div class="admin-toolbar">
          <div>
            <div class="panel-title">${esc(t('admin_users_title'))}</div>
            <p class="micro">${esc(t2('admin_users_count', { n: rows.length }))}</p>
          </div>
          <div class="admin-toolbar-actions">
            <input class="admin-search" type="search" value="${esc(state.search.users)}"
                   placeholder="${esc(t('admin_search_placeholder'))}" data-admin-search="users" />
            <button class="btn btn-ghost btn-sm" data-admin-refresh>${esc(t('admin_refresh'))}</button>
          </div>
        </div>
        ${state.loading === 'users' ? `<p class="micro">${esc(t('admin_loading'))}</p>` : ''}
        ${!rows.length && state.loading !== 'users' ? `<p class="micro">${esc(t('admin_users_empty'))}</p>` : ''}
        ${rows.length ? `<div class="admin-table-wrap"><table class="admin-table">
          <thead><tr>
            <th>${esc(t('admin_col_user'))}</th>
            <th>${esc(t('admin_col_role'))}</th>
            <th>${esc(t('admin_col_tests'))}</th>
            <th>${esc(t('admin_col_joined'))}</th>
            <th class="ta-right">${esc(t('admin_col_actions'))}</th>
          </tr></thead>
          <tbody>${rows.map(p => {
            const c = counts.get(p.id) || { total: 0, completed: 0 };
            const isSelf = cloud() && cloud().getState().user && cloud().getState().user.id === p.id;
            const isAdminRow = p.role === 'admin';
            return `<tr>
              <td class="admin-cell-user">
                ${avatar(p)}
                <span class="admin-cell-stack">
                  <strong>${esc(p.name || t('admin_unnamed'))}</strong>
                  <small>${esc(p.email || '—')}</small>
                </span>
              </td>
              <td><span class="role-pill role-pill--${isAdminRow ? 'admin' : 'user'}">${esc(isAdminRow ? t('admin_role_admin') : t('admin_role_user'))}</span></td>
              <td>${esc(String(c.total))}<small class="admin-muted"> · ${esc(String(c.completed))} ${esc(t('admin_done_short'))}</small></td>
              <td>${esc(fmtDate(p.created_at))}</td>
              <td class="ta-right">
                <div class="admin-row-actions">
                  ${isSelf ? `<span class="admin-you">${esc(t('admin_you'))}</span>` : `
                    <button class="btn btn-ghost btn-sm" data-admin-role="${esc(p.id)}" data-role="${isAdminRow ? 'user' : 'admin'}">${esc(isAdminRow ? t('admin_demote') : t('admin_promote'))}</button>
                    <button class="btn btn-ghost btn-sm admin-danger" data-admin-delete-user="${esc(p.id)}" data-name="${esc(p.name || p.email || '')}">${esc(t('admin_delete'))}</button>
                  `}
                </div>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : ''}
      </div>`;
  }



  /* ===================================================================
   * TESTS
   * =================================================================== */
  function nextTestId() {
    const used = new Set();
    const content = (window.IELTS_CONTENT && window.IELTS_CONTENT.testMeta) || {};
    (content.tests || []).forEach(x => used.add(String(x.id)));
    ((state.tests && state.tests.meta) || []).forEach(x => used.add(String(x.test_id)));
    ((state.tests && state.tests.rows) || []).forEach(x => used.add(String(x.test_id)));
    let n = 1;
    while (used.has('test' + n)) n += 1;
    return 'test' + n;
  }

  function countQuestions(payload) {
    try {
      const p = payload || {};
      const blocks = p.parts || p.passages || p.tasks || [];
      return blocks.reduce((sum, b) => sum + ((b && b.questions && b.questions.length) || 0), 0);
    } catch { return 0; }
  }

  function testsHtml() {
    const meta = (state.tests && state.tests.meta) || [];
    const bySkill = testsBySkill();
    const content = (window.IELTS_CONTENT && window.IELTS_CONTENT.testMeta) || {};
    const builtIn = (content.tests || []).filter(x => !meta.some(m => m.test_id === x.id));

    return `
      <div class="glass admin-block">
        <div class="admin-toolbar">
          <div>
            <div class="panel-title">${esc(t('admin_tests_title'))}</div>
            <p class="micro">${esc(t('admin_tests_subtitle'))}</p>
          </div>
          <div class="admin-toolbar-actions">
            <button class="btn btn-primary btn-sm" data-admin-new-test>＋ ${esc(t('admin_tests_new'))}</button>
            <button class="btn btn-ai btn-sm" data-admin-ai-generate title="${esc(t('admin_ai_button_hint'))}">✨ ${esc(t('admin_ai_generate'))}</button>
            <button class="btn btn-ghost btn-sm" data-admin-refresh>${esc(t('admin_refresh'))}</button>
          </div>
        </div>
        ${state.loading === 'tests' ? `<p class="micro">${esc(t('admin_loading'))}</p>` : ''}

        ${builtIn.length ? `<p class="admin-subhead">${esc(t('admin_tests_builtin'))}</p>
        <div class="admin-test-grid">
          ${builtIn.map(x => `
            <div class="admin-test-card admin-test-card--locked">
              <div class="admin-test-head">
                <div class="admin-test-id">
                  <span class="admin-test-key">${esc(x.id)}</span>
                  <strong>${esc(x.label)}</strong>
                  <span class="pill">${esc(t('admin_tests_builtin_badge'))}</span>
                </div>
              </div>
              <p class="micro">${esc(t('admin_tests_builtin_hint'))}</p>
            </div>`).join('')}
        </div>` : ''}

        <p class="admin-subhead">${esc(t('admin_tests_custom'))}</p>
        ${!meta.length ? `<p class="micro">${esc(t('admin_tests_empty'))}</p>` : `
        <div class="admin-test-grid">
          ${meta.map(m => {
            const published = !!m.is_published;
            return `
            <div class="admin-test-card">
              <div class="admin-test-head">
                <div class="admin-test-id">
                  <span class="admin-test-key">${esc(m.test_id)}</span>
                  <strong>${esc(m.label)}</strong>
                  ${m.difficulty ? `<span class="pill">${esc(m.difficulty)}</span>` : ''}
                  <span class="admin-state ${published ? 'on' : 'off'}">${esc(published ? t('admin_published') : t('admin_draft'))}</span>
                </div>
                <div class="admin-row-actions">
                  <button class="btn btn-ghost btn-sm" data-admin-toggle-publish="${esc(m.test_id)}" data-publish="${published ? '0' : '1'}">${esc(published ? t('admin_unpublish') : t('admin_publish'))}</button>
                  <button class="btn btn-ghost btn-sm" data-admin-edit-meta="${esc(m.test_id)}">${esc(t('admin_edit'))}</button>
                  <button class="btn btn-ghost btn-sm admin-danger" data-admin-delete-test="${esc(m.test_id)}" data-name="${esc(m.label)}">${esc(t('admin_delete'))}</button>
                </div>
              </div>
              <div class="admin-skill-grid">
                ${SKILLS.map(sk => {
                  const row = bySkill.get(m.test_id + '::' + sk);
                  const cls = !row ? 'missing' : (row.is_published ? 'on' : 'off');
                  return `<button class="admin-skill is-${cls}" data-admin-edit-skill="${esc(m.test_id)}::${sk}">
                    <span>${esc(SKILL_LABEL[sk])}</span>
                    <small>${row
                      ? esc(String(countQuestions(row.payload))) + ' ' + esc(t('admin_questions_short')) + ' · ' + esc(row.is_published ? t('admin_published') : t('admin_draft'))
                      : esc(t('admin_skill_missing'))}</small>
                  </button>`;
                }).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>`}
      </div>`;
  }

  /* ===================================================================
   * EDITOR — hybrid: a structured form, plus a JSON view for pasting
   * =================================================================== */
  /* ===================================================================
   * EDITOR — IELTS-specific visual builder + per-skill JSON mode
   *
   * Fixed section counts match the exam: 4 Listening parts, 3 Reading
   * passages, 2 Writing tasks, 3 Speaking parts. Questions remain flexible
   * and every Listening/Reading question must have an answer + explanation.
   * =================================================================== */
  function emptyPayload(skill) {
    if (skill === 'listening') return {
      id: 'listening-custom', title: '', skill: 'Listening', duration: 30,
      parts: [1, 2, 3, 4].map(emptyListeningPart)
    };
    if (skill === 'reading') return {
      id: 'reading-custom', title: '', skill: 'Reading', duration: 60, format: 'Academic',
      passages: [1, 2, 3].map(emptyPassage)
    };
    if (skill === 'writing') return {
      id: 'writing-custom', title: '', skill: 'Writing', format: 'Academic', duration: 60,
      tasks: [emptyTask(1), emptyTask(2)]
    };
    return {
      id: 'speaking-custom', title: '', skill: 'Speaking', duration: 14,
      parts: [1, 2, 3].map(emptySpeakingPart)
    };
  }
  function emptyListeningPart(n) {
    return {
      id: 'lp' + n, partNumber: n, title: 'Part ' + n,
      instructions: n === 1 ? 'Questions 1–10. You will hear this recording ONCE.' : '',
      transcript: '', audioUrl: '', audioPath: '', questions: []
    };
  }
  function emptyPassage(n) {
    return {
      id: 'rp' + n, passageNumber: n, title: 'Passage ' + n,
      difficulty: ['Easier', 'Medium', 'Harder'][n - 1], text: '', paragraphs: [], questions: []
    };
  }
  function writingCriteria(taskNumber) {
    return taskNumber === 1
      ? 'Task Achievement · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy.'
      : 'Task Response · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy.';
  }
  function emptyTask(n) {
    return {
      id: 'w' + n, taskNumber: n, title: 'Task ' + n,
      minutes: n === 1 ? 20 : 40, minWords: n === 1 ? 150 : 250,
      prompt: '', visualType: n === 1 ? 'Chart / graph / map / process / table' : '',
      imageUrl: '', imagePath: '', chartData: '', criteria: writingCriteria(n)
    };
  }
  function emptySpeakingPart(n) {
    if (n === 1) return {
      id: 'sp1', partNumber: 1, title: 'Part 1 — Introduction and interview', minutes: '4–5',
      topics: [1, 2, 3].map(i => ({ title: 'Topic ' + i, questions: [] })), questions: []
    };
    if (n === 2) return {
      id: 'sp2', partNumber: 2, title: 'Part 2 — Individual long turn (cue card)', minutes: '3–4',
      prepSeconds: 60, talkSeconds: 120, topic: '', bullets: []
    };
    return {
      id: 'sp3', partNumber: 3, title: 'Part 3 — Two-way discussion', minutes: '4–5',
      linkedTopic: '', questions: []
    };
  }
  function emptyQuestion(type) {
    return {
      id: 'q', type: type || 'sentence-completion', prompt: '', options: [], answer: '', explanation: '',
      wordLimit: /completion/.test(type || 'sentence-completion') ? 'NO MORE THAN TWO WORDS AND/OR A NUMBER' : ''
    };
  }
  function alphaLabel(index) { return String.fromCharCode(65 + (Number(index) || 0)); }
  function questionTypesFor(skill) {
    if (skill === 'listening') return [
      'form-completion', 'note-completion', 'table-completion', 'sentence-completion',
      'multiple-choice', 'multiple-choice-multi', 'matching', 'map-labelling'
    ];
    if (skill === 'reading') return [
      'true-false-not-given', 'yes-no-not-given', 'matching-headings',
      'summary-completion', 'sentence-completion', 'multiple-choice', 'multiple-choice-multi', 'matching'
    ];
    return Q_TYPES;
  }
  function isOptionQuestion(type) {
    return ['multiple-choice', 'multiple-choice-multi', 'matching', 'matching-headings', 'map-labelling'].includes(type);
  }
  function indexValue(value) {
    const one = item => {
      if (typeof item === 'number' && Number.isFinite(item)) return item;
      const text = String(item == null ? '' : item).trim();
      const letter = /^([A-Z])$/i.exec(text);
      if (letter) return letter[1].toUpperCase().charCodeAt(0) - 65;
      if (/^\d+$/.test(text)) return Number(text);
      return null;
    };
    if (Array.isArray(value)) return value.map(one).filter(n => n != null);
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return '';
    if (raw.includes(',') || raw.includes(';') || raw.includes('|')) return raw.split(/[,;|]/).map(one).filter(n => n != null);
    const n = one(raw);
    return n == null ? value : n;
  }
  function normalizeQuestion(question, id, skill) {
    const q = { ...(question || {}) };
    q.id = id;
    q.type = String(q.type || (skill === 'reading' ? 'true-false-not-given' : 'sentence-completion'));
    q.prompt = String(q.prompt || '');
    q.explanation = String(q.explanation || '');
    if (isOptionQuestion(q.type)) {
      q.options = Array.isArray(q.options) ? q.options : [];
      if (q.answer !== '' && q.answer !== undefined && q.answer !== null) q.answer = indexValue(q.answer);
    } else if (q.type === 'multiple-choice-multi') {
      if (q.answer !== '' && q.answer !== undefined && q.answer !== null) q.answer = indexValue(q.answer);
    } else {
      q.answer = q.answer == null ? '' : q.answer;
    }
    if (q.type === 'yes-no-not-given') q.answerSet = 'yes-no';
    if (/completion/.test(q.type) && !String(q.wordLimit || '').trim()) {
      q.wordLimit = 'NO MORE THAN TWO WORDS AND/OR A NUMBER';
    }
    return q;
  }

  /* Normalise visual + JSON data to the public legacy shape consumed by the
     learner runners. Existing fields (id, skill, parts/passages/tasks,
     questions, answer, options, transcript, chartData) are kept; richer
     IELTS fields are additive. */
  function normalizePayload(skill, payload) {
    const p = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    p.skill = SKILL_LABEL[skill] || skill;
    p.id = String(p.id || skill + '-custom');
    if (skill === 'listening') {
      p.duration = Number(p.duration) || 30;
      let qn = 0;
      p.parts = (Array.isArray(p.parts) ? p.parts : []).map((part, i) => {
        const questions = (Array.isArray(part.questions) ? part.questions : []).map(q => normalizeQuestion(q, 'l' + (++qn), skill));
        return { ...part, id: part.id || 'lp' + (i + 1), partNumber: i + 1, title: String(part.title || 'Part ' + (i + 1)), questions };
      });
      return p;
    }
    if (skill === 'reading') {
      p.duration = Number(p.duration) || 60;
      p.format = p.format || 'Academic';
      let qn = 0;
      p.passages = (Array.isArray(p.passages) ? p.passages : []).map((passage, i) => {
        const paragraphs = (Array.isArray(passage.paragraphs) ? passage.paragraphs : [])
          .filter(row => row && String(row.text || '').trim())
          .map((row, j) => ({ ...row, label: alphaLabel(j), text: String(row.text || '').trim() }));
        const text = paragraphs.length ? paragraphs.map(row => row.text).join('\n\n') : String(passage.text || '');
        const questions = (Array.isArray(passage.questions) ? passage.questions : []).map(q => normalizeQuestion(q, 'r' + (++qn), skill));
        return { ...passage, id: passage.id || 'rp' + (i + 1), passageNumber: i + 1, title: String(passage.title || 'Passage ' + (i + 1)), text, paragraphs, questions };
      });
      return p;
    }
    if (skill === 'writing') {
      p.duration = Number(p.duration) || 60;
      p.format = p.format || 'Academic';
      p.tasks = (Array.isArray(p.tasks) ? p.tasks : []).map((task, i) => {
        const n = i + 1;
        return {
          ...task, id: task.id || 'w' + n, taskNumber: n, title: String(task.title || 'Task ' + n),
          minutes: n === 1 ? 20 : 40, minWords: n === 1 ? 150 : 250,
          criteria: String(task.criteria || writingCriteria(n))
        };
      });
      return p;
    }
    p.duration = Number(p.duration) || 14;
    const parts = (Array.isArray(p.parts) ? p.parts : []).map((part, i) => {
      const n = i + 1;
      let next = { ...part, id: part.id || 'sp' + n, partNumber: n };
      if (n === 1) {
        if (!Array.isArray(next.topics)) {
          const legacyQs = Array.isArray(next.questions) ? next.questions : [];
          next.topics = [{ title: 'Interview', questions: legacyQs }];
        }
        next.topics = next.topics.map((topic, ti) => ({
          ...topic, title: String(topic.title || 'Topic ' + (ti + 1)),
          questions: (Array.isArray(topic.questions) ? topic.questions : []).map(x => String(x || '')).filter(x => x.trim())
        }));
        next.questions = next.topics.flatMap(topic => topic.questions);
        next.minutes = next.minutes || '4–5';
      } else if (n === 2) {
        next.bullets = (Array.isArray(next.bullets) ? next.bullets : []).map(x => String(x || '').trim()).filter(Boolean);
        next.prepSeconds = 60;
        next.talkSeconds = 120;
        next.minutes = '3–4';
      } else if (n === 3) {
        next.questions = (Array.isArray(next.questions) ? next.questions : []).map(x => String(x || '')).filter(x => x.trim());
        next.minutes = next.minutes || '4–5';
      }
      return next;
    });
    p.parts = parts;
    const cue = parts.find(part => part.partNumber === 2);
    const discussion = parts.find(part => part.partNumber === 3);
    if (discussion && !discussion.linkedTopic && cue) discussion.linkedTopic = cue.topic || '';
    return p;
  }

  function openSkillEditor(testId, skill) {
    const row = testsBySkill().get(testId + '::' + skill);
    const payload = normalizePayload(skill, row && row.payload ? JSON.parse(JSON.stringify(row.payload)) : emptyPayload(skill));
    state.editor = {
      kind: 'skill',
      test_id: testId,
      skill,
      id: row ? row.id : null,
      title: (row && row.title) || (SKILL_LABEL[skill] + ' — ' + testId),
      is_published: row ? !!row.is_published : true,
      position: row ? row.position : 100,
      payload
    };
    state.jsonMode = false;
    state.jsonDraft = JSON.stringify(payload, null, 2);
    state.jsonError = '';
    state.uploadError = '';
    rerender();
  }

  function openMetaEditor(testId) {
    const existing = ((state.tests && state.tests.meta) || []).find(m => m.test_id === testId);
    state.editor = {
      kind: 'meta',
      meta: existing
        ? { ...existing }
        : { test_id: testId || nextTestId(), label: '', label_uz: '', difficulty: '', is_published: false, position: 100 }
    };
    state.jsonError = '';
    rerender();
  }

  function modalHtml() {
    if (state.confirm) return confirmHtml();
    if (!state.editor) return '';
    return state.editor.kind === 'meta' ? metaEditorHtml() : skillEditorHtml();
  }

  function confirmHtml() {
    const c = state.confirm;
    if (!c) return '';
    return `
    <div class="modal-backdrop" id="adminConfirmBackdrop">
      <div class="modal glass admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminConfirmTitle">
        <h2 id="adminConfirmTitle" style="font-family:var(--font-display);font-size:20px;margin:0 0 10px">${esc(c.title)}</h2>
        <p style="color:var(--muted);font-size:14px;line-height:1.6;margin:0 0 22px">${esc(c.body)}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn ${c.danger ? 'btn-primary' : 'btn-primary'}" data-admin-confirm-yes>${esc(c.confirmLabel || t('admin_confirm_yes'))}</button>
          <button class="btn btn-ghost" data-admin-confirm-no>${esc(t('admin_cancel'))}</button>
        </div>
      </div>
    </div>`;
  }

  function metaEditorHtml() {
    const m = state.editor.meta;
    const isNew = !((state.tests && state.tests.meta) || []).some(x => x.test_id === m.test_id);
    return `
    <div class="modal-backdrop" id="adminEditorBackdrop">
      <div class="modal glass admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminEditorTitle">
        <h2 id="adminEditorTitle" style="font-family:var(--font-display);font-size:20px;margin:0 0 4px">${esc(isNew ? t('admin_new_test_title') : t('admin_edit_test_title'))}</h2>
        <p class="micro" style="margin:0 0 18px">${esc(t('admin_meta_hint'))}</p>
        <div class="admin-form">
          <label class="field"><span>${esc(t('admin_field_test_id'))}</span>
            <input class="btn btn-ghost field-input" data-meta="test_id" value="${esc(m.test_id)}" ${isNew ? '' : 'readonly'} />
          </label>
          <label class="field"><span>${esc(t('admin_field_label'))}</span>
            <input class="btn btn-ghost field-input" data-meta="label" value="${esc(m.label || '')}" placeholder="Practice Test 5" />
          </label>
          <label class="field"><span>${esc(t('admin_field_label_uz'))}</span>
            <input class="btn btn-ghost field-input" data-meta="label_uz" value="${esc(m.label_uz || '')}" placeholder="Amaliyot testi 5" />
          </label>
          <label class="field"><span>${esc(t('admin_field_difficulty'))}</span>
            <input class="btn btn-ghost field-input" data-meta="difficulty" value="${esc(m.difficulty || '')}" placeholder="Intermediate" />
          </label>
          <label class="field"><span>${esc(t('admin_field_position'))}</span>
            <input class="btn btn-ghost field-input" type="number" data-meta="position" value="${esc(m.position || 100)}" />
          </label>
          <label class="admin-toggle">
            <input type="checkbox" data-meta="is_published" ${m.is_published ? 'checked' : ''} />
            <span>${esc(t('admin_field_published'))}</span>
          </label>
        </div>
        ${state.jsonError ? `<p class="admin-json-error">${esc(state.jsonError)}</p>` : ''}
        <div class="admin-modal-actions">
          <button class="btn btn-primary" data-admin-save-meta>${esc(t('admin_save'))}</button>
          <button class="btn btn-ghost" data-admin-close-modal>${esc(t('admin_cancel'))}</button>
        </div>
      </div>
    </div>`;
  }

  function skillEditorHtml() {
    const e = state.editor;
    const fixed = { listening: 4, reading: 3, writing: 2, speaking: 3 }[e.skill];
    return `
    <div class="modal-backdrop" id="adminEditorBackdrop">
      <div class="modal glass admin-modal admin-modal--wide" role="dialog" aria-modal="true" aria-labelledby="adminEditorTitle">
        <div class="admin-modal-head">
          <div>
            <span class="admin-editor-kicker">${esc(t('admin_tests_title'))} · ${fixed} ${esc(e.skill === 'reading' ? t('admin_passages') : e.skill === 'writing' ? t('admin_tasks') : t('admin_parts'))}</span>
            <h2 id="adminEditorTitle" style="font-family:var(--font-display);font-size:20px;margin:4px 0 0">${esc(e.title)}</h2>
            <p class="micro" style="margin:4px 0 0">${esc(e.test_id)} · ${esc(SKILL_LABEL[e.skill])}</p>
          </div>
          <button class="modal-close" data-admin-close-modal aria-label="${esc(t('admin_cancel'))}">×</button>
        </div>
        <div class="admin-form admin-form--row">
          <label class="field"><span>${esc(t('admin_field_title'))}</span>
            <input class="btn btn-ghost field-input" data-editor="title" value="${esc(e.title)}" />
          </label>
          <label class="admin-toggle">
            <input type="checkbox" data-editor="is_published" ${e.is_published ? 'checked' : ''} />
            <span>${esc(t('admin_field_published'))}</span>
          </label>
        </div>
        <div class="admin-mode-switch" role="tablist" aria-label="${esc(t('admin_editor_mode'))}">
          <button class="seg-btn${!state.jsonMode ? ' active' : ''}" data-admin-mode="visual">${esc(t('admin_editor_visual'))}</button>
          <button class="seg-btn${state.jsonMode ? ' active' : ''}" data-admin-mode="json">${esc(t('admin_editor_json'))}</button>
        </div>
        ${state.jsonError ? `<p class="admin-json-error" role="alert">${esc(state.jsonError)}</p>` : ''}
        ${state.uploadError ? `<p class="admin-json-error" role="alert">${esc(state.uploadError)}</p>` : ''}
        <div class="admin-editor-body">
          ${state.jsonMode ? jsonEditorHtml() : visualEditorHtml()}
        </div>
        <div class="admin-modal-actions">
          <button class="btn btn-primary" data-admin-save-skill>${esc(t('admin_save'))}</button>
          ${state.editor.id ? `<button class="btn btn-ghost admin-danger" data-admin-delete-skill="${esc(e.test_id)}::${esc(e.skill)}">${esc(t('admin_delete'))}</button>` : ''}
          <button class="btn btn-ghost" data-admin-close-modal>${esc(t('admin_cancel'))}</button>
        </div>
      </div>
    </div>`;
  }

  function jsonEditorHtml() {
    return `<textarea class="admin-json" spellcheck="false" data-admin-json>${esc(state.jsonDraft)}</textarea>
      <p class="micro">${esc(t('admin_json_hint'))}</p>`;
  }

  /* ---------- skill-specific visual forms ---------- */
  function visualEditorHtml() {
    const e = state.editor;
    if (e.skill === 'listening') return blocksHtml('parts', e.payload.parts, listeningPartHtml);
    if (e.skill === 'reading') return blocksHtml('passages', e.payload.passages, passageHtml);
    if (e.skill === 'writing') return blocksHtml('tasks', e.payload.tasks, taskHtml);
    return blocksHtml('parts', e.payload.parts, speakingPartHtml);
  }
  function blocksHtml(key, blocks, renderBlock) {
    const list = blocks || [];
    const name = key === 'passages' ? t('admin_passages') : key === 'tasks' ? t('admin_tasks') : t('admin_parts');
    return `<div class="admin-blocks">
      <div class="admin-fixed-note"><strong>${esc(list.length)} / ${key === 'parts' && state.editor.skill === 'listening' ? 4 : key === 'passages' ? 3 : key === 'tasks' ? 2 : 3} ${esc(name)}</strong><span>${esc(t('admin_fixed_structure'))}</span></div>
      ${list.map((b, i) => renderBlock(b, i, key)).join('')}
    </div>`;
  }
  function blockShell(key, index, title, inner, badge) {
    return `<section class="admin-edit-block">
      <div class="admin-edit-block-head">
        <span class="admin-part-badge">${esc(badge || '')}</span>
        <input class="btn btn-ghost field-input admin-inline-title" aria-label="${esc(t('admin_field_title'))}" data-edit="${key}.${index}.title" value="${esc(title || '')}" />
      </div>
      ${inner}
    </section>`;
  }
  function uploadField({ urlPath, pathPath, folder, accept, title, url, label, kind }) {
    const isAudio = kind === 'audio';
    const preview = url ? (isAudio
      ? `<audio class="admin-media-audio" controls preload="none" src="${esc(url)}"></audio>`
      : `<img class="admin-media-image" src="${esc(url)}" alt="${esc(title)}" loading="lazy">`) : '';
    return `<div class="admin-upload">
      <div class="admin-upload-head"><strong>${esc(title)}</strong><span>${esc(isAudio ? 'MP3 · max 50 MB' : 'PNG / JPG / WebP · max 50 MB')}</span></div>
      <label class="admin-upload-picker">
        <span class="btn btn-ghost btn-sm">↑ ${esc(t('admin_upload_choose'))}</span>
        <input type="file" data-admin-upload="${esc(urlPath)}" data-media-path="${esc(pathPath)}" data-folder="${esc(folder)}" data-label="${esc(label)}" accept="${esc(accept)}">
      </label>
      ${preview ? `<div class="admin-upload-preview">${preview}<a href="${esc(url)}" target="_blank" rel="noopener">${esc(t('admin_open_media'))} ↗</a></div>` : `<p class="micro admin-upload-empty">${esc(t('admin_upload_empty'))}</p>`}
      <label class="field admin-url-field"><span>${esc(t('admin_media_url'))}</span><input class="btn btn-ghost field-input" data-edit="${esc(urlPath)}" value="${esc(url || '')}" placeholder="https://…" /></label>
      <small class="admin-upload-status" aria-live="polite"></small>
    </div>`;
  }
  function listeningPartHtml(part, i, key) {
    const prefix = `${key}.${i}`;
    return blockShell(key, i, part.title, `
      <div class="admin-form admin-form--row">
        <label class="field"><span>${esc(t('admin_field_instructions'))}</span>
          <input class="btn btn-ghost field-input" data-edit="${prefix}.instructions" value="${esc(part.instructions || '')}" placeholder="Questions 1–10. You will hear this recording once." />
        </label>
      </div>
      ${uploadField({ urlPath: `${prefix}.audioUrl`, pathPath: `${prefix}.audioPath`, folder: 'audio', accept: '.mp3,audio/mpeg,audio/mp3', kind: 'audio', title: t('admin_audio_upload'), url: part.audioUrl || '', label: `${state.editor.test_id}-listening-part${i + 1}` })}
      <label class="field"><span>${esc(t('admin_field_transcript'))}</span>
        <textarea class="admin-textarea" rows="6" data-edit="${prefix}.transcript" placeholder="Full audio transcript for review and answer explanations">${esc(part.transcript || '')}</textarea>
      </label>
      ${questionsHtml(`${prefix}.questions`, part.questions || [], 'listening', `${state.editor.test_id}-part${i + 1}`)}`, `Part ${i + 1}`);
  }
  function paragraphEditor(path, passage) {
    const paras = Array.isArray(passage.paragraphs) ? passage.paragraphs : [];
    if (!paras.length) return `<label class="field"><span>${esc(t('admin_field_text'))}</span>
      <textarea class="admin-textarea" rows="10" data-edit="${path}.text" placeholder="Paste the full academic passage here. Use blank lines between paragraphs.">${esc(passage.text || '')}</textarea>
      <div class="admin-inline-actions"><button class="btn btn-ghost btn-sm" type="button" data-edit-split-paragraphs="${path}">${esc(t('admin_split_paragraphs'))}</button></div>
    </label>`;
    return `<div class="admin-paragraphs">
      <div class="admin-subhead">${esc(t('admin_paragraphs'))} (${paras.length})</div>
      <p class="micro">${esc(t('admin_paragraphs_hint'))}</p>
      ${paras.map((paragraph, pi) => `<div class="admin-paragraph-editor">
        <span class="paragraph-label">${alphaLabel(pi)}</span>
        <textarea class="admin-textarea" rows="4" data-edit="${path}.paragraphs.${pi}.text" aria-label="Paragraph ${alphaLabel(pi)}">${esc(paragraph.text || '')}</textarea>
        <button class="btn btn-ghost btn-sm admin-danger" type="button" data-edit-del="${path}.paragraphs.${pi}">${esc(t('admin_remove'))}</button>
      </div>`).join('')}
      <div class="admin-inline-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-edit-add-paragraph="${path}.paragraphs">＋ ${esc(t('admin_add_paragraph'))}</button>
        <button class="btn btn-ghost btn-sm" type="button" data-edit-clear-paragraphs="${path}">${esc(t('admin_use_full_text'))}</button>
      </div>
    </div>`;
  }
  function passageHtml(passage, i, key) {
    const prefix = `${key}.${i}`;
    return blockShell(key, i, passage.title, `
      <div class="admin-form admin-form--row">
        <label class="field"><span>${esc(t('admin_field_difficulty'))}</span>
          <select class="admin-select admin-select--large" data-edit="${prefix}.difficulty">
            ${['Easier', 'Medium', 'Harder'].map(v => `<option value="${v}"${v === passage.difficulty ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
      </div>
      ${paragraphEditor(prefix, passage)}
      ${questionsHtml(`${prefix}.questions`, passage.questions || [], 'reading', `${state.editor.test_id}-passage${i + 1}`)}`, `Passage ${i + 1}`);
  }
  function taskHtml(task, i, key) {
    const prefix = `${key}.${i}`;
    return blockShell(key, i, task.title, `
      <div class="admin-task-rule">${esc(i === 0 ? t('admin_task1_rule') : t('admin_task2_rule'))}</div>
      <label class="field"><span>${esc(t('admin_field_prompt'))} <b class="required-star">*</b></span>
        <textarea class="admin-textarea" rows="4" data-edit="${prefix}.prompt" placeholder="${esc(i === 0 ? t('admin_task1_prompt_placeholder') : t('admin_task2_prompt_placeholder'))}">${esc(task.prompt || '')}</textarea>
      </label>
      ${i === 0 ? `
        <label class="field"><span>${esc(t('admin_visual_type'))}</span>
          <input class="btn btn-ghost field-input" data-edit="${prefix}.visualType" value="${esc(task.visualType || '')}" placeholder="Chart, graph, process, map or table" />
        </label>
        ${uploadField({ urlPath: `${prefix}.imageUrl`, pathPath: `${prefix}.imagePath`, folder: 'images', accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp', kind: 'image', title: t('admin_task1_upload'), url: task.imageUrl || '', label: `${state.editor.test_id}-writing-task1` })}
        <label class="field"><span>${esc(t('admin_field_chart_data'))} · ${esc(t('admin_legacy_optional'))}</span>
          <textarea class="admin-textarea" rows="3" data-edit="${prefix}.chartData">${esc(task.chartData || '')}</textarea>
        </label>` : ''}
      <label class="field"><span>${esc(t('admin_writing_criteria'))}${i === 1 ? ' *' : ''}</span>
        <textarea class="admin-textarea" rows="3" data-edit="${prefix}.criteria">${esc(task.criteria || writingCriteria(i + 1))}</textarea>
      </label>`, `Task ${i + 1}`);
  }
  function speakingPartHtml(part, i, key) {
    const prefix = `${key}.${i}`;
    if (i === 0) {
      const topics = Array.isArray(part.topics) ? part.topics : [];
      return blockShell(key, i, part.title, `
        <p class="micro">${esc(t('admin_part1_hint'))}</p>
        <div class="admin-topic-list">
          ${topics.map((topic, ti) => `<div class="admin-topic-editor">
            <div class="admin-topic-head"><span class="admin-part-badge">${esc(t('admin_topic'))} ${ti + 1}</span><button class="btn btn-ghost btn-sm admin-danger" type="button" data-edit-del="${prefix}.topics.${ti}">${esc(t('admin_remove'))}</button></div>
            <label class="field"><span>${esc(t('admin_topic_title'))}</span><input class="btn btn-ghost field-input" data-edit="${prefix}.topics.${ti}.title" value="${esc(topic.title || '')}" placeholder="Hometown, study, work, hobbies…" /></label>
            <label class="field"><span>${esc(t('admin_field_questions_lines'))}</span><textarea class="admin-textarea" rows="3" data-edit-lines="${prefix}.topics.${ti}.questions" placeholder="One short interview question per line">${esc((topic.questions || []).join('\n'))}</textarea></label>
          </div>`).join('')}
        </div>
        <button class="btn btn-ghost admin-add" type="button" data-edit-add-topic="${prefix}.topics">＋ ${esc(t('admin_add_topic'))}</button>`, `Part 1`);
    }
    if (i === 1) return blockShell(key, i, part.title, `
      <div class="cue-card-preview"><span>${esc(t('cue_card'))}</span><strong>${esc(t('admin_cue_card_rule'))}</strong></div>
      <label class="field"><span>${esc(t('admin_field_topic'))} <b class="required-star">*</b></span>
        <textarea class="admin-textarea" rows="3" data-edit="${prefix}.topic" placeholder="Describe a person, place, event, object or experience…">${esc(part.topic || '')}</textarea>
      </label>
      <label class="field"><span>${esc(t('admin_field_bullets'))} <b class="required-star">*</b></span>
        <textarea class="admin-textarea" rows="4" data-edit-lines="${prefix}.bullets" placeholder="One prompt per line; use three or four bullets">${esc((part.bullets || []).join('\n'))}</textarea>
      </label>
      <div class="admin-fixed-timers"><span>⏱ ${esc(t('admin_prep_minute'))}</span><span>🎙 ${esc(t('admin_talk_two_minutes'))}</span></div>`, `Part 2`);
    return blockShell(key, i, part.title, `
      <label class="field"><span>${esc(t('admin_linked_topic'))}</span>
        <input class="btn btn-ghost field-input" data-edit="${prefix}.linkedTopic" value="${esc(part.linkedTopic || '')}" placeholder="${esc(t('admin_auto_link_hint'))}" />
      </label>
      ${linesQuestionList(`${prefix}.questions`, part.questions || [], 'Part 3 discussion questions')}`, `Part 3`);
  }
  function linesQuestionList(path, questions, hint) {
    return `<label class="field"><span>${esc(t('admin_field_questions_lines'))} <b class="required-star">*</b></span>
      <textarea class="admin-textarea" rows="6" data-edit-lines="${path}" placeholder="${esc(hint)}">${esc((questions || []).join('\n'))}</textarea>
    </label>`;
  }
  function answerText(answer, type) {
    if (answer == null || answer === '') return '';
    if (isOptionQuestion(type)) {
      const items = Array.isArray(answer) ? answer : [answer];
      return items.map(value => {
        const raw = String(value).trim();
        if (/^[A-Z]$/i.test(raw)) return raw.toUpperCase();
        const index = Number(value);
        return Number.isInteger(index) && index >= 0 ? alphaLabel(index) : raw;
      }).join(', ');
    }
    return Array.isArray(answer) ? answer.join(', ') : String(answer);
  }
  function questionsHtml(path, questions, skill, labelPrefix) {
    const types = questionTypesFor(skill);
    const list = questions || [];
    return `<div class="admin-questions">
      <div class="admin-questions-title"><p class="admin-subhead">${esc(t('admin_questions_head'))} (${list.length})</p><span>${esc(t('admin_required_answer_hint'))}</span></div>
      ${list.map((q, i) => {
        const type = q.type || types[0];
        const opts = q.options || [];
        const needsOptions = isOptionQuestion(type);
        const isCompletion = /completion/.test(type);
        return `<article class="admin-question">
          <div class="admin-question-head">
            <span class="admin-q-num">Q${i + 1}</span>
            <select class="admin-select" data-edit-type="${path}.${i}.type" aria-label="${esc(t('admin_question_type'))}">
              ${types.map(x => `<option value="${esc(x)}"${x === type ? ' selected' : ''}>${esc(Q_TYPE_LABEL[x] || x)}</option>`).join('')}
              ${!types.includes(type) ? `<option value="${esc(type)}" selected>${esc(Q_TYPE_LABEL[type] || type)}</option>` : ''}
            </select>
            <button class="btn btn-ghost btn-sm admin-danger" type="button" data-edit-del="${path}.${i}">${esc(t('admin_remove'))}</button>
          </div>
          <label class="field"><span>${esc(t('admin_field_prompt'))} <b class="required-star">*</b></span>
            <textarea class="admin-textarea" rows="2" data-edit="${path}.${i}.prompt" placeholder="${esc(t('admin_question_prompt_placeholder'))}">${esc(q.prompt || '')}</textarea>
          </label>
          ${q.group !== undefined || type === 'matching' || type === 'map-labelling' ? `<label class="field"><span>${esc(t('admin_question_group'))}</span><input class="btn btn-ghost field-input" data-edit="${path}.${i}.group" value="${esc(q.group || '')}" placeholder="Questions 1–5 / labelling group title" /></label>` : ''}
          ${needsOptions ? `<label class="field"><span>${esc(t('admin_field_options'))} <b class="required-star">*</b></span>
            <textarea class="admin-textarea" rows="2" data-edit-list="${path}.${i}.options" placeholder="Option A | Option B | Option C">${esc(opts.join(' | '))}</textarea>
          </label>` : ''}
          ${isCompletion ? `<label class="field"><span>${esc(t('admin_word_limit'))}</span><input class="btn btn-ghost field-input" data-edit="${path}.${i}.wordLimit" value="${esc(q.wordLimit || 'NO MORE THAN TWO WORDS AND/OR A NUMBER')}" placeholder="NO MORE THAN TWO WORDS" /></label>` : ''}
          ${type === 'map-labelling' ? uploadField({ urlPath: `${path}.${i}.imageUrl`, pathPath: `${path}.${i}.imagePath`, folder: 'images', accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp', kind: 'image', title: t('admin_map_upload'), url: q.imageUrl || '', label: `${state.editor.test_id}-${labelPrefix}-q${i + 1}` }) : ''}
          <div class="admin-form admin-form--row admin-answer-row">
            <label class="field"><span>${esc(t('admin_field_answer'))} <b class="required-star">*</b></span>
              <input class="btn btn-ghost field-input" data-edit="${path}.${i}.answer" value="${esc(answerText(q.answer, type))}" placeholder="${esc(type === 'multiple-choice-multi' ? 'A, C' : needsOptions ? 'B or 2' : type.includes('not-given') ? 'TRUE / FALSE / NOT GIVEN' : 'Exact accepted answer') }" />
              ${needsOptions ? `<small class="micro">${esc(t('admin_answer_index_hint'))}</small>` : ''}
            </label>
            <label class="field"><span>${esc(t('admin_field_explanation'))} <b class="required-star">*</b></span>
              <textarea class="admin-textarea" rows="2" data-edit="${path}.${i}.explanation" placeholder="${esc(t('admin_explanation_placeholder'))}">${esc(q.explanation || '')}</textarea>
            </label>
          </div>
        </article>`;
      }).join('')}
      <button class="btn btn-ghost admin-add" type="button" data-edit-add-q="${path}">＋ ${esc(t('admin_add_question'))}</button>
    </div>`;
  }

    /* ---------- path helpers used by the form ---------- */
  function getByPath(obj, path) {
    return path.split('.').reduce((cur, k) => (cur == null ? undefined : cur[k]), obj);
  }
  function setByPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null) cur[parts[i]] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  function removeByPath(obj, path) {
    const parts = path.split('.');
    const last = parts.pop();
    const parent = parts.reduce((cur, k) => (cur == null ? undefined : cur[k]), obj);
    if (Array.isArray(parent)) parent.splice(Number(last), 1);
    else if (parent) delete parent[last];
  }

  /* ===================================================================
   * SUBMISSIONS
   * =================================================================== */
  function submissionsHtml() {
    const term = String(state.search.submissions || '').toLowerCase();
    const rows = (state.submissions || []).filter(r => !term
      || String(r.name || '').toLowerCase().includes(term)
      || String(r.test_id || '').toLowerCase().includes(term)
      || String((r.profile && (r.profile.name || r.profile.email)) || '').toLowerCase().includes(term));

    return `
      <div class="glass admin-block">
        <div class="admin-toolbar">
          <div>
            <div class="panel-title">${esc(t('admin_submissions_title'))}</div>
            <p class="micro">${esc(t2('admin_submissions_count', { n: rows.length }))}</p>
          </div>
          <div class="admin-toolbar-actions">
            <input class="admin-search" type="search" value="${esc(state.search.submissions)}"
                   placeholder="${esc(t('admin_search_placeholder'))}" data-admin-search="submissions" />
            <button class="btn btn-ghost btn-sm" data-admin-refresh>${esc(t('admin_refresh'))}</button>
          </div>
        </div>
        ${state.loading === 'submissions' ? `<p class="micro">${esc(t('admin_loading'))}</p>` : ''}
        ${!rows.length && state.loading !== 'submissions' ? `<p class="micro">${esc(t('admin_submissions_empty'))}</p>` : ''}
        ${rows.length ? `<div class="admin-table-wrap"><table class="admin-table">
          <thead><tr>
            <th>${esc(t('admin_col_user'))}</th>
            <th>${esc(t('admin_col_test'))}</th>
            <th>L</th><th>R</th><th>W</th><th>S</th>
            <th>${esc(t('admin_col_overall'))}</th>
            <th>${esc(t('admin_col_date'))}</th>
            <th class="ta-right">${esc(t('admin_col_actions'))}</th>
          </tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td class="admin-cell-user">
              ${avatar(r.profile)}
              <span class="admin-cell-stack">
                <strong>${esc((r.profile && (r.profile.name || r.profile.email)) || r.name || '—')}</strong>
                <small>${esc((r.profile && r.profile.email) || '')}</small>
              </span>
            </td>
            <td>${esc(r.test_id)}</td>
            <td>${fmtBand(r.listening)}</td>
            <td>${fmtBand(r.reading)}</td>
            <td>${fmtBand(r.writing)}</td>
            <td>${fmtBand(r.speaking)}</td>
            <td><strong class="${r.overall_band == null ? 'admin-muted' : ''}">${fmtBand(r.overall_band)}</strong></td>
            <td>${esc(fmtDate(r.updated_at || r.created_at))}</td>
            <td class="ta-right">
              <button class="btn btn-ghost btn-sm admin-danger" data-admin-delete-submission="${esc(r.id)}">${esc(t('admin_delete'))}</button>
            </td>
          </tr>`).join('')}</tbody>
        </table></div>` : ''}
      </div>`;
  }

  /* ===================================================================
   * VALIDATION
   * =================================================================== */
  function validatePayload(skill, payload) {
    const problems = [];
    const p = payload && typeof payload === 'object' ? payload : {};
    const blocks = skill === 'reading' ? (p.passages || []) : (skill === 'writing' ? (p.tasks || []) : (p.parts || []));
    const expected = { listening: 4, reading: 3, writing: 2, speaking: 3 }[skill];
    if (blocks.length !== expected) {
      const key = skill === 'listening' || skill === 'speaking' ? 'admin_err_part_count'
        : skill === 'reading' ? 'admin_err_passage_count' : 'admin_err_task_count';
      problems.push(t2(key, { n: expected }));
    }
    if (skill === 'writing') {
      (p.tasks || []).forEach((task, i) => {
        if (!String(task.prompt || '').trim()) problems.push(t2('admin_err_task_prompt', { n: i + 1 }));
        if (i === 0 && !String(task.imageUrl || task.chartData || '').trim()) problems.push(t('admin_err_task1_visual'));
        if (i === 1 && !String(task.criteria || '').trim()) problems.push(t('admin_err_task2_criteria'));
      });
      return problems;
    }
    if (skill === 'speaking') {
      const parts = p.parts || [];
      const p1 = parts[0] || {};
      const topics = p1.topics || [];
      if (topics.length < 3 || topics.length > 4) problems.push(t('admin_err_speaking_topics'));
      topics.forEach((topic, i) => {
        if (!String(topic.title || '').trim()) problems.push(t2('admin_err_topic_title', { n: i + 1 }));
        if (!(topic.questions || []).some(q => String(q || '').trim())) problems.push(t2('admin_err_topic_questions', { n: i + 1 }));
      });
      const cue = parts[1] || {};
      if (!String(cue.topic || '').trim()) problems.push(t('admin_err_cue_topic'));
      const bullets = (cue.bullets || []).filter(x => String(x || '').trim());
      if (bullets.length < 3 || bullets.length > 4) problems.push(t('admin_err_cue_bullets'));
      if (Number(cue.prepSeconds || 60) !== 60 || Number(cue.talkSeconds || 120) !== 120) problems.push(t('admin_err_cue_timers'));
      const p3 = parts[2] || {};
      if ((p3.questions || []).filter(q => String(q || '').trim()).length < 3) problems.push(t('admin_err_discussion_questions'));
      return problems;
    }

    let n = 0;
    blocks.forEach((block, bi) => {
      if (!String(block.title || '').trim()) problems.push(t2(skill === 'reading' ? 'admin_err_passage_title' : 'admin_err_part_title', { n: bi + 1 }));
      if (skill === 'listening' && !String(block.audioUrl || block.transcript || '').trim()) problems.push(t2('admin_err_part_audio', { n: bi + 1 }));
      if (skill === 'reading' && !String(block.text || '').trim() && !(block.paragraphs || []).some(x => String(x.text || '').trim())) {
        problems.push(t2('admin_err_passage_text', { n: bi + 1 }));
      }
      const questions = block.questions || [];
      if (!questions.length) problems.push(t2('admin_err_block_questions', { n: bi + 1 }));
      questions.forEach(q => {
        n += 1;
        const qtype = String(q.type || '');
        if (!Q_TYPES.includes(qtype)) problems.push(t2('admin_err_q_type', { n }));
        if (!String(q.prompt || '').trim()) problems.push(t2('admin_err_q_prompt', { n }));
        const answer = q.answer;
        const hasAnswer = Array.isArray(answer) ? answer.length > 0 : String(answer == null ? '' : answer).trim() !== '';
        if (!hasAnswer) problems.push(t2('admin_err_q_answer', { n }));
        if (!String(q.explanation || '').trim()) problems.push(t2('admin_err_q_explanation', { n }));
        if (isOptionQuestion(qtype)) {
          const options = (q.options || []).map(x => String(x || '').trim()).filter(Boolean);
          if (options.length < 2) problems.push(t2('admin_err_q_options', { n }));
          const indexes = indexValue(answer);
          const picks = Array.isArray(indexes) ? indexes : (indexes === '' || indexes == null ? [] : [indexes]);
          if (options.length >= 2 && picks.some(index => typeof index !== 'number' || index < 0 || index >= options.length)) {
            problems.push(t2('admin_err_q_answer_option', { n }));
          }
          if (qtype === 'multiple-choice-multi' && (picks.length !== 2 || new Set(picks).size !== 2)) problems.push(t2('admin_err_q_choose_two', { n }));
          if (qtype === 'multiple-choice' && picks.length > 1) problems.push(t2('admin_err_q_single', { n }));
        }
        if (/completion/.test(qtype) && !String(q.wordLimit || '').trim()) problems.push(t2('admin_err_q_word_limit', { n }));
        if (qtype === 'map-labelling' && !String(q.imageUrl || '').trim()) problems.push(t2('admin_err_map_image', { n }));
        if (qtype === 'matching-headings' && skill === 'reading'
          && !(block.paragraphs || []).some(row => String(row && row.text || '').trim())) {
          problems.push(t2('admin_err_headings_paragraphs', { n }));
        }
        const tfnAnswer = String(answer || '').trim();
        const validTfn = qtype === 'yes-no-not-given'
          ? /^(YES|NO|NOT GIVEN)$/i.test(tfnAnswer)
          : qtype === 'true-false-not-given' ? /^(TRUE|FALSE|NOT GIVEN)$/i.test(tfnAnswer) : true;
        if (!validTfn) problems.push(t2('admin_err_q_tfn_answer', { n }));
      });
    });
    return problems;
  }
  /* ===================================================================
   * ACTIONS
   * =================================================================== */
  async function saveMeta() {
    const m = state.editor.meta;
    if (!/^test\d{1,2}$/.test(String(m.test_id || ''))) {
      state.jsonError = t('admin_err_test_id');
      rerender();
      return;
    }
    if (!String(m.label || '').trim()) {
      state.jsonError = t('admin_err_label');
      rerender();
      return;
    }
    try {
      const c = api();
      await c.adminSaveTestMeta({
        test_id: m.test_id,
        label: m.label.trim(),
        label_uz: (m.label_uz || '').trim(),
        difficulty: (m.difficulty || '').trim(),
        is_published: !!m.is_published,
        position: Number(m.position) || 100
      });
      state.editor = null;
      state.notice = t('admin_saved');
      await refresh('tests');
    } catch (err) {
      state.jsonError = message(err);
      rerender();
    }
  }

  async function saveSkill() {
    const e = state.editor;
    if (state.jsonMode) {
      try {
        e.payload = JSON.parse(state.jsonDraft);
      } catch (err) {
        state.jsonError = t('admin_editor_invalid_json') + ' — ' + err.message;
        rerender();
        return;
      }
    }
    const problems = validatePayload(e.skill, e.payload);
    if (problems.length) {
      state.jsonError = problems.slice(0, 4).join(' · ');
      rerender();
      return;
    }
    normalizePayload(e.skill, e.payload);
    e.payload.title = String(e.title || e.payload.title || '').trim();
    try {
      const c = api();
      await c.adminSaveTest({
        id: e.id,
        test_id: e.test_id,
        skill: e.skill,
        title: e.title,
        payload: e.payload,
        is_published: !!e.is_published,
        position: Number(e.position) || 100
      });
      state.editor = null;
      state.notice = t('admin_saved');
      await refresh('tests');
      const h = hooks();
      if (typeof h.reloadTests === 'function') h.reloadTests();
    } catch (err) {
      state.jsonError = message(err);
      rerender();
    }
  }

  function ask(title, body, confirmLabel, onConfirm, danger) {
    state.confirm = { title, body, confirmLabel, onConfirm, danger: danger !== false };
    rerender();
  }

  /* ===================================================================
   * FOCUS — re-rendering must not steal the caret while someone types
   * =================================================================== */
  const FOCUS_ATTRS = ['data-admin-search', 'data-edit', 'data-edit-num', 'data-edit-lines',
    'data-edit-list', 'data-meta', 'data-editor', 'data-admin-json'];
  function focusInfo() {
    const el = typeof document !== 'undefined' && document.activeElement ? document.activeElement : null;
    if (!el || !el.getAttribute || typeof el.getAttribute !== 'function') return null;
    for (const attr of FOCUS_ATTRS) {
      const v = el.getAttribute(attr);
      if (v !== null && v !== undefined && v !== '') {
        return { attr, value: String(v), start: el.selectionStart, end: el.selectionEnd };
      }
    }
    return null;
  }
  function restoreFocus(info) {
    if (!info || typeof document === 'undefined' || !document.querySelector) return;
    try {
      const sel = '[' + info.attr + '="' + String(info.value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
      const el = document.querySelector(sel);
      if (!el || typeof el.focus !== 'function') return;
      el.focus();
      if (info.start != null && el.setSelectionRange && el.type !== 'number' && el.type !== 'checkbox') {
        try { el.setSelectionRange(info.start, info.end == null ? info.start : info.end); } catch { /* not supported */ }
      }
    } catch { /* restoring focus is best-effort */ }
  }
  function rerenderKeepingFocus() {
    const info = focusInfo();
    rerender();
    restoreFocus(info);
  }

  /* ===================================================================
   * BIND
   * =================================================================== */
  function bind(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const all = (sel) => Array.prototype.slice.call(scope.querySelectorAll(sel));
    const on = (sel, handler) => all(sel).forEach(el => { handler(el); });

    /* --- chrome --- */
    on('[data-admin-tab]', el => {
      el.onclick = () => { state.tab = el.dataset.adminTab; state.error = ''; ensure(state.tab); rerender(); };
    });
    on('[data-admin-refresh]', el => { el.onclick = () => refresh(state.tab); });

    on('[data-admin-search]', el => {
      const key = el.dataset.adminSearch;
      el.oninput = () => {
        state.search[key] = el.value;
        clearTimeout(el._adminTimer);
        el._adminTimer = setTimeout(() => { rerenderKeepingFocus(); refresh(key === 'users' ? 'users' : 'submissions'); }, 350);
      };
      el.onchange = () => {
        state.search[key] = el.value;
        refresh(key === 'users' ? 'users' : 'submissions');
      };
    });

    /* --- users --- */
    on('[data-admin-role]', el => {
      el.onclick = () => {
        const id = el.dataset.adminRole;
        const role = el.dataset.role;
        const person = (state.profiles || []).find(p => p.id === id);
        const who = person ? (person.name || person.email || id) : id;
        ask(
          role === 'admin' ? t('admin_confirm_promote_title') : t('admin_confirm_demote_title'),
          t2(role === 'admin' ? 'admin_confirm_promote_body' : 'admin_confirm_demote_body', { name: who }),
          t('admin_confirm_yes'),
          async () => {
            state.confirm = null;
            try { await api().adminSetRole(id, role); state.notice = t('admin_role_updated'); }
            catch (err) { state.error = message(err); }
            await refresh('users');
          }
        );
      };
    });

    on('[data-admin-delete-user]', el => {
      el.onclick = () => {
        const id = el.dataset.adminDeleteUser;
        const who = el.dataset.name || id;
        ask(t('admin_confirm_delete_user_title'),
          t2('admin_confirm_delete_user_body', { name: who }),
          t('admin_delete'),
          async () => {
            state.confirm = null;
            try { await api().adminDeleteUser(id); state.notice = t('admin_deleted'); }
            catch (err) { state.error = message(err); }
            await refresh('users');
          });
      };
    });

    /* --- submissions --- */
    on('[data-admin-delete-submission]', el => {
      el.onclick = () => {
        const id = el.dataset.adminDeleteSubmission;
        ask(t('admin_confirm_delete_submission_title'), t('admin_confirm_delete_submission_body'),
          t('admin_delete'),
          async () => {
            state.confirm = null;
            try { await api().adminDeleteSubmission(id); state.notice = t('admin_deleted'); }
            catch (err) { state.error = message(err); }
            await refresh('submissions');
          });
      };
    });

    /* --- tests --- */
    on('[data-admin-new-test]', el => { el.onclick = () => openMetaEditor(nextTestId()); });
    on('[data-admin-edit-meta]', el => { el.onclick = () => openMetaEditor(el.dataset.adminEditMeta); });

    /* --- AI generator (mockGenerator.js) --- */
    on('[data-admin-ai-generate]', el => {
      el.onclick = () => {
        const generator = typeof window !== 'undefined' ? window.IELTS_GENERATOR : null;
        if (!generator || typeof generator.open !== 'function') {
          state.error = t('admin_ai_missing_module');
          rerender();
          return;
        }
        generator.open({
          testId: nextTestId(),
          label: '',
          difficulty: 'standard',
          topic: '',
          onDone: () => { refresh('tests'); }
        });
      };
    });

    on('[data-admin-toggle-publish]', el => {
      el.onclick = async () => {
        const testId = el.dataset.adminTogglePublish;
        const publish = el.dataset.publish === '1';
        const meta = ((state.tests && state.tests.meta) || []).find(m => m.test_id === testId);
        if (!meta) return;
        try {
          await api().adminSaveTestMeta({ ...meta, is_published: publish });
          state.notice = publish ? t('admin_published_msg') : t('admin_unpublished_msg');
        } catch (err) { state.error = message(err); }
        await refresh('tests');
        const h = hooks();
        if (typeof h.reloadTests === 'function') h.reloadTests();
      };
    });

    on('[data-admin-delete-test]', el => {
      el.onclick = () => {
        const testId = el.dataset.adminDeleteTest;
        ask(t('admin_confirm_delete_test_title'),
          t2('admin_confirm_delete_test_body', { name: el.dataset.name || testId }),
          t('admin_delete'),
          async () => {
            state.confirm = null;
            try { await api().adminDeleteTestMeta(testId); state.notice = t('admin_deleted'); }
            catch (err) { state.error = message(err); }
            await refresh('tests');
            const h = hooks();
            if (typeof h.reloadTests === 'function') h.reloadTests();
          });
      };
    });

    on('[data-admin-edit-skill]', el => {
      el.onclick = () => {
        const [testId, skill] = String(el.dataset.adminEditSkill).split('::');
        openSkillEditor(testId, skill);
      };
    });

    /* --- editor: header fields --- */
    on('[data-editor]', el => {
      if (el.type === 'checkbox') el.onchange = () => { state.editor.is_published = el.checked; };
      else el.oninput = () => { state.editor.title = el.value; };
    });
    on('[data-meta]', el => {
      const key = el.dataset.meta;
      if (el.type === 'checkbox') el.onchange = () => { state.editor.meta[key] = el.checked; };
      else el.oninput = () => { state.editor.meta[key] = key === 'position' ? Number(el.value) : el.value; };
    });

    /* --- editor: structured form (mutate the model, do not re-render) --- */
    on('[data-edit]', el => {
      el.oninput = () => {
        setByPath(state.editor.payload, el.dataset.edit, el.value);
        state.uploadError = '';
      };
    });
    on('[data-edit-num]', el => {
      el.oninput = () => { setByPath(state.editor.payload, el.dataset.editNum, el.value === '' ? '' : Number(el.value)); };
    });
    on('[data-edit-lines]', el => {
      el.oninput = () => {
        setByPath(state.editor.payload, el.dataset.editLines,
          String(el.value).split('\n').map(x => x.trim()).filter(Boolean));
      };
    });
    on('[data-edit-list]', el => {
      el.oninput = () => {
        setByPath(state.editor.payload, el.dataset.editList,
          String(el.value).split('|').map(x => x.trim()).filter(Boolean));
      };
    });
    on('[data-admin-json]', el => {
      el.oninput = () => { state.jsonDraft = el.value; };
    });
    on('[data-admin-upload]', el => {
      el.onchange = async () => {
        const file = el.files && el.files[0];
        if (!file) return;
        const folder = el.dataset.folder || 'media';
        const status = el.parentElement && el.parentElement.parentElement
          ? el.parentElement.parentElement.querySelector('.admin-upload-status') : null;
        const setStatus = (text, isError) => {
          if (!status) return;
          status.textContent = text;
          status.classList.toggle('is-error', !!isError);
        };
        if (file.size > 50 * 1024 * 1024) {
          setStatus(t('admin_upload_too_large'), true);
          return;
        }
        if (folder === 'audio' && !(/\.mp3$/i.test(file.name || '') || /audio\/(mpeg|mp3)/i.test(file.type || ''))) {
          setStatus(t('admin_upload_mp3_only'), true);
          return;
        }
        if (folder === 'images' && !/^image\/(png|jpe?g|webp)$/i.test(file.type || '') && !/\.(png|jpe?g|webp)$/i.test(file.name || '')) {
          setStatus(t('admin_upload_image_only'), true);
          return;
        }
        setStatus(t('admin_uploading'), false);
        el.disabled = true;
        state.uploadError = '';
        try {
          const e = state.editor;
          const urlPath = el.dataset.adminUpload;
          const pathPath = el.dataset.mediaPath;
          const oldPath = pathPath ? getByPath(e.payload, pathPath) : '';
          const oldUrl = getByPath(e.payload, urlPath);
          const result = await api().adminUploadMedia(file, { folder, label: el.dataset.label || e.test_id });
          setByPath(e.payload, urlPath, result.url);
          if (pathPath) setByPath(e.payload, pathPath, result.path);
          syncJsonDraft();
          if (oldPath && oldPath !== result.path && typeof api().adminRemoveMedia === 'function') {
            try { await api().adminRemoveMedia(oldPath); } catch { /* old media cleanup is best-effort */ }
          } else if (oldUrl && oldUrl.includes('/ielts-media/') && oldUrl !== result.url && typeof api().adminRemoveMedia === 'function') {
            try { await api().adminRemoveMedia(oldUrl); } catch { /* old media cleanup is best-effort */ }
          }
          state.notice = t('admin_upload_done');
          setStatus(t('admin_upload_done'), false);
          rerender();
        } catch (err) {
          state.uploadError = message(err);
          setStatus(message(err), true);
        } finally {
          el.disabled = false;
        }
      };
    });

    /* --- editor: structural edits (these re-render) --- */
    on('[data-edit-type]', el => {
      el.onchange = () => {
        const path = el.dataset.editType;
        const q = getByPath(state.editor.payload, path);
        if (q) {
          q.type = el.value;
          if (isOptionQuestion(q.type)) {
            if (!Array.isArray(q.options) || !q.options.length) q.options = ['', '', ''];
          } else delete q.options;
          if (/completion/.test(q.type) && !q.wordLimit) q.wordLimit = 'NO MORE THAN TWO WORDS AND/OR A NUMBER';
          if (q.type === 'yes-no-not-given') q.answerSet = 'yes-no';
          else if (q.type === 'true-false-not-given') delete q.answerSet;
        }
        syncJsonDraft();
        rerender();
      };
    });
    on('[data-edit-add-q]', el => {
      el.onclick = () => {
        const path = el.dataset.editAddQ;
        const list = getByPath(state.editor.payload, path) || [];
        list.push(emptyQuestion(state.editor.skill === 'reading' ? 'true-false-not-given' : 'form-completion'));
        setByPath(state.editor.payload, path, list);
        normalizePayload(state.editor.skill, state.editor.payload);
        syncJsonDraft();
        rerender();
      };
    });
    on('[data-edit-add-paragraph]', el => {
      el.onclick = () => {
        const path = el.dataset.editAddParagraph;
        const list = getByPath(state.editor.payload, path) || [];
        list.push({ label: alphaLabel(list.length), text: '' });
        setByPath(state.editor.payload, path, list);
        normalizePayload('reading', state.editor.payload);
        syncJsonDraft();
        rerender();
      };
    });
    on('[data-edit-split-paragraphs]', el => {
      el.onclick = () => {
        const path = el.dataset.editSplitParagraphs;
        const passage = getByPath(state.editor.payload, path) || {};
        const rows = String(passage.text || '').split(/\n\s*\n|\n/).map(text => text.trim()).filter(Boolean);
        passage.paragraphs = rows.map((text, i) => ({ label: alphaLabel(i), text }));
        normalizePayload('reading', state.editor.payload);
        syncJsonDraft();
        rerender();
      };
    });
    on('[data-edit-clear-paragraphs]', el => {
      el.onclick = () => {
        const path = el.dataset.editClearParagraphs;
        const passage = getByPath(state.editor.payload, path);
        if (passage) passage.paragraphs = [];
        syncJsonDraft();
        rerender();
      };
    });
    on('[data-edit-add-topic]', el => {
      el.onclick = () => {
        const path = el.dataset.editAddTopic;
        const list = getByPath(state.editor.payload, path) || [];
        list.push({ title: 'Topic ' + (list.length + 1), questions: [] });
        setByPath(state.editor.payload, path, list);
        normalizePayload('speaking', state.editor.payload);
        syncJsonDraft();
        rerender();
      };
    });
    on('[data-edit-del]', el => {
      el.onclick = () => {
        removeByPath(state.editor.payload, el.dataset.editDel);
        normalizePayload(state.editor.skill, state.editor.payload);
        syncJsonDraft();
        rerender();
      };
    });

    on('[data-admin-mode]', el => {
      el.onclick = () => {
        const wantJson = el.dataset.adminMode === 'json';
        if (wantJson) {
          syncJsonDraft();
          state.jsonMode = true;
        } else {
          try {
            const parsed = JSON.parse(state.jsonDraft);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON must be an object.');
            state.editor.payload = normalizePayload(state.editor.skill, parsed);
            state.jsonMode = false;
          } catch (err) {
            state.jsonError = t('admin_editor_invalid_json') + ' — ' + err.message;
            rerender();
            return;
          }
        }
        state.jsonError = '';
        rerender();
      };
    });

    on('[data-admin-save-meta]', el => { el.onclick = saveMeta; });
    on('[data-admin-save-skill]', el => { el.onclick = saveSkill; });
    on('[data-admin-close-modal]', el => {
      el.onclick = () => { state.editor = null; state.jsonError = ''; rerender(); };
    });
    on('[data-admin-delete-skill]', el => {
      el.onclick = () => {
        const [testId, skill] = String(el.dataset.adminDeleteSkill).split('::');
        ask(t('admin_confirm_delete_skill_title'),
          t2('admin_confirm_delete_skill_body', { skill: SKILL_LABEL[skill] || skill }),
          t('admin_delete'),
          async () => {
            state.confirm = null;
            state.editor = null;
            try { await api().adminDeleteTest(testId, skill); state.notice = t('admin_deleted'); }
            catch (err) { state.error = message(err); }
            await refresh('tests');
            const h = hooks();
            if (typeof h.reloadTests === 'function') h.reloadTests();
          });
      };
    });

    /* --- confirm dialog --- */
    on('[data-admin-confirm-yes]', el => {
      el.onclick = async () => {
        const fn = state.confirm && state.confirm.onConfirm;
        if (typeof fn === 'function') await fn();
        else { state.confirm = null; rerender(); }
      };
    });
    on('[data-admin-confirm-no]', el => {
      el.onclick = () => { state.confirm = null; rerender(); };
    });
  }

  function syncJsonDraft() {
    if (!state.editor) return;
    state.jsonDraft = JSON.stringify(state.editor.payload, null, 2);
  }

  /* ===================================================================
   * PUBLIC SURFACE
   * =================================================================== */
  window.IELTS_ADMIN = {
    SKILLS, Q_TYPES, SKILL_LABEL,
    state, loaded,
    isAdmin, body, modalHtml, bind, ensure, refresh, esc, t,
    /* also used by the AI generator modal (mockGenerator.js) to hand the
       freshly created test straight to the normal editor */
    openSkillEditor, openMetaEditor,
    /* used by tests and by the router guard */
    _internal: {
      nextTestId, validatePayload, normalizePayload, testsByUser, countQuestions, emptyPayload,
      emptyQuestion, emptyListeningPart, emptyPassage, emptyTask, emptySpeakingPart,
      questionTypesFor, indexValue
    }
  };
})();
