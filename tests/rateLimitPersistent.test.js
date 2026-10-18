/* tests/rateLimitPersistent.test.js — Task 03.6 persistent rate limiting.
 *
 * PART 1 (PostgreSQL, PGlite — no fake policies): the migration chain
 *   including 202610150001_rate_limits.sql applies; rate_limit_hit runs
 *   ONLY for service_role; per-hit verdicts are atomic (parallel callers
 *   on the same key can never both slip past the limit); sliding window,
 *   deny-not-recorded, bucket/id isolation, and input validation hold;
 *   the counter table is unreadable for everyone else.
 * PART 2 (lib/rateLimit.js integration): check() prefers the store when
 *   present, degrades to the in-process limiter on any store failure
 *   (degrade ≠ fail-open — traffic is STILL throttled), and keeps the
 *   endpoint/length of identity opaque (sha256, no raw IP).
 * PART 3 (static pins): every API handler awaits limiter.check, limit
 *   values/windows are unchanged, and the service-role key is nowhere in
 *   the files shipped to browsers.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
let failed = 0;
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log('✓ ' + name))
    .catch((error) => {
      failed++;
      console.log('✗ FAIL ' + name + ' — ' + (error && error.message));
      if (error && 'actual' in error) {
        console.log('   actual:   ' + JSON.stringify(error.actual));
        console.log('   expected: ' + JSON.stringify(error.expected));
      }
    });
}

/* PART 1 … atomic persistent counter via the real migration chain ……………… */
async function testSql() {
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  try {
    const alice = '00000000-0000-4000-8000-00000000000a';
    /* service_role mirrors the Supabase-managed role our Vercel functions
       authenticate with (SUPABASE_SERVICE_ROLE_KEY). */
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users (id, email) values ('${alice}', 'alice@example.com');
      create schema storage;
      create table storage.buckets(
        id text primary key, name text, public boolean,
        file_size_limit bigint, allowed_mime_types text[]
      );
      create table storage.objects(
        id uuid primary key default gen_random_uuid(),
        bucket_id text, name text
      );
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated, anon;
    `);
    const dir = path.join(root, 'supabase', 'migrations');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
      await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
    }

    const ipHashA = 'a'.repeat(64);
    const ipHashB = 'b'.repeat(64);
    const hit = (bucket, id = ipHashA, max = 3, windowMs = 60000) =>
      db.query('select public.rate_limit_hit($1,$2,$3,$4) r', [bucket, id, max, windowMs])
        .then(({ rows }) => rows[0].r);

    await db.exec('set role service_role;');

    /* 1 — allowed flow + the (max+1)-th verdict */
    const first = [await hit('t-flow'), await hit('t-flow'), await hit('t-flow'), await hit('t-flow')];
    assert.deepEqual(first.map(r => r.allowed), [true, true, true, false]);
    assert.deepEqual(first.map(r => r.used), [1, 2, 3, 3]);

    /* 2 — a denied hit is NOT recorded: the stored window holds exactly 3 */
    await db.exec('reset role;');
    let count = await db.query("select cardinality(hits) n from public.rate_limit_hits where bucket='t-flow' and id=$1", [ipHashA]);
    assert.equal(count.rows[0].n, 3, 'denied request did not extend the window');

    /* 3 — window expiry: pruning resets counters automatically */
    await db.query("update public.rate_limit_hits set hits = array(select now() - interval '2 minutes' from unnest(hits)) where bucket='t-flow' and id=$1", [ipHashA]);
    await db.exec('set role service_role;');
    const after = await hit('t-flow');
    assert.deepEqual({ allowed: after.allowed, used: after.used }, { allowed: true, used: 1 }, 'an expired window is replaced by a fresh count');

    /* 4 — bucket isolation: the same id on another endpoint is fresh */
    const other1 = await hit('t-other');
    assert.equal(other1.allowed, true);
    assert.equal(other1.used, 1, 'the other bucket starts counting from zero');
    assert.equal((await hit('t-other')).used, 2, 'hits keep counting up in the isolated bucket');

    /* 5 — id isolation: a different caller on the same endpoint is fresh */
    assert.equal((await hit('t-flow', ipHashB)).allowed, true);

    /* 6 — parallel callers: exactly max wins, the rest lose, row-lock clean */
    const results = await Promise.all(Array.from({ length: 16 }, () => hit('t-parallel', ipHashA, 15, 60000)));
    assert.equal(results.filter(r => r.allowed).length, 15, 'exactly 15 of 16 parallel hits win');
    assert.equal(results.filter(r => !r.allowed).length, 1, 'the 16th loses atomically');
    await db.exec('reset role;');
    count = await db.query("select cardinality(hits) n from public.rate_limit_hits where bucket='t-parallel'");
    assert.equal(count.rows[0].n, 15, 'counter never exceeds the limit');

    /* 7 — validation: buckets/ids must be fixed-shape; ids are never raw IPs */
    await db.exec('set role service_role;');
    await assert.rejects(hit('bad!bucket'), /Invalid bucket/);
    await assert.rejects(hit('t-flow', '1.2.3.4'), /Invalid identifier/, 'a raw IP cannot be stored as an identifier');
    await assert.rejects(hit('t-flow', ipHashA, 0), /Invalid limiter parameters/);
    await assert.rejects(hit('t-flow', ipHashA, 15, 0), /Invalid limiter parameters/);

    /* 8 — privileges: nobody but service_role may touch anything here */
    await db.exec('reset role; set role authenticated;');
    await assert.rejects(hit('t-flow'), /permission denied/, 'authenticated cannot call the RPC');
    await assert.rejects(db.query('select * from public.rate_limit_hits'), /permission denied/, 'authenticated cannot read counters');
    await db.exec('reset role; set role anon;');
    await assert.rejects(hit('t-flow'), /permission denied/, 'anon cannot call the RPC');
    await db.exec('reset role;');
  } finally { await db.close(); }
}

/* PART 2 … the handler-facing check(): degrade, never fail-open ……………… */
async function testIntegration() {
  const { createRateLimiter, attachStore, idHash } = require('../lib/rateLimit.js');
  const req = (ip) => ({ headers: ip ? { 'x-forwarded-for': ip } : {} });

  /* 1 — a healthy store wins the decision and sees opaque identity */
  {
    const calls = [];
    const perId = new Map();
    attachStore({
      async hit(bucket, id, max, windowMs) {
        calls.push([bucket, id, max, windowMs]);
        const used = perId.get(bucket + id) || 0;
        if (used >= max) return false;
        perId.set(bucket + id, used + 1);
        return true;
      }
    });
    const limiter = createRateLimiter('x-itest', { windowMs: 60_000, max: 3 });
    assert.equal(await limiter.check(req('9.9.9.1')), false);
    assert.equal(await limiter.check(req('9.9.9.1')), false);
    assert.equal(await limiter.check(req('9.9.9.1')), false);
    assert.equal(await limiter.check(req('9.9.9.1')), true, 'the store denies past the limit');
    assert.equal(calls.length, 4);
    assert.equal(calls[0][0], 'x-itest');
    assert.equal(calls[0][1], idHash('x-itest', '9.9.9.1'), 'identity is hashed before leaving the process');
    assert.match(calls[0][1], /^[0-9a-f]{64}$/);
    assert.equal(calls[0][2], 3);
    assert.equal(calls[0][3], 60000);
    /* the in-process map stayed EMPTY while the store owned decisions */
    assert.equal(limiter._ipHits.size, 0, 'local map is not double-counting');
  }

  /* 2 — store failure degrades to the local limiter (STILL throttled) */
  {
    attachStore({ async hit() { throw new Error('storage down'); } });
    const limiter = createRateLimiter('x-degrade', { windowMs: 60_000, max: 3 });
    assert.equal(await limiter.check(req('8.8.8.8')), false);
    assert.equal(await limiter.check(req('8.8.8.8')), false);
    assert.equal(await limiter.check(req('8.8.8.8')), false);
    assert.equal(await limiter.check(req('8.8.8.8')), true, 'a storage failure never becomes a silent allow');
    assert.equal(limiter._ipHits.get('8.8.8.8').length, 3, 'the fallback counted the degraded hits');
  }

  /* 3 — no store configured at all: pure local mode (dev/tests) */
  {
    attachStore(null);
    const limiter = createRateLimiter('x-local', { windowMs: 60_000, max: 2 });
    assert.equal(await limiter.check(req('7.7.7.7')), false);
    assert.equal(await limiter.check(req('7.7.7.7')), false);
    assert.equal(await limiter.check(req('7.7.7.7')), true, 'local mode limits on its own');
  }

  /* 4 — equivalent calls produce different hashes per endpoint/ip */
  assert.notEqual(idHash('grade', '9.9.9.1'), idHash('coach', '9.9.9.1'), 'digests are endpoint-scoped');
  assert.notEqual(idHash('grade', '9.9.9.1'), idHash('grade', '9.9.9.2'), 'digests are caller-scoped');
}

/* PART 3 … static pins: handlers, limits, secret hygiene ……………………… */
function testStatic() {
  const handlers = ['grade', 'coach', 'quiz', 'generate-mock', 'delete-account'];
  for (const name of handlers) {
    const src = fs.readFileSync(path.join(root, 'api', name + '.js'), 'utf8');
    assert.ok(src.includes('await limiter.check(req)'), `${name} uses the async check`);
    assert.ok(!/\blimiter\.limited\(req\)/.test(src), `${name} no longer calls the legacy sync gate directly`);
  }
  const reads = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  assert.ok(/createRateLimiter\('grade',\s*{ windowMs: 60 \* 1000, max: 15 }\)/.test(reads('api/grade.js')), 'grade limit untouched');
  assert.ok(/createRateLimiter\('coach',\s*{ windowMs: 60 \* 1000, max: 20 }\)/.test(reads('api/coach.js')), 'coach limit untouched');
  assert.ok(/createRateLimiter\('quiz',\s*{ windowMs: 60 \* 1000, max: 20 }\)/.test(reads('api/quiz.js')), 'quiz limit untouched');
  assert.ok(/createRateLimiter\('generate-mock',\s*{ windowMs: 5 \* 60 \* 1000, max: 120 }\)/.test(reads('api/generate-mock.js')), 'generator limit untouched');
  assert.ok(/createRateLimiter\('delete-account',\s*{ windowMs: 60 \* 1000, max: 5 }\)/.test(reads('api/delete-account.js')), 'delete-account limit untouched');

  /* the service-role key must never reach a browser-shipped file */
  const BRIDGE_PATTERN = /SUPABASE_SERVICE_ROLE_KEY/;
  for (const shipped of ['script.js', 'supabaseClient.js', 'admin.js', 'mockGenerator.js', 'index.html', 'sw.js']) {
    assert.ok(!BRIDGE_PATTERN.test(reads(shipped)), `no service-role reference in ${shipped}`);
  }
  /* the migration adds exactly one new table with zero grants on it */
  const sql = reads('supabase/migrations/202610150001_rate_limits.sql');
  assert.ok(/create table if not exists public\.rate_limit_hits/.test(sql));
  assert.ok(/grant execute on function public\.rate_limit_hit\(text, text, integer, bigint\) to service_role/.test(sql));
  assert.ok(!/grant (select|insert|update|delete)[^;]*rate_limit_hits/iu.test(sql), 'no data-level grants on the counter table');
}

(async () => {
  try {
    await check('PART 1 — rate_limit_hit: atomicity, window, deny-not-recorded, isolation, validation, service_role-only', testSql);
    await check('PART 2 — check(): store-first, opaque identity, degrade-not-fail-open, pure local mode', testIntegration);
    await check('PART 3 — handlers await check, limits untouched, secret hygiene, zero-grant table, migration presence', testStatic);
  } finally {
    /* restore the real lazy store for any later suite in this process */
    try { require('../lib/rateLimit.js').attachStore(null); } catch { /* best effort */ }
  }
  if (failed) { console.log('\nrateLimitPersistent suite FAILED (' + failed + ')'); process.exit(1); }
  console.log('\nrateLimitPersistent suite: all parts green');
  process.exit(0);
})();
