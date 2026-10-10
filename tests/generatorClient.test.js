/* ===================================================================
 * 1-Click AI Generator — the browser orchestration
 *
 * The endpoint tests live in generator.test.js. This suite boots the
 * real mockGenerator.js against a tiny fake DOM and walks the whole
 * admin journey:
 *
 *   open the modal → the four progress steps appear → "Generatsiya
 *   qilish" → nine chunk calls (Listening parts 1–4, Reading passages
 *   1–3, Writing, Speaking) one after another, four TTS calls, five
 *   media uploads, four adminSaveTest calls and one adminSaveTestMeta
 *   call → the summary with the per-skill counts.
 *
 * It also pins the behaviours that matter most in production:
 *   • a failure in one section stops the run, marks that step as failed
 *     and keeps everything already saved
 *   • a Groq rate limit (HTTP 429, RATE_LIMITED) is NOT an error: the
 *     modal waits (exponential backoff, a countdown in the status line)
 *     and sends the same chunk again; only an exhausted or daily quota
 *     stops the run, with a plain message
 *   • anything the admin types is escaped before it reaches innerHTML
 * =================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(root + p, 'utf8');

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

/* ------------------------------------------------------------------ */
/* A DOM that is just big enough for the modal                        */
/* ------------------------------------------------------------------ */
class El {
  constructor(tagName, attrs) {
    this.tagName = tagName;
    this.attrs = attrs || {};
    this.children = [];
    this.parentNode = null;
    this.onclick = null;
    this.oninput = null;
    this.onchange = null;
    this._listeners = {};
    this._value = undefined;
    this.disabled = false;
    this.style = {};
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  get value() { return this._value !== undefined ? this._value : (this.attrs.value || ''); }
  set value(v) { this._value = v; }
  getAttribute(name) { return this.attrs[name] !== undefined ? this.attrs[name] : null; }
  setAttribute(name, v) { this.attrs[name] = String(v); }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  dispatch(type, event) {
    const arg = event || {};
    (this._listeners[type] || []).forEach(fn => fn(arg));
    const handler = this['on' + type];
    if (typeof handler === 'function') handler(arg);
  }
  click() { this.dispatch('click', { target: this }); }
  focus() {}
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    this.children = this.children.filter(c => c !== child);
    child.parentNode = null;
    return child;
  }
  get innerHTML() { return this._html || ''; }
  set innerHTML(html) {
    this._html = String(html);
    this.children = parseChildren(String(html), this);
  }
  querySelectorAll(selector) { return descendants(this).filter(el => matches(el, selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  descendants() { return descendants(this); }
}

function parseAttrs(text) {
  const attrs = {};
  const re = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(text || ''))) {
    if (!m[1]) break;
    attrs[m[1]] = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : ''));
  }
  return attrs;
}

function parseChildren(html, parent) {
  const out = [];
  const stack = [{ el: parent, tag: null }];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const el = new El(tag, parseAttrs(m[3]));
    el.parentNode = stack[stack.length - 1].el;
    stack[stack.length - 1].el.children.push(el);
    out.push(el);
    const voids = ['input', 'br', 'img', 'hr', 'meta', 'link', 'source'];
    if (m[4] !== '/' && !voids.includes(tag)) stack.push({ el, tag });
  }
  return out;
}

function descendants(el) {
  const out = [];
  (el.children || []).forEach(child => {
    out.push(child);
    descendants(child).forEach(x => out.push(x));
  });
  return out;
}

function matches(el, selector) {
  if (selector.startsWith('[')) return el.attrs[selector.slice(1, -1)] !== undefined;
  if (selector.startsWith('#')) return el.attrs.id === selector.slice(1);
  if (selector.startsWith('.')) return String(el.attrs.class || '').split(/\s+/).includes(selector.slice(1));
  return el.tagName === selector;
}

/* ------------------------------------------------------------------ */
/* Fake canvas (the Task 1 chart renderer)                            */
/* ------------------------------------------------------------------ */
function fakeContext() {
  const noop = () => {};
  return {
    fillStyle: '', strokeStyle: '', font: '', lineWidth: 1, textAlign: 'left',
    fillRect: noop, strokeRect: noop, clearRect: noop, beginPath: noop, closePath: noop, moveTo: noop, fillText: noop, strokeText: noop,
    lineTo: noop, stroke: noop, fill: noop, arc: noop, rect: noop, save: noop, restore: noop,
    measureText: (text) => ({ width: String(text).length * 7 })
  };
}

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */
const document = {
  body: new El('body', {}),
  createElement: (tag) => {
    if (tag === 'canvas') {
      const canvas = new El('canvas', {});
      canvas.width = 0;
      canvas.height = 0;
      canvas.getContext = () => fakeContext();
      canvas.toBlob = (cb) => cb(new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }));
      return canvas;
    }
    return new El(tag, {});
  }
};

