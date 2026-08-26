const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const CONTENT = window.IELTS_CONTENT;
const SERVICES = window.IELTS_SERVICES;
const STORAGE = 'ielts-v2-store';

let store = load();
function load() { try { return { ...{ attempts: [] }, ...JSON.parse(localStorage.getItem(STORAGE)) }; } catch { return { attempts: [] }; } }
function save() { localStorage.setItem(STORAGE, JSON.stringify(store)); }
function go(path) { location.hash = path; }
function route() { return location.hash.slice(1) || '/'; }
function esc(v) { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function notify(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }

function shell(body, active) {
  return `<div class="shell"><nav class="nav"><a class="brand" href="#/"><span class="brand-mark">B</span>IELTS Mock</a>
    <div class="nav-links">
      <a class="${active === 'listening' ? 'active' : ''}" href="#/listening">Listening</a>
      <a class="${active === 'reading' ? 'active' : ''}" href="#/reading">Reading</a>
      <a class="${active === 'writing' ? 'active' : ''}" href="#/writing">Writing</a>
      <a class="${active === 'speaking' ? 'active' : ''}" href="#/speaking">Speaking</a>
    </div>
    <div class="nav-actions"><span class="avatar">AM</span></div>
  </nav>${body}</div>`;
}

function home() {
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
        <h1>Practice IELTS<br>like it's <span>test day.</span></h1>
        <p class="hero-copy">Real exam structure, real timing, and an AI examiner that scores your Writing and Speaking against official band criteria.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-go="/listening">Start with Listening</button>
          <button class="btn btn-ghost" data-go="/reading">Browse tests</button>
        </div>
        <p class="micro">Practice estimates only · Not affiliated with or endorsed by IELTS, British Council, IDP, or Cambridge</p>
      </div>
      <div class="preview-wrap">
        <div class="glass score-card">
          <div class="score-label"><span>Sections completed</span><span>${store.attempts.length}/4</span></div>
          <div class="big">${store.attempts.length ? (store.attempts.reduce((s, a) => s + a.band, 0) / store.attempts.length).toFixed(1) : '—'} <small>/ 9</small></div>
          <div class="meter"><i style="width:${Math.min(100, store.attempts.length * 25)}%"></i></div>
        </div>
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
    </section>`, '');
}

/* ---------------- LISTENING ---------------- */
let listeningState = { partIndex: 0, answers: {}, played: {} };
function listening() {
  const test = CONTENT.listening;
  const part = test.parts[listeningState.partIndex];
  const played = listeningState.played[part.id];
  return shell(`
    <section class="section">
      <div class="eyebrow">Listening · ${part.title}</div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 20px">Part ${part.partNumber} of 4</h1>
      <div class="glass" style="padding:24px;margin-bottom:20px">
        <p style="color:var(--muted);font-size:14px;margin-bottom:14px">${part.instructions}</p>
        <button class="btn ${played ? 'btn-ghost' : 'btn-primary'}" data-play-part ${played ? 'disabled' : ''}>${played ? '✓ Played once' : '▶ Play recording'}</button>
        ${!played ? '<p class="micro">Put on headphones. This plays only once, exactly like the real test.</p>' : ''}
      </div>
      ${played ? `<div style="display:flex;flex-direction:column;gap:16px">${part.questions.map((q, i) => `
        <div class="glass" style="padding:18px 20px">
          <p style="margin:0 0 10px;font-size:14.5px">${part.partNumber === 1 || part.partNumber === 2 || part.partNumber === 4 ? '' : ''}Q${part.questions.indexOf(q) + 1 + (part.partNumber - 1) * 10}. ${q.prompt}</p>
          ${q.type === 'multiple-choice'
            ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${q.options.map((opt, oi) => `<button class="btn btn-ghost" style="font-size:13px" data-l-answer="${i}" data-value="${oi}">${String.fromCharCode(65 + oi)}. ${opt}</button>`).join('')}</div>`
            : `<input class="btn btn-ghost" style="width:220px;text-align:left" data-l-text="${i}" placeholder="Your answer">`}
        </div>`).join('')}</div>
      <div style="margin-top:24px;display:flex;gap:12px">
        ${listeningState.partIndex < 3 ? '<button class="btn btn-primary" data-l-next>Next part ↗</button>' : '<button class="btn btn-primary" data-l-submit>Submit Listening ↗</button>'}
      </div>` : ''}
    </section>`, 'listening');
}

