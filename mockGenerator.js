/* ===================================================================
 * IELTS Mock — 1-Click AI Generator (admin panel)
 * -------------------------------------------------------------------
 * Opened from Admin → Mock tests → "AI orqali yangi Mock yaratish".
 *
 * What it does, in order, with live progress in the modal:
 *   1. Listening  → /api/generate-mock (4 parts, 40 questions, 4 transcripts)
 *                   then one TTS request per part; each recording is
 *                   uploaded to the public "ielts-media" bucket and the
 *                   URL is written into parts[i].audioUrl
 *   2. Reading    → /api/generate-mock (3 passages, 40 questions)
 *   3. Writing    → /api/generate-mock (Task 1 + Task 2). The Task 1
 *                   chartSpec is rendered to a PNG on a canvas and
 *                   uploaded, so the candidate sees a real chart image
 *   4. Speaking   → /api/generate-mock (Parts 1–3 incl. the cue card)
 *   5. every section is saved through the normal admin Supabase calls
 *      (adminSaveTest / adminSaveTestMeta), so row level security is the
 *      only thing standing between this button and the database
 *
 * Everything the admin typed or the model produced is escaped before it
 * reaches innerHTML. The generator never invents its own validation:
 * the payload goes through window.IELTS_ADMIN._internal.normalizePayload
 * before saving, exactly like the manual editor does.
 * =================================================================== */
