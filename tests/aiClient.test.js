/* ===================================================================
 * Single AI provider wiring — regression tests
 *
 * Why this suite exists: every server-side AI feature (grade, coach,
 * quiz, 1-Click mock generator) used to call its own hardcoded model
 * URL. When the provider rotated access, every AI endpoint started
 * failing at once and the fix was a multi-file hunt.
 *
 * What must never silently break again:
 *   • every AI call site uses lib/aiClient.js — no hardcoded provider
 *     URLs, model ids or auth schemes in the endpoints
 *   • the provider is Groq (OpenAI chat format), the model is
 *     llama-3.3-70b-versatile, the only key is GROQ_API_KEY
 *   • every call sends max_tokens 4096, so long answers never truncate
 *   • GROQ_MODEL can retarget the model without a code change
 *   • a 401/404/429 from Groq surfaces an actionable message
 *   • no trace of the previous provider remains anywhere in the repo
 *     (the scan below covers code, tests, docs and config — including
 *     this very file, which is why the banned tokens are built from
 *     pieces instead of written out)
 *   • TTS is keyless Edge TTS only: no AI fallback hides behind it
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

const ai = require('../lib/aiClient.js');
const tts = require('../lib/edgeTts.js');
const aiCache = require('../lib/aiCache.js');

/* ------------------------------------------------------------------ */
/* 1. The shared AI module                                             */
/* ------------------------------------------------------------------ */
const CURRENT = 'llama-3.3-70b-versatile';
const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

check('ai: lib/aiClient.js exists', fs.existsSync(path.join(root, 'lib/aiClient.js')));
const retiredModule = 'lib/ge' + 'mini' + 'Model.js';
const retiredSuite = 'tests/ge' + 'mini' + 'Model.test.js';
check('ai: the retired provider module is gone', !fs.existsSync(path.join(root, retiredModule)));
check('ai: the retired provider suite is gone', !fs.existsSync(path.join(root, retiredSuite)));
check('ai: the base URL is the Groq OpenAI endpoint', ai.API_BASE === 'https://api.groq.com/openai/v1');
check('ai: the default model is llama-3.3-70b-versatile', ai.DEFAULT_MODEL === CURRENT);
check('ai: every call budgets 4096 output tokens', ai.DEFAULT_MAX_TOKENS === 4096);
check('ai: the key-missing code is GROQ_KEY_MISSING', ai.KEY_MISSING_CODE === 'GROQ_KEY_MISSING');
check('ai: model() with no override returns the default', ai.model() === ai.DEFAULT_MODEL);
check('ai: endpoint() is the chat completions route', ai.endpoint() === CHAT_URL);
check('ai: headers() carry the key as a Bearer token',
  ai.headers('abc 123').Authorization === 'Bearer abc 123'
  && ai.headers('x')['Content-Type'] === 'application/json');

/* the override is read per call, so a rotation needs no redeploy */
process.env.GROQ_MODEL = 'llama-3.1-8b-instant';
check('ai: GROQ_MODEL retargets the model without a code change', ai.model() === 'llama-3.1-8b-instant');
process.env.GROQ_MODEL = '   ';
check('ai: a blank GROQ_MODEL falls back to the default', ai.model() === CURRENT);
delete process.env.GROQ_MODEL;

/* the single key */
process.env.GROQ_API_KEY = '  key-1  ';
check('ai: apiKey() reads the trimmed GROQ_API_KEY', ai.apiKey() === 'key-1');
delete process.env.GROQ_API_KEY;
check('ai: apiKey() is empty when the key is missing', ai.apiKey() === '');

/* the tolerant JSON parser the endpoints share */
check('ai: parseJson reads plain JSON', ai.parseJson('{"a":1}').a === 1);
check('ai: parseJson strips fenced blocks', ai.parseJson('```json\n{"a":1}\n```').a === 1);
check('ai: parseJson skips a preamble', ai.parseJson('Sure! {"a":1} done').a === 1);
let threw = '';
try { ai.parseJson('no json here'); } catch (err) { threw = err.message; }
check('ai: parseJson fails loudly on garbage', /did not return valid JSON/.test(threw));

