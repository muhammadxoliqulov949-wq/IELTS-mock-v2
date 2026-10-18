/* ===================================================================
 * Shared per-IP rate limiter (lib/rateLimit.js) — focused tests
 *
 * Pins the exact semantics the five API endpoints relied on before the
 * extraction (Task 02.2): sliding window, denied-not-recorded, per-IP
 * and per-endpoint isolation, x-forwarded-for identity, and each
 * production endpoint's recorded limit/window.
 *
 * This file is intentionally run directly (`node tests/rateLimit.test.js`)
 * — package.json may not be edited in this subtask.
 * =================================================================== */
'use strict';

const { clientIp, createRateLimiter } = require('../lib/rateLimit.js');

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const req = (headers = {}, socketAddr) => ({ headers, socket: socketAddr ? { remoteAddress: socketAddr } : undefined });

(async () => {
  /* ---------- client-IP identity (trusted-proxy assumption preserved) ---------- */
  check('clientIp: first x-forwarded-for entry wins (the edge-composed chain)',
    clientIp(req({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.4' })) === '203.0.113.7');
  check('clientIp: the forwarded entry is trimmed',
    clientIp(req({ 'x-forwarded-for': '  192.0.2.9 , 10.0.0.1' })) === '192.0.2.9');
  check('clientIp: without a header the TCP peer is used',
    clientIp(req({}, '198.51.100.23')) === '198.51.100.23');
  check('clientIp: neither header nor peer → unknown (all such callers share one bucket, as before)',
    clientIp(req({})) === 'unknown');

  /* ---------- allowed flow, exhaustion, denied-not-recorded ---------- */
  {
    const limiter = createRateLimiter('t-flow', { windowMs: 60_000, max: 3 });
    const ip = { 'x-forwarded-for': '9.9.9.1' };
    check('allowed: requests up to the limit pass', !limiter.limited(req(ip)) && !limiter.limited(req(ip)) && !limiter.limited(req(ip)));
    check('exhaustion: the (max+1)-th request is denied', limiter.limited(req(ip)) === true);
    limiter._ipHits.clear();
    check('a denied request was not recorded: after clear() the limiter is fresh (still max allowances)',
      !limiter.limited(req(ip)) && limiter._ipHits.get('9.9.9.1').length === 1);
  }
  {
    /* deny several times in a row, then prove the window did NOT move:
       the original three hits still age out on their own schedule */
    const limiter = createRateLimiter('t-deny', { windowMs: 60, max: 2 });
    const ip = { 'x-forwarded-for': '9.9.9.2' };
    limiter.limited(req(ip)); limiter.limited(req(ip));
    check('deny: third request denied', limiter.limited(req(ip)) === true);
    await sleep(30);
    check('deny: a further denied attempt does not reset the window', limiter.limited(req(ip)) === true);
    await sleep(45); /* 75 ms total > 60 ms window */
    check('window reset: after the window elapses the caller is allowed again', limiter.limited(req(ip)) === false);
  }

  /* ---------- per-IP isolation ---------- */
  {
    const limiter = createRateLimiter('t-ips', { windowMs: 60_000, max: 1 });
    check('IP isolation: IP A exhausts its own quota', !limiter.limited(req({ 'x-forwarded-for': '8.8.8.8' })) && limiter.limited(req({ 'x-forwarded-for': '8.8.8.8' })));
    check('IP isolation: IP B is unaffected by IP A', !limiter.limited(req({ 'x-forwarded-for': '8.8.4.4' })));
  }

  /* ---------- per-limiter (endpoint) isolation — no shared counters ---------- */
  {
    const a = createRateLimiter('endpoint-a', { windowMs: 60_000, max: 1 });
    const b = createRateLimiter('endpoint-b', { windowMs: 60_000, max: 1 });
    const ip = { 'x-forwarded-for': '7.7.7.7' };
    a.limited(req(ip));
    check('endpoint isolation: exhausting limiter A does not spend limiter B', a.limited(req(ip)) === true && b.limited(req(ip)) === false);
    const a2 = createRateLimiter('endpoint-a', { windowMs: 60_000, max: 1 });
    check('two instances with the same name still get separate counters (no accidental sharing)',
      a2.limited(req(ip)) === false);
  }

  /* ---------- the five production configurations, recorded pre-extraction ---------- */
  const PRODUCTION = [
    ['grade',          { windowMs: 60 * 1000,      max: 15  }],
    ['coach',          { windowMs: 60 * 1000,      max: 20  }],
    ['quiz',           { windowMs: 60 * 1000,      max: 20  }],
    ['delete-account', { windowMs: 60 * 1000,      max: 5   }],
    ['generate-mock',  { windowMs: 5 * 60 * 1000,  max: 120 }]
  ];
  for (const [name, cfg] of PRODUCTION) {
    const limiter = createRateLimiter(name, cfg);
    check(`production config: ${name} keeps windowMs=${cfg.windowMs} max=${cfg.max}`,
      limiter.windowMs === cfg.windowMs && limiter.max === cfg.max);
    const ip = { 'x-forwarded-for': '10.9.8.7' };
    let allowed = 0;
    for (let i = 0; i < cfg.max + 2 && !limiter.limited(req(ip)); i++) allowed++;
    check(`production config: ${name} allows exactly ${cfg.max} then denies`, allowed === cfg.max);
  }

  /* ---------- constructor validation ---------- */
  let threw = 0;
  for (const bad of [['', { windowMs: 1, max: 1 }], ['x', { windowMs: 0, max: 1 }], ['x', { windowMs: 1, max: 0 }], ['x', undefined]]) {
    try { createRateLimiter(bad[0], bad[1]); } catch { threw++; }
  }
  check('validation: name, windowMs and max are required and must be positive', threw === 4);

  console.log(failed === 0 ? '\nRATE LIMIT TESTS OK ✓' : `\n${failed} RATE LIMIT TEST(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('RATE LIMIT TEST CRASH:', e); process.exit(1); });
