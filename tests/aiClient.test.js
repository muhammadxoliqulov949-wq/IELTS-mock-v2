'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const aiClient = require('../lib/aiClient.js');
const aiCache = require('../lib/aiCache.js');
const { buildPlan } = require('../lib/topicPool.js');

/* Pin the model environment so the suite does not depend on a developer's shell. */
delete process.env.GROQ_MODEL;
delete process.env.GROQ_FALLBACK_MODEL;
delete process.env.GROQ_GENERATOR_MODEL;

/* The shipped 429 policy, captured before any test shortens it. */
const shippedRetryPolicy = Object.assign({}, aiClient._retryPolicy);

const root = path.join(__dirname, '..');
const check = (condition, message) => assert.ok(condition, message);
const makeRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; return res; };
  return res;
};
const makeReq = (body, ip) => ({
  method: 'POST',
  headers: { 'x-forwarded-for': ip || '30.0.0.1' },
  socket: {},
  body
});

function speakingPayload() {
  return {
    speaking: {
      title: 'Speaking Practice Test',
      parts: [
        {
          partNumber: 1,
          topics: [
            { title: 'Study', questions: ['What do you study?', 'Why did you choose it?', 'What is challenging?'] },
            { title: 'Hometown', questions: ['Where do you live?', 'What do you like there?', 'Has it changed?'] },
            { title: 'Reading', questions: ['Do you read often?', 'What do you enjoy?', 'Where do you read?'] }
          ]
        },
        {
          partNumber: 2,
          topic: 'Describe a place where you like to study.',
          bullets: ['Where it is', 'When you go there', 'What you do there']
        },
        {
          partNumber: 3,
          linkedTopic: 'Places for learning',
          questions: [
            'How have study spaces changed?',
            'Should schools provide quiet areas?',
            'Will online learning replace classrooms?'
          ]
        }
      ]
    }
  };
}

async function testClientConfigurationAndWireFormat() {
  const oldKey = process.env.GROQ_API_KEY;
  const oldFetch = global.fetch;
  const calls = [];
  try {
    assert.equal(aiClient.API_BASE, 'https://api.groq.com/openai/v1');
    assert.equal(aiClient.MODEL, 'openai/gpt-oss-20b', 'the default model is the one Groq still serves on the Free tier');
    assert.equal(aiClient.MAX_TOKENS, 4096);
    assert.equal(aiClient.endpoint(), 'https://api.groq.com/openai/v1/chat/completions');

    delete process.env.GROQ_API_KEY;
    assert.equal(aiClient.isConfigured(), false);
    global.fetch = async () => { throw new Error('must not call the provider without a key'); };
    await assert.rejects(
      aiClient.chatCompletion([{ role: 'user', content: 'hello' }]),
      error => error.code === 'GROQ_KEY_MISSING' && /GROQ_API_KEY/.test(error.message)
    );

    process.env.GROQ_API_KEY = '  test-groq-key  ';
    global.fetch = async (url, options) => {
      calls.push({ url: String(url), options, body: JSON.parse(options.body) });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ finish_reason: 'stop', message: { content: 'A complete answer.' } }],
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 }
        })
      };
    };

    const result = await aiClient.chatCompletion([
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'Explain an IELTS overview.' }
    ], { temperature: 0.85, responseFormat: 'json_object', max_tokens: 12 });

    assert.equal(aiClient.isConfigured(), true);
    assert.equal(result.content, 'A complete answer.');
    assert.deepEqual(result.usage, { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 });
    assert.equal(result.finishReason, 'stop');
    assert.equal(result.model, 'openai/gpt-oss-20b', 'the result names the model that answered');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, aiClient.endpoint());
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-groq-key');
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    assert.equal(calls[0].body.model, 'openai/gpt-oss-20b');
    assert.equal(calls[0].body.max_completion_tokens, 4096, 'the output budget is fixed at 4096 for every call');
    assert.equal(calls[0].body.max_tokens, undefined, 'the deprecated max_tokens field is not sent');
    assert.equal(calls[0].body.reasoning_effort, 'low', 'GPT-OSS reasoning is pinned to low effort');
    assert.equal(calls[0].body.include_reasoning, false, 'GPT-OSS reasoning stays out of the answer text');
    assert.equal(calls[0].body.temperature, 0.85);
    assert.deepEqual(calls[0].body.response_format, { type: 'json_object' });
    assert.deepEqual(calls[0].body.messages, [
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'Explain an IELTS overview.' }
    ]);
    check(!calls[0].url.includes('key='), 'the API key is sent only as a Bearer header');
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = oldKey;
  }
}

