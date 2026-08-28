'use strict';
/* Tests for the new /api/quiz endpoint (local fallback when no Gemini key). */
const fs = require('fs');
const path = require('path').join(__dirname, '..');

function makeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

(async () => {
  const src = fs.readFileSync(path + '/api/quiz.js', 'utf8');
  const fn = new Function('module', 'require', 'process', src);
  const m = { exports: {} };
  fn(m, require, process);
  const handler = m.exports;

  const req = (body, ip) => ({ method: 'POST', headers: { 'x-forwarded-for': ip || '1.2.3.4' }, socket: {}, body });

  let r = makeRes();
  await handler(req({ topic: 'vocabulary', count: 3 }), r);
  console.log('quiz local:', r.statusCode, '| questions =', r.body.questions ? r.body.questions.length : r.body.error);
  if (r.statusCode !== 200 || !r.body.questions || r.body.questions.length !== 3) {
    console.log('FAIL quiz local'); process.exit(1);
  }
  const q = r.body.questions[0];
  if (!q.prompt || !Array.isArray(q.options) || typeof q.answer !== 'number') {
    console.log('FAIL quiz shape'); process.exit(1);
  }

  r = makeRes();
  await handler({ method: 'GET', headers: {} }, r);
  if (r.statusCode !== 405) { console.log('FAIL quiz GET', r.statusCode); process.exit(1); }

  console.log('QUIZ API OK ✓');
  process.exit(0);
})();
