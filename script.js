const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const CONTENT = window.IELTS_CONTENT;
const SERVICES = window.IELTS_SERVICES;
const STORAGE = 'ielts-v2-store';

let store = load();
function load() { try { return { attempts: [], mistakes: [], coachMessages: [], ...JSON.parse(localStorage.getItem(STORAGE)) }; } catch { return { attempts: [], mistakes: [], coachMessages: [] }; } }
function save() { localStorage.setItem(STORAGE, JSON.stringify(store)); }
function go(path) { location.hash = path; }
function route() { return location.hash.slice(1) || '/'; }
function esc(v) { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function notify(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }
function fmtTime(seconds) { const m = Math.floor(Math.max(0, seconds) / 60); const s = Math.max(0, seconds) % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }

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

function shell(body, active) {
  return `<div class="shell"><nav class="nav"><a class="brand" href="#/"><span class="brand-mark">B</span>IELTS Mock</a>
    <div class="nav-links">
      <a class="${active === 'listening' ? 'active' : ''}" href="#/listening">Listening</a>
      <a class="${active === 'reading' ? 'active' : ''}" href="#/reading">Reading</a>
      <a class="${active === 'writing' ? 'active' : ''}" href="#/writing">Writing</a>
      <a class="${active === 'speaking' ? 'active' : ''}" href="#/speaking">Speaking</a>
      <a class="${active === 'mistakes' ? 'active' : ''}" href="#/mistakes">Mistakes</a>
      <a class="${active === 'coach' ? 'active' : ''}" href="#/coach">AI Coach</a>
    </div>
    <div class="nav-actions"><span class="avatar">AM</span></div>
  </nav><div class="page-fade">${body}</div></div>`;
}

/* ---------------- HOME (Intro -> Body -> Conclusion -> Coach CTA) ---------------- */
function home() {
  const overall = bandAverage();
  const weakest = weakestSkill();
  const cards = [
    { key: 'listening', title: 'Listening', meta: '4 parts · 40 questions · 30 min', href: '/listening' },
    { key: 'reading', title: 'Reading', meta: '3 passages · 40 questions · 60 min', href: '/reading' },
    { key: 'writing', title: 'Writing', meta: '2 tasks · 60 min', href: '/writing' },
    { key: 'speaking', title: 'Speaking', meta: '3 parts · 11-14 min · voice recorded', href: '/speaking' }
  ];
  return shell(`
    <section class="hero">
      <div>
        <div class="eyebrow">Full-length mock exam · Band 1-9</div>
        <h1>Know your level.<br>Fix your <span>weaknesses.</span><br>Improve with AI.</h1>
        <p class="hero-copy">Take a real-format IELTS mock exam, get an instant band estimate, see exactly which questions you missed and why, then talk to an AI coach that builds your next study step from your own results.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-go="/listening">Start the full mock exam</button>
          <button class="btn btn-ghost" data-go="/mistakes">See my mistakes</button>
        </div>
        <p class="micro">Practice estimates only · Not affiliated with or endorsed by IELTS, British Council, IDP, or Cambridge</p>
      </div>
      <div class="preview-wrap">
        <div class="glass score-card">
          <div class="score-label"><span>Overall estimated band</span><span>${store.attempts.length}/4 sections</span></div>
          <div class="big">${overall ?? '—'} <small>/ 9</small></div>
          <div class="meter"><i style="width:${Math.min(100, (store.attempts.length / 4) * 100)}%"></i></div>
          ${weakest ? `<p class="micro" style="margin-top:10px">Weakest so far: <strong style="color:var(--coral);text-transform:capitalize">${weakest}</strong></p>` : ''}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header"><div><div class="eyebrow">How it works</div><h2>Four steps to a real improvement plan.</h2></div></div>
      <div class="feature-grid">
        <article class="feature"><div class="feature-icon">①</div><h3>Take the mock test</h3><p>Real IELTS structure and timing across all four skills — no shortcuts.</p></article>
        <article class="feature"><div class="feature-icon">②</div><h3>Get your band instantly</h3><p>Objective sections are scored on the official conversion table; Writing and Speaking are scored by an AI examiner using real band descriptors.</p></article>
        <article class="feature"><div class="feature-icon">③</div><h3>See your exact mistakes</h3><p>Every wrong answer is saved with what you answered vs. the correct one, so you know precisely where points were lost.</p></article>
        <article class="feature"><div class="feature-icon">④</div><h3>Ask your AI Coach</h3><p>Get a personalised study plan based on your actual weakest skill and repeated mistake patterns — not generic advice.</p></article>
      </div>
    </section>

    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Full mock exam</div><h2>Choose a section.</h2></div></div>
      <div class="library">${cards.map(c => `
        <article class="test-card">
          <div class="test-meta"><span>${c.title}</span><span>${store.attempts.some(a => a.section === c.key) ? 'Done' : 'Not started'}</span></div>
          <h3>${c.title}</h3>
          <span class="pill">${c.meta}</span>
          <div class="test-meta" style="margin-top:20px"><span></span><button class="btn btn-primary" style="padding:7px 14px;font-size:12.5px" data-go="${c.href}">Start ↗</button></div>
        </article>`).join('')}</div>
    </section>

    <section class="section">
      <div class="glass" style="padding:32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px">
        <div>
          <div class="eyebrow">Your next step</div>
          <h2 style="font-family:var(--font-display);font-size:22px;margin:8px 0 6px">${weakest ? `Work on your ${weakest} with the AI Coach` : 'Finish a section to unlock coaching'}</h2>
          <p style="color:var(--muted);font-size:14px;margin:0">${store.mistakes.length ? `You have ${store.mistakes.length} saved mistakes ready to review.` : 'Complete a section and your mistakes will show up here automatically.'}</p>
        </div>
        <button class="btn btn-primary" data-go="/coach">Talk to AI Coach ↗</button>
      </div>
    </section>`, '');
}

/* ---------------- LISTENING ---------------- */
let listeningState = { partIndex: 0, answers: {}, played: {}, deadline: null };
function listening() {
  const test = CONTENT.listening;
  if (!listeningState.deadline) listeningState.deadline = Date.now() + 30 * 60000;
  const part = test.parts[listeningState.partIndex];
  const played = listeningState.played[part.id];
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Listening · ${part.title}</span><span class="timer" data-timer>--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 20px">Part ${part.partNumber} of 4</h1>
      <div class="glass" style="padding:24px;margin-bottom:20px">
        <p style="color:var(--muted);font-size:14px;margin-bottom:14px">${part.instructions}</p>
        <button class="btn ${played ? 'btn-ghost' : 'btn-primary'}" data-play-part ${played ? 'disabled' : ''}>${played ? '✓ Played' : '▶ Play recording'}</button>
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
        ${listeningState.partIndex > 0 ? '<button class="btn btn-ghost" data-l-prev>← Previous part</button>' : ''}
        ${listeningState.partIndex < 3 ? '<button class="btn btn-primary" data-l-next>Next part ↗</button>' : '<button class="btn btn-primary" data-l-submit>Submit Listening ↗</button>'}
      </div>
    </section>`, 'listening');
}

/* ---------------- READING ---------------- */
let readingState = { passageIndex: 0, answers: {}, deadline: null };
function reading() {
  const test = CONTENT.reading;
  if (!readingState.deadline) readingState.deadline = Date.now() + 60 * 60000;
  const passage = test.passages[readingState.passageIndex];
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Reading · Passage ${passage.passageNumber} of 3 · ${passage.difficulty}</span><span class="timer" data-timer>--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:26px;margin:10px 0 20px">${passage.title}</h1>
      <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:20px">
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
        ${readingState.passageIndex > 0 ? '<button class="btn btn-ghost" data-r-prev>← Previous passage</button>' : ''}
        ${readingState.passageIndex < 2 ? '<button class="btn btn-primary" data-r-next>Next passage ↗</button>' : '<button class="btn btn-primary" data-r-submit>Submit Reading ↗</button>'}
      </div>
    </section>`, 'reading');
}

