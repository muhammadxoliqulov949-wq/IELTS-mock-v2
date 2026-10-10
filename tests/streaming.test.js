'use strict';

/* Tests for the new streaming + multi-provider router additions:
 *   1. streamChat() yields chunks and finalises correctly.
 *   2. Multi-key round-robin distributes requests across GROQ_API_KEY_1..N.
 *   3. 429 / network failover moves to the next key within ~100ms.
 *   4. DeepSeek is used as the ultimate fallback when Groq keys are exhausted.
 *   4b. When EVERY provider answers 429, the pass is repeated after an
 *      exponential wait (2–3 s, 4–5 s, 8–9 s) — for streams too, as long as
 *      nothing has been yielded yet.
 *   5. The SSE endpoint (api/coach.js with Accept: text/event-stream) emits
 *      connected, chunk, and done events; cached replies stream in one shot.
 *
 * Each test reloads lib/aiClient.js fresh so the round-robin pointer starts
 * from zero — otherwise state leaks between tests.
 */
const assert = require('node:assert/strict');

function freshAiClient() {
  delete require.cache[require.resolve('../lib/aiClient.js')];
  delete require.cache[require.resolve('../lib/aiGuardrails.js')];
  delete require.cache[require.resolve('../lib/aiCache.js')];
  return require('../lib/aiClient.js');
}

const aiCache = require('../lib/aiCache.js');

