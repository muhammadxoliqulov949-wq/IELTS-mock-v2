/* ===================================================================
 * The single AI module — regression tests
 *
 * Why this suite exists: the project used to talk to Google Gemini with
 * the text model id hardcoded in four endpoints (plus a second, TTS-only
 * id in lib/edgeTts.js). When Google rotated access to the text model
 * ("models/gemini-2.5-flash is no longer available to new users") every
 * AI endpoint started failing with 404 at once.
 *
 * The project now has ONE provider and ONE credential:
 *   lib/aiClient.js → https://api.groq.com/openai/v1 (OpenAI format)
 *   model:   llama-3.3-70b-versatile   (GROQ_MODEL can retarget it)
 *   key:     process.env.GROQ_API_KEY  (nothing else)
 *
 * What must never silently break again:
 *   • every AI call site goes through lib/aiClient.js — no hardcoded
 *     provider URLs, model ids or keys anywhere else, and no Google code
 *   • each call carries max_tokens: 4096 so answers are never cut off
 *     (the 40-question Listening/Reading sections get SECTION_MAX_TOKENS)
 *   • a model Groq itself retired must not break the endpoint: the module
 *     falls back to openai/gpt-oss-120b and remembers the live model
 *   • a missing key surfaces the exact actionable message an admin sees
 *   • the TTS fallback still produces ONE valid WAV: Orpheus takes ≤ 200
 *     characters per request, so chunks share a single RIFF header
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

function makeHandler(file) {
  const src = read('/' + file);
  const fn = new Function('module', 'require', 'process', src);
  const m = { exports: {} };
  fn(m, require, process);
  return m.exports;
}
function makeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}
const req = (body, ip) => ({ method: 'POST', headers: { 'x-forwarded-for': ip || '5.5.5.5' }, socket: {}, body });

/* A RIFF/WAVE file with any format the parser may meet. */
function makeWav(pcm, opts) {
  const { rate = 24000, channels = 1, bits = 16, format = 1 } = opts || {};
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(format, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * channels * bits / 8, 28);
  header.writeUInt16LE(channels * bits / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
/* The OpenAI-shaped answer every stubbed Groq call returns. */
function chatOk(content, extra) {
  return {
    ok: true,
    status: 200,
    json: async () => Object.assign({
      model: 'llama-3.3-70b-versatile',
      choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
    }, extra || {})
  };
}
function errorResponse(status, payload) {
  const body = JSON.stringify(payload);
  return { ok: false, status, text: async () => body, json: async () => payload };
}

const ai = require('../lib/aiClient.js');
const tts = require('../lib/edgeTts.js');
const aiCache = require('../lib/aiCache.js');

/* ------------------------------------------------------------------ */
/* 1. The module surface                                               */
/* ------------------------------------------------------------------ */
check('module: lib/aiClient.js exists', fs.existsSync(path.join(root, 'lib/aiClient.js')));
check('module: the old per-provider model file is gone', !fs.existsSync(path.join(root, 'lib/geminiModel.js')));

check('module: the base URL is Groq in OpenAI format',
  ai.API_BASE === 'https://api.groq.com/openai/v1'
  && ai.CHAT_ENDPOINT === 'https://api.groq.com/openai/v1/chat/completions'
  && ai.SPEECH_ENDPOINT === 'https://api.groq.com/openai/v1/audio/speech');
check('module: the project model is llama-3.3-70b-versatile', ai.DEFAULT_MODEL === 'llama-3.3-70b-versatile');
check('module: the documented replacement is openai/gpt-oss-120b', ai.FALLBACK_MODEL === 'openai/gpt-oss-120b');
check('module: 4096 tokens is the answer budget for every call', ai.MAX_TOKENS === 4096);
check('module: the 40-question sections get a bigger budget', ai.SECTION_MAX_TOKENS > ai.MAX_TOKENS);
check('module: model() returns the project model by default', ai.model() === ai.DEFAULT_MODEL);

process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
check('module: GROQ_MODEL retargets every call without a code change', ai.model() === 'openai/gpt-oss-20b');
check('module: the override heads the chain and keeps the live replacement behind it',
  ai.modelChain()[0] === 'openai/gpt-oss-20b' && ai.modelChain().includes(ai.FALLBACK_MODEL));
process.env.GROQ_MODEL = '   ';
check('module: a blank GROQ_MODEL falls back to the default', ai.model() === ai.DEFAULT_MODEL);
delete process.env.GROQ_MODEL;

check('module: the model chain keeps trying the live replacement',
  ai.modelChain().includes(ai.DEFAULT_MODEL) && ai.modelChain().includes(ai.FALLBACK_MODEL));

/* the key is the single credential */
delete process.env.GROQ_API_KEY;
check('module: hasKey() is false without GROQ_API_KEY', ai.hasKey() === false && ai.apiKey() === '');
process.env.GROQ_API_KEY = '  gsk_test  ';
check('module: apiKey() reads GROQ_API_KEY and trims it', ai.apiKey() === 'gsk_test');

/* the exact 500 body the admin sees */
const missing = ai.missingKey();
check('module: the missing-key body carries its own code', missing.code === 'GROQ_KEY_MISSING');
check('module: the missing-key message names GROQ_API_KEY in Uzbek',
  /Iltimos, avval GROQ_API_KEY sozlang/.test(missing.message));
check('module: the missing-key hint points at the Groq console',
  /console\.groq\.com\/keys/.test(missing.hint) && /GROQ_API_KEY/.test(missing.hint));
check('module: the short missing-key error is actionable too',
  /GROQ_API_KEY/.test(ai.missingKeyError()) && /console\.groq\.com/.test(ai.missingKeyError()));

/* retired models are recognised, other failures are not */
check('module: Groq\'s model_decommissioned answer is recognised',
  ai.isRetiredModelError(404, '{"error":{"message":"The model llama-3.3-70b-versatile does not exist or you do not have access to it."}}')
  && ai.isRetiredModelError(400, '{"error":{"code":"model_decommissioned","message":"model_decommissioned"}}'));
check('module: unrelated failures are left alone',
  !ai.isRetiredModelError(500, 'overloaded') && !ai.isRetiredModelError(401, 'invalid api key')
  && !ai.isRetiredModelError(429, 'rate limit reached'));
check('module: the retirement hint explains how to pin a model',
  /GROQ_MODEL/.test(ai.modelHint(404, 'model_decommissioned')) && /gpt-oss-120b/.test(ai.modelHint(404, 'model_decommissioned')));
check('module: other errors carry no hint', ai.modelHint(500, 'overloaded') === '');

/* reasoning models get reasoning_effort, chat models do not */
check('module: gpt-oss is treated as a reasoning model',
  ai.isReasoningModel('openai/gpt-oss-120b') && !ai.isReasoningModel('llama-3.3-70b-versatile'));

/* message building (OpenAI format) */
const built = ai.buildMessages({
  system: 'SYSTEM',
  messages: [{ role: 'user', text: 'first' }, { role: 'model', text: 'second' }, { role: 'model', text: 'third' }],
  user: 'last'
});
check('module: the system prompt is the first message',
  built[0].role === 'system' && built[0].content === 'SYSTEM');
check('module: a model turn becomes an assistant turn and stays merged',
  built[1].role === 'user' && built[2].role === 'assistant' && built[2].content === 'second\nthird');
check('module: the new question closes the conversation', built[3].content === 'last');

/* JSON extraction */
check('module: plain JSON is parsed', ai.parseJson('{"band":7}').band === 7);
check('module: a ```json fence is stripped', ai.parseJson('```json\n{"band":6.5}\n```').band === 6.5);
check('module: a wrapping sentence does not break parsing', ai.parseJson('Here it is: {"band":8} — enjoy!').band === 8);
let threw = '';
try { ai.parseJson('not json at all'); } catch (err) { threw = err.message; }
check('module: invalid JSON fails loudly', /valid JSON/.test(threw));

/* ------------------------------------------------------------------ */
/* 2. No provider leftovers anywhere in the app                        */
/* ------------------------------------------------------------------ */
const SOURCES = ['api/coach.js', 'api/grade.js', 'api/quiz.js', 'api/generate-mock.js', 'api/config.js',
  'server.js', 'script.js', 'admin.js', 'mockGenerator.js', 'services.js', 'sw.js', 'supabaseClient.js',
  'i18n.js', 'lib/edgeTts.js', 'lib/aiCache.js', 'lib/aiGuardrails.js', 'index.html', '.env.example'];

for (const file of SOURCES) {
  const src = read('/' + file);
  check(`leftovers: ${file} mentions no Gemini code, key or URL`,
    !/gemini/i.test(src) && !/generativelanguage\.googleapis\.com/.test(src)
    && !/GEMINI_API_KEY/.test(src) && !/aistudio\.google\.com/.test(src));
}
for (const file of ['api/coach.js', 'api/grade.js', 'api/quiz.js', 'api/generate-mock.js']) {
  const src = read('/' + file);
  check(`wiring: ${file} uses the shared AI module`, src.includes("require('../lib/aiClient.js')"));
  check(`wiring: ${file} builds no provider URL of its own`,
    !/api\.groq\.com/.test(src) && !/generativelanguage\.googleapis\.com/.test(src));
  check(`wiring: ${file} no longer reads a key directly`, !/process\.env\.[A-Z_]*API_KEY/.test(src));
}
check('wiring: lib/edgeTts.js takes its TTS calls from the shared module',
  read('/lib/edgeTts.js').includes("require('./aiClient.js')") && !/GEMINI/.test(read('/lib/edgeTts.js')));
check('wiring: the env template documents GROQ_API_KEY',
  /^GROQ_API_KEY=/m.test(read('/.env.example')));

/* ------------------------------------------------------------------ */
/* 3. Every endpoint really calls Groq                                 */
/* ------------------------------------------------------------------ */
(async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  aiCache._memory.clear();
  ai._resetModelState();

  const calls = [];
  function stubGroq(handler) {
    global.fetch = async (url, options) => {
      const call = {
        url: String(url),
        headers: (options && options.headers) || {},
        body: options && options.body ? JSON.parse(options.body) : null
      };
      calls.push(call);
      return handler(call, calls.length);
    };
  }
  const userText = (call) => call.body.messages.map((m) => m.content).join('\n');

  /* --- 3a. grade: Writing --- */
  calls.length = 0;
  stubGroq(() => chatOk(JSON.stringify({
    tasks: [{
      title: 'Task 2', band: 7,
      criteria: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammar: 7 },
      strengths: ['clear position'], improvements: ['develop examples'], summary: 'solid'
    }],
    overallSummary: 'solid work'
  })));
  const grade = makeHandler('api/grade.js');
  let r = makeRes();
  await grade(req({ mode: 'writing', tasks: [{ title: 'Task 2', prompt: 'p', response: 'b '.repeat(300) }] }, '6.6.6.1'), r);
  check('grade: the request goes to Groq chat completions', calls.length === 1 && calls[0].url === ai.CHAT_ENDPOINT);
  check('grade: the request is authorised with the one key',
    calls[0].headers.Authorization === 'Bearer gsk_test');
  check('grade: max_tokens is 4096 so the band breakdown is never cut off',
    calls[0].body.max_tokens === 4096 && calls[0].body.model === ai.DEFAULT_MODEL);
  check('grade: the examiner is asked for JSON object mode', calls[0].body.response_format.type === 'json_object');
  check('grade: the guardrail system prompt travels with the request',
    calls[0].body.messages[0].role === 'system' && /IELTS Murabbiyi/.test(calls[0].body.messages[0].content));
  check('grade: a normal answer is still graded', r.statusCode === 200 && r.body.band === 7);

  /* --- 3b. coach --- */
  calls.length = 0;
  stubGroq(() => chatOk('Start Task 2 with a clear position sentence, then develop two body paragraphs.'));
  const coach = makeHandler('api/coach.js');
  r = makeRes();
  await coach(req({
    message: 'How do I plan my Writing Task 2?',
    profile: { band: 6, weakest: 'writing', mistakeCount: 3 },
    history: [{ role: 'user', text: 'hi' }, { role: 'model', text: 'hello' }]
  }, '6.6.6.2'), r);
  check('coach: posts to Groq with max_tokens 4096',
    calls.length === 1 && calls[0].url === ai.CHAT_ENDPOINT && calls[0].body.max_tokens === 4096);
  check('coach: the profile is inside the system prompt',
    /latest overall band: 6/.test(calls[0].body.messages[0].content) && /weakest skill: writing/.test(calls[0].body.messages[0].content));
  check('coach: the history is sent as OpenAI messages',
    calls[0].body.messages[1].role === 'user' && calls[0].body.messages[2].role === 'assistant'
    && calls[0].body.messages[3].content === 'How do I plan my Writing Task 2?');
  check('coach: the reply is returned unchanged',
    r.statusCode === 200 && /clear position sentence/.test(r.body.reply));

  /* --- 3c. quiz (falls back to the local bank when Groq fails) --- */
  calls.length = 0;
  stubGroq(() => errorResponse(429, { error: { message: 'rate limit reached', type: 'rate_limit_error' } }));
  aiCache._memory.clear();
  const quiz = makeHandler('api/quiz.js');
  r = makeRes();
  await quiz(req({ topic: 'vocabulary', count: 3 }, '6.6.6.3'), r);
  check('quiz: calls Groq first for a fresh topic',
    calls.length === 1 && calls[0].body.max_tokens === 4096 && calls[0].body.response_format.type === 'json_object');
  check('quiz: a provider failure still serves local questions',
    r.statusCode === 200 && Array.isArray(r.body.questions) && r.body.questions.length === 3);

  /* --- 3d. the mock generator --- */
  calls.length = 0;
  const listeningAnswer = {
    listening: {
      title: 'Listening Practice Test',
      parts: [1, 2, 3, 4].map((n) => ({
        partNumber: n,
        title: `Part ${n} — something`,
        instructions: `Questions ${(n - 1) * 10 + 1}–${n * 10}.`,
        transcript: 'Woman: Good morning. ' + 'This is a transcript with plenty of words in it. '.repeat(12),
        questions: Array.from({ length: 10 }, (_, i) => ({
          id: 'x', type: n === 2 ? 'multiple-choice' : 'form-completion',
          prompt: `Question ${i + 1}`, options: ['one', 'two', 'three', 'four'],
          answer: n === 2 ? 1 : 'words', explanation: 'because the transcript says so'
        }))
      }))
    }
  };
  stubGroq(() => chatOk(JSON.stringify(listeningAnswer)));
  const generate = makeHandler('api/generate-mock.js');
  r = makeRes();
  await generate(req({ skill: 'listening', testId: 'test9', label: 'Practice Test 9' }, '6.6.6.4'), r);
  check('generator: posts to Groq with the JSON response mode',
    calls.length === 1 && calls[0].url === ai.CHAT_ENDPOINT && calls[0].body.response_format.type === 'json_object');
  check('generator: Listening gets the big section budget, not 4096',
    calls[0].body.max_tokens === ai.SECTION_MAX_TOKENS);
  check('generator: the creative temperature is kept', calls[0].body.temperature === 0.85);
  check('generator: the planned theme is inside the prompt',
    userText(calls[0]).includes(r.body.plan.topics.listening));
  check('generator: a generated section is returned', r.statusCode === 200 && r.body.ok === true && !!r.body.payload);

  /* --- 3e. a retired model must not break the endpoint --- */
  calls.length = 0;
  ai._resetModelState();
  stubGroq((call) => (call.body.model === ai.DEFAULT_MODEL
    ? errorResponse(404, { error: { code: 'model_decommissioned', message: `The model ${ai.DEFAULT_MODEL} does not exist or you do not have access to it.` } })
    : chatOk('A perfectly normal answer about IELTS Writing Task 2 planning.')));
  r = makeRes();
  await coach(req({ message: 'Give me a 7-day Writing plan', profile: {}, history: [] }, '6.6.6.5'), r);
  check('fallback: a decommissioned model is retried on the live replacement',
    calls.length === 2 && calls[0].body.model === ai.DEFAULT_MODEL && calls[1].body.model === ai.FALLBACK_MODEL);
  check('fallback: reasoning is kept short for gpt-oss so the answer still fits',
    calls[1].body.reasoning_effort === 'low' && ai.MAX_TOKENS === 4096);
  check('fallback: the answer still reaches the candidate',
    r.statusCode === 200 && /IELTS Writing Task 2/.test(r.body.reply));
  calls.length = 0;
  r = makeRes();
  await coach(req({ message: 'What about Listening?', profile: {}, history: [] }, '6.6.6.6'), r);
  check('fallback: the live model is remembered for the next call',
    calls.length === 1 && calls[0].body.model === ai.FALLBACK_MODEL);

  /* --- 3f. provider errors surface as actionable text --- */
  ai._resetModelState();
  calls.length = 0;
  stubGroq(() => errorResponse(401, { error: { message: 'Invalid API Key', type: 'invalid_request_error' } }));
  r = makeRes();
  await grade(req({ mode: 'writing', tasks: [{ title: 'Task 2', prompt: 'p', response: 'c '.repeat(300) }] }, '6.6.6.7'), r);
  check('errors: a rejected key is reported with the provider status',
    r.statusCode === 500 && /Groq API error \(401\)/.test(r.body.error) && /Invalid API Key/.test(r.body.error));

  /* --- 3g. the missing key message is the one the admin sees --- */
  delete process.env.GROQ_API_KEY;
  const mockedKey = makeRes();
  await makeHandler('api/generate-mock.js')({ method: 'POST', headers: { 'x-forwarded-for': '6.6.6.8' }, socket: {}, body: { skill: 'listening' } }, mockedKey);
  check('missing key: the generator answers GROQ_KEY_MISSING',
    mockedKey.statusCode === 500 && mockedKey.body.code === 'GROQ_KEY_MISSING'
    && /Iltimos, avval GROQ_API_KEY sozlang/.test(mockedKey.body.message)
    && /console\.groq\.com\/keys/.test(mockedKey.body.hint));
  const guessedKey = makeRes();
  await makeHandler('api/grade.js')({ method: 'POST', headers: { 'x-forwarded-for': '6.6.6.9' }, socket: {}, body: { mode: 'writing', tasks: [{ response: 'a '.repeat(50) }] } }, guessedKey);
  check('missing key: the grading endpoint points at GROQ_API_KEY too',
    guessedKey.statusCode === 500 && /GROQ_API_KEY is not set/.test(guessedKey.body.error));
  process.env.GROQ_API_KEY = 'gsk_test';

  /* ------------------------------------------------------------------ */
  /* 4. Text-to-speech: labels, Orpheus limits, one joined WAV           */
  /* ------------------------------------------------------------------ */
  const labels = [
    ['Woman: Good morning, how can I help you?', 'Woman: '],
    ['Man: I would like to hire a bike.', 'Man: '],
    ['TUTOR: Let us look at your essay.', 'TUTOR: '],
    ['Dr Ahmed: The results are conclusive.', 'Dr Ahmed: '],
    ['Good morning. Woman: How can I help you?', 'Woman: ']
  ];
  check('tts: speaker labels are stripped so a verbatim engine cannot read them aloud',
    labels.every(([input, label]) => !tts.stripSpeakerLabels(input).includes(label)));
  check('tts: stripping keeps the spoken words',
    tts.stripSpeakerLabels('Woman: Good morning, how can I help you?') === 'Good morning, how can I help you?'
    && tts.stripSpeakerLabels('Good morning. Woman: How can I help you?') === 'Good morning. How can I help you?');
  check('tts: ordinary punctuation is left intact',
    tts.stripSpeakerLabels('The price is 50 pounds, and the time is 9 am: sharp.').includes('the time is 9 am: sharp'));
  check('tts: Orpheus vocal directions are dropped from a transcript',
    !/\[cheerful\]/.test(tts.spokenText('Woman: [cheerful] Welcome to the museum.'))
    && tts.spokenText('Woman: [cheerful] Welcome to the museum.').includes('Welcome to the museum'));

  check('tts: the module speaks through Groq\'s Orpheus model',
    ai.TTS_MODEL === 'canopylabs/orpheus-v1-english' && ai.TTS_VOICES.includes('troy')
    && ai.TTS_MAX_CHARS === 200 && ai.TTS_FORMAT === 'wav');

  const pcm = Buffer.alloc(2000, 7);
  const wav = tts.pcmToWav(pcm, 24000);
  const mono = tts.normalizeTtsAudio(wav, 'audio/wav');
  check('tts: a WAV answer is unwrapped back to raw PCM (no nested header)',
    mono.pcm.equals(pcm) && mono.rate === 24000);
  const raw = tts.normalizeTtsAudio(pcm, 'audio/L16;codec=pcm;rate=24000');
  check('tts: headerless PCM is still accepted',
    raw.pcm.equals(pcm) && raw.rate === 24000);
  check('tts: the sample rate comes from the WAV header when present',
    tts.normalizeTtsAudio(tts.pcmToWav(Buffer.alloc(400, 1), 22050), 'audio/wav').rate === 22050);

  const stereo = Buffer.alloc(8);
  stereo.writeInt16LE(1000, 0); stereo.writeInt16LE(3000, 2);
  stereo.writeInt16LE(-1000, 4); stereo.writeInt16LE(1000, 6);
  const down = tts.normalizeTtsAudio(makeWav(stereo, { channels: 2 }), 'audio/wav');
  check('tts: a stereo answer is down-mixed to mono samples',
    down.pcm.length === 4 && down.pcm.readInt16LE(0) === 2000 && down.pcm.readInt16LE(2) === 0);

  const odd = Buffer.concat([
    tts.pcmToWav(pcm, 24000).subarray(0, 36),
    Buffer.from('LIST'), (() => { const b = Buffer.alloc(4); b.writeUInt32LE(5, 0); return b; })(),
    Buffer.from('abcde\0'),
    Buffer.from('data'), (() => { const b = Buffer.alloc(4); b.writeUInt32LE(pcm.length, 0); return b; })(),
    pcm
  ]);
  const oddWav = Buffer.concat([odd.subarray(0, 4), (() => {
    const b = Buffer.alloc(4); b.writeUInt32LE(odd.length - 8, 0); return b;
  })(), odd.subarray(8)]);
  check('tts: chunk padding is handled when unwrapping a WAV',
    tts.normalizeTtsAudio(oddWav, 'audio/wav').pcm.equals(pcm));

  threw = '';
  try { tts.normalizeTtsAudio(Buffer.alloc(600, 3), 'audio/wav'); } catch (err) { threw = err.message; }
  check('tts: a claimed audio/wav with no RIFF header is rejected, not played as noise',
    /announced audio\/wav/.test(threw));
  threw = '';
  try { tts.normalizeTtsAudio(makeWav(Buffer.alloc(400), { format: 3 }), 'audio/wav'); } catch (err) { threw = err.message; }
  check('tts: an unsupported WAV format (float samples) fails loudly', /unsupported WAV format/.test(threw));

  /* Orpheus takes ≤ 200 characters, so the transcript is chunked */
  const longChunks = tts.chunkText('Woman: Welcome to the museum. ' + 'The tour begins at nine. '.repeat(30), 180);
  check('tts: long transcripts are chunked inside Orpheus\' 200-character limit',
    longChunks.length > 1 && longChunks.every((c) => c.length <= 180));

  /* a single speech request through the module */
  calls.length = 0;
  const speechPcm = Buffer.alloc(1500, 3);
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), headers: options.headers, body: JSON.parse(options.body) });
    return { ok: true, status: 200, arrayBuffer: async () => makeWav(speechPcm, { rate: 24000 }) };
  };
  const spoken = await ai.speech('Good morning, everyone.');
  check('speech: the request goes to Groq\'s OpenAI-format speech endpoint',
    calls[0].url === ai.SPEECH_ENDPOINT && calls[0].headers.Authorization === 'Bearer gsk_test');
  check('speech: the request uses the Orpheus model, a real voice and WAV',
    calls[0].body.model === ai.TTS_MODEL && ai.TTS_VOICES.includes(calls[0].body.voice)
    && calls[0].body.response_format === 'wav' && calls[0].body.input === 'Good morning, everyone.');
  check('speech: the returned audio is a WAV buffer',
    spoken.ext === 'wav' && spoken.mime === 'audio/wav' && spoken.buffer.slice(0, 4).toString() === 'RIFF');
  threw = '';
  try { await ai.speech('x'.repeat(201)); } catch (err) { threw = err.message; }
  check('speech: an over-long input is refused before it reaches the API', /200 characters/.test(threw));

  /* --- the real trap: many chunks of WAV must not become a WAV in a WAV --- */
  const longTranscript = 'Woman: Welcome to the museum. The tour begins at nine. '
    + 'Man: How much is the ticket? '.repeat(20)
    + 'Woman: Tickets cost twelve pounds for adults. '.repeat(20);
  const synthCalls = [];
  global.fetch = async (url, options) => {
    synthCalls.push({ url: String(url), body: JSON.parse(options.body) });
    return { ok: true, status: 200, arrayBuffer: async () => makeWav(Buffer.alloc(4000, 9), { rate: 24000 }) };
  };
  const synthesised = await tts.synthesizeWav(longTranscript);
  const riffCount = synthesised.toString('latin1').split('RIFF').length - 1;
  check('tts: a multi-chunk transcript is joined into ONE valid WAV',
    synthesised.toString('latin1', 0, 4) === 'RIFF'
    && synthesised.toString('latin1', 8, 12) === 'WAVE'
    && riffCount === 1);
  check('tts: the joined recording holds every chunk of audio',
    synthesised.readUInt32LE(40) === synthCalls.length * 4000
    && synthesised.readUInt32LE(40) + 44 === synthesised.length);
  check('tts: every speech chunk stays inside the Orpheus limit and drops the labels',
    synthCalls.length > 1
    && synthCalls.every((c) => c.url === ai.SPEECH_ENDPOINT && c.body.input.length <= ai.TTS_MAX_CHARS)
    && synthCalls.every((c) => !/Woman:|Man:/.test(c.body.input))
    && synthCalls.some((c) => /Welcome to the museum/.test(c.body.input)));

  /* the fallback engine labels itself groq-tts with a WAV payload */
  const viaFallback = await tts.synthesize('Woman: A short transcript for the fallback engine.', {
    endpoint: 'ws://127.0.0.1:1/edge/v1', transport: 'raw', rejectUnauthorized: false
  });
  check('tts: the Groq engine reports itself as groq-tts / audio/wav',
    viaFallback.source === 'groq-tts' && viaFallback.mime === 'audio/wav' && viaFallback.ext === 'wav'
    && viaFallback.buffer.toString('latin1', 0, 4) === 'RIFF');

  /* process.exit() can drop a pending pipe write (npm's stdio forwarder in
     particular), so flush the summary and give the reader a moment before
     the process disappears. */
  const summary = failed === 0 ? 'AI CLIENT TESTS OK ✓' : `${failed} AI CLIENT TEST(S) FAILED`;
  process.stdout.write('\n' + summary + '\n', () => {
    setTimeout(() => process.exit(failed === 0 ? 0 : 1), 50);
  });
})().catch((e) => {
  console.error('AI CLIENT TEST CRASH:', e);
  process.exit(1);
});
