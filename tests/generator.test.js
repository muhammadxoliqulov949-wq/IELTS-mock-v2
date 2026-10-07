/* ===================================================================
 * 1-Click IELTS AI Generator — regression tests
 *
 * What must never silently break:
 *   • the topic/diversity pool (≥40 topics, per-section picks, shuffled
 *     question-type mixes, temperature 0.85 reaching Groq)
 *   • the generator endpoint (shape of every one of the four skills,
 *     the GROQ_API_KEY message an admin actually sees, audio mode)
 *   • the TTS module (Sec-MS-GEC vectors, WAV wrapping, frame parsing,
 *     and a full Edge-TTS round trip against a local mock endpoint)
 *   • the wiring (button in the admin panel, scripts loaded, service
 *     worker, local preview server route, i18n in all three languages)
 *   • the orchestration: a generated section passes the SAME validator
 *     the manual editor uses, so the admin can open and edit it
 * =================================================================== */
'use strict';

const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(root + p, 'utf8');

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

/* ------------------------------------------------------------------ */
/* 1. Topic & diversity pool                                           */
/* ------------------------------------------------------------------ */
const pool = require('../lib/topicPool.js');

check('pool: at least 40 IELTS topics are defined', pool.TOPICS.length >= 40);
check('pool: topics are unique and non-empty',
  new Set(pool.TOPICS).size === pool.TOPICS.length
  && pool.TOPICS.every(t => String(t).trim().length > 2));
['Space exploration', 'Marine biology', 'Cognitive psychology', 'Urban architecture',
  'Ancient history', 'Artificial intelligence', 'Agricultural innovations']
  .forEach(topic => check('pool: includes ' + topic, pool.TOPICS.includes(topic)));

/* deterministic rng so the diversity assertions are stable */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const planA = pool.buildPlan({ rng: seeded(1) });
const planB = pool.buildPlan({ rng: seeded(2) });
check('plan: every section gets its own random topic when none is forced',
  Object.keys(planA.topics).length === 4
  && pool.TOPICS.includes(planA.topics.listening)
  && pool.TOPICS.includes(planA.topics.reading));
check('plan: two runs pick different topics (Math.random-style diversity)',
  JSON.stringify(planA.topics) !== JSON.stringify(planB.topics));
check('plan: a forced topic anchors all four sections',
  JSON.stringify(pool.buildPlan({ topic: 'Marine biology' }).topics)
  === JSON.stringify({ listening: 'Marine biology', reading: 'Marine biology', writing: 'Marine biology', speaking: 'Marine biology' }));
check('plan: difficulty defaults to standard and accepts hard',
  pool.buildPlan({}).difficulty === 'standard' && pool.buildPlan({ difficulty: 'hard' }).difficulty === 'hard');

const listeningPlan = pool.listeningPlan(seeded(7));
check('listening plan: 4 parts × 10 questions',
  listeningPlan.length === 4 && listeningPlan.every(p => p.types.length === 10));
check('listening plan: only types the validator accepts',
  listeningPlan.every(p => p.types.every(type => pool.LISTENING_TYPES.includes(type))));
check('listening plan: map-labelling is excluded (no map image can be invented)',
  !pool.LISTENING_TYPES.includes('map-labelling')
  && !pool.READING_TYPES.includes('map-labelling'));

const readingPlan = pool.readingPlan(seeded(9));
check('reading plan: 13 + 14 + 13 = 40 questions',
  readingPlan.reduce((sum, p) => sum + p.types.length, 0) === 40);
check('reading plan: types come from the reading set',
  readingPlan.every(p => p.types.every(type => pool.READING_TYPES.includes(type))));

/* the mix itself must change between runs */
const mixes = new Set();
for (let seed = 1; seed <= 12; seed++) {
  mixes.add(JSON.stringify(pool.listeningPlan(seeded(seed)).map(p => p.types)));
}
check('diversity: 12 runs produce more than 6 different question-type mixes', mixes.size > 6);

/* ------------------------------------------------------------------ */
/* 2. TTS module                                                       */
/* ------------------------------------------------------------------ */
const tts = require('../lib/edgeTts.js');