/* ---------------- WRITING ---------------- */
let writingState = { answers: {}, deadline: null };
function writing() {
  const test = CONTENT.writing;
  if (!writingState.deadline) writingState.deadline = Date.now() + 60 * 60000;
  return shell(`
    <section class="section">
      <div class="test-top"><span class="eyebrow">Writing · Task 1 & Task 2</span><span class="timer" data-timer>--:--</span></div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 24px">60 minutes total</h1>
      ${test.tasks.map((t, i) => `
        <div class="glass" style="padding:22px;margin-bottom:18px">
          <p class="eyebrow" style="margin-bottom:8px">${t.title} · ${t.minutes} min · min ${t.minWords} words</p>
          <p style="font-size:14.5px;line-height:1.6">${t.prompt}</p>
          ${t.chartData ? `<pre style="white-space:pre-wrap;font-size:12.5px;color:var(--muted);background:rgba(255,255,255,0.03);padding:12px;border-radius:10px">${esc(t.chartData)}</pre>` : ''}
          <textarea data-w-text="${i}" placeholder="Write your response here..." style="width:100%;min-height:180px;margin-top:14px;background:rgba(255,255,255,0.03);border:1px solid var(--panel-border);border-radius:12px;color:var(--text);padding:14px;font-family:var(--font-body);font-size:14px">${esc(writingState.answers[i] || '')}</textarea>
          <p class="micro word-count-${i}">${(writingState.answers[i] || '').trim() ? writingState.answers[i].trim().split(/\s+/).length : 0} words</p>
        </div>`).join('')}
      <button class="btn btn-primary" data-w-submit>Submit for AI grading ↗</button>
      <div id="writing-result"></div>
    </section>`, 'writing');
}

