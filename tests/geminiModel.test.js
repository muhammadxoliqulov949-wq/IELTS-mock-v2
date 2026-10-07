/* ===================================================================
 * Gemini model wiring — regression tests
 *
 * Why this suite exists: the text model id used to be hardcoded as the
 * literal `gemini-2.5-flash` in api/grade.js, api/coach.js, api/quiz.js
 * and api/generate-mock.js. When Google restricted that model
 * ("models/gemini-2.5-flash is no longer available to new users") every
 * AI endpoint started failing with 404 at once.
 *
 * What must never silently break again:
 *   • every Gemini call site uses lib/geminiModel.js — no hardcoded ids
 *   • the default id is a model that is actually served today
 *     (`gemini-2.0-flash` was shut down 2026-06-01; `gemini-2.5-flash`
 *     is restricted to keys that already used it)
 *   • GEMINI_MODEL / GEMINI_TTS_MODELS can retarget the endpoints without
 *     a code change, and are read per request
 *   • a 404 from Google surfaces an actionable message, not just JSON
 *   • the TTS fallback survives the 3.8 move: it answers with a finished
 *     WAV file, so chunk headers must be stripped before re-wrapping
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

/* A RIFF/WAVE file with any format the parser may meet (lib/edgeTts.js only
 * writes 16-bit mono, but Google's encoder decides what comes back). */
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

const gemini = require('../lib/geminiModel.js');
const tts = require('../lib/edgeTts.js');
const aiCache = require('../lib/aiCache.js');

/* ------------------------------------------------------------------ */
/* 1. The shared model module                                          */
/* ------------------------------------------------------------------ */
const CURRENT = 'gemini-3.8-flash';
const RETIRED = ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite',
  'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro',
  'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];

check('model: lib/geminiModel.js exists', fs.existsSync(path.join(root, 'lib/geminiModel.js')));
check('model: the default text model is the current GA Flash', gemini.DEFAULT_MODEL === CURRENT);
check('model: the default is not a retired or restricted id',
  !RETIRED.includes(gemini.model()));
check('model: model() with no override returns the default', gemini.model() === gemini.DEFAULT_MODEL);
check('model: the endpoint is the v1beta generateContent route',
  gemini.endpoint() === `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT}:generateContent`);
check('model: url() carries the key as a query parameter',
  gemini.url('abc 123').endsWith(`:generateContent?key=abc%20123`));

/* the override is read per call, so a rotation needs no redeploy */
process.env.GEMINI_MODEL = 'gemini-3.5-flash';
check('model: GEMINI_MODEL retargets the endpoint without a code change',
  gemini.model() === 'gemini-3.5-flash' && gemini.endpoint().includes('models/gemini-3.5-flash:'));
process.env.GEMINI_MODEL = '   ';
check('model: a blank GEMINI_MODEL falls back to the default', gemini.model() === CURRENT);
delete process.env.GEMINI_MODEL;

/* TTS ids live here too */
check('model: the TTS fallbacks are the 3.8 TTS models',
  gemini.DEFAULT_TTS_MODELS[0] === 'gemini-3.8-flash-tts'
  && gemini.DEFAULT_TTS_MODELS.every(m => !RETIRED.includes(m)));
check('model: ttsModels() returns a copy of the defaults',
  gemini.ttsModels().join(',') === gemini.DEFAULT_TTS_MODELS.join(',')
  && gemini.ttsModels() !== gemini.DEFAULT_TTS_MODELS);
process.env.GEMINI_TTS_MODELS = 'gemini-3.8-flash-tts, gemini-3.8-flash-lite-tts';
check('model: GEMINI_TTS_MODELS is parsed and trimmed',
  gemini.ttsModels().join('|') === 'gemini-3.8-flash-tts|gemini-3.8-flash-lite-tts');
process.env.GEMINI_TTS_MODELS = ',,';
check('model: a junk GEMINI_TTS_MODELS falls back to the defaults',
  gemini.ttsModels().join(',') === gemini.DEFAULT_TTS_MODELS.join(','));
delete process.env.GEMINI_TTS_MODELS;

/* the exact 404 Google sent — it must produce actionable advice */
const google404 = 'models/gemini-2.5-flash is no longer available to new users. '
  + 'Please update your code to use models/gemini-3.8-flash';