let savedEnv = {};
function saveEnv() {
  savedEnv = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_API_KEY_1: process.env.GROQ_API_KEY_1,
    GROQ_API_KEY_2: process.env.GROQ_API_KEY_2,
    GROQ_API_KEY_3: process.env.GROQ_API_KEY_3,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    GROQ_FALLBACK_MODEL: process.env.GROQ_FALLBACK_MODEL
  };
}
function restoreEnv() {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

/* Clean all Groq/DeepSeek keys from env so buildPrimaryPool() is deterministic. */
function clearKeys() {
  delete process.env.GROQ_API_KEY;
  for (let i = 1; i <= 5; i++) delete process.env[`GROQ_API_KEY_${i}`];
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.GROQ_MODEL;
  delete process.env.GROQ_FALLBACK_MODEL;
}

const oldFetch = global.fetch;

function makeSSEStream(chunks) {
  const enc = new TextEncoder();
  let idx = 0;
  return new (class R {
    getReader() {
      return {
        async read() {
          if (idx >= chunks.length) return { done: true, value: undefined };
          const c = chunks[idx++];
          return { done: false, value: enc.encode(c) };
        },
        releaseLock() {}
      };
    }
  })();
}

function sseChunk(delta) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: delta }, finish_reason: null }] })}\n\n`;
}
function sseDone() {
  return `data: [DONE]\n\n`;
}

async function testStreamChatYieldsDeltas() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  try {
    process.env.GROQ_API_KEY = 'stream-test-key';

    const chunks = [sseChunk('Hello '), sseChunk('world'), sseChunk('!'), sseDone()];
    global.fetch = async () => ({ ok: true, status: 200, body: makeSSEStream(chunks) });

    const deltas = [];
    let final = null;
    for await (const c of aiClient.streamChat([{ role: 'user', content: 'hi' }], { temperature: 0.6 })) {
      if (c.done) final = c;
      else deltas.push(c.delta);
    }
    assert.deepEqual(deltas, ['Hello ', 'world', '!']);
    assert.equal(final.content, 'Hello world!');
    assert.equal(final.done, true);
  } finally {
    global.fetch = oldFetch;
    restoreEnv();
  }
}

async function testMultiKeyRoundRobin() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  try {
    process.env.GROQ_API_KEY_1 = 'key-1';
    process.env.GROQ_API_KEY_2 = 'key-2';
    process.env.GROQ_API_KEY_3 = 'key-3';

    const seen = [];
    global.fetch = async (url, opts) => {
      seen.push(opts.headers.Authorization.replace('Bearer ', ''));
      return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'ok' } }] }) };
    };

    await aiClient.chatCompletion([{ role: 'user', content: 'a' }]);
    await aiClient.chatCompletion([{ role: 'user', content: 'b' }]);
    await aiClient.chatCompletion([{ role: 'user', content: 'c' }]);
    await aiClient.chatCompletion([{ role: 'user', content: 'd' }]);

    assert.deepEqual(seen, ['key-1', 'key-2', 'key-3', 'key-1'],
      'requests rotate key-1 → key-2 → key-3 → key-1');
  } finally {
    global.fetch = oldFetch;
    restoreEnv();
  }
}

async function test429FailoverToNextKey() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  const start = Date.now();
  try {
    process.env.GROQ_API_KEY_1 = 'k1';
    process.env.GROQ_API_KEY_2 = 'k2';

    const attempts = [];
    global.fetch = async (url, opts) => {
      const key = opts.headers.Authorization.replace('Bearer ', '');
      attempts.push(key);
      if (key === 'k1') {
        return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'rate limited' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'from k2' } }] }) };
    };

    const result = await aiClient.chatCompletion([{ role: 'user', content: 'hi' }]);
    assert.equal(result.content, 'from k2', 'the second key answers after k1 is rate-limited');
    assert.deepEqual(attempts, ['k1', 'k2'], 'both keys were tried');
    assert.ok(Date.now() - start < 500, 'failover completes under 500ms');
  } finally {
    global.fetch = oldFetch;
    restoreEnv();
  }
}

async function testDeepSeekFallback() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  try {
    process.env.GROQ_API_KEY = 'groq-broken';
    process.env.DEEPSEEK_API_KEY = 'ds-key';

    const requests = [];
    global.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      requests.push({ url: String(url), model: body.model, auth: opts.headers.Authorization });
      if (String(url).includes('groq')) {
        return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'rate limited' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'answered by deepseek' } }] }) };
    };

    const result = await aiClient.chatCompletion([{ role: 'user', content: 'hi' }]);
    assert.equal(result.content, 'answered by deepseek');
    assert.equal(result.provider, 'deepseek');
    assert.equal(result.model, 'deepseek-chat');
    assert.equal(requests.length, 2, 'one Groq attempt then one DeepSeek attempt');
    assert.ok(requests[1].url.includes('deepseek.com'));
    assert.equal(requests[1].auth, 'Bearer ds-key');
  } finally {
    global.fetch = oldFetch;
    restoreEnv();
  }
}

async function testStreamSSECoachEndpoint() {
  saveEnv();
  clearKeys();
  aiCache._memory.clear();
  try {
    process.env.GROQ_API_KEY = 'coach-stream-key';
    // Fresh require so coach uses our env.
    delete require.cache[require.resolve('../api/coach.js')];
    const aiClientFresh = freshAiClient();
    // Attach the fresh aiClient to the cache so coach's require resolves to it.
    require.cache[require.resolve('../lib/aiClient.js')].exports = aiClientFresh;

    const sseBody = [sseChunk('Hello '), sseChunk('IELTS '), sseChunk('student!'), sseDone()].join('');
    global.fetch = async () => ({ ok: true, status: 200, body: makeSSEStream([sseBody]) });

    const events = [];
    let headWritten = false;
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      flushHeaders() { headWritten = true; },
      write(chunk) { if (!headWritten) headWritten = true; events.push(String(chunk)); },
      end(chunk) { if (chunk) events.push(String(chunk)); this.ended = true; }
    };
    res.status = (c) => { res.statusCode = c; return res; };

    const coach = require('../api/coach.js');

    await coach({
      method: 'POST',
      headers: { 'accept': 'text/event-stream', 'x-forwarded-for': '1.2.3.4' },
      socket: {},
      body: { message: 'Give me a tip', profile: { band: 6, weakest: 'writing', mistakeCount: 2 }, history: [] }
    }, res);

    assert.equal(res.headers['Content-Type'], 'text/event-stream');
    const joined = events.join('');
    assert.match(joined, /event: connected/, 'connected event sent');
    assert.match(joined, /event: chunk/, 'chunk event sent');
    assert.match(joined, /event: done/, 'done event closes the stream');
    assert.ok(joined.includes('Hello '));
    assert.ok(joined.includes('IELTS '));
    assert.ok(joined.includes('student!'));
    const doneMatch = joined.match(/event: done\ndata: ([^\n]+)/);
    assert.ok(doneMatch);
    const donePayload = JSON.parse(doneMatch[1]);
    assert.equal(donePayload.reply, 'Hello IELTS student!');
  } finally {
    global.fetch = oldFetch;
    delete require.cache[require.resolve('../api/coach.js')];
    delete require.cache[require.resolve('../lib/aiClient.js')];
    restoreEnv();
    aiCache._memory.clear();
  }
}

async function testNonRetryableErrorsDoNotFailOver() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  try {
    process.env.GROQ_API_KEY = 'k';
    process.env.DEEPSEEK_API_KEY = 'ds';

    let calls = 0;
    global.fetch = async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: 'partial' } }] }) };
    };

    await assert.rejects(
      aiClient.chatCompletion([{ role: 'user', content: 'hi' }]),
      err => err.code === 'AI_OUTPUT_TRUNCATED'
    );
    assert.equal(calls, 1, 'truncation errors must NOT fail over');
  } finally {
    global.fetch = oldFetch;
    restoreEnv();
  }
}

async function testLegacyKeyStillWorks() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  try {
    process.env.GROQ_API_KEY = 'legacy-single';

    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'ok' } }] }) });

    const result = await aiClient.chatCompletion([{ role: 'user', content: 'hi' }]);
    assert.equal(result.content, 'ok');
    assert.equal(aiClient.isConfigured(), true);
  } finally {
    global.fetch = oldFetch;
    restoreEnv();
  }
}

async function testNetworkErrorFailover() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  try {
    process.env.GROQ_API_KEY_1 = 'k1';
    process.env.GROQ_API_KEY_2 = 'k2';

    const attempts = [];
    global.fetch = async (url, opts) => {
      const key = opts.headers.Authorization.replace('Bearer ', '');
      attempts.push(key);
      if (key === 'k1') throw new Error('connect ECONNREFUSED');
      return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'recovered' } }] }) };
    };

    const result = await aiClient.chatCompletion([{ role: 'user', content: 'hi' }]);
    assert.equal(result.content, 'recovered');
    assert.deepEqual(attempts, ['k1', 'k2'], 'network error triggers failover to next key');
  } finally {
    global.fetch = oldFetch;
    restoreEnv();
  }
}

/* A Groq 429 answer; `retryAfter` (seconds) becomes the Retry-After header. */
function limitedReply(retryAfter) {
  return {
    ok: false,
    status: 429,
    headers: { get: name => (String(name).toLowerCase() === 'retry-after' && retryAfter !== undefined ? String(retryAfter) : null) },
    text: async () => JSON.stringify({ error: { message: 'Rate limit reached for model on tokens per minute (TPM).', code: 'rate_limit_exceeded' } })
  };
}

async function testStream429BacksOffAndRetries() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  const oldWarn = console.warn;
  try {
    process.env.GROQ_API_KEY = 'stream-429-key';
    console.warn = () => {};
    const waits = [];
    aiClient._retryPolicy.sleep = async ms => { waits.push(ms); };

    /* two 429s before the first chunk: the caller just sees the text arrive */
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      if (attempts <= 2) return limitedReply();
      return { ok: true, status: 200, body: makeSSEStream([sseChunk('Worth '), sseChunk('the wait'), sseDone()]) };
    };
    const deltas = [];
    let final = null;
    for await (const c of aiClient.streamChat([{ role: 'user', content: 'hi' }])) {
      if (c.done) final = c; else deltas.push(c.delta);
    }
    assert.deepEqual(deltas, ['Worth ', 'the wait']);
    assert.equal(final.content, 'Worth the wait');
    assert.equal(attempts, 3, 'the stream was opened again after every wait');
    assert.equal(waits.length, 2);
    assert.ok(waits[0] >= 2000 && waits[0] <= 3000 && waits[1] >= 4000 && waits[1] <= 5000,
      `2–3 s then 4–5 s (was ${waits.join(', ')})`);

    /* Retry-After is honoured for streams too */
    waits.length = 0; attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      return attempts === 1 ? limitedReply(6) : { ok: true, status: 200, body: makeSSEStream([sseChunk('ok'), sseDone()]) };
    };
    for await (const c of aiClient.streamChat([{ role: 'user', content: 'hi' }])) { void c; }
    assert.deepEqual(waits, [6250]);

    /* a quota that never clears ends with the 429, after 1 + maxRetries attempts */
    waits.length = 0; attempts = 0;
    global.fetch = async () => { attempts += 1; return limitedReply(); };
    await assert.rejects(
      (async () => { for await (const c of aiClient.streamChat([{ role: 'user', content: 'hi' }])) { void c; } })(),
      err => err.status === 429
    );
    assert.equal(attempts, 1 + aiClient._retryPolicy.maxRetries);
    assert.equal(waits.length, aiClient._retryPolicy.maxRetries);

    /* a wait longer than a request may hold is not slept through */
    waits.length = 0; attempts = 0;
    global.fetch = async () => { attempts += 1; return limitedReply(300); };
    await assert.rejects(
      (async () => { for await (const c of aiClient.streamChat([{ role: 'user', content: 'hi' }])) { void c; } })(),
      err => err.status === 429 && err.retryAfterMs === 300000
    );
    assert.deepEqual([attempts, waits.length], [1, 0]);

    /* once text has been yielded the stream is never restarted */
    waits.length = 0; attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      const cut = makeSSEStream([sseChunk('Partial ')]);
      const reader = cut.getReader();
      let sent = false;
      return {
        ok: true, status: 200,
        body: { getReader: () => ({
          async read() { if (!sent) { sent = true; return reader.read(); } throw new Error('connection reset'); },
          releaseLock() {}
        }) }
      };
    };
    const seen = [];
    await assert.rejects(
      (async () => { for await (const c of aiClient.streamChat([{ role: 'user', content: 'hi' }])) { if (!c.done) seen.push(c.delta); } })(),
      () => true
    );
    assert.deepEqual(seen, ['Partial ']);
    assert.equal(waits.length, 0, 'no rate-limit wait after output has reached the caller');
  } finally {
    console.warn = oldWarn;
    global.fetch = oldFetch;
    restoreEnv();
  }
}

async function testChat429OnlyWaitsWhenEveryProviderIsLimited() {
  saveEnv();
  clearKeys();
  const aiClient = freshAiClient();
  const oldWarn = console.warn;
  try {
    process.env.GROQ_API_KEY_1 = 'k1';
    process.env.GROQ_API_KEY_2 = 'k2';
    console.warn = () => {};
    const waits = [];
    aiClient._retryPolicy.sleep = async ms => { waits.push(ms); };

    /* k1 is limited, k2 is not: the failover is immediate, nothing sleeps */
    const attempts = [];
    global.fetch = async (url, opts) => {
      const key = opts.headers.Authorization.replace('Bearer ', '');
      attempts.push(key);
      if (key === 'k1') return limitedReply();
      return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'from k2' } }] }) };
    };
    assert.equal((await aiClient.chatCompletion([{ role: 'user', content: 'hi' }])).content, 'from k2');
    assert.deepEqual(waits, [], 'a free key is used at once instead of waiting');

    /* both limited, then the limit clears: one wait, then the answer */
    attempts.length = 0;
    let round = 0;
    global.fetch = async (url, opts) => {
      attempts.push(opts.headers.Authorization.replace('Bearer ', ''));
      round += 1;
      if (round <= 2) return limitedReply();
      return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'after the wait' } }] }) };
    };
    assert.equal((await aiClient.chatCompletion([{ role: 'user', content: 'hi' }])).content, 'after the wait');
    assert.equal(attempts.length, 3);
    assert.equal(waits.length, 1);
    assert.ok(waits[0] >= 2000 && waits[0] <= 3000);
  } finally {
    console.warn = oldWarn;
    global.fetch = oldFetch;
    restoreEnv();
  }
}

(async () => {
  await testStreamChatYieldsDeltas();
  console.log('  ✓ streamChat yields deltas + final frame');
  await testMultiKeyRoundRobin();
  console.log('  ✓ multi-key round-robin distributes requests');
  await test429FailoverToNextKey();
  console.log('  ✓ 429 failover moves to the next key under 500ms');
  await testDeepSeekFallback();
  console.log('  ✓ DeepSeek acts as ultimate fallback after Groq 429');
  await testNetworkErrorFailover();
  console.log('  ✓ network error triggers failover');
  await testStreamSSECoachEndpoint();
  console.log('  ✓ Coach SSE endpoint emits connected/chunk/done events');
  await testNonRetryableErrorsDoNotFailOver();
  console.log('  ✓ truncation/empty/invalid-JSON errors do not fail over');
  await testLegacyKeyStillWorks();
  console.log('  ✓ legacy single GROQ_API_KEY still works');
  await testChat429OnlyWaitsWhenEveryProviderIsLimited();
  console.log('  ✓ a 429 waits only when every key/provider is limited');
  await testStream429BacksOffAndRetries();
  console.log('  ✓ streams back off on 429 (2–3 s, 4–5 s …), honour Retry-After, never restart after output');
  console.log('STREAMING + ROUTER TESTS OK ✓');
})().catch(err => {
  console.error('STREAMING/ROUTER TEST FAILED:', err);
  process.exitCode = 1;
});