/* ---------------- SPEAKING ---------------- */
let speakingState = { partIndex: 0, transcripts: { sp1: [], sp2: '', sp3: [] } };
function speaking() {
  const test = CONTENT.speaking;
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
        ${speakingState.partIndex < 2 ? '<button class="btn btn-primary" data-sp-next>Next part ↗</button>' : '<button class="btn btn-primary" data-sp-submit>Finish & get AI score ↗</button>'}
      </div>
      <div id="speaking-result"></div>
    </section>`, 'speaking');
}

/* ---------------- MISTAKES ---------------- */
function mistakes() {
  const groups = { listening: [], reading: [] };
  store.mistakes.forEach(m => { if (groups[m.section]) groups[m.section].push(m); });
  const sections = ['listening', 'reading'];
  return shell(`
    <section class="section">
      <div class="eyebrow">Mistake Notebook</div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 10px">Your misses, made useful.</h1>
      <p style="color:var(--muted);font-size:14.5px;margin-bottom:26px">Every question you got wrong on Listening or Reading is saved here with your answer and the correct one. Writing and Speaking feedback appears right after each AI grading.</p>
      ${sections.every(s => groups[s].length === 0) ? `
        <div class="glass" style="padding:30px;text-align:center">
          <p style="color:var(--muted)">No mistakes recorded yet. Complete a Listening or Reading section to see them here.</p>
        </div>` : sections.map(s => groups[s].length ? `
        <h2 style="font-family:var(--font-display);font-size:19px;margin:24px 0 12px;text-transform:capitalize">${s} (${groups[s].length})</h2>
        <div style="display:flex;flex-direction:column;gap:10px">${groups[s].map(m => `
          <div class="glass" style="padding:16px 18px">
            <p style="margin:0 0 8px;font-size:14px">${esc(m.prompt)}</p>
            <p style="margin:0;font-size:13px;color:var(--muted)">Your answer: <span style="color:var(--coral)">${esc(m.given || '(no answer)')}</span> · Correct: <span style="color:var(--cyan)">${esc(m.correct)}</span></p>
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
      <div class="eyebrow">AI Coach</div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 20px">A coach that knows your results.</h1>
      <div class="glass" style="padding:10px 18px;margin-bottom:16px;font-size:13.5px;color:var(--muted)">
        Overall band: <strong style="color:var(--text)">${overall ?? 'not assessed yet'}</strong> · Weakest skill: <strong style="color:var(--text);text-transform:capitalize">${weakest ?? 'complete a section first'}</strong> · Saved mistakes: <strong style="color:var(--text)">${store.mistakes.length}</strong>
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
  const rows = Object.entries(feedback.criteria || {}).map(([k, v]) => `<div class="score-label"><span>${k.replace(/([A-Z])/g, ' $1')}</span><strong>${v}</strong></div>`).join('');
  const str = (feedback.strengths || []).map(s => `<li>${esc(s)}</li>`).join('');
  const imp = (feedback.improvements || []).map(s => `<li>${esc(s)}</li>`).join('');
  return `<div class="glass" style="padding:24px;margin-top:20px">
    <p class="eyebrow">AI Examiner Result</p>
    <div class="big" style="margin:10px 0">${feedback.band} <small>/ 9</small></div>
    ${rows}
    <p style="color:var(--muted);font-size:14px;margin:16px 0">${esc(feedback.summary || '')}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div><p class="eyebrow">Strengths</p><ul style="font-size:13.5px;line-height:1.7">${str}</ul></div>
      <div><p class="eyebrow">To improve</p><ul style="font-size:13.5px;line-height:1.7">${imp}</ul></div>
    </div>
  </div>`;
}

function recordMistakes(section, questions, answers, keyFn) {
  questions.forEach((q, i) => {
    const given = answers[keyFn(i)];
    if (!SERVICES.isCorrect(q, given)) {
      store.mistakes.push({ section, prompt: q.prompt, given, correct: q.options ? q.options[q.answer] : q.answer, date: Date.now() });
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
    if (remaining <= 0) {
      clearInterval(timerInterval);
      notify('Time is up. Submitting automatically.');
      onExpire();
    }
  };
  tick();
  timerInterval = setInterval(tick, 1000);
}

/* ---------------- BIND ---------------- */
function bind() {
  document.querySelectorAll('[data-go]').forEach(el => el.onclick = () => go(el.dataset.go));

  const r = route();

  if (r === '/listening') {
    startTimer(() => listeningState.deadline, submitListening);
    const playBtn = document.querySelector('[data-play-part]');
    if (playBtn) playBtn.onclick = () => {
      if (!window.speechSynthesis) return notify('Audio not supported in this browser');
      const part = CONTENT.listening.parts[listeningState.partIndex];
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(part.transcript);
      utter.rate = 0.95;
      playBtn.disabled = true; playBtn.textContent = 'Playing…';
      utter.onend = () => { listeningState.played[part.id] = true; playBtn.textContent = '✓ Played'; };
      utter.onerror = () => { playBtn.disabled = false; playBtn.textContent = '▶ Play recording'; notify('Playback issue — try again'); };
      window.speechSynthesis.speak(utter);
    };
    document.querySelectorAll('[data-l-answer]').forEach(el => el.onclick = () => {
      const part = CONTENT.listening.parts[listeningState.partIndex];
      const globalIndex = (part.partNumber - 1) * 10 + Number(el.dataset.lAnswer);
      listeningState.answers[globalIndex] = el.dataset.value;
      render();
    });
    document.querySelectorAll('[data-l-text]').forEach(el => el.onchange = () => {
      const part = CONTENT.listening.parts[listeningState.partIndex];
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
      render();
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
      if (label) label.textContent = `${words} words`;
    });
    const wSubmit = document.querySelector('[data-w-submit]');
    if (wSubmit) wSubmit.onclick = async () => {
      const tasks = CONTENT.writing.tasks;
      const combinedPrompt = tasks.map(t => `${t.title}: ${t.prompt}`).join('\n\n');
      const combinedResponse = tasks.map((t, i) => `[${t.title}]\n${writingState.answers[i] || '(no answer)'}`).join('\n\n');
      wSubmit.disabled = true; wSubmit.textContent = 'AI examiner is grading…';
      try {
        const res = await fetch('/api/grade', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'writing', prompt: combinedPrompt, response: combinedResponse })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Grading failed');
        store.attempts.push({ section: 'writing', band: data.band, date: Date.now() });
        save();
        clearInterval(timerInterval);
        document.querySelector('#writing-result').innerHTML = aiFeedbackBlock(data);
      } catch (err) {
        notify(`Error: ${err.message}`);
      } finally {
        wSubmit.disabled = false; wSubmit.textContent = 'Submit for AI grading ↗';
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
        const part = CONTENT.speaking.parts[speakingState.partIndex];
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
      const allText = [...speakingState.transcripts.sp1, speakingState.transcripts.sp2, ...speakingState.transcripts.sp3].filter(Boolean).join('\n\n');
      if (!allText) return notify('Please record at least one answer first');
      spSubmit.disabled = true; spSubmit.textContent = 'AI examiner is grading…';
      try {
        const res = await fetch('/api/grade', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'speaking', prompt: 'IELTS Speaking Parts 1-3', response: allText })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Grading failed');
        store.attempts.push({ section: 'speaking', band: data.band, date: Date.now() });
        save();
        document.querySelector('#speaking-result').innerHTML = aiFeedbackBlock(data);
      } catch (err) {
        notify(`Error: ${err.message}`);
      } finally {
        spSubmit.disabled = false; spSubmit.textContent = 'Finish & get AI score ↗';
      }
    };
    const cueFlow = document.querySelector('#speaking-cue-flow');
    if (cueFlow) {
      cueFlow.innerHTML = `<button class="btn btn-primary" style="margin-top:16px" data-sp2-start>Start 1-minute prep</button><p class="micro" data-sp2-status></p>`;
      const startBtn = cueFlow.querySelector('[data-sp2-start]');
      startBtn.onclick = () => {
        let prep = 60;
        startBtn.disabled = true;
        const status = cueFlow.querySelector('[data-sp2-status]');
        const prepTimer = setInterval(() => {
          prep--; status.textContent = `Prep time: ${prep}s`;
          if (prep <= 0) { clearInterval(prepTimer); startRecordingPart2(); }
        }, 1000);
      };
      function startRecordingPart2() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const status = cueFlow.querySelector('[data-sp2-status]');
        if (!SR) { notify('Speech recognition not supported'); return; }
        const recognition = new SR();
        recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true;
        recognition.onresult = (e) => {
          let finalText = '';
          for (let i = 0; i < e.results.length; i++) finalText += e.results[i][0].transcript + ' ';
          speakingState.transcripts.sp2 = finalText.trim();
        };
        recognition.start();
        status.textContent = '🔴 Recording… speak now (2 minutes)';
        let talk = 120;
        const talkTimer = setInterval(() => {
          talk--; status.textContent = `🔴 Recording… ${talk}s left`;
          if (talk <= 0) { clearInterval(talkTimer); recognition.stop(); status.textContent = '✓ Recorded. Click Next part when ready.'; }
        }, 1000);
      }
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
            profile: { band: bandAverage(), weakest: weakestSkill(), mistakeCount: store.mistakes.length }
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
}

function submitListening() {
  const allQuestions = CONTENT.listening.parts.flatMap(p => p.questions);
  recordMistakes('listening', allQuestions, listeningState.answers, i => i);
  const correct = allQuestions.filter((q, i) => SERVICES.isCorrect(q, listeningState.answers[i])).length;
  const band = SERVICES.bandFromRaw(correct, allQuestions.length);
  store.attempts.push({ section: 'listening', band, raw: correct, total: allQuestions.length, date: Date.now() });
  save();
  clearInterval(timerInterval);
  notify(`Listening complete: Band ${band} (${correct}/${allQuestions.length})`);
  listeningState = { partIndex: 0, answers: {}, played: {}, deadline: null };
  go('/mistakes');
}

function submitReading() {
  let correct = 0, total = 0;
  CONTENT.reading.passages.forEach((p, pi) => {
    recordMistakes('reading', p.questions, readingState.answers, qi => `${pi}-${qi}`);
    p.questions.forEach((q, qi) => { total++; if (SERVICES.isCorrect(q, readingState.answers[`${pi}-${qi}`])) correct++; });
  });
  const band = SERVICES.bandFromRaw(correct, total);
  store.attempts.push({ section: 'reading', band, raw: correct, total, date: Date.now() });
  save();
  clearInterval(timerInterval);
  notify(`Reading complete: Band ${band} (${correct}/${total})`);
  readingState = { passageIndex: 0, answers: {}, deadline: null };
  go('/mistakes');
}

function render() {
  const r = route();
  if (r === '/') app.innerHTML = home();
  else if (r === '/listening') app.innerHTML = listening();
  else if (r === '/reading') app.innerHTML = reading();
  else if (r === '/writing') app.innerHTML = writing();
  else if (r === '/speaking') app.innerHTML = speaking();
  else if (r === '/mistakes') app.innerHTML = mistakes();
  else if (r === '/coach') app.innerHTML = coach();
  else app.innerHTML = home();
  bind();
  const msgBox = document.querySelector('#coach-messages');
  if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
}

window.addEventListener('hashchange', render);
render();