const saved = { tests: [], meta: [], media: [], reloads: 0 };
const cloud = {
  getState: () => ({ status: 'ready', user: { id: 'admin-1' }, profile: { role: 'admin' }, isAdmin: true }),
  adminSaveTest: async (row) => { saved.tests.push(row); return row; },
  adminSaveTestMeta: async (row) => { saved.meta.push(row); return row; },
  adminUploadMedia: async (file, options) => {
    saved.media.push({ name: file.name, type: file.type, size: file.size, folder: options.folder });
    return { url: `https://demo.supabase.co/storage/v1/object/public/ielts-media/${options.folder}/${file.name}`, path: `${options.folder}/${file.name}` };
  },
  getAccessToken: async () => 'admin-jwt'
};

const window = {
  document,
  IELTS_CLOUD: cloud,
  addEventListener() {},
  location: { hash: '#/admin' }
};
global.window = window;
global.document = document;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
window.IELTS_ADMIN_HOOKS = {
  render() {},
  notify() {},
  go() {},
  reloadTests: () => { saved.reloads += 1; }
};

/* i18n + admin panel + topic pool + the generator itself */
new Function('window', 'document', 'localStorage', read('/i18n.js'))(window, document, global.localStorage);
new Function('window', 'document', 'localStorage', read('/admin.js'))(window, document, global.localStorage);
new Function('window', read('/lib/topicPool.js'))(window);
new Function('window', 'document', 'localStorage', read('/mockGenerator.js'))(window, document, global.localStorage);

const generator = window.IELTS_GENERATOR;
const adminPanel = window.IELTS_ADMIN;

/* ------------------------------------------------------------------ */
/* Canned endpoint answers                                            */
/* ------------------------------------------------------------------ */
const QUESTIONS_PER_PASSAGE = [13, 14, 13];

function listeningPart(n) {
  return {
    id: 'lp' + n, partNumber: n, title: 'Part ' + n,
    instructions: 'Questions 1–10.', transcript: 'Woman: ' + 'spoken words for the recording. '.repeat(20),
    audioUrl: '', audioPath: '',
    questions: Array.from({ length: 10 }, (_, i) => ({
      id: 'x', type: 'form-completion', prompt: `Q${i + 1} ______`, answer: 'words', explanation: 'said in the transcript'
    }))
  };
}

function readingPassage(n) {
  return {
    id: 'rp' + n, passageNumber: n, title: 'Passage ' + n, difficulty: 'Medium',
    text: 'Academic text. '.repeat(80),
    paragraphs: [{ label: 'A', text: 'Academic text. '.repeat(60) }],
    questions: Array.from({ length: QUESTIONS_PER_PASSAGE[n - 1] }, (_, i) => ({
      id: 'x', type: 'true-false-not-given', prompt: `R${i + 1}`, answer: 'TRUE', explanation: 'paragraph A'
    }))
  };
}

/* What the endpoint answers for one request. A request with `part` /
   `passage` is ONE chunk: a payload holding a single block plus `chunk`;
   anything else gets the whole skill, like the legacy endpoint path. */
function sectionAnswer(skill, request) {
  const body = request || {};
  if (skill === 'listening') {
    const numbers = body.part ? [Number(body.part)] : [1, 2, 3, 4];
    return {
      ok: true, skill, counts: { questions: numbers.length * 10, blocks: numbers.length },
      ...(body.part ? { chunk: { kind: 'part', number: Number(body.part), index: Number(body.part) - 1, total: 4 } } : {}),
      plan: { topics: { listening: 'Space exploration', reading: 'Marine biology', writing: 'Cognitive psychology', speaking: 'Urban architecture' } },
      payload: {
        id: 'listening-custom', title: '', skill: 'Listening', duration: 30,
        parts: numbers.map(listeningPart)
      }
    };
  }
  if (skill === 'reading') {
    const numbers = body.passage ? [Number(body.passage)] : [1, 2, 3];
    return {
      ok: true, skill,
      counts: { questions: numbers.reduce((sum, n) => sum + QUESTIONS_PER_PASSAGE[n - 1], 0), blocks: numbers.length },
      ...(body.passage ? { chunk: { kind: 'passage', number: Number(body.passage), index: Number(body.passage) - 1, total: 3 } } : {}),
      payload: {
        id: 'reading-custom', title: '', skill: 'Reading', duration: 60, format: 'Academic',
        passages: numbers.map(readingPassage)
      }
    };
  }
  if (skill === 'writing') {
    return {
      ok: true, skill, counts: { questions: 0, blocks: 2 },
      payload: {
        id: 'writing-custom', title: '', skill: 'Writing', format: 'Academic', duration: 60,
        tasks: [
          {
            id: 'w1', taskNumber: 1, title: 'Task 1', minutes: 20, minWords: 150,
            prompt: 'The chart below shows museum visitor numbers between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
            visualType: 'Bar chart', imageUrl: '', imagePath: '', chartData: 'A: 8, 12, 41, 33',
            chartSpec: {
              chartType: 'bar', title: 'Museum visitors', unit: 'thousands',
              labels: ['2015', '2019', '2021', '2025'],
              series: [{ name: 'Museum A', values: [8, 12, 41, 33] }]
            },
            criteria: 'Task Achievement · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy.'
          },
          {
            id: 'w2', taskNumber: 2, title: 'Task 2', minutes: 40, minWords: 250,
            prompt: 'Some people believe museums should be free. To what extent do you agree or disagree?',
            criteria: 'Task Response · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy.'
          }
        ]
      }
    };
  }
  return {
    ok: true, skill, counts: { questions: 0, blocks: 3 },
    payload: {
      id: 'speaking-custom', title: '', skill: 'Speaking', duration: 14,
      parts: [
        { id: 'sp1', partNumber: 1, title: 'Part 1', minutes: '4–5', topics: [
          { title: 'Museums', questions: ['Do you like museums?'] },
          { title: 'Your town', questions: ['Where do you live?'] },
          { title: 'Free time', questions: ['What do you do?'] }
        ], questions: [] },
        { id: 'sp2', partNumber: 2, title: 'Part 2', minutes: '3–4', prepSeconds: 60, talkSeconds: 120, topic: 'Describe a museum.', bullets: ['where it is', 'what you saw', 'and explain how you felt'] },
        { id: 'sp3', partNumber: 3, title: 'Part 3', minutes: '4–5', linkedTopic: 'museums', questions: ['Should museums be free?', 'How have museums changed?', 'Are museums still relevant?'] }
      ]
    }
  };
}