/* golden vectors published for the Sec-MS-GEC algorithm */
const gecVectors = [
  [0, '116444736000000000', '7ECB79D14E3AA576D2D79E6D487A1388156D91E614B1BE11C64226A29BC8DD8C'],
  [1700000000, '133444734000000000', '42301B335578FEFDAE2637DED1ABD614505D432559EC08032B82048483726AFF'],
  [1700000123, '133444737000000000', 'AE4CF72E466874182A75878E20EADA83D29A1C12CAD9C3E0E014CCE0BFA55880']
];
gecVectors.forEach(([unix, ticks, hash]) => {
  const seconds = unix + 11644473600;
  const rounded = seconds - (seconds % 300);
  const expected = crypto.createHash('sha256')
    .update(String(rounded * 1e7) + tts.TRUSTED_CLIENT_TOKEN).digest('hex').toUpperCase();
  check('tts: Sec-MS-GEC vector for unix ' + unix, expected === hash);
});
check('tts: Sec-MS-GEC-Version is the current Chromium handshake', tts.GEC_VERSION === '1-143.0.3650.75');

check('tts: speaker labels are stripped so the engine never reads them aloud',
  tts.stripSpeakerLabels('Woman: Good morning, how can I help you?') === 'Good morning, how can I help you?'
  && !tts.stripSpeakerLabels('TUTOR: Let us look at your essay.').includes('TUTOR:')
  && tts.stripSpeakerLabels('Good morning. Woman: How can I help you?') === 'Good morning. How can I help you?');
check('tts: ordinary punctuation is left intact',
  tts.stripSpeakerLabels('There are three options: bus, tram or bike.').includes('three options: bus'));

const chunks = tts.chunkText('One. Two! Three? ' + 'y'.repeat(5000), 2400);
check('tts: long transcripts are chunked within the request limit',
  chunks.length > 1 && chunks.every(c => c.length <= 2400));
check('tts: empty text yields no chunks', tts.chunkText('   ').length === 0);

const audioHeader = Buffer.from('Path:audio\r\nContent-Type:audio/mpeg\r\n\r\n');
const framed = Buffer.concat([
  Buffer.from([0, audioHeader.length]),
  audioHeader,
  Buffer.from([0xff, 0xfb, 0x90, 0x64])
]);
check('tts: binary audio frames are stripped of their Path header',
  tts.stripAudioHeader(framed).toString('hex') === 'fffb9064');

