/* ===================================================================
 * 1-Click AI Generator — the browser orchestration
 *
 * The endpoint tests live in generator.test.js. This suite boots the
 * real mockGenerator.js against a tiny fake DOM and walks the whole
 * admin journey:
 *
 *   open the modal → the four progress steps appear → "Generatsiya
 *   qilish" → four section calls, four TTS calls, five media uploads,
 *   four adminSaveTest calls and one adminSaveTestMeta call → the
 *   summary with the per-skill counts.
 *
 * It also pins the two behaviours that matter most in production:
 *   • a failure in one section stops the run, marks that step as failed
 *     and keeps everything already saved
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
function sectionAnswer(skill) {
  if (skill === 'listening') {
    return {
      ok: true, skill, counts: { questions: 40, blocks: 4 },
      plan: { topics: { listening: 'Space exploration', reading: 'Marine biology', writing: 'Cognitive psychology', speaking: 'Urban architecture' } },
      payload: {
        id: 'listening-custom', title: '', skill: 'Listening', duration: 30,
        parts: [1, 2, 3, 4].map(n => ({
          id: 'lp' + n, partNumber: n, title: 'Part ' + n,
          instructions: 'Questions 1–10.', transcript: 'Woman: ' + 'spoken words for the recording. '.repeat(20),
          audioUrl: '', audioPath: '',
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: 'x', type: 'form-completion', prompt: `Q${i + 1} ______`, answer: 'words', explanation: 'said in the transcript'
          }))
        }))
      }
    };
  }
  if (skill === 'reading') {
    return {
      ok: true, skill, counts: { questions: 40, blocks: 3 },
      payload: {
        id: 'reading-custom', title: '', skill: 'Reading', duration: 60, format: 'Academic',
        passages: [1, 2, 3].map(n => ({
          id: 'rp' + n, passageNumber: n, title: 'Passage ' + n, difficulty: 'Medium',
          text: 'Academic text. '.repeat(80),
          paragraphs: [{ label: 'A', text: 'Academic text. '.repeat(60) }],
          questions: Array.from({ length: 13 }, (_, i) => ({
            id: 'x', type: 'true-false-not-given', prompt: `R${i + 1}`, answer: 'TRUE', explanation: 'paragraph A'
          }))
        }))
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
  global.fetch = async (url, options) => {
    const target = String(url);
    const body = JSON.parse(options.body || '{}');
    calls.push(body);
    if (body.mode === 'audio') {
      return { ok: true, status: 200, json: async () => ({ ok: true, audio: { source: 'edge-tts', mime: 'audio/mpeg', ext: 'mp3', bytes: 1234, base64: Buffer.from([0xff, 0xfb, 0x90]).toString('base64') }, storage: 'client' }) };
    }
    return { ok: true, status: 200, json: async () => sectionAnswer(body.skill) };
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

  const skillCalls = calls.filter(c => c.mode !== 'audio').map(c => c.skill);
  check('run: the four sections were requested in IELTS order',
    JSON.stringify(skillCalls) === JSON.stringify(['listening', 'reading', 'writing', 'speaking']));
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

  let seen = 0;
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body || '{}');
    if (body.mode !== 'audio') {
      seen += 1;
      if (body.skill === 'reading') {
        return { ok: false, status: 502, json: async () => ({ ok: false, error: 'Gemini API error (500): overloaded' }) };
      }
      return { ok: true, status: 200, json: async () => sectionAnswer(body.skill) };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, audio: { source: 'edge-tts', mime: 'audio/mpeg', ext: 'mp3', base64: '' }, storage: 'client' }) };
  };

  backdrop2.querySelector('[data-ai-generate]').click();
  const stopped = await waitFor(() => !generator.state.running, 'the failed run to stop', 20000);
  check('failure: the run stops', stopped);
  check('failure: the error message is shown to the admin',
    /Gemini API error/.test(generator.state.error));
  check('failure: Reading is marked as failed',
    generator.state.steps.reading === 'error' && generator.state.steps.listening === 'done');
  check('failure: the sections generated before the failure are still saved',
    saved.tests.length === 1 && saved.tests[0].skill === 'listening');
  check('failure: no meta row is written for an incomplete test', saved.meta.length === 0);
  check('failure: no editor buttons are offered', !/data-ai-open-editor/.test(backdrop2.innerHTML));

  /* ---------- 5. a missing GEMINI_API_KEY is reported verbatim ---------- */
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
      ok: false, code: 'GEMINI_KEY_MISSING',
      error: 'GEMINI_API_KEY is not set on the server.',
      message: 'Iltimos, avval GEMINI_API_KEY sozlang — AI generator ishga tushishi uchun Gemini API kaliti kerak.',
      hint: 'Add GEMINI_API_KEY in Vercel → Settings → Environment Variables.'
    })
  });
  backdrop3.querySelector('[data-ai-generate]').click();
  const stopped2 = await waitFor(() => !generator.state.running, 'the key-missing run to stop', 20000);
  check('key missing: the run stops', stopped2);
  check('key missing: the admin sees the setup instruction',
    /Iltimos, avval GEMINI_API_KEY sozlang/.test(generator.state.error));
  check('key missing: nothing is saved', saved.tests.length === 0 && saved.meta.length === 0);

  console.log(failed === 0 ? '\nGENERATOR CLIENT TESTS OK ✓' : `\n${failed} GENERATOR CLIENT TEST(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('GENERATOR CLIENT TEST CRASH:', e);
  process.exit(1);
});