async function testProviderErrorsAndTruncation() {
  const oldKey = process.env.GROQ_API_KEY;
  const oldFetch = global.fetch;
  const oldWarn = console.warn;
  const policy = aiClient._retryPolicy;
  const oldPolicy = Object.assign({}, policy);
  process.env.GROQ_API_KEY = 'test-key';
  try {
    /* a 429 that never clears is retried with backoff, then reported as a 429 */
    console.warn = () => {};
    let attempts = 0;
    Object.assign(policy, { baseDelayMs: 1, jitterMs: 0, sleep: async () => {} });
    global.fetch = async () => {
      attempts += 1;
      return { ok: false, status: 429, text: async () => '{"error":{"message":"rate limit"}}' };
    };
    await assert.rejects(
      aiClient.chatCompletion([{ role: 'user', content: 'test' }]),
      error => error.status === 429 && /Groq API error \(429\)/.test(error.message)
    );
    assert.equal(attempts, 1 + policy.maxRetries, 'the request is sent again after every wait, then given up');

    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"partial":' } }] })
    });
    await assert.rejects(
      aiClient.chatCompletion([{ role: 'user', content: 'write json' }]),
      error => error.code === 'AI_OUTPUT_TRUNCATED' && error.status === 502
    );
  } finally {
    global.fetch = oldFetch;
    console.warn = oldWarn;
    Object.assign(policy, oldPolicy);
    if (oldKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = oldKey;
  }
}