/* a full Edge-TTS round trip against a local mock of the endpoint */
function mockEdgeServer() {
  const audio = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x11, 0x22]);
  function encode(opcode, payload) {
    const len = payload.length;
    const head = len < 126 ? Buffer.from([0x80 | opcode, len]) : (() => {
      const h = Buffer.alloc(4); h[0] = 0x80 | opcode; h[1] = 126; h.writeUInt16BE(len, 2); return h;
    })();
    return Buffer.concat([head, payload]);
  }
  function decode(buffer) {
    const frames = [];
    let buf = buffer;
    while (buf.length >= 2) {
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; }
      let mask = null;
      if (masked) { if (buf.length < off + 4) break; mask = buf.slice(off, off + 4); off += 4; }
      if (buf.length < off + len) break;
      let payload = buf.slice(off, off + len);
      if (mask) { const p = Buffer.alloc(len); for (let i = 0; i < len; i++) p[i] = payload[i] ^ mask[i % 4]; payload = p; }
      frames.push({ opcode, payload });
      buf = buf.slice(off + len);
    }
    return { frames, rest: buf };
  }
  const server = http.createServer((req, res) => res.writeHead(426).end());
  server.on('upgrade', (req, socket) => {
    const accept = crypto.createHash('sha1')
      .update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
      + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
    let rest = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      rest = Buffer.concat([rest, chunk]);
      const { frames, rest: leftover } = decode(rest);
      rest = leftover;
      frames.forEach(({ payload }) => {
        const text = payload.toString('utf-8');
        if (!text.includes('Path:synthesis.ssml')) return;
        const head = Buffer.from('Path:audio\r\nContent-Type:audio/mpeg\r\n\r\n');
        socket.write(encode(2, Buffer.concat([head, audio])));
        socket.write(encode(1, Buffer.from('Path:turn.end')));
        setTimeout(() => socket.end(), 20);
      });
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* ------------------------------------------------------------------ */
/* 3. Generator endpoint                                               */
/* ------------------------------------------------------------------ */
function makeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}
function loadHandler() {
  const src = read('/api/generate-mock.js');
  const fn = new Function('module', 'require', 'process', src);
  const m = { exports: {} };
  fn(m, require, process);
  return m.exports;
}
const handler = loadHandler();
const req = (body, ip) => ({ method: 'POST', headers: { 'x-forwarded-for': ip || '1.2.3.4' }, socket: {}, body });

/* canned model answers — exactly the shape the prompts ask for */
function listeningAnswer() {
  const part = (n) => ({
    partNumber: n,
    title: `Part ${n} — something`,
    instructions: `Questions ${(n - 1) * 10 + 1}–${n * 10}. You will hear this recording ONCE.`,
    transcript: 'Woman: Good morning. ' + 'This is a spoken transcript with plenty of words in it. '.repeat(12),
    questions: Array.from({ length: 10 }, (_, i) => ({
      id: 'x',
      type: n === 2 ? 'multiple-choice' : 'form-completion',
      prompt: `Question ${i + 1}: the answer is ______`,
      options: ['one', 'two', 'three', 'four'],
      answer: n === 2 ? 1 : 'words',
      explanation: 'because the transcript says so'
    }))
  });
  return { listening: { title: 'Listening Practice Test', parts: [1, 2, 3, 4].map(part) } };
}
function readingAnswer() {
  const passage = (n, count) => ({
    passageNumber: n,
    title: `Passage ${n}`,
    difficulty: ['Easier', 'Medium', 'Harder'][n - 1],
    paragraphs: [
      { text: 'Paragraph one. ' + 'Academic prose about the topic. '.repeat(20) },
      { text: 'Paragraph two. ' + 'More academic prose with evidence. '.repeat(20) },
      { text: 'Paragraph three. ' + 'A concluding academic paragraph. '.repeat(20) }
    ],
    questions: Array.from({ length: count }, (_, i) => ({
      id: 'x',
      type: i % 3 === 0 ? 'true-false-not-given' : (i % 3 === 1 ? 'sentence-completion' : 'multiple-choice'),
      prompt: `Reading question ${i + 1}`,
      options: ['a', 'b', 'c', 'd'],
      answer: i % 3 === 0 ? 'true' : (i % 3 === 1 ? 'evidence' : 2),
      explanation: 'paragraph A proves it'
    }))
  });
  return { reading: { title: 'Reading Practice Test', passages: [passage(1, 13), passage(2, 14), passage(3, 13)] } };
}
function writingAnswer() {
  return {
    writing: {
      title: 'Writing Practice Test',
      tasks: [
        {
          taskNumber: 1, title: 'Task 1', minutes: 20, minWords: 150,
          prompt: 'The chart below shows the number of visitors to four museums between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          visualType: 'Bar chart',
          chartData: 'Museum A: 8 (2015), 12 (2019), 41 (2021), 33 (2025)',
          chartSpec: {
            chartType: 'bar', title: 'Museum visitors', unit: 'thousands',
            labels: ['2015', '2019', '2021', '2025'],
            series: [{ name: 'Museum A', values: [8, 12, 41, 33] }]
          }
        },
        {
          taskNumber: 2, title: 'Task 2', minutes: 40, minWords: 250,
          prompt: 'Some people believe that museums should be free for everyone. To what extent do you agree or disagree?',
          criteria: 'Task Response · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy.'
        }
      ]
    }
  };
}
function speakingAnswer() {
  return {
    speaking: {
      title: 'Speaking Practice Test',
      parts: [
        {
          partNumber: 1, title: 'Part 1 — Introduction and interview', minutes: '4–5',
          topics: [
            { title: 'Your town', questions: ['Where do you live?', 'What do you like about it?'] },
            { title: 'Museums', questions: ['Do you visit museums?', 'When did you last go?'] },
            { title: 'Free time', questions: ['What do you do at weekends?'] }
          ]
        },
        {
          partNumber: 2, title: 'Part 2 — cue card', minutes: '3–4',
          prepSeconds: 60, talkSeconds: 120,
          topic: 'Describe a museum you have visited.',
          bullets: ['where it is', 'what you saw there', 'and explain how you felt about it']
        },
        {
          partNumber: 3, title: 'Part 3 — discussion', minutes: '4–5',
          linkedTopic: 'museums',
          questions: ['Should museums charge entry?', 'How have museums changed?', 'Are museums still relevant?', 'What makes a good museum?']
        }
      ]
    }
  };
}

/* ------------------------------------------------------------------ */
/* 4. Run everything                                                   */
/* ------------------------------------------------------------------ */
(async () => {
  /* --- 4.1 wiring (static checks first, no network needed) --- */
  check('wiring: admin panel has the AI generator button',
    /data-admin-ai-generate/.test(read('/admin.js')));
  check('wiring: the button opens window.IELTS_GENERATOR',
    /window\.IELTS_GENERATOR/.test(read('/admin.js')));
  check('wiring: admin exposes the editors to the generator modal',
    /openSkillEditor, openMetaEditor/.test(read('/admin.js')));
  check('wiring: index.html loads the topic pool before the admin panel',
    read('/index.html').indexOf('lib/topicPool.js') < read('/index.html').indexOf('admin.js'));
  check('wiring: index.html loads the generator after the admin panel',
    read('/index.html').indexOf('admin.js') < read('/index.html').indexOf('mockGenerator.js'));
  check('wiring: service worker precaches both new files',
    read('/sw.js').includes("'/lib/topicPool.js'") && read('/sw.js').includes("'/mockGenerator.js'"));
  check('wiring: the build ships both new files',
    read('/scripts/build.js').includes("'mockGenerator.js'") && read('/scripts/build.js').includes("'lib/topicPool.js'"));
  check('wiring: the local preview server routes /api/generate-mock',
    /generate-mock/.test(read('/server.js')) && /require\('\.\/api\/generate-mock\.js'\)/.test(read('/server.js')));
  check('wiring: the Supabase client can hand a token to the generator',
    /export async function getAccessToken\(\)/.test(read('/supabaseClient.js')));
  check('wiring: the modal escapes user input before innerHTML',
    /function esc\(v\)/.test(read('/mockGenerator.js')) && /\$\{esc\(/.test(read('/mockGenerator.js')));
  check('css: the AI button and progress steps are styled',
    /\.btn-ai\b/.test(read('/styles.css')) && /\.ai-gen-step\b/.test(read('/styles.css')));

  /* i18n: every admin_ai_* string exists in all three languages */
  global.window = {};
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.document = { documentElement: {}, body: {} };
  eval(read('/i18n.js'));
  const dict = window.IELTS_I18N.dict;
  const aiKeys = Object.keys(dict.en).filter(k => /^admin_(ai_|yes|no)/.test(k));
  check('i18n: AI generator strings exist (' + aiKeys.length + ')', aiKeys.length >= 40);
  ['en', 'uz', 'ru'].forEach(lang => {
    const missing = aiKeys.filter(k => !dict[lang][k] || dict[lang][k] === k);
    check('i18n: ' + lang + ' has every AI generator string', missing.length === 0);
  });

  /* --- 4.2 the pool is also usable from the browser --- */
  const browserPool = new Function('window', 'module',
    read('/lib/topicPool.js') + '\n;return window.IELTS_TOPICS;')({}, undefined);
  check('pool: the browser build exposes window.IELTS_TOPICS',
    browserPool && browserPool.TOPICS.length === pool.TOPICS.length
    && typeof browserPool.buildPlan === 'function');

  /* --- 4.3 endpoint: method + missing key + bad skill --- */
  let r = makeRes();
  await handler({ method: 'GET', headers: {} }, r);
  check('api: only POST is allowed', r.statusCode === 405);

  delete process.env.GROQ_API_KEY;
  r = makeRes();
  await handler(req({ skill: 'listening' }), r);
  check('api: without GROQ_API_KEY the admin sees the setup message',
    r.statusCode === 500 && r.body.code === 'GROQ_KEY_MISSING'
    && /Iltimos, avval GROQ_API_KEY sozlang/.test(r.body.message)
    && /console\.groq\.com/.test(r.body.hint));

  process.env.GROQ_API_KEY = 'fake-key';
  r = makeRes();
  await handler(req({ skill: 'underwater-basket-weaving' }), r);
  check('api: an unknown skill is rejected', r.statusCode === 400 && /Unknown skill/.test(r.body.error));

  /* --- 4.4 every skill, with the Groq call captured --- */
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body), headers: (options && options.headers) || {} });
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(pendingAnswer) } }],
        usage: { total_tokens: 1234 }
      })
    };
  };

  const skills = [
    ['listening', listeningAnswer(), 4096],
    ['reading', readingAnswer(), 4096],
    ['writing', writingAnswer(), 4096],
    ['speaking', speakingAnswer(), 4096]
  ];

  let pendingAnswer = null;

  /* the payload must survive the SAME validator the manual editor uses */
  global.window = { addEventListener() {} };
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.document = { documentElement: {}, body: {} };
  new Function('window', 'document', 'localStorage', read('/admin.js'))(global.window, global.document, global.localStorage);
  const adminInternal = global.window.IELTS_ADMIN._internal;
  check('admin: the panel is loaded for the validator cross-check', !!adminInternal && typeof adminInternal.validatePayload === 'function');

  const saved = {};
  for (const [skill, answer, maxTokens] of skills) {
    pendingAnswer = answer; /* eslint-disable-line no-undef */
    r = makeRes();
    await handler(req({ skill, testId: 'test6', label: 'Practice Test 6', difficulty: 'hard', plan: pool.buildPlan({ difficulty: 'hard' }) }, '10.0.0.' + skills.indexOf(skill)), r);
    const ok = r.statusCode === 200 && r.body.ok && r.body.payload;
    check('api: ' + skill + ' generates a payload', ok);
    if (!ok) { console.log('   →', r.body.error); continue; }

    const payload = r.body.payload;
    saved[skill] = payload;

    const request = calls[calls.length - 1];
    check('api: ' + skill + ' asks Groq with temperature 0.85',
      request.body.model === 'llama-3.3-70b-versatile'
      && request.body.temperature === 0.85
      && request.body.max_tokens === maxTokens
      && request.body.response_format.type === 'json_object');
    check('api: ' + skill + ' posts to the Groq chat endpoint with the API key',
      request.url === 'https://api.groq.com/openai/v1/chat/completions'
      && request.headers.Authorization === 'Bearer fake-key');
    check('api: ' + skill + ' sends the planned topic to the model',
      request.body.messages.some(m => m.role === 'user' && String(m.content).includes(r.body.plan.topics[skill])));

    const problems = adminInternal.validatePayload(skill, payload);
    check('api: ' + skill + ' passes the admin editor validator', problems.length === 0);
    if (problems.length) console.log('   →', problems.slice(0, 3).join(' · '));

    const normalized = adminInternal.normalizePayload(skill, JSON.parse(JSON.stringify(payload)));
    const after = adminInternal.validatePayload(skill, normalized);
    check('api: ' + skill + ' still validates after normalisation', after.length === 0);
  }

  /* structural assertions on the generated sections */
  const listening = saved.listening || {};
  check('listening: 4 parts and 40 questions',
    (listening.parts || []).length === 4
    && (listening.parts || []).reduce((s, p) => s + p.questions.length, 0) === 40);
  check('listening: question ids run l1…l40',
    (listening.parts || []).flatMap(p => p.questions).every((q, i) => q.id === 'l' + (i + 1)));
  check('listening: every part carries a transcript and empty audio fields',
    (listening.parts || []).every(p => p.transcript.length > 100 && p.audioUrl === '' && p.audioPath === ''));
  check('listening: completion questions carry the IELTS word limit',
    (listening.parts || []).flatMap(p => p.questions)
      .filter(q => /completion/.test(q.type))
      .every(q => /NO MORE THAN/.test(q.wordLimit || '')));

  const reading = saved.reading || {};
  check('reading: 3 passages and 40 questions',
    (reading.passages || []).length === 3
    && (reading.passages || []).reduce((s, p) => s + p.questions.length, 0) === 40);
  check('reading: question ids run r1…r40',
    (reading.passages || []).flatMap(p => p.questions).every((q, i) => q.id === 'r' + (i + 1)));
  check('reading: paragraphs are labelled for matching headings',
    (reading.passages || []).every(p => p.paragraphs.length >= 3 && p.paragraphs[0].label === 'A'));
  check('reading: TRUE/FALSE/NOT GIVEN answers are upper-case',
    (reading.passages || []).flatMap(p => p.questions)
      .filter(q => q.type === 'true-false-not-given')
      .every(q => /^(TRUE|FALSE|NOT GIVEN)$/.test(q.answer)));

  const writing = saved.writing || {};
  check('writing: Task 1 keeps its chart data and spec, Task 2 its criteria',
    (writing.tasks || []).length === 2
    && /chart/i.test(writing.tasks[0].prompt)
    && writing.tasks[0].chartData.length > 0
    && writing.tasks[0].chartSpec.labels.length === 4
    && /Task Response/.test(writing.tasks[1].criteria));

  const speaking = saved.speaking || {};
  check('speaking: Part 1 has topics, Part 2 the cue card, Part 3 the discussion',
    (speaking.parts || []).length === 3
    && speaking.parts[0].topics.length === 3
    && speaking.parts[1].prepSeconds === 60 && speaking.parts[1].talkSeconds === 120
    && speaking.parts[1].bullets.length === 3
    && speaking.parts[2].questions.length >= 3);

  /* --- 4.5 a malformed model answer fails loudly, not silently --- */
  pendingAnswer = { listening: { parts: [listeningAnswer().listening.parts[0]] } };
  r = makeRes();
  await handler(req({ skill: 'listening', plan: pool.buildPlan({}) }, '10.9.9.9'), r);
  check('api: a short model answer is reported instead of saved',
    r.statusCode >= 400 && /4 parts/.test(r.body.error));

  /* --- 4.6 audio mode: upload through the forwarded admin token --- */
  const uploaded = [];
  /* the Edge TTS protocol itself is covered in 4.7 against a local mock;
     here the engine is stubbed (same module instance the handler uses, via
     the real require cache) so the upload branching stays deterministic */
  const realSynthesize = tts.synthesize;
  tts.synthesize = async () => ({
    buffer: Buffer.alloc(2048, 1), mime: 'audio/mpeg', ext: 'mp3', source: 'edge-tts'
  });
  global.fetch = async (url, options) => {
    const target = String(url);
    if (target.includes('/storage/v1/object/')) {
      uploaded.push({ url: target, contentType: options.headers['Content-Type'], bytes: options.body.length });
      return { ok: true, json: async () => ({}) };
    }
    throw new Error('network unreachable');
  };
  process.env.SUPABASE_URL = 'https://demo.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon-key';
  r = makeRes();
  await handler(req({
    mode: 'audio', testId: 'test6', partNumber: 2,
    transcript: 'Woman: This is a transcript long enough to be synthesised into audio for a listening part.',
    accessToken: 'admin-jwt'
  }, '10.0.0.99'), r);
  check('api: audio mode returns a recording', r.statusCode === 200 && r.body.ok && !!r.body.audio);
  check('api: audio mode reports the Edge TTS engine',
    r.body.audio && r.body.audio.source === 'edge-tts');
  check('api: the recording is uploaded to the ielts-media bucket under the part name',
    uploaded.length === 1
    && /\/storage\/v1\/object\/ielts-media\/audio\/test6-listening-part2-/.test(uploaded[0].url)
    && uploaded[0].contentType === 'audio/mpeg');

  /* an unreachable engine fails loudly with TTS_FAILED, not silently */
  tts.synthesize = async () => { throw new Error('Edge TTS: network unreachable'); };
  r = makeRes();
  await handler(req({
    mode: 'audio', testId: 'test6', partNumber: 1,
    transcript: 'Woman: This transcript cannot be synthesised because the engine is down.',
    accessToken: 'admin-jwt'
  }, '10.0.0.98'), r);
  check('tts: an unreachable engine answers 502 TTS_FAILED (the transcript is kept)',
    r.statusCode === 502 && r.body.code === 'TTS_FAILED');
  tts.synthesize = realSynthesize;

  /* --- 4.7 the local mock Edge endpoint (both transports) --- */
  const server = await mockEdgeServer();
  const endpoint = `ws://127.0.0.1:${server.address().port}/edge/v1`;
  for (const transport of [undefined, 'raw']) {
    try {
      const mp3 = await tts.synthesizeMp3('Hello there. This is a listening transcript.', { endpoint, transport });
      check('tts: ' + (transport || 'auto') + ' transport returns concatenated MP3 bytes',
        mp3.length === 6 && mp3.toString('hex') === 'fffb90641122');
    } catch (err) {
      check('tts: ' + (transport || 'auto') + ' transport returns concatenated MP3 bytes', false);
      console.log('   →', err.message);
    }
  }
  server.close();

  /* --- 4.8 rate limiting (last: it burns the quota for one IP) --- */
  let limited = false;
  for (let i = 0; i < 62; i++) {
    r = makeRes();
    await handler(req({ skill: 'listening' }, '77.77.77.77'), r);
    if (r.statusCode === 429) { limited = true; break; }
  }
  check('api: generation is rate limited', limited);

  console.log(failed === 0 ? '\nGENERATOR TESTS OK ✓' : `\n${failed} GENERATOR TEST(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('GENERATOR TEST CRASH:', e);
  process.exit(1);
});