(function () {
  'use strict';

  const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
  const STEP_LABEL = {
    listening: 'admin_ai_step_listening',
    reading: 'admin_ai_step_reading',
    writing: 'admin_ai_step_writing',
    speaking: 'admin_ai_step_speaking'
  };

  /* ---------- state ---------- */
  const state = {
    open: false,
    running: false,
    testId: '',
    label: '',
    difficulty: 'standard',
    topic: '',
    publish: true,
    plan: null,
    onDone: null,
    steps: {},          /* skill → 'pending' | 'active' | 'done' | 'error' */
    status: '',
    error: '',
    result: null,       /* { questions, audio, chart, saved } */
    root: null
  };

  /* ---------- tiny helpers ---------- */
  const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ENT[c]); }
  function t(key, fallback) {
    const i18n = window.IELTS_I18N;
    const value = i18n && typeof i18n.t === 'function' ? i18n.t(key) : '';
    return value && value !== key ? value : (fallback || key);
  }
  function cloud() { return window.IELTS_CLOUD || null; }
  function admin() { return window.IELTS_ADMIN || null; }
  function pool() { return window.IELTS_TOPICS || null; }
  function nextTestId() {
    const a = admin();
    if (a && a._internal && typeof a._internal.nextTestId === 'function') return a._internal.nextTestId();
    return 'test5';
  }
  function hooks() { return window.IELTS_ADMIN_HOOKS || {}; }

  /* ---------- modal ---------- */
  function open(options) {
    const opts = options || {};
    state.open = true;
    state.running = false;
    state.error = '';
    state.status = '';
    state.result = null;
    state.plan = null;
    state.testId = opts.testId || nextTestId();
    state.label = opts.label || defaultLabel(state.testId);
    state.difficulty = opts.difficulty || 'standard';
    state.topic = opts.topic || '';
    state.publish = opts.publish !== false;
    state.onDone = typeof opts.onDone === 'function' ? opts.onDone : null;
    SKILLS.forEach(skill => { state.steps[skill] = 'pending'; });
    mount();
    render();
  }

  /* Warn before an existing test id is overwritten by a fresh run. */
  function existingTestId() {
    const a = admin();
    const meta = (a && a.state && a.state.tests && a.state.tests.meta) || [];
    return meta.some(m => m.test_id === state.testId);
  }

  function defaultLabel(testId) {
    const n = /^test(\d+)$/.exec(String(testId || ''));
    return n ? `Practice Test ${n[1]}` : 'Practice Test';
  }

  function close() {
    state.open = false;
    if (state.root && state.root.parentNode) state.root.parentNode.removeChild(state.root);
    state.root = null;
  }

  function isOpen() { return state.open; }

  function mount() {
    if (state.root) return;
    const root = document.createElement('div');
    root.id = 'aiGeneratorRoot';
    document.body.appendChild(root);
    state.root = root;
  }

  function render() {
    if (!state.root) return;
    state.root.innerHTML = modalHtml();
    bind();
  }

  function modalHtml() {
    const running = state.running;
    const done = state.result;
    return `
    <div class="modal-backdrop ai-gen-backdrop" id="aiGenBackdrop">
      <div class="modal glass admin-modal ai-gen-modal" role="dialog" aria-modal="true" aria-labelledby="aiGenTitle">
        <div class="admin-modal-head">
          <div>
            <span class="admin-editor-kicker">${esc(t('admin_ai_kicker', 'Mock testlar · AI'))}</span>
            <h2 id="aiGenTitle" style="font-family:var(--font-display);font-size:20px;margin:4px 0 0">${esc(t('admin_ai_title', "AI orqali yangi Mock yaratish (1-Click IELTS Generator)"))}</h2>
            <p class="micro" style="margin:4px 0 0">${esc(t('admin_ai_subtitle', 'To\'liq IELTS mock test: Listening · Reading · Writing · Speaking — bir tugma bilan.'))}</p>
          </div>
          <button class="modal-close" data-ai-close aria-label="${esc(t('admin_cancel', 'Cancel'))}">×</button>
        </div>

        ${state.error ? `<div class="admin-notice admin-notice--error" role="alert"><div><strong>${esc(t('admin_error', 'Xatolik'))}</strong><p>${esc(state.error)}</p></div></div>` : ''}

        ${done ? doneHtml() : ''}

        ${done || running ? '' : `
        <div class="admin-form">
          <label class="field"><span>${esc(t('admin_ai_field_name', 'Test raqami/nomi'))}</span>
            <input class="btn btn-ghost field-input" data-ai-label value="${esc(state.label)}" placeholder="Practice Test 6" ${running ? 'disabled' : ''}>
          </label>
          <label class="field"><span>${esc(t('admin_field_test_id', 'Test id'))}</span>
            <input class="btn btn-ghost field-input" data-ai-testid value="${esc(state.testId)}" ${running ? 'disabled' : ''}>
          </label>
          <label class="field"><span>${esc(t('admin_ai_field_difficulty', 'Qiyinlik darajasi'))}</span>
            <select class="btn btn-ghost field-input" data-ai-difficulty ${running ? 'disabled' : ''}>
              <option value="standard" ${state.difficulty === 'standard' ? 'selected' : ''}>${esc(t('admin_ai_difficulty_standard', 'Standard IELTS'))}</option>
              <option value="hard" ${state.difficulty === 'hard' ? 'selected' : ''}>${esc(t('admin_ai_difficulty_hard', 'Hard'))}</option>
            </select>
          </label>
          <label class="field"><span>${esc(t('admin_ai_field_topic', "Ixtiyoriy mavzu yo'nalishi"))}</span>
            <input class="btn btn-ghost field-input" data-ai-topic value="${esc(state.topic)}" placeholder="${esc(t('admin_ai_topic_placeholder', "Space exploration, Marine biology, Cognitive psychology …"))}" ${running ? 'disabled' : ''}>
          </label>
          <p class="micro">${esc(t('admin_ai_pool_hint', "Bo'sh qoldirsangiz, tizim 48 ta rasmiy IELTS mavzusi omboridan har bir bo'lim uchun alohida tasodifiy mavzu tanlaydi va savol turlarini aralashtiradi."))}</p>
          ${existingTestId() ? `<p class="ai-gen-warn">${esc(t('admin_ai_exists_warn', "Bu test id allaqachon mavjud — generatsiya natijasi uning ustiga yoziladi."))}</p>` : ''}
          <label class="admin-toggle">
            <input type="checkbox" data-ai-publish ${state.publish ? 'checked' : ''} ${running ? 'disabled' : ''}>
            <span>${esc(t('admin_ai_field_publish', "Nashr qilish (o'quvchilarga ko'rinadi)"))}</span>
          </label>
        </div>`}

        <ol class="ai-gen-steps">
          ${SKILLS.map(skill => stepHtml(skill)).join('')}
        </ol>
        <p class="ai-gen-status" aria-live="polite">${esc(state.status || t('admin_ai_status_idle', "Tayyor — \"Generatsiya qilish\" ni bosing."))}</p>

        <div class="admin-modal-actions">
          ${done ? `
            <button class="btn btn-primary" data-ai-open-editor="listening">${esc(t('admin_ai_open_listening', "Listening'ni ko'rish"))}</button>
            <button class="btn btn-ghost" data-ai-open-editor="reading">${esc(t('admin_ai_open_reading', "Reading"))}</button>
            <button class="btn btn-ghost" data-ai-open-editor="writing">${esc(t('admin_ai_open_writing', 'Writing'))}</button>
            <button class="btn btn-ghost" data-ai-open-editor="speaking">${esc(t('admin_ai_open_speaking', 'Speaking'))}</button>
            <button class="btn btn-ghost" data-ai-close>${esc(t('admin_ai_close', 'Yopish'))}</button>
          ` : `
            <button class="btn btn-primary" data-ai-generate ${running ? 'disabled' : ''}>${running ? esc(t('admin_ai_generating', 'Generatsiya…')) : esc(t('admin_ai_generate_btn', 'Generatsiya qilish'))}</button>
            <button class="btn btn-ghost" data-ai-close ${running ? 'disabled' : ''}>${esc(t('admin_cancel', 'Bekor qilish'))}</button>
          `}
        </div>
      </div>
    </div>`;
  }

  function stepHtml(skill) {
    const step = state.steps[skill] || 'pending';
    const icon = step === 'done' ? '✓' : step === 'error' ? '!' : step === 'active' ? '…' : '';
    return `<li class="ai-gen-step is-${esc(step)}">
      <span class="ai-gen-step-icon">${icon}</span>
      <span class="ai-gen-step-label">${esc(t(STEP_LABEL[skill], skill))}</span>
      <span class="ai-gen-step-note">${esc(stepNote(skill, step))}</span>
    </li>`;
  }

  function stepNote(skill, step) {
    if (step === 'active') return t('admin_ai_step_active', 'yuklanmoqda…');
    if (step === 'done') {
      const result = state.result;
      if (result && result.perSkill && result.perSkill[skill]) return result.perSkill[skill];
      return t('admin_ai_step_done', 'tayyor');
    }
    if (step === 'error') return t('admin_ai_step_failed', 'xato');
    return '';
  }

  function doneHtml() {
    const r = state.result || {};
    return `<div class="ai-gen-summary">
      <p class="ai-gen-summary-line"><strong>${esc(t('admin_ai_done_title', 'Test yaratildi'))}</strong> — ${esc(r.testId || '')} · ${esc(r.label || '')}</p>
      <ul>
        <li>${esc(t('admin_ai_done_questions', 'Savollar soni'))}: <strong>${esc(String(r.questions || 0))}</strong></li>
        <li>${esc(t('admin_ai_done_audio', 'Listening MP3'))}: <strong>${esc(String(r.audio || 0))}</strong>${r.audioNote ? ` <span class="micro">(${esc(r.audioNote)})</span>` : ''}</li>
        <li>${esc(t('admin_ai_done_chart', 'Writing Task 1 diagrammasi'))}: <strong>${r.chart ? esc(t('admin_yes', 'ha')) : esc(t('admin_no', "yo'q (chartData saqlandi)"))}</strong></li>
      </ul>
      <p class="micro">${esc(t('admin_ai_done_hint', "Test darhol ko'rish va tahrirlash mumkin. O'quvchilarga ko'rinishi uchun \"Nashr qilish\" ni yoqing."))}</p>
    </div>`;
  }

  function bind() {
    const root = state.root;
    if (!root) return;
    const on = (selector, handler) => {
      root.querySelectorAll(selector).forEach(el => { el.onclick = handler; });
    };
    const onInput = (selector, handler) => {
      root.querySelectorAll(selector).forEach(el => { el.oninput = () => handler(el); });
    };
    onInput('[data-ai-label]', el => { state.label = el.value; });
    onInput('[data-ai-testid]', el => { state.testId = el.value; });
    onInput('[data-ai-topic]', el => { state.topic = el.value; });
    root.querySelectorAll('[data-ai-publish]').forEach(el => {
      el.onchange = () => { state.publish = el.checked; };
    });
    root.querySelectorAll('[data-ai-difficulty]').forEach(el => {
      el.onchange = () => { state.difficulty = el.value; };
    });
    on('[data-ai-close]', () => { if (!state.running) close(); });
    on('[data-ai-generate]', () => { generate(); });
    on('[data-ai-open-editor]', el => { openEditor(el.getAttribute('data-ai-open-editor')); });
    const backdrop = root.querySelector('#aiGenBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop && !state.running) close();
      });
    }
  }

  /* ---------- generation ---------- */
  /* Progress is patched into the live DOM instead of re-rendering the whole
     modal, so the admin never loses their scroll position mid-run. */
  function setStep(skill, step) {
    state.steps[skill] = step;
    if (!patchSteps()) render();
  }

  function setStatus(text) {
    state.status = text;
    const node = state.root ? state.root.querySelector('.ai-gen-status') : null;
    if (node) node.textContent = text;
    else render();
  }

  function patchSteps() {
    if (!state.root) return false;
    const nodes = state.root.querySelectorAll('.ai-gen-step');
    if (nodes.length !== SKILLS.length) return false;
    SKILLS.forEach((skill, i) => {
      const node = nodes[i];
      if (!node) return;
      const step = state.steps[skill] || 'pending';
      node.className = 'ai-gen-step is-' + step;
      const icon = node.querySelector('.ai-gen-step-icon');
      const note = node.querySelector('.ai-gen-step-note');
      if (icon) icon.textContent = step === 'done' ? '✓' : step === 'error' ? '!' : step === 'active' ? '…' : '';
      if (note) note.textContent = stepNote(skill, step);
    });
    return true;
  }

  async function generate() {
    const c = cloud();
    const a = admin();
    if (!c || typeof c.adminSaveTest !== 'function' || typeof c.adminSaveTestMeta !== 'function') {
      state.error = t('admin_ai_no_cloud', "Supabase ulanmagan — avval SUPABASE_URL va SUPABASE_ANON_KEY ni sozlang.");
      render();
      return;
    }
    if (a && typeof a.isAdmin === 'function' && !a.isAdmin()) {
      state.error = t('admin_not_admin', 'Faqat adminlar test yarata oladi.');
      render();
      return;
    }
    if (!/^test\d{1,2}$/.test(String(state.testId || ''))) {
      state.error = t('admin_err_test_id', 'Test id formati noto\'g\'ri (masalan: test6).');
      render();
      return;
    }
    if (!String(state.label || '').trim()) {
      state.error = t('admin_err_label', 'Test nomini kiriting.');
      render();
      return;
    }

    const p = pool();
    if (!p || typeof p.buildPlan !== 'function') {
      state.error = t('admin_ai_no_pool', 'Mavzular ombori yuklanmadi (lib/topicPool.js).');
      render();
      return;
    }

    state.running = true;
    state.error = '';
    state.result = null;
    SKILLS.forEach(skill => { state.steps[skill] = 'pending'; });
    /* the plan is built here so the modal can show exactly which topics
       and question-type mixes the model was asked to follow */
    state.plan = p.buildPlan({ difficulty: state.difficulty, topic: state.topic });
    render();

    const perSkill = {};
    let questions = 0;
    let audioCount = 0;
    let audioNote = '';
    let chart = false;

    try {
      for (const skill of SKILLS) {
        setStep(skill, 'active');
        setStatus(t('admin_ai_status_generating', 'Generatsiya qilinmoqda') + ': ' + t(STEP_LABEL[skill], skill) + '…');

        const response = await fetch('/api/generate-mock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'section',
            skill,
            testId: state.testId,
            label: state.label,
            difficulty: state.plan.difficulty,
            plan: state.plan
          })
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.ok) {
          throw new Error(errorMessage(data, response.status));
        }

        let payload = data.payload || {};
        const counts = data.counts || {};

        if (skill === 'listening') {
          const audio = await generateAudio(payload, state.testId);
          payload = audio.payload;
          audioCount = audio.uploaded;
          if (audio.note) audioNote = audio.note;
          setStatus(t('admin_ai_status_audio', 'Audio tayyor') + ` ${audio.uploaded}/${audio.total}`);
        }
        if (skill === 'writing') {
          const image = await renderTask1(payload, state.testId);
          payload = image.payload;
          chart = !!image.uploaded;
        }

        /* same normalisation the manual editor applies before saving */
        if (a && a._internal && typeof a._internal.normalizePayload === 'function') {
          payload = a._internal.normalizePayload(skill, payload);
        }
        payload.title = String(state.label || payload.title || '').trim();

        await c.adminSaveTest({
          test_id: state.testId,
          skill,
          title: `${state.label} — ${skillLabel(skill)}`,
          payload,
          is_published: !!state.publish,
          position: 100
        });

        questions += Number(counts.questions) || countQuestions(payload);
        perSkill[skill] = `${Number(counts.questions) || countQuestions(payload)} ${t('admin_questions_short', 'savol')}`;
        setStep(skill, 'done');
      }

      await c.adminSaveTestMeta({
        test_id: state.testId,
        label: state.label.trim(),
        label_uz: '',
        difficulty: state.plan.difficulty === 'hard' ? t('admin_ai_difficulty_hard', 'Hard') : t('admin_ai_difficulty_standard', 'Standard IELTS'),
        is_published: !!state.publish,
        position: 100
      });

      state.running = false;
      state.result = {
        testId: state.testId,
        label: state.label.trim(),
        questions,
        audio: audioCount,
        audioNote,
        chart,
        perSkill
      };
      state.status = t('admin_ai_status_done', 'Barcha bo\'limlar saqlandi.');
      render();

      /* republish to learners and refresh the admin list behind the modal */
      const h = hooks();
      if (typeof h.reloadTests === 'function') { try { h.reloadTests(); } catch { /* best effort */ } }
      /* let the caller (the admin panel) refresh its own list */
      if (state.onDone) { try { state.onDone(state.testId); } catch { /* best effort */ } }
      if (a && typeof a.refresh === 'function') { try { a.refresh('tests'); } catch { /* best effort */ } }
    } catch (err) {
      state.running = false;
      state.error = err && err.message ? err.message : String(err);
      const failed = SKILLS.find(skill => state.steps[skill] === 'active');
      if (failed) state.steps[failed] = 'error';
      render();
    }
  }

  function errorMessage(data, status) {
    if (data && data.message) return data.message;
    if (data && data.error) return data.error;
    return `Generation failed (HTTP ${status}).`;
  }

  function skillLabel(skill) {
    const a = admin();
    if (a && a.SKILL_LABEL && a.SKILL_LABEL[skill]) return a.SKILL_LABEL[skill];
    return skill;
  }

  function countQuestions(payload) {
    const blocks = (payload && (payload.parts || payload.passages || payload.tasks)) || [];
    return blocks.reduce((sum, b) => sum + ((b && b.questions && b.questions.length) || 0), 0);
  }

  /* ---------- Listening audio (Edge TTS → Supabase Storage) ---------- */
  async function generateAudio(payload, testId) {
    const parts = Array.isArray(payload.parts) ? payload.parts : [];
    let uploaded = 0;
    let note = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const transcript = String(part.transcript || '').trim();
      if (!transcript) continue;
      setStatus(`${t('admin_ai_status_audio', 'Audio tayyorlanmoqda')} ${i + 1}/${parts.length}…`);
      try {
        const response = await fetch('/api/generate-mock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'audio',
            testId,
            partNumber: i + 1,
            transcript,
            accessToken: await accessToken()
          })
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.ok) throw new Error(errorMessage(data, response.status));
        const audio = data.audio || {};
        if (audio.url) {
          part.audioUrl = audio.url;
          part.audioPath = audio.path || '';
          uploaded++;
        } else if (audio.base64) {
          /* the server could not upload (no token) — do it from the browser */
          const bytes = base64ToBytes(audio.base64);
          const file = new File([bytes], `${testId}-listening-part${i + 1}.${audio.ext || 'mp3'}`, { type: audio.mime || 'audio/mpeg' });
          const result = await cloud().adminUploadMedia(file, { folder: 'audio', label: `${testId}-listening-part${i + 1}` });
          part.audioUrl = result.url;
          part.audioPath = result.path;
          uploaded++;
        }
      } catch (err) {
        note = t('admin_ai_audio_note_failed', 'ayniya qismda audio yaratilmadi — transcript saqlandi');
        /* a missing recording must never kill the whole test */
      }
    }
    return { payload, uploaded, total: parts.length, note };
  }

  /* The admin's own Supabase token, so the server can upload into the
     bucket under their identity (the storage policy still checks admin). */
  async function accessToken() {
    try {
      const c = cloud();
      if (c && typeof c.getAccessToken === 'function') return await c.getAccessToken();
    } catch { /* no token → the browser uploads instead */ }
    return '';
  }

  function base64ToBytes(base64) {
    const binary = atob(String(base64 || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /* ---------- Writing Task 1 chart (chartSpec → canvas → PNG → Storage) ---------- */
  async function renderTask1(payload, testId) {
    const task = (Array.isArray(payload.tasks) ? payload.tasks : [])[0];
    if (!task) return { payload, uploaded: false };
    const spec = task.chartSpec;
    if (!spec || !Array.isArray(spec.labels) || !Array.isArray(spec.series) || !spec.series.length) {
      return { payload, uploaded: false };
    }
    try {
      const blob = await chartPng(spec);
      if (!blob) return { payload, uploaded: false };
      const file = new File([blob], `${testId}-writing-task1.png`, { type: 'image/png' });
      const result = await cloud().adminUploadMedia(file, { folder: 'images', label: `${testId}-writing-task1` });
      task.imageUrl = result.url;
      task.imagePath = result.path;
      return { payload, uploaded: true };
    } catch {
      /* chartData stays in the payload — the editor still has the data */
      return { payload, uploaded: false };
    }
  }

  function chartPng(spec) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 960;
        canvas.height = 540;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas unavailable')); return; }
        const W = canvas.width;
        const H = canvas.height;
        const bg = '#11141d';
        const grid = 'rgba(255,255,255,0.10)';
        const text = '#e8ebf5';
        const muted = '#9aa3b8';
        const colors = ['#6d5bff', '#22d3ee', '#f59e0b', '#f472b6'];

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = text;
        ctx.font = '600 22px "Space Grotesk", system-ui, sans-serif';
        ctx.fillText(String(spec.title || 'Task 1'), 48, 52);
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = muted;
        if (spec.unit) ctx.fillText(`unit: ${spec.unit}`, 48, 76);

        const left = 78;
        const right = W - 40;
        const top = 110;
        const bottom = H - 70;
        const labels = spec.labels.map(String);
        const series = spec.series.slice(0, 4);
        const all = series.flatMap(s => s.values.map(Number)).filter(v => Number.isFinite(v));
        const max = Math.max(1, ...all);
        const min = Math.min(0, ...all);
        const span = max - min || 1;

        /* grid + y labels */
        ctx.strokeStyle = grid;
        ctx.fillStyle = muted;
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
          const y = bottom - ((bottom - top) * i) / 4;
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
          const value = min + (span * i) / 4;
          ctx.fillText(formatNumber(value), left - 10, y + 4);
        }
        ctx.textAlign = 'center';

        const plotWidth = right - left;
        const groupWidth = plotWidth / Math.max(1, labels.length);

        if (spec.chartType === 'pie') {
          const total = series[0].values.reduce((a, b) => a + (Number(b) || 0), 0) || 1;
          const cx = W / 2;
          const cy = (top + bottom) / 2;
          const radius = Math.min(plotWidth, bottom - top) / 2 - 20;
          let angle = -Math.PI / 2;
          series[0].values.forEach((value, i) => {
            const slice = (Number(value) || 0) / total;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, angle, angle + slice * Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            angle += slice * Math.PI * 2;
            /* label outside the slice */
            const mid = angle - slice * Math.PI;
            ctx.fillStyle = text;
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText(`${labels[i] ?? i + 1}`, cx + Math.cos(mid) * (radius + 22), cy + Math.sin(mid) * (radius + 22));
          });
        } else if (spec.chartType === 'line') {
          series.forEach((s, si) => {
            ctx.strokeStyle = colors[si % colors.length];
            ctx.lineWidth = 3;
            ctx.beginPath();
            s.values.forEach((value, i) => {
              const x = left + groupWidth * (i + 0.5);
              const y = bottom - ((Number(value) - min) / span) * (bottom - top);
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
            s.values.forEach((value, i) => {
              const x = left + groupWidth * (i + 0.5);
              const y = bottom - ((Number(value) - min) / span) * (bottom - top);
              ctx.fillStyle = colors[si % colors.length];
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
            });
          });
          drawLegend(ctx, series, colors, right, top);
        } else {
          /* bar (also used for "table": a labelled grid reads better than
             an HTML table rasterised by hand) */
          const barWidth = Math.max(6, (groupWidth - 18) / series.length);
          series.forEach((s, si) => {
            ctx.fillStyle = colors[si % colors.length];
            s.values.forEach((value, i) => {
              const x = left + groupWidth * i + 9 + si * barWidth;
              const y = bottom - ((Number(value) - min) / span) * (bottom - top);
              const height = Math.max(1, bottom - y);
              ctx.fillRect(x, y, barWidth - 3, height);
            });
          });
          drawLegend(ctx, series, colors, right, top);
        }

        /* x labels */
        ctx.fillStyle = muted;
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        labels.forEach((label, i) => {
          const x = left + groupWidth * (i + 0.5);
          ctx.fillText(truncate(ctx, label, groupWidth - 8), x, bottom + 22);
        });

        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob(blob => resolve(blob), 'image/png');
        } else {
          reject(new Error('canvas.toBlob unavailable'));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  function drawLegend(ctx, series, colors, right, top) {
    ctx.textAlign = 'left';
    ctx.font = '12px system-ui, sans-serif';
    series.forEach((s, i) => {
      const y = top - 14 + i * 0; /* single row, above the plot */
      const x = right - 190 - (series.length - 1 - i) * 0;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y - 9, 10, 10);
      ctx.fillStyle = '#e8ebf5';
      ctx.fillText(truncate(ctx, s.name, 150), x + 16, y);
    });
  }

  function truncate(ctx, text, maxWidth) {
    let out = String(text == null ? '' : text);
    if (ctx.measureText(out).width <= maxWidth) return out;
    while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
    return out + '…';
  }

  function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return Math.abs(n) >= 1000 ? n.toLocaleString('en-US') : String(Math.round(n * 100) / 100);
  }

  /* ---------- open the freshly saved test in the normal editor ---------- */
  async function openEditor(skill) {
    const a = admin();
    if (!a) return;
    try {
      if (typeof a.refresh === 'function') await a.refresh('tests');
    } catch { /* the editor falls back to the cached rows */ }
    if (typeof a.openSkillEditor === 'function') {
      close();
      a.openSkillEditor(state.testId, skill);
    }
  }

  /* ---------- public surface ---------- */
  window.IELTS_GENERATOR = { open, close, isOpen, state };
})();
