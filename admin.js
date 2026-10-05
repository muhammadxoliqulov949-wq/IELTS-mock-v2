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
  const Q_TYPES = ['sentence-completion', 'multiple-choice', 'true-false-not-given'];
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
  function emptyPayload(skill) {
    if (skill === 'listening') return { id: skill + '-custom', title: '', skill: 'Listening', duration: 30, parts: [emptyListeningPart()] };
    if (skill === 'reading') return { id: skill + '-custom', title: '', skill: 'Reading', duration: 60, format: 'Academic', passages: [emptyPassage()] };
    if (skill === 'writing') return { id: skill + '-custom', title: '', skill: 'Writing', format: 'Academic', duration: 60, tasks: [emptyTask(1), emptyTask(2)] };
    return { id: skill + '-custom', title: '', skill: 'Speaking', duration: 14, parts: [emptySpeakingPart(1)] };
  }
  function emptyListeningPart() {
    return { id: 'lp1', partNumber: 1, title: 'Part 1', instructions: '', transcript: '', questions: [emptyQuestion()] };
  }
  function emptyPassage() {
    return { id: 'rp1', passageNumber: 1, title: 'Passage 1', difficulty: 'Easier', text: '', questions: [emptyQuestion('true-false-not-given')] };
  }
  function emptyTask(n) {
    return { id: 'w' + n, taskNumber: n, title: 'Task ' + n, minutes: n === 1 ? 20 : 40, minWords: n === 1 ? 150 : 250, prompt: '' };
  }
  function emptySpeakingPart(n) {
    return { id: 'sp' + n, partNumber: n, title: 'Part ' + n, minutes: '4-5', questions: [''] };
  }
  function emptyQuestion(type) {
    return { id: 'q', type: type || 'sentence-completion', prompt: '', answer: '' };
  }

  /* Renumber blocks/questions and rebuild ids so the saved payload always
     matches the shape the test runners expect. */
  function normalizePayload(skill, payload) {
    const p = payload && typeof payload === 'object' ? payload : {};
    p.skill = SKILL_LABEL[skill] || skill;
    if (!p.id) p.id = skill + '-custom';
    if (skill === 'writing') {
      p.tasks = (p.tasks || []).map((task, i) => ({ ...task, taskNumber: i + 1, id: task.id || 'w' + (i + 1) }));
      return p;
    }
    if (skill === 'speaking') {
      p.parts = (p.parts || []).map((part, i) => ({ ...part, partNumber: i + 1, id: part.id || 'sp' + (i + 1) }));
      return p;
    }
    const key = skill === 'reading' ? 'passages' : 'parts';
    const numKey = skill === 'reading' ? 'passageNumber' : 'partNumber';
    const prefix = skill === 'reading' ? 'rp' : 'lp';
    let q = 0;
    p[key] = (p[key] || []).map((block, i) => {
      const questions = (block.questions || []).map(question => {
        q += 1;
        return { ...question, id: (skill === 'reading' ? 'r' : 'l') + q };
      });
      return { ...block, [numKey]: i + 1, id: block.id || prefix + (i + 1), questions };
    });
    /* question ids must be unique across the whole skill */
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
    rerender();
  }

  function openMetaEditor(testId) {
    const existing = ((state.tests && state.tests.meta) || []).find(m => m.test_id === testId);
    state.editor = {
      kind: 'meta',
      meta: existing
        ? { ...existing }
        : { test_id: testId || nextTestId(), label: '', label_uz: '', difficulty: '', is_published: true, position: 100 }
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
    return `
    <div class="modal-backdrop" id="adminEditorBackdrop">
      <div class="modal glass admin-modal admin-modal--wide" role="dialog" aria-modal="true" aria-labelledby="adminEditorTitle">
        <div class="admin-modal-head">
          <div>
            <h2 id="adminEditorTitle" style="font-family:var(--font-display);font-size:20px;margin:0">${esc(e.title)}</h2>
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
        <div class="admin-mode-switch">
          <button class="seg-btn${!state.jsonMode ? ' active' : ''}" data-admin-mode="visual">${esc(t('admin_editor_visual'))}</button>
          <button class="seg-btn${state.jsonMode ? ' active' : ''}" data-admin-mode="json">${esc(t('admin_editor_json'))}</button>
        </div>
        ${state.jsonError ? `<p class="admin-json-error">${esc(state.jsonError)}</p>` : ''}
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

  /* ---------- the visual builder ---------- */
  function visualEditorHtml() {
    const e = state.editor;
    if (e.skill === 'listening') return blocksHtml('parts', e.payload.parts, listeningPartHtml);
    if (e.skill === 'reading') return blocksHtml('passages', e.payload.passages, passageHtml);
    if (e.skill === 'writing') return blocksHtml('tasks', e.payload.tasks, taskHtml);
    return blocksHtml('parts', e.payload.parts, speakingPartHtml);
  }

  function blocksHtml(key, blocks, renderBlock) {
    const list = blocks || [];
    return `<div class="admin-blocks">
      ${list.map((b, i) => renderBlock(b, i, key)).join('')}
      <button class="btn btn-ghost admin-add" data-edit-add="${key}">＋ ${esc(t(blocksAddKey(key)))}</button>
    </div>`;
  }
  function blocksAddKey(key) {
    if (key === 'passages') return 'admin_add_passage';
    if (key === 'tasks') return 'admin_add_task';
    return 'admin_add_part';
  }

  function blockShell(key, index, title, inner) {
    return `<div class="admin-edit-block">
      <div class="admin-edit-block-head">
        <input class="btn btn-ghost field-input admin-inline-title" data-edit="${key}.${index}.title" value="${esc(title)}" />
        <button class="btn btn-ghost btn-sm admin-danger" data-edit-del="${key}.${index}">${esc(t('admin_remove'))}</button>
      </div>
      ${inner}
    </div>`;
  }

  function listeningPartHtml(part, i, key) {
    return blockShell(key, i, part.title, `
      <label class="field"><span>${esc(t('admin_field_instructions'))}</span>
        <input class="btn btn-ghost field-input" data-edit="${key}.${i}.instructions" value="${esc(part.instructions || '')}" />
      </label>
      <label class="field"><span>${esc(t('admin_field_transcript'))}</span>
        <textarea class="admin-textarea" rows="5" data-edit="${key}.${i}.transcript">${esc(part.transcript || '')}</textarea>
      </label>
      ${questionsHtml(`${key}.${i}.questions`, part.questions || [])}`);
  }

  function passageHtml(passage, i, key) {
    return blockShell(key, i, passage.title, `
      <label class="field"><span>${esc(t('admin_field_difficulty'))}</span>
        <input class="btn btn-ghost field-input" data-edit="${key}.${i}.difficulty" value="${esc(passage.difficulty || '')}" />
      </label>
      <label class="field"><span>${esc(t('admin_field_text'))}</span>
        <textarea class="admin-textarea" rows="7" data-edit="${key}.${i}.text">${esc(passage.text || '')}</textarea>
      </label>
      ${questionsHtml(`${key}.${i}.questions`, passage.questions || [])}`);
  }

  function taskHtml(task, i, key) {
    return `<div class="admin-edit-block">
      <div class="admin-edit-block-head">
        <input class="btn btn-ghost field-input admin-inline-title" data-edit="${key}.${i}.title" value="${esc(task.title || '')}" />
        <button class="btn btn-ghost btn-sm admin-danger" data-edit-del="${key}.${i}">${esc(t('admin_remove'))}</button>
      </div>
      <div class="admin-form admin-form--row">
        <label class="field"><span>${esc(t('admin_field_minutes'))}</span>
          <input class="btn btn-ghost field-input" type="number" data-edit-num="${key}.${i}.minutes" value="${esc(task.minutes || 20)}" />
        </label>
        <label class="field"><span>${esc(t('admin_field_min_words'))}</span>
          <input class="btn btn-ghost field-input" type="number" data-edit-num="${key}.${i}.minWords" value="${esc(task.minWords || 150)}" />
        </label>
      </div>
      <label class="field"><span>${esc(t('admin_field_prompt'))}</span>
        <textarea class="admin-textarea" rows="4" data-edit="${key}.${i}.prompt">${esc(task.prompt || '')}</textarea>
      </label>
      <label class="field"><span>${esc(t('admin_field_chart_data'))}</span>
        <textarea class="admin-textarea" rows="3" data-edit="${key}.${i}.chartData">${esc(task.chartData || '')}</textarea>
      </label>
    </div>`;
  }

  function speakingPartHtml(part, i, key) {
    return blockShell(key, i, part.title, `
      <div class="admin-form admin-form--row">
        <label class="field"><span>${esc(t('admin_field_minutes'))}</span>
          <input class="btn btn-ghost field-input" data-edit="${key}.${i}.minutes" value="${esc(part.minutes || '')}" />
        </label>
        <label class="field"><span>${esc(t('admin_field_prep'))}</span>
          <input class="btn btn-ghost field-input" type="number" data-edit-num="${key}.${i}.prepSeconds" value="${esc(part.prepSeconds || '')}" />
        </label>
        <label class="field"><span>${esc(t('admin_field_talk'))}</span>
          <input class="btn btn-ghost field-input" type="number" data-edit-num="${key}.${i}.talkSeconds" value="${esc(part.talkSeconds || '')}" />
        </label>
      </div>
      <label class="field"><span>${esc(t('admin_field_topic'))}</span>
        <input class="btn btn-ghost field-input" data-edit="${key}.${i}.topic" value="${esc(part.topic || '')}" />
      </label>
      <label class="field"><span>${esc(t('admin_field_questions_lines'))}</span>
        <textarea class="admin-textarea" rows="4" data-edit-lines="${key}.${i}.questions">${esc((part.questions || []).join('\n'))}</textarea>
      </label>
      <label class="field"><span>${esc(t('admin_field_bullets'))}</span>
        <textarea class="admin-textarea" rows="3" data-edit-lines="${key}.${i}.bullets">${esc((part.bullets || []).join('\n'))}</textarea>
      </label>`);
  }

  function questionsHtml(path, questions) {
    return `<div class="admin-questions">
      <p class="admin-subhead">${esc(t('admin_questions_head'))} (${questions.length})</p>
      ${questions.map((q, i) => `
        <div class="admin-question">
          <div class="admin-question-head">
            <span class="admin-q-num">Q${i + 1}</span>
            <select class="admin-select" data-edit-type="${path}.${i}.type">
              ${Q_TYPES.map(x => `<option value="${esc(x)}"${x === q.type ? ' selected' : ''}>${esc(x)}</option>`).join('')}
            </select>
            <button class="btn btn-ghost btn-sm admin-danger" data-edit-del="${path}.${i}">${esc(t('admin_remove'))}</button>
          </div>
          <label class="field"><span>${esc(t('admin_field_prompt'))}</span>
            <textarea class="admin-textarea" rows="2" data-edit="${path}.${i}.prompt">${esc(q.prompt || '')}</textarea>
          </label>
          ${q.type === 'multiple-choice' ? `
          <label class="field"><span>${esc(t('admin_field_options'))}</span>
            <input class="btn btn-ghost field-input" data-edit-list="${path}.${i}.options" value="${esc((q.options || []).join(' | '))}" placeholder="Option A | Option B | Option C" />
          </label>` : ''}
          <div class="admin-form admin-form--row">
            <label class="field"><span>${esc(t('admin_field_answer'))}</span>
              <input class="btn btn-ghost field-input" data-edit="${path}.${i}.answer" value="${esc(q.answer == null ? '' : q.answer)}" />
            </label>
            <label class="field"><span>${esc(t('admin_field_explanation'))}</span>
              <input class="btn btn-ghost field-input" data-edit="${path}.${i}.explanation" value="${esc(q.explanation || '')}" />
            </label>
          </div>
        </div>`).join('')}
      <button class="btn btn-ghost admin-add" data-edit-add-q="${path}">＋ ${esc(t('admin_add_question'))}</button>
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
    const p = payload || {};
    if (skill === 'writing') {
      const tasks = p.tasks || [];
      if (!tasks.length) problems.push(t('admin_err_need_task'));
      tasks.forEach((task, i) => {
        if (!String(task.prompt || '').trim()) problems.push(t2('admin_err_task_prompt', { n: i + 1 }));
      });
      return problems;
    }
    if (skill === 'speaking') {
      if (!(p.parts || []).length) problems.push(t('admin_err_need_part'));
      return problems;
    }
    const key = skill === 'reading' ? 'passages' : 'parts';
    const blocks = p[key] || [];
    if (!blocks.length) problems.push(t(skill === 'reading' ? 'admin_err_need_passage' : 'admin_err_need_part'));
    let n = 0;
    blocks.forEach(block => {
      (block.questions || []).forEach(q => {
        n += 1;
        if (!String(q.prompt || '').trim()) problems.push(t2('admin_err_q_prompt', { n }));
        if (q.answer === undefined || q.answer === null || String(q.answer).trim() === '') problems.push(t2('admin_err_q_answer', { n }));
        if (q.type === 'multiple-choice' && !(q.options || []).length) problems.push(t2('admin_err_q_options', { n }));
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
      el.oninput = () => { state.editor.title = el.value; };
    });
    on('[data-meta]', el => {
      const key = el.dataset.meta;
      if (el.type === 'checkbox') el.onchange = () => { state.editor.meta[key] = el.checked; };
      else el.oninput = () => { state.editor.meta[key] = key === 'position' ? Number(el.value) : el.value; };
    });

    /* --- editor: structured form (mutate the model, do not re-render) --- */
    on('[data-edit]', el => {
      el.oninput = () => { setByPath(state.editor.payload, el.dataset.edit, el.value); };
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

    /* --- editor: structural edits (these re-render) --- */
    on('[data-edit-type]', el => {
      el.onchange = () => {
        const path = el.dataset.editType;
        const q = getByPath(state.editor.payload, path);
        if (q) {
          q.type = el.value;
          if (q.type === 'multiple-choice' && !Array.isArray(q.options)) q.options = ['', '', ''];
          if (q.type !== 'multiple-choice') delete q.options;
        }
        syncJsonDraft();
        rerender();
      };
    });
    on('[data-edit-add]', el => {
      el.onclick = () => {
        const key = el.dataset.editAdd;
        const p = state.editor.payload;
        p[key] = p[key] || [];
        const skill = state.editor.skill;
        if (skill === 'reading') p[key].push(emptyPassage());
        else if (skill === 'writing') p[key].push(emptyTask(p[key].length + 1));
        else if (skill === 'speaking') p[key].push(emptySpeakingPart(p[key].length + 1));
        else p[key].push(emptyListeningPart());
        normalizePayload(skill, p);
        syncJsonDraft();
        rerender();
      };
    });
    on('[data-edit-add-q]', el => {
      el.onclick = () => {
        const path = el.dataset.editAddQ;
        const list = getByPath(state.editor.payload, path) || [];
        list.push(emptyQuestion(state.editor.skill === 'reading' ? 'true-false-not-given' : 'sentence-completion'));
        setByPath(state.editor.payload, path, list);
        normalizePayload(state.editor.skill, state.editor.payload);
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
        if (wantJson) syncJsonDraft();
        state.jsonMode = wantJson;
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
    /* used by tests and by the router guard */
    _internal: { nextTestId, validatePayload, normalizePayload, testsByUser, countQuestions, emptyPayload }
  };
})();
