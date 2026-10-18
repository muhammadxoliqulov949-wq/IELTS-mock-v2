/* Timeout layer alignment regression tests (Task 03.10).
 *
 * The original defect: lib/aiClient.js budgeted 120s per provider attempt
 * while vercel.json caps every api/*.js function at 60s. Any attempt past
 * 60s could never succeed — the platform hard-kills the function with an
 * unmapped error — so the AI client's own timeout/failover path (mapped
 * GROQ_/STREAM_REQUEST_FAILED, retryable-error failover, mid-stream
 * "[Connection interrupted]" note) could never run for a hung provider.
 *
 * These pins keep the invariant: per-attempt timeout + headroom <= the
 * function maxDuration, and the documented constants stay wired to the
 * fetches. They deliberately do NOT raise maxDuration (the Vercel plan
 * limit must be verified in the dashboard before any such change).
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path').join(__dirname, '..');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('✓ ' + name); }
  catch (err) { failed++; console.log('✗ FAIL ' + name + ' — ' + err.message); }
}

const vercel = JSON.parse(fs.readFileSync(path + '/vercel.json', 'utf8'));
const aiClient = fs.readFileSync(path + '/lib/aiClient.js', 'utf8');
const mReq = aiClient.match(/REQUEST_TIMEOUT_MS\s*=\s*([\d_]+)/);
const mStr = aiClient.match(/STREAM_TIMEOUT_MS\s*=\s*([\d_]+)/);
const requestTimeout = Number((mReq && mReq[1] || '').replace(/_/g, ''));
const streamTimeout = Number((mStr && mStr[1] || '').replace(/_/g, ''));
const maxDurationMs = ((vercel.functions && vercel.functions['api/*.js'] && vercel.functions['api/*.js'].maxDuration) || 0) * 1000;

check('vercel.json: every api/*.js function has a declared maxDuration (60s today)', () => {
  assert.equal(vercel.functions['api/*.js'].maxDuration, 60);
  assert.equal(maxDurationMs, 60_000);
});
check('alignment: REQUEST_TIMEOUT_MS + 10s handler headroom <= function budget', () => {
  assert(requestTimeout > 0 && requestTimeout + 10_000 <= maxDurationMs);
});
check('alignment: STREAM_TIMEOUT_MS + 10s headroom <= function budget', () => {
  assert(streamTimeout > 0 && streamTimeout + 10_000 <= maxDurationMs);
});
check('constants are the documented 50s post-03.10 values', () => {
  assert.equal(requestTimeout, 50_000);
  assert.equal(streamTimeout, 50_000);
});
check('wiring: chat path fetches with AbortSignal.timeout(REQUEST_TIMEOUT_MS)', () => {
  assert(aiClient.includes('signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)'));
});
check('wiring: stream path fetches with AbortSignal.timeout(STREAM_TIMEOUT_MS)', () => {
  assert(aiClient.includes('signal: AbortSignal.timeout(STREAM_TIMEOUT_MS)'));
});
check('wiring: abort maps to mapped retryable codes (failover can engage)', () => {
  assert((aiClient.match(/code: 'GROQ_REQUEST_FAILED'/g) || []).length >= 1);
  assert((aiClient.match(/code: 'STREAM_REQUEST_FAILED'/g) || []).length >= 1);
  const flat = aiClient.replace(/\s+/g, ' ');
  assert(flat.includes("err.code === 'GROQ_REQUEST_FAILED' || err.code === 'STREAM_REQUEST_FAILED') return true"));
});

/* No handler may exceed the shared function cap via Vercel config drift:
   per-route overrides must not appear silently. */
check('vercel.json: no per-route function overrides hiding a different timeout', () => {
  assert.deepEqual(Object.keys(vercel.functions), ['api/*.js']);
});

/* Runbook exists and matches the real configuration on disk. */
check('runbook: docs/VERCEL-TIMEOUT-RUNBOOK.md exists with real constants', () => {
  const doc = fs.readFileSync(path + '/docs/VERCEL-TIMEOUT-RUNBOOK.md', 'utf8');
  assert(doc.includes('maxDuration') && doc.includes('REQUEST_TIMEOUT_MS') && doc.includes('STREAM_TIMEOUT_MS'));
  assert(doc.includes('50 000') || doc.includes('50s'));
  assert(doc.includes('[aiClient]'));
  // No secrets may live in the doc.
  assert(!/GROQ_API_KEY\s*=\s*\S|DEEPSEEK_API_KEY\s*=\s*\S|Bearer\s+\S/i.test(doc.replace(/GROQ_API_KEY\)|DEEPSEEK_API_KEY\)/g, '')));
});

console.log(failed ? '\nRESULT: FAIL (' + failed + ')' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