/* provider errors must tell the admin how to fix them */
check('ai: a 401 explains the key is missing or invalid',
  /GROQ_API_KEY/.test(ai.groqErrorHint(401, 'Invalid API key')) && /console\.groq\.com/.test(ai.groqErrorHint(401, 'x')));
check('ai: a decommissioned model points at GROQ_MODEL',
  /GROQ_MODEL/.test(ai.groqErrorHint(404, 'model decommissioned')) && ai.groqErrorHint(404, 'model decommissioned').includes(CURRENT));
check('ai: a 429 says to wait and retry', /rate limit/i.test(ai.groqErrorHint(429, 'rate limit reached')));
check('ai: other failures are left alone', ai.groqErrorHint(500, 'overloaded') === '');

/* ------------------------------------------------------------------ */
/* 2. Wiring: one provider, zero leftovers                             */
/* ------------------------------------------------------------------ */
for (const file of ['api/coach.js', 'api/grade.js', 'api/quiz.js', 'api/generate-mock.js']) {
  const src = read('/' + file);
  check(`wiring: ${file} uses lib/aiClient.js`, src.includes("require('../lib/aiClient.js')"));
  check(`wiring: ${file} hardcodes no provider URL or model id`,
    !src.includes('api.groq.com') && !src.includes('llama-'));
  check(`wiring: ${file} calls the model only through the shared client`,
    /ai\.(chat|completeJson|completeText)\(/.test(src));
}
check('wiring: lib/edgeTts.js needs no AI key (keyless engine)',
  !read('/lib/edgeTts.js').includes('GROQ_') && !read('/lib/edgeTts.js').includes("require('./aiClient.js')"));

/* Every remaining trace of the previous provider fails the build. The
 * tokens are assembled from pieces so this file itself stays scannable:
 * a literal here would trip the very check it defines. */
const BANNED = ['ge' + 'mini', 'generative' + 'language', 'ai' + 'studio'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'public', 'coverage', 'test-results', 'playwright-report', '.cache', '.vercel']);
const SCAN_EXTS = new Set(['.js', '.md', '.json', '.sql', '.html', '.css', '.xml', '.txt', '.webmanifest']);
function collect(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      collect(full, out);
    } else if (SCAN_EXTS.has(path.extname(entry.name)) || entry.name.endsWith('.example')) {
      if (entry.name === 'package-lock.json') continue;
      out.push(full);
    }
  }
  return out;
}
const scanned = collect(root, []);
let dirty = [];
for (const full of scanned) {
  const low = fs.readFileSync(full, 'utf8').toLowerCase();
  const hits = BANNED.filter(t => low.includes(t));
  if (hits.length) dirty.push(path.relative(root, full) + ' [' + hits.join(',') + ']');
}
check(`leftovers: no previous-provider trace in ${scanned.length} repo files (${dirty.join('; ') || 'clean'})`, dirty.length === 0);

