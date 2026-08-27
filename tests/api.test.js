'use strict';
const fs = require('fs');
const path = require('path').join(__dirname, '..');

function makeHandler(file) {
  const src = fs.readFileSync(path + '/' + file, 'utf8');
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

(async () => {
  const grade = await makeHandler('api/grade.js');
  const coach = await makeHandler('api/coach.js');
  const req = (body) => ({ method: 'POST', headers: {}, socket: {}, body });

  let r = makeRes();
  await grade(req({ mode: 'writing', response: 'hello' }), r);
  console.log('no-key grade:', r.statusCode, '|', r.body.error.slice(0, 40));

  process.env.GEMINI_API_KEY = 'fake';
  r = makeRes();
  await grade(req({ mode: 'xxx' }), r);
  console.log('bad mode:', r.statusCode, '|', r.body.error);

  r = makeRes();
  await grade(req({ mode: 'writing', tasks: [{ response: 'hi' }] }), r);
  console.log('short response:', r.statusCode, '|', r.body.error.slice(0, 40));

  for (let i = 0; i < 16; i++) {
    r = makeRes();
    await grade(req({ mode: 'speaking', parts: [] }), r);
  }
  console.log('rate-limited at 16th:', r.statusCode, '|', r.body.error.slice(0, 30));

  r = makeRes();
  await grade({ method: 'GET', headers: {} }, r);
  console.log('GET:', r.statusCode);

  const writingPayload = {
    tasks: [
      { title: 'Task 1', band: 6.5, criteria: { taskAchievement: 6.5, coherenceCohesion: 6, lexicalResource: 7, grammar: 6.5 }, strengths: ['clear overview'], improvements: ['add comparisons'], summary: 'ok' },
      { title: 'Task 2', band: 7, criteria: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammar: 7 }, strengths: ['good position'], improvements: ['develop ideas'], summary: 'good' }
    ],
    overallSummary: 'solid'
  };
  global.fetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(writingPayload) }] } }] }) });
  r = makeRes();
  await grade({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, socket: {}, body: { mode: 'writing', tasks: [{ title: 'Task 1', prompt: 'p', response: 'a '.repeat(200) }, { title: 'Task 2', prompt: 'p', response: 'b '.repeat(300) }] } }, r);
  console.log('writing mock:', r.statusCode, '| overall band =', r.body.band, '| tasks =', r.body.tasks.map(t => t.title + ':' + t.band).join(', '));
  console.log('  expected overall = round((6.5/3 + 7*2/3)*2)/2 =', Math.round((6.5 / 3 + 7 * 2 / 3) * 2) / 2);

  global.fetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Here is your 7-day plan targeting Writing...' }] } }] }) });
  r = makeRes();
  await coach({ method: 'POST', headers: { 'x-forwarded-for': '8.8.8.8' }, socket: {}, body: { message: 'Make me a plan', profile: { band: 6, weakest: 'writing', mistakeCount: 5 }, history: [{ role: 'user', text: 'hi' }] } }, r);
  console.log('coach mock:', r.statusCode, '| reply:', r.body.reply.slice(0, 45));

  console.log('ALL API TESTS DONE');
  process.exit(0);
})().catch((e) => { console.error('TEST CRASH:', e); process.exit(1); });