/* ------------------------------------------------------------------ */
/* Run                                                               */
/* ------------------------------------------------------------------ */
async function waitFor(predicate, label, timeout) {
  const limit = Date.now() + (timeout || 8000);
  while (Date.now() < limit) {
    let value = false;
    try { value = predicate(); } catch { value = false; }
    if (value) return true;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  console.log('   → timed out waiting for ' + label);
  return false;
}

(async () => {
  check('module: window.IELTS_GENERATOR is registered', !!generator && typeof generator.open === 'function');
  check('module: the admin panel exposes its editors to the generator',
    typeof adminPanel.openSkillEditor === 'function' && typeof adminPanel.nextTestId === 'function'
    || (adminPanel._internal && typeof adminPanel._internal.nextTestId === 'function'));

  /* ---------- 1. the modal renders the promised controls ---------- */
  generator.open({ testId: 'test9' });
  check('modal: it is mounted in the document', document.body.children.length === 1);
  const backdrop = document.body.children[0];
  check('modal: the backdrop exists', !!backdrop && !!backdrop.querySelector('#aiGenBackdrop'));
  const html = backdrop.innerHTML;
  check('modal: the label field is pre-filled with the next test number',
    /data-ai-label/.test(html) && /Practice Test 9/.test(html));
  check('modal: difficulty offers Standard and Hard',
    /data-ai-difficulty/.test(html) && /Standard IELTS/.test(html) && /Hard/.test(html));
  check('modal: the optional topic field is present', /data-ai-topic/.test(html));
  check('modal: the four IELTS steps are listed',
    (html.match(/class="ai-gen-step is-pending"/g) || []).length === 4);
  check('modal: the steps cover Listening, Reading, Writing and Speaking',
    html.indexOf('Listening') < html.indexOf('Reading')
    && html.indexOf('Reading') < html.indexOf('Writing')
    && html.indexOf('Writing') < html.indexOf('Speaking'));
  check('modal: the generate button is there', !!backdrop.querySelector('[data-ai-generate]'));
  check('modal: nothing is running yet', generator.state.running === false);

  /* ---------- 2. escaping ---------- */
  const topicField = backdrop.querySelector('[data-ai-topic]');
  topicField.value = '<img src=x onerror="alert(1)">';
  topicField.dispatch('input');
  const labelField = backdrop.querySelector('[data-ai-label]');
  labelField.value = '<script>alert(2)</script>'; /* proof of escaping below */
  labelField.dispatch('input');
  check('escape: typed markup is kept out of the rendered modal',
    generator.state.topic === topicField.value
    && !/<img src=x/.test(backdrop.innerHTML));

  /* ---------- 3. the full generation run ---------- */
  const calls = [];
  let inFlight = 0;
  let maxInFlight = 0;
  global.fetch = async (url, options) => {
    const target = String(url);
    const body = JSON.parse(options.body || '{}');
    calls.push(body);
    /* a real round trip takes time, so overlapping requests would be seen */
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise(resolve => setTimeout(resolve, 1));
    inFlight -= 1;
    if (body.mode === 'audio') {
      return { ok: true, status: 200, json: async () => ({ ok: true, audio: { source: 'edge-tts', mime: 'audio/mpeg', ext: 'mp3', bytes: 1234, base64: Buffer.from([0xff, 0xfb, 0x90]).toString('base64') }, storage: 'client' }) };
    }
    return { ok: true, status: 200, json: async () => sectionAnswer(body.skill, body) };
  };

  const difficulty = backdrop.querySelector('[data-ai-difficulty]');
  difficulty.value = 'hard';
  difficulty.dispatch('change');
  const topicInput = backdrop.querySelector('[data-ai-topic]');
  topicInput.value = '';
  topicInput.dispatch('input');
  labelField.value = 'Practice Test 9';
  labelField.dispatch('input');

  const generateButton = backdrop.querySelector('[data-ai-generate]');
  generateButton.click();

  check('run: it starts immediately', generator.state.running === true);
  check('run: Listening is the first active step', generator.state.steps.listening === 'active');

  const finished = await waitFor(() => !generator.state.running, 'the run to finish', 20000);
  check('run: the run finishes', finished);
  check('run: no error was reported', generator.state.error === '');

  const sectionCalls = calls.filter(c => c.mode !== 'audio');
  const skillCalls = sectionCalls.map(c => c.skill);
  check('run: the four sections were requested in IELTS order',
    JSON.stringify(skillCalls.filter((skill, i) => skillCalls.indexOf(skill) === i))
      === JSON.stringify(['listening', 'reading', 'writing', 'speaking']));
  check('run: every request is ONE chunk — Listening parts 1–4, Reading passages 1–3, Writing, Speaking',
    JSON.stringify(sectionCalls.map(c => c.skill + (c.part ? ':part' + c.part : '') + (c.passage ? ':passage' + c.passage : '')))
      === JSON.stringify(['listening:part1', 'listening:part2', 'listening:part3', 'listening:part4',
        'reading:passage1', 'reading:passage2', 'reading:passage3', 'writing', 'speaking']));
  check('run: each chunk is told how many questions the earlier chunks hold',
    JSON.stringify(sectionCalls.filter(c => c.skill === 'listening').map(c => c.questionOffset)) === JSON.stringify([0, 10, 20, 30])
    && JSON.stringify(sectionCalls.filter(c => c.skill === 'reading').map(c => c.questionOffset)) === JSON.stringify([0, 13, 27])
    && sectionCalls.filter(c => c.skill === 'writing' || c.skill === 'speaking').every(c => c.questionOffset === undefined));
  check('run: the chunks are asked for one at a time (never in parallel)', maxInFlight === 1);
  const audioCalls = calls.filter(c => c.mode === 'audio');
  check('run: one TTS request per Listening part', audioCalls.length === 4);
  check('run: every section was sent the same test id and label',
    calls.filter(c => c.mode !== 'audio').every(c => c.testId === 'test9' && c.label === 'Practice Test 9'));
  check('run: the chosen difficulty reached the endpoint',
    calls.filter(c => c.mode !== 'audio').every(c => c.difficulty === 'hard'));

  check('save: four skill rows were written through the admin client',
    saved.tests.length === 4 && saved.tests.map(r => r.skill).join(',') === 'listening,reading,writing,speaking');
  check('save: every row is published and belongs to test9',
    saved.tests.every(r => r.test_id === 'test9' && r.is_published === true));
  check('save: the meta row carries the label and difficulty',
    saved.meta.length === 1 && saved.meta[0].label === 'Practice Test 9'
    && saved.meta[0].difficulty === 'Hard' && saved.meta[0].is_published === true);
  check('media: four recordings and one chart were uploaded',
    saved.media.length === 5
    && saved.media.filter(m => m.folder === 'audio').length === 4
    && saved.media.filter(m => m.folder === 'images').length === 1);
  check('media: the chart upload is a PNG named after the test',
    saved.media[4].type === 'image/png' && /test9-writing-task1/.test(saved.media[4].name));

  const listeningRow = saved.tests.find(r => r.skill === 'listening');
  check('listening: every part got an audioUrl from the upload',
    listeningRow.payload.parts.every(p => /ielts-media\/audio\//.test(p.audioUrl || '') && p.audioPath));
  const listeningQuestions = listeningRow.payload.parts.flatMap(p => p.questions);
  check('listening: the four chunks are merged into one section — parts 1–4, ids l1…l40',
    listeningRow.payload.parts.map(p => p.partNumber).join(',') === '1,2,3,4'
    && listeningQuestions.length === 40
    && listeningQuestions.every((q, i) => q.id === 'l' + (i + 1)));
  const readingRow = saved.tests.find(r => r.skill === 'reading');
  const readingQuestions = readingRow.payload.passages.flatMap(p => p.questions);
  check('reading: the three chunks are merged into one section — passages 1–3 (13 + 14 + 13), ids r1…r40',
    readingRow.payload.passages.map(p => p.passageNumber).join(',') === '1,2,3'
    && readingRow.payload.passages.map(p => p.questions.length).join(',') === '13,14,13'
    && readingQuestions.every((q, i) => q.id === 'r' + (i + 1)));
  const writingRow = saved.tests.find(r => r.skill === 'writing');
  check('writing: Task 1 has the rendered chart image and keeps chartData',
    /ielts-media\/images\//.test(writingRow.payload.tasks[0].imageUrl || '')
    && writingRow.payload.tasks[0].chartData.length > 0);

  /* the saved payloads must be valid for the editor the admin will open */
  ['listening', 'reading', 'writing', 'speaking'].forEach(skill => {
    const row = saved.tests.find(r => r.skill === skill);
    const problems = adminPanel._internal.validatePayload(skill, row.payload);
    check('save: the ' + skill + ' payload passes the admin editor validator', problems.length === 0);
    if (problems.length) console.log('   →', problems.slice(0, 3).join(' · '));
  });

  check('hooks: learners get the republished content', saved.reloads === 1);

  const summary = backdrop.innerHTML;
  check('summary: the modal shows the per-skill counts and the editor buttons',
    /data-ai-open-editor/.test(summary) && /40/.test(summary));
  check('summary: all four steps are marked done',
    ['listening', 'reading', 'writing', 'speaking'].every(skill => generator.state.steps[skill] === 'done'));

  generator.close();
  check('close: the modal is removed from the document', document.body.children.length === 0);
  /* ---------- 3b. a hostile label is escaped on render ---------- */
  generator.open({ testId: 'test9', label: '<script>alert(2)</script>' });
  const hostileHtml = document.body.children[0].innerHTML;
  check('escape: a hostile label is escaped before it reaches innerHTML',
    hostileHtml.includes('&lt;script&gt;') && !hostileHtml.includes('<script>alert'));
  generator.close();

  /* ---------- 3d. the caller is told when the test is ready ---------- */
  const doneCalls = [];
  generator.close();
  generator.open({ testId: 'test12', label: 'Practice Test 12', onDone: (id) => doneCalls.push(id) });
  const doneBackdrop = document.body.children[0];
  doneBackdrop.querySelector('[data-ai-generate]').click();
  const doneRun = await waitFor(() => !generator.state.running, 'the callback run to finish', 20000);
  check('callback: a finished run reports the new test id to the caller',
    doneRun && doneCalls.length === 1 && doneCalls[0] === 'test12');
  generator.close();

  /* ---------- 3c. the publish checkbox and the overwrite warning ---------- */
  generator.open({ testId: 'test9', label: 'Practice Test 9' });
  const publishBox = document.body.children[0].querySelector('[data-ai-publish]');
  check('publish: the checkbox defaults to publishing the new test',
    !!publishBox && publishBox.attrs.checked === '' && generator.state.publish === true);
  check('warning: a brand new test id shows no overwrite warning',
    !/Bu test id allaqachon mavjud/.test(document.body.children[0].innerHTML));
  adminPanel.state.tests = { meta: [{ test_id: 'test9' }], tests: [] };
  generator.close();
  generator.open({ testId: 'test9', label: 'Practice Test 9' });
  check('warning: an existing test id warns that the run will overwrite it',
    /Bu test id allaqachon mavjud/.test(document.body.children[0].innerHTML));
  const draftBox = document.body.children[0].querySelector('[data-ai-publish]');
  draftBox.checked = false;
  draftBox.dispatch('change');
  check('publish: unchecking turns the run into a draft', generator.state.publish === false);

  const testsBeforeDraft = saved.tests.length;
  const metaBeforeDraft = saved.meta.length;
  const generate2 = document.body.children[0].querySelector('[data-ai-generate]');
  generate2.click();
  check('publish: the second run starts', generator.state.running === true);
  const draftFinished = await waitFor(() => !generator.state.running, 'the draft run to finish', 20000);
  check('publish: the draft run finishes', draftFinished && generator.state.error === '');
  const draftRows = saved.tests.slice(testsBeforeDraft);
  check('publish: every new row is saved as a draft',
    draftRows.length === 4 && draftRows.every(r => r.is_published === false));
  check('publish: the meta row of the draft run is unpublished too',
    saved.meta.length === metaBeforeDraft + 1 && saved.meta[metaBeforeDraft].is_published === false);
  generator.close();

  /* ---------- 4. a failing section keeps what was already saved ---------- */
  saved.tests.length = 0;
  saved.meta.length = 0;
  saved.media.length = 0;
  saved.reloads = 0;
  generator.open({ testId: 'test10' });
  const backdrop2 = document.body.children[0];
  const label2 = backdrop2.querySelector('[data-ai-label]');
  label2.value = 'Practice Test 10';
  label2.dispatch('input');

  const seen = [];
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body || '{}');
    if (body.mode !== 'audio') {
      seen.push(body.skill + (body.part ? ':part' + body.part : '') + (body.passage ? ':passage' + body.passage : ''));
      if (body.skill === 'reading') {
        return { ok: false, status: 502, json: async () => ({ ok: false, error: 'Groq API error (500): overloaded' }) };
      }
      return { ok: true, status: 200, json: async () => sectionAnswer(body.skill, body) };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, audio: { source: 'edge-tts', mime: 'audio/mpeg', ext: 'mp3', base64: '' }, storage: 'client' }) };
  };

  backdrop2.querySelector('[data-ai-generate]').click();
  const stopped = await waitFor(() => !generator.state.running, 'the failed run to stop', 20000);
  check('failure: the run stops', stopped);
  check('failure: the error message is shown to the admin',
    /Groq API error/.test(generator.state.error));
  check('failure: Reading is marked as failed',
    generator.state.steps.reading === 'error' && generator.state.steps.listening === 'done');
  check('failure: the sections generated before the failure are still saved',
    saved.tests.length === 1 && saved.tests[0].skill === 'listening');
  check('failure: no meta row is written for an incomplete test', saved.meta.length === 0);
  check('failure: no editor buttons are offered', !/data-ai-open-editor/.test(backdrop2.innerHTML));
  check('failure: an ordinary error is not retried — Reading Passage 1 was asked once and nothing came after it',
    seen.join(',') === 'listening:part1,listening:part2,listening:part3,listening:part4,reading:passage1');

  /* ---------- 4b. a Groq rate limit is waited out, never shown ---------- */
  const normalTiming = Object.assign({}, generator.timing);
  Object.assign(generator.timing, { maxRetries: 6, baseMs: 20, jitterMs: 0, maxWaitMs: 2000, maxHintMs: 5000, tickMs: 5 });

  const audioReply = () => ({
    ok: true, status: 200,
    json: async () => ({ ok: true, audio: { source: 'edge-tts', mime: 'audio/mpeg', ext: 'mp3', bytes: 3, base64: Buffer.from([0xff, 0xfb, 0x90]).toString('base64') }, storage: 'client' })
  });
  const rateLimitedReply = (retryAfterMs) => ({
    ok: false, status: 429,
    json: async () => ({
      ok: false, code: 'RATE_LIMITED',
      error: 'Groq rate limit reached (429) — try this section again in a moment.',
      message: "Groq bepul limiti vaqtincha to'ldi (429) — birozdan so'ng avtomatik qayta uriniladi.",
      retryAfterMs: retryAfterMs === undefined ? null : retryAfterMs,
      hint: 'Free-tier Groq keys allow only a few thousand tokens per minute.'
    })
  });
  /* a fake endpoint: `decide(body, attemptNumberForThatChunk)` may answer with
     a custom reply; returning nothing falls through to a normal success */
  function installEndpoint(decide) {
    const attempts = {};
    const log = [];
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body || '{}');
      if (body.mode === 'audio') return audioReply();
      const id = body.skill + (body.part ? ':part' + body.part : '') + (body.passage ? ':passage' + body.passage : '');
      attempts[id] = (attempts[id] || 0) + 1;
      log.push({ id, at: Date.now() });
      return decide(body, attempts[id], id) || { ok: true, status: 200, json: async () => sectionAnswer(body.skill, body) };
    };
    return { attempts, log };
  }
  function resetSaved() {
    saved.tests.length = 0; saved.meta.length = 0; saved.media.length = 0; saved.reloads = 0;
  }
  async function startRun(testId, label) {
    resetSaved();
    generator.close();
    generator.open({ testId, label });
    const modal = document.body.children[0];
    const field = modal.querySelector('[data-ai-label]');
    field.value = label;
    field.dispatch('input');
    /* every text the status line is given, in order */
    const statuses = [];
    let current = generator.state.status;
    Object.defineProperty(generator.state, 'status', {
      configurable: true, enumerable: true,
      get() { return current; },
      set(value) { current = value; statuses.push(value); }
    });
    modal.querySelector('[data-ai-generate]').click();
    return {
      modal, statuses,
      stop() { Object.defineProperty(generator.state, 'status', { configurable: true, enumerable: true, writable: true, value: current }); }
    };
  }

  /* (a) Reading passage 2 is rate limited twice, the third try succeeds */
  {
    const endpoint = installEndpoint((body, attempt) => {
      if (body.skill === 'reading' && body.passage === 2 && attempt === 1) return rateLimitedReply();
      if (body.skill === 'reading' && body.passage === 2 && attempt === 2) return rateLimitedReply(100);
      return null;
    });
    const run = await startRun('test13', 'Practice Test 13');
    const done = await waitFor(() => !generator.state.running, 'the rate-limited run to finish', 20000);
    run.stop();
    const second = endpoint.log.filter(row => row.id === 'reading:passage2');
    check('429: the run still finishes', done);
    check('429: no error is shown to the admin', generator.state.error === '' && !/admin-notice--error/.test(run.modal.innerHTML));
    check('429: the limited chunk is simply sent again (3 attempts), nothing else is repeated',
      endpoint.attempts['reading:passage2'] === 3
      && Object.keys(endpoint.attempts).filter(id => id !== 'reading:passage2').every(id => endpoint.attempts[id] === 1)
      && Object.keys(endpoint.attempts).length === 9);
    const gap1 = second[1].at - second[0].at;
    const gap2 = second[2].at - second[1].at;
    check('429: the first wait is the base delay (' + gap1 + ' ms)', gap1 >= 15 && gap1 < 300);
    check('429: a wait of at least what Groq asked for (retryAfterMs 100 + margin) is honoured (' + gap2 + ' ms)', gap2 >= 330);
    const waiting = run.statuses.filter(text => /Groq/.test(text) && /\(\d\/6\)/.test(text));
    check('429: the status line counts the attempt while waiting', waiting.some(t => /\(1\/6\)/.test(t)) && waiting.some(t => /\(2\/6\)/.test(t)));
    const lastCountdown = run.statuses.map((text, i) => (/\(2\/6\)/.test(text) ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
    check('429: the countdown is replaced by the normal progress text afterwards',
      lastCountdown >= 0 && /Reading 2\/3/.test(run.statuses[lastCountdown + 1] || ''));
    const progress = run.statuses.filter(text => !/Groq/.test(text)).join(' | ');
    check('429: the status line shows the chunk in progress (Listening 1/4 … Reading 3/3, then Writing and Speaking)',
      ['Listening 1/4', 'Listening 2/4', 'Listening 3/4', 'Listening 4/4', 'Reading 1/3', 'Reading 2/3', 'Reading 3/3', 'Writing', 'Speaking']
        .every(label => progress.includes(label)));
    check('429: all four sections and the meta row were saved',
      saved.tests.map(r => r.skill).join(',') === 'listening,reading,writing,speaking' && saved.meta.length === 1);
    const savedReading = saved.tests.find(r => r.skill === 'reading');
    check('429: the merged Reading section is complete (3 passages, 40 questions)',
      savedReading.payload.passages.length === 3
      && savedReading.payload.passages.reduce((sum, p) => sum + p.questions.length, 0) === 40);
    check('429: every step ended done',
      ['listening', 'reading', 'writing', 'speaking'].every(skill => generator.state.steps[skill] === 'done'));
  }

  /* (b) a daily quota (a huge retryAfterMs) is not waited for in the page */
  {
    const endpoint = installEndpoint((body) => (body.skill === 'reading' && body.passage === 1 ? rateLimitedReply(3600000) : null));
    const run = await startRun('test14', 'Practice Test 14');
    const done = await waitFor(() => !generator.state.running, 'the daily-limit run to stop', 20000);
    run.stop();
    check('429 daily limit: the run stops at once', done && endpoint.attempts['reading:passage1'] === 1);
    check('429 daily limit: the admin gets a plain message naming the wait (60 min)',
      /429/.test(generator.state.error) && /60/.test(generator.state.error) && !/undefined|\{m\}/.test(generator.state.error));
    check('429 daily limit: Reading is marked failed, Listening stays saved',
      generator.state.steps.reading === 'error' && saved.tests.length === 1 && saved.tests[0].skill === 'listening' && saved.meta.length === 0);
  }

  /* (b2) a hint longer than the exponential cap but within maxHintMs IS waited out */
  {
    const saveTiming = Object.assign({}, generator.timing);
    Object.assign(generator.timing, { maxWaitMs: 100, maxHintMs: 1000 });
    const endpoint = installEndpoint((body, attempt) => (body.skill === 'writing' && attempt === 1 ? rateLimitedReply(600) : null));
    const run = await startRun('test18', 'Practice Test 18');
    const done = await waitFor(() => !generator.state.running, 'the long-hint run to finish', 20000);
    run.stop();
    const at = endpoint.log.filter(row => row.id === 'writing').map(row => row.at);
    check('429 long hint: a 600 ms hint (above the 100 ms backoff cap) is waited out, then the run completes',
      done && generator.state.error === '' && at.length === 2 && at[1] - at[0] >= 800 && saved.tests.length === 4);
    Object.assign(generator.timing, saveTiming);
  }

  /* (c) a quota that never opens: every attempt is used, then the run stops */
  {
    generator.timing.maxRetries = 2;
    const endpoint = installEndpoint((body) => (body.skill === 'writing' ? rateLimitedReply() : null));
    const run = await startRun('test15', 'Practice Test 15');
    const done = await waitFor(() => !generator.state.running, 'the exhausted run to stop', 20000);
    run.stop();
    check('429 exhausted: the same chunk was tried 1 + maxRetries times (3)', done && endpoint.attempts.writing === 3);
    check('429 exhausted: Speaking was never requested', endpoint.attempts.speaking === undefined);
    check('429 exhausted: the sections before it are saved, Writing is marked failed',
      saved.tests.map(r => r.skill).join(',') === 'listening,reading' && generator.state.steps.writing === 'error' && saved.meta.length === 0);
    check('429 exhausted: the message is plain, not a raw provider error',
      /429/.test(generator.state.error) && !/Groq API error/.test(generator.state.error));
    generator.timing.maxRetries = 6;
  }

  /* (d) this server's own per-IP limiter is a different 429: not retried */
  {
    const endpoint = installEndpoint((body) => (body.skill === 'listening' && body.part === 1
      ? { ok: false, status: 429, json: async () => ({ ok: false, code: 'TOO_MANY_REQUESTS', error: 'Too many generation requests. Wait a few minutes and try again.' }) }
      : null));
    const run = await startRun('test16', 'Practice Test 16');
    const done = await waitFor(() => !generator.state.running, 'the per-IP limit run to stop', 20000);
    run.stop();
    check('429 per-IP limiter: the run stops after a single attempt', done && endpoint.attempts['listening:part1'] === 1);
    check('429 per-IP limiter: the server message is shown as an error', /Too many generation requests/.test(generator.state.error));
  }

  /* (e) the waits grow exponentially, honour Groq's hint and are capped */
  {
    const { backoffMs, isRateLimited } = generator._internal;
    const saveTiming = Object.assign({}, generator.timing);
    Object.assign(generator.timing, { baseMs: 2000, jitterMs: 0, maxWaitMs: 60000, maxHintMs: 300000 });
    const noJitter = [0, 1, 2, 3, 4, 5, 6, 7].map(attempt => backoffMs(attempt, 0));
    check('backoff: 2 s, 4 s, 8 s, 16 s, 32 s, then capped at one minute (' + noJitter.join(', ') + ')',
      noJitter.join(',') === '2000,4000,8000,16000,32000,60000,60000,60000');
    check('backoff: Groq\'s own hint is waited out in full (+ a margin), never less than the backoff',
      backoffMs(0, 7000) === 7250 && backoffMs(3, 1000) === 16000 && backoffMs(0, 59900) === 60150);
    check('backoff: a hint beyond the one-minute cap (here 2 min) is still waited out — Groq knows when its quota reopens',
      backoffMs(0, 120000) === 120250);

    generator.timing.jitterMs = 1000;
    const realRandom = Math.random;
    Math.random = () => 0;
    const lowest = backoffMs(0, 0);
    Math.random = () => 0.999999;
    const highest = backoffMs(0, 0);
    Math.random = realRandom;
    check('backoff: the first wait is 2–3 s (jitter adds up to 1 s)', lowest === 2000 && highest >= 2990 && highest <= 3000);
    Object.assign(generator.timing, saveTiming);

    check('signal: an upstream rate limit is recognised', isRateLimited(429, { code: 'RATE_LIMITED' })
      && isRateLimited(502, { error: 'Groq API error (429): rate limit reached' }) && isRateLimited(429, null));
    check('signal: this server\'s own limiter and ordinary errors are not',
      !isRateLimited(429, { code: 'TOO_MANY_REQUESTS' }) && !isRateLimited(502, { error: 'Groq API error (500): overloaded' })
      && !isRateLimited(500, { code: 'GROQ_KEY_MISSING', error: 'GROQ_API_KEY is not set on the server.' }));
  }

  /* (f) the same ladder, end to end with real timers (lower bounds only) */
  {
    const normal = Object.assign({}, generator.timing);
    Object.assign(generator.timing, { maxRetries: 3, baseMs: 20, jitterMs: 0, maxWaitMs: 70, tickMs: 5 });
    const endpoint = installEndpoint((body) => (body.skill === 'speaking' ? rateLimitedReply() : null));
    const run = await startRun('test17', 'Practice Test 17');
    const done = await waitFor(() => !generator.state.running, 'the backoff run to stop', 20000);
    run.stop();
    const at = endpoint.log.filter(row => row.id === 'speaking').map(row => row.at);
    const gaps = at.slice(1).map((time, i) => time - at[i]);
    check('backoff: 1 + maxRetries attempts were made (' + at.length + ')', done && at.length === 4);
    check('backoff: the real waits follow 20 ms, 40 ms, 70 ms (capped) (' + gaps.join(', ') + ' ms)',
      gaps[0] >= 17 && gaps[1] >= 37 && gaps[2] >= 67);
    Object.assign(generator.timing, normal);
  }
  Object.assign(generator.timing, normalTiming);
  check('timing: the real defaults wait 2–3 s first, doubling up to a minute; a Groq hint up to 5 minutes is honoured',
    normalTiming.baseMs === 2000 && normalTiming.jitterMs === 1000 && normalTiming.maxWaitMs === 60000
    && normalTiming.maxHintMs === 300000 && normalTiming.maxRetries >= 5);

  /* ---------- 5. a missing GROQ_API_KEY is reported verbatim ---------- */
  generator.close();
  saved.tests.length = 0;
  generator.open({ testId: 'test11' });
  const backdrop3 = document.body.children[0];
  const label3 = backdrop3.querySelector('[data-ai-label]');
  label3.value = 'Practice Test 11';
  label3.dispatch('input');
  global.fetch = async () => ({
    ok: false, status: 500,
    json: async () => ({
      ok: false, code: 'GROQ_KEY_MISSING',
      error: 'GROQ_API_KEY is not set on the server.',
      message: 'Iltimos, avval GROQ_API_KEY sozlang — AI generator ishga tushishi uchun Groq API kaliti kerak.',
      hint: 'Add GROQ_API_KEY in Vercel → Settings → Environment Variables.'
    })
  });
  backdrop3.querySelector('[data-ai-generate]').click();
  const stopped2 = await waitFor(() => !generator.state.running, 'the key-missing run to stop', 20000);
  check('key missing: the run stops', stopped2);
  check('key missing: the admin sees the setup instruction',
    /Iltimos, avval GROQ_API_KEY sozlang/.test(generator.state.error));
  check('key missing: nothing is saved', saved.tests.length === 0 && saved.meta.length === 0);

  console.log(failed === 0 ? '\nGENERATOR CLIENT TESTS OK ✓' : `\n${failed} GENERATOR CLIENT TEST(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('GENERATOR CLIENT TEST CRASH:', e);
  process.exit(1);
});