/* ---------------- READING ---------------- */
let readingState = { passageIndex: 0, answers: {} };
function reading() {
  const test = CONTENT.reading;
  const passage = test.passages[readingState.passageIndex];
  return shell(`
    <section class="section">
      <div class="eyebrow">Reading · Passage ${passage.passageNumber} of 3 · ${passage.difficulty}</div>
      <h1 style="font-family:var(--font-display);font-size:26px;margin:10px 0 20px">${passage.title}</h1>
      <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:20px">
        <div class="glass" style="padding:22px;max-height:560px;overflow-y:auto;font-size:14px;line-height:1.7;white-space:pre-line">${passage.text}</div>
        <div style="display:flex;flex-direction:column;gap:12px;max-height:560px;overflow-y:auto">
          ${passage.questions.map((q, i) => `
            <div class="glass" style="padding:14px 16px">
              <p style="margin:0 0 8px;font-size:13.5px">${q.prompt}</p>
              ${q.type === 'true-false-not-given'
                ? `<div style="display:flex;gap:6px">${['TRUE', 'FALSE', 'NOT GIVEN'].map(v => `<button class="btn btn-ghost" style="font-size:11.5px;padding:6px 10px" data-r-answer="${i}" data-value="${v}">${v}</button>`).join('')}</div>`
                : q.type === 'multiple-choice'
                ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${q.options.map((opt, oi) => `<button class="btn btn-ghost" style="font-size:11.5px" data-r-answer="${i}" data-value="${oi}">${String.fromCharCode(65 + oi)}</button>`).join('')}</div>`
                : `<input class="btn btn-ghost" style="width:100%;text-align:left" data-r-text="${i}" placeholder="Your answer">`}
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
let writingState = { answers: {} };
function writing() {
  const test = CONTENT.writing;
  return shell(`
    <section class="section">
      <div class="eyebrow">Writing · ${test.duration} minutes total</div>
      <h1 style="font-family:var(--font-display);font-size:28px;margin:10px 0 24px">Task 1 & Task 2</h1>
      ${test.tasks.map((t, i) => `
        <div class="glass" style="padding:22px;margin-bottom:18px">
          <p class="eyebrow" style="margin-bottom:8px">${t.title} · ${t.minutes} min · min ${t.minWords} words</p>
          <p style="font-size:14.5px;line-height:1.6">${t.prompt}</p>
          ${t.chartData ? `<pre style="white-space:pre-wrap;font-size:12.5px;color:var(--muted);background:rgba(255,255,255,0.03);padding:12px;border-radius:10px">${esc(t.chartData)}</pre>` : ''}
          <textarea data-w-text="${i}" placeholder="Write your response here..." style="width:100%;min-height:180px;margin-top:14px;background:rgba(255,255,255,0.03);border:1px solid var(--panel-border);border-radius:12px;color:var(--text);padding:14px;font-family:var(--font-body);font-size:14px"></textarea>
          <p class="micro word-count-${i}">0 words</p>
        </div>`).join('')}
      <button class="btn btn-primary" data-w-submit>Submit for AI grading ↗</button>
      <div id="writing-result"></div>
    </section>`, 'writing');
}

/* ---------------- SPEAKING ---------------- */
let speakingState = { partIndex: 0, transcripts: { sp1: [], sp2: '', sp3: [] }, recording: false };
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

/* ---------------- BIND ---------------- */
function bind() {
  document.querySelectorAll('[data-go]').forEach(el => el.onclick = () => go(el.dataset.go));

  // Listening
  const playBtn = document.querySelector('[data-play-part]');
  if (playBtn) playBtn.onclick = () => {
    if (!window.speechSynthesis) return notify('Audio not supported in this browser');
    const part = CONTENT.listening.parts[listeningState.partIndex];
    const utter = new SpeechSynthesisUtterance(part.transcript);
    utter.rate = 0.95;
    playBtn.disabled = true; playBtn.textContent = 'Playing…';
    utter.onend = () => { listeningState.played[part.id] = true; render(); };
    window.speechSynthesis.speak(utter);
  };
  document.querySelectorAll('[data-l-answer]').forEach(el => el.onclick = () => {
    const globalIndex = listeningState.partIndex * 10 + Number(el.dataset.lAnswer);
    listeningState.answers[globalIndex] = el.dataset.value;
    render();
  });
  document.querySelectorAll('[data-l-text]').forEach(el => el.onchange = () => {
    const globalIndex = listeningState.partIndex * 10 + Number(el.dataset.lText);
    listeningState.answers[globalIndex] = el.value;
  });
  const lNext = document.querySelector('[data-l-next]');
  if (lNext) lNext.onclick = () => { listeningState.partIndex++; render(); };
  const lSubmit = document.querySelector('[data-l-submit]');
  if (lSubmit) lSubmit.onclick = () => {
    const allQuestions = CONTENT.listening.parts.flatMap(p => p.questions);
    const correct = allQuestions.filter((q, i) => SERVICES.isCorrect(q, listeningState.answers[i])).length;
    const band = SERVICES.bandFromRaw(correct, allQuestions.length);
    store.attempts.push({ section: 'listening', band, raw: correct, total: allQuestions.length, date: Date.now() });
    save();
    notify(`Listening complete: Band ${band} (${correct}/${allQuestions.length})`);
    listeningState = { partIndex: 0, answers: {}, played: {} };
    go('/');
  };

  // Reading
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
  if (rSubmit) rSubmit.onclick = () => {
    let correct = 0, total = 0;
    CONTENT.reading.passages.forEach((p, pi) => p.questions.forEach((q, qi) => {
      total++;
      if (SERVICES.isCorrect(q, readingState.answers[`${pi}-${qi}`])) correct++;
    }));
    const band = SERVICES.bandFromRaw(correct, total);
    store.attempts.push({ section: 'reading', band, raw: correct, total, date: Date.now() });
    save();
    notify(`Reading complete: Band ${band} (${correct}/${total})`);
    readingState = { passageIndex: 0, answers: {} };
    go('/');
  };

  // Writing
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
      document.querySelector('#writing-result').innerHTML = aiFeedbackBlock(data);
    } catch (err) {
      notify(`Error: ${err.message}`);
    } finally {
      wSubmit.disabled = false; wSubmit.textContent = 'Submit for AI grading ↗';
    }
  };

  // Speaking
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
    const allText = [
      ...speakingState.transcripts.sp1,
      speakingState.transcripts.sp2,
      ...speakingState.transcripts.sp3
    ].filter(Boolean).join('\n\n');
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

  // Speaking part 2 cue card flow (prep timer -> record)
  const cueFlow = document.querySelector('#speaking-cue-flow');
  if (cueFlow) {
    cueFlow.innerHTML = `<button class="btn btn-primary" style="margin-top:16px" data-sp2-start>Start 1-minute prep</button><p class="micro" data-sp2-status></p>`;
    const startBtn = cueFlow.querySelector('[data-sp2-start]');
    startBtn.onclick = () => {
      let prep = 60;
      startBtn.disabled = true;
      const status = cueFlow.querySelector('[data-sp2-status]');
      const prepTimer = setInterval(() => {
        prep--;
        status.textContent = `Prep time: ${prep}s`;
        if (prep <= 0) {
          clearInterval(prepTimer);
          startRecordingPart2();
        }
      }, 1000);
    };
    function startRecordingPart2() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const status = cueFlow.querySelector('[data-sp2-status]');
      if (!SR) { notify('Speech recognition not supported'); return; }
      const recognition = new SR();
      recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true;
      let finalText = '';
      recognition.onresult = (e) => {
        finalText = '';
        for (let i = 0; i < e.results.length; i++) finalText += e.results[i][0].transcript + ' ';
        speakingState.transcripts.sp2 = finalText.trim();
      };
      recognition.start();
      status.textContent = '🔴 Recording… speak now (2 minutes)';
      let talk = 120;
      const talkTimer = setInterval(() => {
        talk--;
        status.textContent = `🔴 Recording… ${talk}s left`;
        if (talk <= 0) { clearInterval(talkTimer); recognition.stop(); status.textContent = '✓ Recorded. Click Next part when ready.'; }
      }, 1000);
    }
  }
}

function render() {
  const r = route();
  if (r === '/') app.innerHTML = home();
  else if (r === '/listening') app.innerHTML = listening();
  else if (r === '/reading') app.innerHTML = reading();
  else if (r === '/writing') app.innerHTML = writing();
  else if (r === '/speaking') app.innerHTML = speaking();
  else app.innerHTML = home();
  bind();
}

window.addEventListener('hashchange', render);
render();