/* ------------------------------------------------------------------ */
/* 3. Every endpoint really calls Groq                                 */
/* ------------------------------------------------------------------ */
(async () => {
  process.env.GROQ_API_KEY = 'fake-key';
  delete process.env.GROQ_MODEL;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  aiCache._memory.clear();

  const calls = [];
  function stubGroq(response) {
    global.fetch = async (url, options) => {
      calls.push({ url: String(url), headers: (options && options.headers) || {}, body: options && options.body ? JSON.parse(options.body) : null });
      return response;
    };
  }
  const ok = (content) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });
  const denied = { ok: false, status: 401, text: async () => 'Invalid API key' };

  /* --- 3a. grade --- */
  calls.length = 0;
  stubGroq(denied);
  const grade = makeHandler('api/grade.js');
  let r = makeRes();
  await grade(req({
    mode: 'writing',
    tasks: [{ title: 'Task 2', prompt: 'p', response: 'a '.repeat(200) }]
  }, '6.6.6.1'), r);
  const gradeCall = calls[0] || {};
  check('grade: posts to the Groq chat endpoint', gradeCall.url === CHAT_URL);
  check('grade: the request carries the model, the key and the token budget',
    gradeCall.body && gradeCall.body.model === CURRENT
    && gradeCall.headers.Authorization === 'Bearer fake-key'
    && gradeCall.body.max_tokens === 4096);
  check('grade: the request is a guarded system prompt plus JSON mode',
    gradeCall.body && gradeCall.body.messages[0].role === 'system'
    && gradeCall.body.messages[0].content.includes('IELTS Murabbiyi')
    && gradeCall.body.response_format.type === 'json_object');
  check('grade: a 401 is reported with the key hint',
    /Groq API error \(401\)/.test(r.body.error || '') && /GROQ_API_KEY/.test(r.body.error || ''));

  /* --- 3b. coach --- */
  calls.length = 0;
  stubGroq(denied);
  const coach = makeHandler('api/coach.js');
  r = makeRes();
  await coach(req({
    message: 'How do I plan my Writing Task 2?',
    profile: { band: 6 },
    history: [{ role: 'user', text: 'q1' }, { role: 'model', text: 'a1' }, { role: 'assistant', text: 'a2' }]
  }, '6.6.6.2'), r);
  const coachCall = calls[0] || {};
  const roles = (coachCall.body && coachCall.body.messages || []).map(m => m.role);
  check('coach: posts to the Groq chat endpoint', coachCall.url === CHAT_URL);
  check('coach: history becomes user/assistant turns after the system prompt',
    JSON.stringify(roles) === JSON.stringify(['system', 'user', 'assistant', 'user'])
    && coachCall.body.messages[2].content.includes('a1')
    && coachCall.body.messages[2].content.includes('a2')
    && coachCall.body.temperature === 0.6
    && coachCall.body.max_tokens === 4096);
  check('coach: plain-text answers use no JSON mode', coachCall.body && !coachCall.body.response_format);
  check('coach: a 401 is reported with the key hint',
    /Groq API error \(401\)/.test(r.body.error || '') && /GROQ_API_KEY/.test(r.body.error || ''));

  /* a guarded refusal comes back canonical */
  const guard = require('../lib/aiGuardrails.js');
  stubGroq(ok(guard.REFUSAL_MESSAGE));
  r = makeRes();
  await coach(req({ message: 'How do I start Writing Task 1?', profile: {}, history: [] }, '6.6.6.20'), r);
  check('coach: a model refusal is swapped for the canonical sentence',
    r.statusCode === 200 && r.body.reply === guard.REFUSAL_MESSAGE && r.body.offTopic === true);

  /* --- 3c. quiz (falls back to the local bank, but still calls the model) --- */
  calls.length = 0;
  stubGroq(denied);
  const quiz = makeHandler('api/quiz.js');
  r = makeRes();
  await quiz(req({ topic: 'vocabulary', count: 3 }, '6.6.6.3'), r);
  check('quiz: posts to the Groq chat endpoint in JSON mode',
    calls.length === 1 && calls[0].url === CHAT_URL && calls[0].body.response_format.type === 'json_object'
    && calls[0].body.max_tokens === 4096);
  check('quiz: a Groq failure still serves local questions',
    r.statusCode === 200 && Array.isArray(r.body.questions) && r.body.questions.length === 3);

  const aiQuestions = { questions: [0, 1].map(i => ({ prompt: 'q' + i, options: ['a', 'b', 'c', 'd'], answer: 1, explanation: 'e' })) };
  stubGroq(ok(JSON.stringify(aiQuestions)));
  r = makeRes();
  await quiz(req({ topic: 'reading', count: 2 }, '6.6.6.30'), r);
  check('quiz: an AI answer is served with the ai source',
    r.statusCode === 200 && r.body.source === 'ai' && r.body.questions.length === 2 && r.body.questions[0].prompt === 'q0');

  /* --- 3d. the mock generator --- */
  calls.length = 0;
  stubGroq(denied);
  const generate = makeHandler('api/generate-mock.js');
  const pool = require('../lib/topicPool.js');
  r = makeRes();
  await generate(req({ skill: 'reading', plan: pool.buildPlan({ topic: 'Marine biology' }) }, '6.6.6.4'), r);
  const genCall = calls[0] || {};
  check('generator: posts to the Groq chat endpoint',
    calls.length === 1 && genCall.url === CHAT_URL);
  check('generator: the request keeps temperature 0.85, the token budget and JSON mode',
    genCall.body && genCall.body.temperature === 0.85
    && genCall.body.max_tokens === 4096
    && genCall.body.response_format.type === 'json_object');
  check('generator: the request carries the planned topic',
    genCall.body && genCall.body.messages.some(m => m.role === 'user' && String(m.content).includes('Marine biology')));
  check('generator: a 401 is reported with the key hint', /GROQ_API_KEY/.test(r.body.error || ''));

  /* --- 3e. a successful call still parses (no shape regression) --- */
  calls.length = 0;
  stubGroq(ok(JSON.stringify({
    tasks: [{ title: 'Task 2', band: 7, criteria: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammar: 7 }, strengths: [], improvements: [], summary: 'good' }],
    overallSummary: 'solid'
  })));
  r = makeRes();
  await grade(req({
    mode: 'writing',
    tasks: [{ title: 'Task 2', prompt: 'p', response: 'b '.repeat(300) }]
  }, '6.6.6.5'), r);
  check('grade: a normal answer is still graded', r.statusCode === 200 && r.body.band === 7);

  /* --- 3f. no key, no call --- */
  delete process.env.GROQ_API_KEY;
  calls.length = 0;
  stubGroq(ok('{}'));
  r = makeRes();
  await grade(req({ mode: 'writing', tasks: [{ title: 'T', prompt: 'p', response: 'c '.repeat(100) }] }, '6.6.6.6'), r);
  check('grade: without GROQ_API_KEY the setup message names the key',
    r.statusCode === 500 && /GROQ_API_KEY/.test(r.body.error || '') && calls.length === 0);
  r = makeRes();
  await generate(req({ skill: 'listening' }, '6.6.6.7'), r);
  check('generator: without GROQ_API_KEY the admin sees GROQ_KEY_MISSING',
    r.statusCode === 500 && r.body.code === 'GROQ_KEY_MISSING'
    && /Iltimos, avval GROQ_API_KEY sozlang/.test(r.body.message || ''));
  let keyErr = null;
  try { await ai.chat([{ role: 'user', content: 'hi' }]); } catch (err) { keyErr = err; }
  check('ai: chat() without a key throws the coded error',
    keyErr && keyErr.code === 'GROQ_KEY_MISSING' && /GROQ_API_KEY/.test(keyErr.message));
  process.env.GROQ_API_KEY = 'fake-key';

  /* ------------------------------------------------------------------ */
  /* 4. TTS is Edge-only: no AI engine hides behind it                  */
  /* ------------------------------------------------------------------ */
  const retiredSpeech = tts['normalize' + 'Ge' + 'mini' + 'Audio'];
  check('tts: the keyed speech helpers are gone',
    typeof tts.synthesizeWav === 'undefined'
    && typeof retiredSpeech === 'undefined'
    && typeof tts.pcmToWav === 'undefined');
  check('tts: the Edge engine and the label stripper remain',
    typeof tts.synthesize === 'function'
    && typeof tts.synthesizeMp3 === 'function'
    && typeof tts.stripSpeakerLabels === 'function');

  let fetches = 0;
  global.fetch = async () => { fetches += 1; throw new Error('must not be called'); };
  let ttsErr = null;
  try {
    await tts.synthesize('Woman: A transcript the unreachable engine cannot speak.', {
      endpoint: 'ws://127.0.0.1:1/edge/v1', transport: 'raw', rejectUnauthorized: false
    });
  } catch (err) { ttsErr = err; }
  check('tts: an unreachable engine rejects with an Edge error', ttsErr && /^Edge TTS: /.test(ttsErr.message));
  check('tts: the failure triggers no hidden AI fallback', fetches === 0);

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