async function testEndpointMigration() {
  const oldEnv = {
    key: process.env.GROQ_API_KEY,
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  const oldFetch = global.fetch;
  const requests = [];
  const answer = {
    tasks: [{
      title: 'Task 2', band: 7,
      criteria: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammar: 7 },
      strengths: ['Clear position'], improvements: ['Add a specific example'], summary: 'Well-developed response.'
    }],
    overallSummary: 'A clear, relevant response.'
  };
  const quizAnswer = {
    questions: [{
      prompt: 'Which phrase introduces an overview?',
      options: ['Overall,', 'For instance,', 'On the contrary,', 'In my opinion,'],
      answer: 0,
      explanation: 'An overview summarises the main feature.'
    }]
  };
  const coachAnswer = 'Start with a clear position, then support it with a specific example.';
  const mockAnswer = speakingPayload();

  try {
    process.env.GROQ_API_KEY = 'integration-test-key';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    aiCache._memory.clear();

    global.fetch = async (url, options) => {
      const target = String(url);
      if (!target.startsWith(aiClient.API_BASE)) throw new Error(`Unexpected outbound request: ${target}`);
      const body = JSON.parse(options.body);
      requests.push({ url: target, headers: options.headers, body });
      const userContent = body.messages[body.messages.length - 1].content;
      let content;
      if (userContent.startsWith('TASK:')) content = JSON.stringify(answer);
      else if (/^Generate \d+ IELTS/.test(userContent)) content = JSON.stringify(quizAnswer);
      else if (userContent.includes('Theme chosen for this section:') || userContent.includes('Requested theme (use it for the whole section):')) content = JSON.stringify(mockAnswer);
      else content = coachAnswer;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ finish_reason: 'stop', message: { content } }],
          usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 }
        })
      };
    };

    const grade = require('../api/grade.js');
    const coach = require('../api/coach.js');
    const quiz = require('../api/quiz.js');
    const generateMock = require('../api/generate-mock.js');
    let res = makeRes();

    await grade(makeReq({
      mode: 'writing',
      tasks: [{ title: 'Task 2', prompt: 'Do you agree or disagree?', response: 'A '.repeat(180) }]
    }, '31.0.0.1'), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.band, 7);

    res = makeRes();
    await coach(makeReq({
      message: 'How can I improve my Writing Task 2 position?',
      profile: { band: 6, weakest: 'writing', mistakeCount: 3 },
      history: [{ role: 'user', text: 'I struggle with introductions.' }]
    }, '31.0.0.2'), res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.reply, /specific example/);

    res = makeRes();
    await quiz(makeReq({ topic: 'vocabulary', count: 1 }, '31.0.0.3'), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.source, 'ai');
    assert.equal(res.body.questions.length, 1);

    const plan = buildPlan({ topic: 'Marine biology' });
    res = makeRes();
    await generateMock(makeReq({
      skill: 'speaking', testId: 'test-provider', label: 'Provider test', plan
    }, '31.0.0.4'), res);
    assert.equal(res.statusCode, 200, res.body.error || 'mock generation failed');
    assert.equal(res.body.payload.parts.length, 3);

    assert.equal(requests.length, 4, 'all four AI endpoints make a request through the same client');
    assert.ok(requests.every(request => request.url === aiClient.endpoint()));
    assert.ok(requests.every(request => request.headers.Authorization === 'Bearer integration-test-key'));
    assert.ok(requests.every(request => request.body.model === aiClient.MODEL));
    assert.ok(requests.every(request => request.body.max_completion_tokens === 4096));
    assert.ok(requests.every(request => request.body.messages.length >= 2));

    for (const file of ['api/coach.js', 'api/grade.js', 'api/quiz.js', 'api/generate-mock.js']) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      assert.ok(source.includes("require('../lib/aiClient.js')"), `${file} uses the common AI client`);
    }
  } finally {
    global.fetch = oldFetch;
    if (oldEnv.key === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = oldEnv.key;
    if (oldEnv.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldEnv.url;
    if (oldEnv.anon === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = oldEnv.anon;
    if (oldEnv.service === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = oldEnv.service;
    aiCache._memory.clear();
  }
}

async function testModelSelectionAndFallback() {
  const saved = {
    key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL,
    fallback: process.env.GROQ_FALLBACK_MODEL
  };
  const oldFetch = global.fetch;
  const oldWarn = console.warn;
  const warnings = [];
  const requests = [];
  let queued = [];
  const okBody = content => ({ choices: [{ finish_reason: 'stop', message: { content } }], usage: null });
  const modelNotFound = {
    error: { message: 'The model does not exist or you do not have access to it.', type: 'invalid_request_error', code: 'model_not_found' }
  };
  const reply = ([status, body]) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
  });
  /* Each scripted [status, body] pair answers one request, in order. */
  const script = (...responses) => {
    queued = responses.slice();
    requests.length = 0;
    warnings.length = 0;
  };
  const messages = [{ role: 'user', content: 'Explain an IELTS overview.' }];

  try {
    process.env.GROQ_API_KEY = 'fallback-test-key';
    global.fetch = async (url, options) => {
      requests.push({ url: String(url), body: JSON.parse(options.body) });
      if (!queued.length) throw new Error('unexpected extra request to Groq');
      return reply(queued.shift());
    };
    console.warn = (...args) => { warnings.push(args.join(' ')); };

    /* 1. The primary model comes from GROQ_MODEL; a blank value uses the default. */
    delete process.env.GROQ_MODEL;
    delete process.env.GROQ_FALLBACK_MODEL;
    assert.equal(aiClient.primaryModel(), 'openai/gpt-oss-20b');
    assert.equal(aiClient.fallbackModel(), 'openai/gpt-oss-120b');
    process.env.GROQ_MODEL = '   ';
    assert.equal(aiClient.primaryModel(), 'openai/gpt-oss-20b', 'a blank GROQ_MODEL uses the default');
    process.env.GROQ_MODEL = '  qwen/qwen3.8-27b  ';
    assert.equal(aiClient.primaryModel(), 'qwen/qwen3.8-27b', 'GROQ_MODEL is trimmed and used as the primary model');
    assert.equal(aiClient.MODEL, 'qwen/qwen3.8-27b', 'MODEL reflects the configured primary model');

    /* 1b. The two defaults back each other up when GROQ_FALLBACK_MODEL is unset. */
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
    assert.equal(aiClient.fallbackModel(), 'openai/gpt-oss-20b', 'a primary of gpt-oss-120b falls back to gpt-oss-20b');
    assert.equal(aiClient.fallbackModel('openai/gpt-oss-20b'), 'openai/gpt-oss-120b', 'a one-request model override gets its own fallback');
    assert.equal(aiClient.fallbackModel('openai/gpt-oss-120b'), 'openai/gpt-oss-20b');
    process.env.GROQ_FALLBACK_MODEL = 'test/fallback-model';
    assert.equal(aiClient.fallbackModel('openai/gpt-oss-20b'), 'test/fallback-model', 'an explicit GROQ_FALLBACK_MODEL always wins');
    delete process.env.GROQ_MODEL;
    delete process.env.GROQ_FALLBACK_MODEL;

    /* 1c. Out of the box: the Free-tier model first, its bigger sibling when it is missing. */
    script([404, modelNotFound], [200, okBody('Answered by gpt-oss-120b.')]);
    const byDefault = await aiClient.chatCompletion(messages);
    assert.deepEqual(requests.map(request => request.body.model), ['openai/gpt-oss-20b', 'openai/gpt-oss-120b']);
    assert.equal(byDefault.model, 'openai/gpt-oss-120b');

    /* 1d. options.model replaces the primary model for ONE request (the mock generator uses it). */
    script([200, okBody('Per-request model.')]);
    process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
    const overridden = await aiClient.chatCompletion(messages, { model: '  openai/gpt-oss-120b ' });
    assert.equal(requests[0].body.model, 'openai/gpt-oss-120b', 'options.model is trimmed and sent');
    assert.equal(overridden.model, 'openai/gpt-oss-120b');
    script([200, okBody('Back to the configured model.')]);
    await aiClient.chatCompletion(messages);
    assert.equal(requests[0].body.model, 'openai/gpt-oss-20b', 'the override does not leak into the next request');
    script([404, modelNotFound], [200, okBody('Fallback of the override.')]);
    await aiClient.chatCompletion(messages, { model: 'openai/gpt-oss-120b' });
    assert.deepEqual(requests.map(request => request.body.model), ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
      'the override falls back to the other default, not to its own model');
    delete process.env.GROQ_MODEL;

    /* 2. A fallback equal to the primary model is never requested a second time. */
    process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
    process.env.GROQ_FALLBACK_MODEL = ' openai/gpt-oss-20b ';
    assert.equal(aiClient.fallbackModel(), null);
    script([404, modelNotFound]);
    await assert.rejects(aiClient.chatCompletion(messages), error => error.status === 404);
    assert.equal(requests.length, 1, 'no retry when the fallback is the same model');

    /* 3. The primary model is missing: the same request is retried once on the fallback. */
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
    process.env.GROQ_FALLBACK_MODEL = 'test/fallback-model';
    script([404, modelNotFound], [200, okBody('Answered by the fallback.')]);
    const recovered = await aiClient.chatCompletion(messages, { responseFormat: 'json_object' });
    assert.equal(recovered.content, 'Answered by the fallback.');
    assert.equal(recovered.model, 'test/fallback-model');
    assert.deepEqual(requests.map(request => request.body.model), ['openai/gpt-oss-120b', 'test/fallback-model']);
    assert.equal(warnings.length, 1, 'the model switch is logged for the operator');
    assert.match(warnings[0], /openai\/gpt-oss-120b.*test\/fallback-model/);
    assert.equal(requests[0].body.reasoning_effort, 'low');
    assert.equal(requests[1].body.reasoning_effort, undefined, 'reasoning options are only sent to GPT-OSS models');
    assert.equal(requests[1].body.include_reasoning, undefined, 'reasoning options are only sent to GPT-OSS models');
    assert.deepEqual(requests[1].body.response_format, { type: 'json_object' }, 'JSON mode is kept on the fallback');
    assert.equal(requests[1].body.max_completion_tokens, 4096, 'the output budget is kept on the fallback');

    /* 4. Any HTTP 404 counts, even without a Groq error code. */
    script([404, 'Not Found'], [200, okBody('Plain 404 recovered.')]);
    assert.equal((await aiClient.chatCompletion(messages)).model, 'test/fallback-model');
    assert.equal(requests.length, 2);

    /* 5. Groq's model error codes move to the fallback whatever the HTTP status. */
    for (const code of ['model_decommissioned', 'model_not_found']) {
      script(
        [400, { error: { message: `Model unavailable (${code}).`, code } }],
        [200, okBody(`${code} recovered.`)]
      );
      assert.equal((await aiClient.chatCompletion(messages)).content, `${code} recovered.`);
      assert.equal(requests.length, 2, `${code} triggers the fallback even on HTTP 400`);
    }

    /* 6. If the fallback is unavailable as well, its error is reported. */
    script([404, modelNotFound], [404, modelNotFound]);
    await assert.rejects(
      aiClient.chatCompletion(messages),
      error => error.status === 404 && error.model === 'test/fallback-model'
    );
    assert.equal(requests.length, 2);

    /* 7. Failures that are not about the model are never retried on the fallback. */
    const notModelProblems = [
      { reply: [503, { error: { message: 'Service unavailable' } }], status: 503 },
      { reply: [400, { error: { message: 'Invalid request', code: 'invalid_request_error' } }], status: 400 },
      { reply: [200, { choices: [{ finish_reason: 'length', message: { content: '{"partial":' } }] }], code: 'AI_OUTPUT_TRUNCATED' }
    ];
    for (const { reply: failure, status, code } of notModelProblems) {
      script(failure, [200, okBody('must not be reached')]);
      await assert.rejects(
        aiClient.chatCompletion(messages),
        error => (status === undefined || error.status === status) && (code === undefined || error.code === code)
      );
      assert.equal(requests.length, 1, `${code || status} does not trigger the model fallback`);
    }

    /* 7b. A 429 is waited out and sent again to the SAME model — never moved to the fallback. */
    const rateLimit = [429, { error: { message: 'Rate limit reached', code: 'rate_limit_exceeded' } }];
    const policy = aiClient._retryPolicy;
    const oldPolicy = Object.assign({}, policy);
    Object.assign(policy, { baseDelayMs: 1, jitterMs: 0, sleep: async () => {} });
    try {
      script(rateLimit, rateLimit, rateLimit, rateLimit, [200, okBody('must not be reached')]);
      await assert.rejects(aiClient.chatCompletion(messages), error => error.status === 429);
      assert.equal(requests.length, 1 + policy.maxRetries, 'a 429 is retried maxRetries times, then reported');
      assert.ok(requests.every(request => request.body.model === 'openai/gpt-oss-120b'),
        'every retry of a 429 uses the same model — the fallback is only for a missing model');
    } finally {
      Object.assign(policy, oldPolicy);
    }
  } finally {
    global.fetch = oldFetch;
    console.warn = oldWarn;
    for (const [name, value] of [['GROQ_API_KEY', saved.key], ['GROQ_MODEL', saved.model], ['GROQ_FALLBACK_MODEL', saved.fallback]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

async function testRateLimitBackoff() {
  const envNames = ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'DEEPSEEK_API_KEY', 'GROQ_MODEL', 'GROQ_FALLBACK_MODEL'];
  const saved = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  const oldFetch = global.fetch;
  const oldWarn = console.warn;
  const policy = aiClient._retryPolicy;
  const oldPolicy = Object.assign({}, policy);
  const messages = [{ role: 'user', content: 'Explain an IELTS overview.' }];
  const requests = [];
  const waits = [];
  let queued = [];
  const okReply = content => ({
    ok: true, status: 200,
    json: async () => ({ choices: [{ finish_reason: 'stop', message: { content } }], usage: null })
  });
  /* a Groq 429: optional Retry-After header, optional text of the error */
  const limited = (retryAfter, message) => ({
    ok: false, status: 429,
    headers: { get: name => (String(name).toLowerCase() === 'retry-after' && retryAfter !== undefined ? String(retryAfter) : null) },
    text: async () => JSON.stringify({ error: { message: message || 'Rate limit reached for model on tokens per minute (TPM): Limit 8000.', code: 'rate_limit_exceeded' } })
  });
  const failed = status => ({ ok: false, status, text: async () => JSON.stringify({ error: { message: 'boom' } }) });
  const script = (...responses) => { queued = responses.slice(); requests.length = 0; waits.length = 0; };
  const between = (value, low, high) => value >= low && value <= high;
  /* the shipped policy, except that "sleeping" only records the wait */
  const resetPolicy = () => Object.assign(policy, shippedRetryPolicy, { sleep: async ms => { waits.push(ms); } });

  try {
    for (const name of envNames) delete process.env[name];
    process.env.GROQ_API_KEY = 'rate-limit-key';
    console.warn = () => {};
    global.fetch = async (url, options) => {
      requests.push({ url: String(url), key: options.headers.Authorization, model: JSON.parse(options.body).model });
      if (!queued.length) throw new Error('unexpected extra request');
      return queued.shift();
    };
    resetPolicy();

    /* 0. The shipped policy: 2–3 s, then doubling. */
    assert.equal(shippedRetryPolicy.maxRetries, 3);
    assert.equal(shippedRetryPolicy.baseDelayMs, 2000, 'the first wait starts at 2 s …');
    assert.equal(shippedRetryPolicy.jitterMs, 1000, '… plus up to 1 s of jitter, so 2–3 s');
    assert.equal(shippedRetryPolicy.factor, 2);
    assert.equal(shippedRetryPolicy.maxDelayMs, 10000, 'one request never sleeps longer than 10 s');

    /* 1. One 429: wait 2–3 s, send the same request again, the caller sees only the answer. */
    script(limited(), okReply('Recovered after one wait.'));
    const recovered = await aiClient.chatCompletion(messages);
    assert.equal(recovered.content, 'Recovered after one wait.');
    assert.equal(requests.length, 2);
    assert.equal(waits.length, 1);
    assert.ok(between(waits[0], 2000, 3000), `the first wait is 2–3 s (was ${waits[0]} ms)`);
    assert.equal(requests[0].model, requests[1].model, 'the retry goes to the same model');

    /* 1b. The jitter is real, and always inside 2–3 s. */
    const firstWaits = new Set();
    for (let i = 0; i < 40; i++) {
      script(limited(), okReply('ok'));
      await aiClient.chatCompletion(messages);
      assert.ok(between(waits[0], 2000, 3000));
      firstWaits.add(waits[0]);
    }
    assert.ok(firstWaits.size > 5, 'waits are spread out so parallel clients do not retry in lockstep');

    /* 2. Several 429s in a row: the wait doubles — 2–3 s, 4–5 s, 8–9 s. */
    script(limited(), limited(), limited(), okReply('Third retry worked.'));
    assert.equal((await aiClient.chatCompletion(messages)).content, 'Third retry worked.');
    assert.equal(requests.length, 4);
    assert.ok(between(waits[0], 2000, 3000) && between(waits[1], 4000, 5000) && between(waits[2], 8000, 9000),
      `exponential backoff 2–3 s, 4–5 s, 8–9 s (was ${waits.join(', ')})`);

    /* 3. The quota never clears: after maxRetries waits the 429 is reported, with no invented hint. */
    script(limited(), limited(), limited(), limited(), okReply('must not be reached'));
    await assert.rejects(aiClient.chatCompletion(messages), error => error.status === 429 && error.retryAfterMs === undefined);
    assert.equal(requests.length, 1 + policy.maxRetries);
    assert.equal(waits.length, policy.maxRetries);

    /* 4. Groq's own number wins when it is longer than the backoff. */
    script(limited(5), okReply('ok'));
    await aiClient.chatCompletion(messages);
    assert.deepEqual(waits, [5250], 'Retry-After: 5 → wait 5 s plus a 250 ms margin');
    script(limited(undefined, 'Rate limit reached … Please try again in 7.66s. Need more tokens? Upgrade.'), okReply('ok'));
    await aiClient.chatCompletion(messages);
    assert.deepEqual(waits, [7910], 'with no header the "try again in 7.66s" sentence is used');
    script(limited(0.5), okReply('ok'));
    await aiClient.chatCompletion(messages);
    assert.ok(between(waits[0], 2000, 3000), 'a hint shorter than the backoff does not shorten it');

    /* 4b. A wait longer than one request may hold (a daily quota, say) is not slept through. */
    script(limited(120), okReply('must not be reached'));
    await assert.rejects(
      aiClient.chatCompletion(messages),
      error => error.status === 429 && error.retryAfterMs === 120000
    );
    assert.equal(requests.length, 1, 'no second request');
    assert.equal(waits.length, 0, 'no sleeping');
    script(limited(undefined, 'Rate limit reached … Please try again in 2m59.56s.'), okReply('must not be reached'));
    await assert.rejects(aiClient.chatCompletion(messages), error => error.status === 429 && error.retryAfterMs === 179560);

    /* 4c. The longest wait the policy allows is a cap on the backoff too. */
    Object.assign(policy, { maxDelayMs: 3000, maxRetries: 5 });
    script(limited(), limited(), limited(), limited(), okReply('ok'));
    await aiClient.chatCompletion(messages);
    assert.ok(waits.length === 4 && waits.every(ms => ms <= 3000) && waits[3] === 3000, `capped at 3 s (was ${waits.join(', ')})`);
    resetPolicy();

    /* 5. Several keys: every key is tried at once; only a whole pool of 429s waits. */
    delete process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY_1 = 'key-a';
    process.env.GROQ_API_KEY_2 = 'key-b';
    script(limited(), okReply('the other key answered'));
    assert.equal((await aiClient.chatCompletion(messages)).content, 'the other key answered');
    assert.equal(requests.length, 2);
    assert.notEqual(requests[0].key, requests[1].key, 'the second key is tried');
    assert.equal(waits.length, 0, 'no waiting while another key is available');
    script(limited(), limited(), okReply('answered after the pool waited'));
    assert.equal((await aiClient.chatCompletion(messages)).content, 'answered after the pool waited');
    assert.equal(requests.length, 3);
    assert.equal(waits.length, 1, 'one wait after BOTH keys said 429');
    assert.equal(requests[2].key, requests[0].key, 'the next pass starts with the same key order');

    /* 6. DeepSeek counts as part of the pool: a 429 from Groq goes there first, without waiting. */
    delete process.env.GROQ_API_KEY_2;
    process.env.DEEPSEEK_API_KEY = 'ds-key';
    script(limited(), okReply('deepseek answered'));
    assert.equal((await aiClient.chatCompletion(messages)).content, 'deepseek answered');
    assert.ok(requests[1].url.startsWith(aiClient.DEEPSEEK_BASE));
    assert.equal(waits.length, 0);
    script(limited(), limited(), limited(), okReply('second pass'));
    assert.equal((await aiClient.chatCompletion(messages)).content, 'second pass');
    assert.equal(waits.length, 1, 'both providers were rate limited → one wait, then a second pass');
    assert.equal(requests.length, 4);

    /* 7. When retries run out, the 429 is what is reported — not the error of a later fallback entry. */
    Object.assign(policy, { maxRetries: 0 });
    script(limited(30), failed(503));
    await assert.rejects(aiClient.chatCompletion(messages), error => error.status === 429 && error.retryAfterMs === 30000);
    resetPolicy();
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.GROQ_API_KEY_1;
    process.env.GROQ_API_KEY = 'rate-limit-key';

    /* 8. Only 429s are waited for. */
    script(failed(500), okReply('must not be reached'));
    await assert.rejects(aiClient.chatCompletion(messages), error => error.status === 500);
    assert.deepEqual([requests.length, waits.length], [1, 0], 'a 500 is not slept on');
    script(failed(400), okReply('must not be reached'));
    await assert.rejects(aiClient.chatCompletion(messages), error => error.status === 400);
    assert.deepEqual([requests.length, waits.length], [1, 0], 'a 400 is not retried');
    script(limited(), failed(400), okReply('must not be reached'));
    await assert.rejects(aiClient.chatCompletion(messages), error => error.status === 400);
    assert.deepEqual([requests.length, waits.length], [2, 1], 'after a 429 wait, a hard error ends the request at once');

    /* 9. Retry-After parsing. */
    const header = value => ({ headers: { get: name => (name === 'retry-after' ? value : null) } });
    assert.equal(aiClient._parseRetryAfterMs(header('7'), ''), 7000);
    assert.equal(aiClient._parseRetryAfterMs(header('0.5'), ''), 500);
    const dateHint = aiClient._parseRetryAfterMs(header(new Date(Date.now() + 30000).toUTCString()), '');
    assert.ok(between(dateHint, 27000, 30000), 'an HTTP date is turned into a delay');
    assert.equal(aiClient._parseRetryAfterMs(header(''), 'try again in 250ms'), 250);
    assert.equal(aiClient._parseRetryAfterMs({}, 'Please try again in 7.66s.'), 7660);
    assert.equal(aiClient._parseRetryAfterMs({}, 'Please try again in 2m59.56s. Need more tokens?'), 179560);
    assert.equal(aiClient._parseRetryAfterMs({}, 'please TRY AGAIN IN 1h2m3s'), 3723000);
    assert.equal(aiClient._parseRetryAfterMs(header('abc'), 'no hint here'), undefined);
    assert.equal(aiClient._parseRetryAfterMs(null, ''), undefined);
  } finally {
    global.fetch = oldFetch;
    console.warn = oldWarn;
    Object.assign(policy, oldPolicy);
    for (const name of envNames) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
}

function testNoLegacyProviderRemnants() {
  const files = [
    'api/coach.js', 'api/grade.js', 'api/quiz.js', 'api/generate-mock.js',
    'api/config.js', 'lib/aiClient.js', 'lib/aiCache.js', 'lib/aiGuardrails.js',
    'lib/edgeTts.js', 'server.js', 'scripts/build.js', 'sw.js', '.env.example',
    'api/.env.example', 'package.json'
  ];
  const banned = [
    /generativelanguage\.googleapis\.com/,
    /GEMINI_[A-Z_]+/,
    /ai\.google\.dev/,
    /aistudio\.google\.com/
  ];
  assert.ok(!fs.existsSync(path.join(root, 'lib/geminiModel.js')),
    'the previous model module was removed');
  assert.ok(!fs.existsSync(path.join(root, 'tests/geminiModel.test.js')),
    'its test suite was removed with it');
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const pattern of banned) {
      assert.ok(!pattern.test(source), `${file} still refers to the previous provider (${pattern})`);
    }
    assert.ok(!/llama-3\.3-70b-versatile/.test(source), `${file} still refers to the retired Groq model llama-3.3-70b-versatile`);
    assert.ok(!/llama-3\.1-8b-instant/.test(source),
      `${file} still refers to llama-3.1-8b-instant, which Groq no longer serves on the Free and Developer tiers`);
  }
  assert.ok(aiClient.endpoint().startsWith('https://api.groq.com/openai/v1'),
    'the API base is Groq');
  assert.equal(aiClient.MODEL, 'openai/gpt-oss-20b', 'the default primary model is pinned in the client');
  assert.equal(aiClient.DEFAULT_MODEL, 'openai/gpt-oss-20b');
  assert.equal(aiClient.DEFAULT_FALLBACK_MODEL, 'openai/gpt-oss-120b', 'the default fallback model is pinned in the client');
}

(async () => {
  await testClientConfigurationAndWireFormat();
  await testProviderErrorsAndTruncation();
  await testModelSelectionAndFallback();
  await testRateLimitBackoff();
  testNoLegacyProviderRemnants();
  await testEndpointMigration();
  console.log('AI CLIENT TESTS OK ✓');
})().catch(error => {
  console.error('AI CLIENT TEST FAILED:', error);
  process.exitCode = 1;
});