check('model: a model-not-found 404 explains how to fix it',
  /GEMINI_MODEL/.test(gemini.modelNotFoundHint(404, google404))
  && gemini.modelNotFoundHint(404, google404).includes(CURRENT));
check('model: other failures are left alone',
  gemini.modelNotFoundHint(500, 'overloaded') === ''
  && gemini.modelNotFoundHint(404, 'quota') === '');

/* ------------------------------------------------------------------ */
/* 2. No hardcoded / stale model ids anywhere in the app code          */
/* ------------------------------------------------------------------ */
const SOURCES = ['api/coach.js', 'api/grade.js', 'api/quiz.js', 'api/generate-mock.js',
  'api/config.js', 'server.js', 'script.js', 'admin.js', 'mockGenerator.js',
  'services.js', 'sw.js', 'supabaseClient.js', 'lib/edgeTts.js', 'lib/geminiModel.js'];

for (const file of ['api/coach.js', 'api/grade.js', 'api/quiz.js', 'api/generate-mock.js']) {
  const src = read('/' + file);
  check(`wiring: ${file} uses lib/geminiModel.js`, src.includes("require('../lib/geminiModel.js')"));
  check(`wiring: ${file} no longer builds a hardcoded models/… URL`,
    !/generativelanguage\.googleapis\.com/.test(src) && !/'gemini-/.test(src));
}
check('wiring: lib/edgeTts.js takes its TTS ids from the shared module',
  read('/lib/edgeTts.js').includes("require('./geminiModel.js')")
  && !read('/lib/edgeTts.js').includes('GEMINI_TTS_MODELS = ['));

for (const file of SOURCES) {
  /* lib/geminiModel.js is the one place allowed to name the old ids: it
     documents why they were replaced so the next person does not re-add
     them. Every other file must be clean. */
  if (file === 'lib/geminiModel.js') continue;
  const src = read('/' + file);
  const stale = RETIRED.filter(id => src.includes(id));
  check(`stale: ${file} mentions no retired or restricted model (${stale.join(', ') || 'clean'})`, stale.length === 0);
}

/* ------------------------------------------------------------------ */
/* 3. Every endpoint really calls the new model                        */
/* ------------------------------------------------------------------ */
(async () => {
  process.env.GEMINI_API_KEY = 'fake-key';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  aiCache._memory.clear();

  const calls = [];
  function stubGemini(response) {
    global.fetch = async (url, options) => {
      const target = String(url);
      calls.push({ url: target, body: options && options.body ? JSON.parse(options.body) : null });
      return response;
    };
  }
  const ok = (payload) => ({ ok: true, status: 200, json: async () => payload });
  const notFound = { ok: false, status: 404, text: async () => google404 };

  /* --- 3a. grade --- */
  calls.length = 0;
  stubGemini(notFound);
  const grade = makeHandler('api/grade.js');
  let r = makeRes();
  await grade(req({
    mode: 'writing',
    tasks: [{ title: 'Task 2', prompt: 'p', response: 'a '.repeat(200) }]
  }, '6.6.6.1'), r);
  const gradeUrl = calls[0] && calls[0].url || '';
  check('grade: posts to the current model', gradeUrl.includes(`models/${CURRENT}:generateContent`));
  check('grade: the request is keyed and carries no stale model',
    gradeUrl.includes('key=fake-key') && !gradeUrl.includes('gemini-2.5-flash'));
  check('grade: the 404 is reported with the fix hint',
    /Gemini API error \(404\)/.test(r.body.error || '') && /GEMINI_MODEL/.test(r.body.error || ''));

  /* --- 3b. coach --- */
  calls.length = 0;
  stubGemini(notFound);
  const coach = makeHandler('api/coach.js');
  r = makeRes();
  await coach(req({ message: 'How do I plan my Writing Task 2?', profile: { band: 6 }, history: [] }, '6.6.6.2'), r);
  check('coach: posts to the current model',
    calls.length === 1 && calls[0].url.includes(`models/${CURRENT}:generateContent`));
  check('coach: the 404 is reported with the fix hint',
    /Gemini API error \(404\)/.test(r.body.error || '') && /GEMINI_MODEL/.test(r.body.error || ''));

  /* --- 3c. quiz (falls back to the local bank, but still calls the model) --- */
  calls.length = 0;
  stubGemini(notFound);
  const quiz = makeHandler('api/quiz.js');
  r = makeRes();
  await quiz(req({ topic: 'vocabulary', count: 3 }, '6.6.6.3'), r);
  check('quiz: posts to the current model',
    calls.length === 1 && calls[0].url.includes(`models/${CURRENT}:generateContent`));
  check('quiz: a Gemini failure still serves local questions',
    r.statusCode === 200 && Array.isArray(r.body.questions) && r.body.questions.length === 3);

  /* --- 3d. the mock generator --- */
  calls.length = 0;
  stubGemini(notFound);
  const generate = makeHandler('api/generate-mock.js');
  r = makeRes();
  await generate(req({ skill: 'listening' }, '6.6.6.4'), r);
  check('generator: posts to the current model',
    calls.length === 1 && calls[0].url.includes(`models/${CURRENT}:generateContent`));
  check('generator: the request keeps the JSON response mode',
    calls[0].body && calls[0].body.generationConfig.responseMimeType === 'application/json');
  check('generator: the 404 is reported with the fix hint',
    /GEMINI_MODEL/.test(r.body.error || ''));

  /* --- 3e. a successful call still parses (no shape regression) --- */
  calls.length = 0;
  stubGemini(ok({ candidates: [{ content: { parts: [{ text: JSON.stringify({
    tasks: [{ title: 'Task 2', band: 7, criteria: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammar: 7 }, strengths: [], improvements: [], summary: 'good' }],
    overallSummary: 'solid'
  }) }] } }] }));
  r = makeRes();
  await grade(req({
    mode: 'writing',
    tasks: [{ title: 'Task 2', prompt: 'p', response: 'b '.repeat(300) }]
  }, '6.6.6.5'), r);
  check('grade: a normal answer is still graded', r.statusCode === 200 && r.body.band === 7);

  /* ------------------------------------------------------------------ */
  /* 4. TTS fallback: labels, formats, and the WAV-in-WAV trap          */
  /* ------------------------------------------------------------------ */
  const labels = [
    ['Woman: Good morning, how can I help you?', 'Woman: '],
    ['Man: I would like to hire a bike.', 'Man: '],
    ['TUTOR: Let us look at your essay.', 'TUTOR: '],
    ['Dr Ahmed: The results are conclusive.', 'Dr Ahmed: '],
    ['Good morning. Woman: How can I help you?', 'Woman: ']
  ];
  check('tts: speaker labels are stripped so a verbatim model cannot read them aloud',
    labels.every(([input, label]) => !tts.stripSpeakerLabels(input).includes(label)));
  check('tts: stripping keeps the spoken words',
    tts.stripSpeakerLabels('Woman: Good morning, how can I help you?') === 'Good morning, how can I help you?'
    && tts.stripSpeakerLabels('Good morning. Woman: How can I help you?') === 'Good morning. How can I help you?');
  check('tts: ordinary punctuation is left intact',
    tts.stripSpeakerLabels('The price is 50 pounds, and the time is 9 am: sharp.')
      .includes('the time is 9 am: sharp')
    && tts.stripSpeakerLabels('There are three options: bus, tram or bike.').includes('three options: bus'));

  const pcm = Buffer.alloc(2000, 7);
  const wav = tts.pcmToWav(pcm, 24000);
  const mono = tts.normalizeGeminiAudio(wav, 'audio/wav');
  check('tts: a WAV answer is unwrapped back to raw PCM (no nested header)',
    mono.pcm.equals(pcm) && mono.rate === 24000);
  const raw = tts.normalizeGeminiAudio(pcm, 'audio/L16;codec=pcm;rate=24000');
  check('tts: legacy headerless PCM is still accepted',
    raw.pcm.equals(pcm) && raw.rate === 24000);
  check('tts: the sample rate comes from the WAV header when present',
    tts.normalizeGeminiAudio(tts.pcmToWav(Buffer.alloc(400, 1), 22050), 'audio/wav').rate === 22050);

  /* stereo → mono downmix (pcmToWav is mono-only, so build the header here) */
  const stereo = Buffer.alloc(8);
  stereo.writeInt16LE(1000, 0); stereo.writeInt16LE(3000, 2);
  stereo.writeInt16LE(-1000, 4); stereo.writeInt16LE(1000, 6);
  const down = tts.normalizeGeminiAudio(makeWav(stereo, { channels: 2 }), 'audio/wav');
  check('tts: a stereo answer is down-mixed to mono samples',
    down.pcm.length === 4 && down.pcm.readInt16LE(0) === 2000 && down.pcm.readInt16LE(2) === 0);

  /* odd-sized chunk before the data chunk (word alignment) */
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
    tts.normalizeGeminiAudio(oddWav, 'audio/wav').pcm.equals(pcm));

  let threw = '';
  try { tts.normalizeGeminiAudio(Buffer.alloc(600, 3), 'audio/wav'); } catch (err) { threw = err.message; }
  check('tts: a claimed audio/wav with no RIFF header is rejected, not played as noise',
    /announced audio\/wav/.test(threw));
  threw = '';
  try { tts.normalizeGeminiAudio(makeWav(Buffer.alloc(400), { format: 3 }), 'audio/wav'); } catch (err) { threw = err.message; }
  check('tts: an unsupported WAV format (float samples) fails loudly', /unsupported WAV format/.test(threw));
  threw = '';
  try { tts.normalizeGeminiAudio(makeWav(Buffer.alloc(400), { bits: 24 }), 'audio/wav'); } catch (err) { threw = err.message; }
  check('tts: an unsupported WAV bit depth fails loudly', /unsupported WAV format/.test(threw));

  /* --- the real trap: two chunks of WAV must not become a WAV in a WAV --- */
  const longTranscript = 'Woman: Welcome to the museum. The tour begins at nine. '
    + 'Man: How much is the ticket? '.repeat(60)
    + 'Woman: Tickets cost twelve pounds for adults. '.repeat(60);
  const synthCalls = [];
  global.fetch = async (url, options) => {
    synthCalls.push({ url: String(url), body: JSON.parse(options.body) });
    return ok({ candidates: [{ content: { parts: [{ inlineData: {
      mimeType: 'audio/wav',
      data: tts.pcmToWav(Buffer.alloc(4000, 9), 24000).toString('base64')
    } }] } }] });
  };
  const synthesised = await tts.synthesizeWav(longTranscript, { models: ['gemini-3.8-flash-tts'] });
  const riffCount = synthesised.toString('latin1').split('RIFF').length - 1;
  check('tts: a multi-chunk transcript is joined into ONE valid WAV',
    synthesised.toString('latin1', 0, 4) === 'RIFF'
    && synthesised.toString('latin1', 8, 12) === 'WAVE'
    && riffCount === 1);
  check('tts: the joined recording holds every chunk of audio',
    synthesised.readUInt32LE(40) === synthCalls.length * 4000
    && synthesised.readUInt32LE(40) + 44 === synthesised.length);
  check('tts: the TTS request carries the current model and strips the labels',
    synthCalls.length > 1
    && synthCalls.every(c => c.url.includes('models/gemini-3.8-flash-tts:generateContent'))
    && synthCalls.every(c => {
      const text = c.body.contents[0].parts[0].text;
      return !text.includes('Woman:') && !text.includes('Man:');
    })
    && synthCalls[0].body.contents[0].parts[0].text.includes('Welcome to the museum'));
  check('tts: the request asks for audio through the prebuilt voice',
    synthCalls[0].body.generationConfig.responseModalities[0] === 'AUDIO'
    && !!synthCalls[0].body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName);

  /* the fallback engine still labels itself gemini-tts with a WAV payload */
  const viaFallback = await tts.synthesize('Woman: A short transcript for the fallback engine.', {
    endpoint: 'ws://127.0.0.1:1/edge/v1', transport: 'raw', rejectUnauthorized: false
  });
  check('tts: the Gemini engine still reports itself as gemini-tts / audio/wav',
    viaFallback.source === 'gemini-tts' && viaFallback.mime === 'audio/wav' && viaFallback.ext === 'wav'
    && viaFallback.buffer.toString('latin1', 0, 4) === 'RIFF');

  /* process.exit() can drop a pending pipe write (npm's stdio forwarder in
     particular), so flush the summary and give the reader a moment before
     the process disappears. */
  const summary = failed === 0 ? 'GEMINI MODEL TESTS OK ✓' : `${failed} GEMINI MODEL TEST(S) FAILED`;
  process.stdout.write('\n' + summary + '\n', () => {
    setTimeout(() => process.exit(failed === 0 ? 0 : 1), 50);
  });
})().catch((e) => {
  console.error('GEMINI MODEL TEST CRASH:', e);
  process.exit(1);
});
