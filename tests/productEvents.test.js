/* tests/productEvents.test.js — Task 03.2 minimal product telemetry.
 *
 * PART 1 (PostgreSQL/RLS, PGlite — no fake policies): the WHOLE migration
 *   chain (ending with 202610130001_product_events.sql) applies cleanly; the
 *   table accepts exactly the three whitelisted events inserted by their
 *   owner; forged user_id, unknown event names, anonymous writes and
 *   non-admin reads are refused; admins read via public.is_admin().
 * PART 2 (client helper, mock network only — explicitly NOT production):
 *   supabaseClient.trackEvent enforces the whitelist, derives user_id from
 *   its OWN session (never the caller), sanitises + caps metadata, is a
 *   no-op for guests/logged-out users, fails open on server errors and
 *   never writes to the console.
 * PART 3 (script.js lifecycle, stubbed DOM/CLOUD): 'signup' fires exactly
 *   once on the real OTP verification success path; 'mock_started' fires
 *   exactly once per fresh attempt start (stale re-clicks / resume do not
 *   re-fire, a new test IS a new lifecycle); 'mock_completed' fires exactly
 *   once at the completing section submit (views/retakes do not re-fire);
 *   and a telemetry outage never breaks any of these flows.
 */
const fs = require('fs');
const os = require('os');
const vm = require('vm');
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

/* PART 1 … PostgreSQL + RLS via PGlite (real migration chain) ……………………… */
async function testRLS() {
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  try {
    const alice = '00000000-0000-4000-8000-00000000000a';
    const bob = '00000000-0000-4000-8000-00000000000b';
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin;
      create schema auth;
      /* Mirror the auth.users shape the migrations actually read:
         handle_new_user() uses email + raw_user_meta_data. */
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users (id, email) values
        ('${alice}', 'alice@example.com'), ('${bob}', 'bob@example.com');
      /* 202610050002_media_storage.sql targets the Supabase-managed storage
         schema; emulate exactly the columns it touches (bucket config +
         storage.objects bucket_id for the policy bodies). */
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
    /* Apply every migration in filename order exactly as production would —
       this also proves the new file introduces no name collisions. */
    const dir = path.join(root, 'supabase', 'migrations');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
      await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
    }
    /* The admin migration backfills one profile per auth user (on conflict
       do nothing); promoting Alice to admin is an UPDATE after the chain. */
    assert.equal((await db.query('select count(*) as c from public.profiles')).rows[0].c, 2);
    await db.exec(`update public.profiles set role = 'admin' where id = '${alice}';`);
    const whitelist = await db.query(
      "select event from public.product_events where false", []);
    assert.equal(whitelist.rows.length, 0, 'table starts empty');
    const rows = () => db.query('select user_id, event, meta from public.product_events order by created_at, event');

    /* 1 — an authenticated learner records their own whitelisted event */
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${alice}';`);
    await db.query(
      'insert into public.product_events (user_id, event, meta) values ($1, $2, $3::jsonb)',
      [alice, 'mock_started', '{"test":"test1"}']
    );
    assert.equal((await rows()).rows.length, 1);

    /* 2 — an unknown event is refused by the CHECK constraint */
    await assert.rejects(
      db.query('insert into public.product_events (user_id, event) values ($1, $2)', [alice, 'click_count']),
      /check constraint/i
    );

    /* 3 — forged user_id is refused by the insert policy */
    await assert.rejects(
      db.query('insert into public.product_events (user_id, event) values ($1, $2)', [bob, 'signup']),
      /row-level security/i
    );

    /* 4 — all three allowed events are accepted for the owner */
    await db.query('insert into public.product_events (user_id, event) values ($1, $2)', [alice, 'signup']);
    await db.query('insert into public.product_events (user_id, event) values ($1, $2)', [alice, 'mock_completed']);
    assert.equal((await rows()).rows.length, 3);

    /* 5 — the OTHER learner sees nothing (zero rows, RLS-filtered) */
    await db.exec(`set request.jwt.claim.sub = '${bob}';`);
    assert.equal((await rows()).rows.length, 0);
    assert.equal((await db.query('select public.is_admin() as v')).rows[0].v, false);
    /* … and cannot insert into someone else's namespace either */
    await assert.rejects(
      db.query('insert into public.product_events (user_id, event) values ($1, $2)', [alice, 'signup']),
      /row-level security/i
    );

    /* 6 — the admin reads everything through public.is_admin() */
    await db.exec(`set request.jwt.claim.sub = '${alice}';`);
    assert.equal((await db.query('select public.is_admin() as v')).rows[0].v, true);
    const adminView = await rows();
    assert.equal(adminView.rows.length, 3);
    assert.deepEqual(adminView.rows.map(r => r.event).sort(), ['mock_completed', 'mock_started', 'signup']);

    /* 7 — anonymous callers are refused at the privilege level entirely */
    await db.exec('reset role; set role anon;');
    await assert.rejects(
      db.query('insert into public.product_events (user_id, event) values ($1, $2)', [alice, 'signup']),
      /permission denied/i
    );
    await assert.rejects(db.query('select * from public.product_events'), /permission denied/i);

    /* 8 — an authenticated caller with no claim sub (auth.uid() = null) cannot write */
    await db.exec('reset role; set role authenticated; set request.jwt.claim.sub = \'\';');
    await assert.rejects(
      db.query('insert into public.product_events (user_id, event) values ($1, $2)', [alice, 'signup']),
      /row-level security/i
    );
  } finally { await db.close(); }
}

/* PART 2 … supabaseClient.trackEvent against a stubbed network ……………………… */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function testClientHelper() {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `ielts-sbclient-telemetry-${process.pid}.cjs`);
  esbuild.buildSync({
    entryPoints: [path.join(root, 'supabaseClient.js')],
    outfile, bundle: true, format: 'cjs', platform: 'node', logLevel: 'silent'
  });
  const uid = '00000000-0000-4000-8000-0000000000aa';
  const user = { id: uid, email: 'aziz@example.com', user_metadata: { name: 'Aziz' } };
  const jwt = 'unit.' + Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 }))
    .toString('base64url') + '.sig';
  const posts = [];
  let insertFails = false;
  global.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith('/api/config')) {
      return json({ configured: true, SUPABASE_URL: 'https://telemetry.unit.test', SUPABASE_ANON_KEY: 'pub-test-key' });
    }
    if (target.includes('/auth/v1/token')) {
      return json({ access_token: jwt, refresh_token: 'ref-unit', expires_in: 3600, token_type: 'bearer', user });
    }
    if (target.includes('/auth/v1/user')) return json(user);
    if (target.includes('/rest/v1/profiles')) {
      return json([{ id: uid, email: user.email, name: 'Aziz', coins: 0, current_streak: 0, last_active_date: null, role: 'user', avatar_url: null }]);
    }
    if (target.includes('/rest/v1/product_events')) {
      /* supabase-js sends the row object as-is for a single-row insert. */
      const parsed = JSON.parse(String(options.body || 'null'));
      posts.push(Array.isArray(parsed) ? parsed[0] : parsed);
      if (insertFails) return json({ message: 'telemetry db unavailable' }, 400);
      return json([{ id: 'evt-' + posts.length }], 201);
    }
    return json({});
  };
  const noisy = [];
  const originalConsole = {};
  for (const level of ['log', 'warn', 'error']) {
    originalConsole[level] = console[level];
    console[level] = (...args) => {
      const line = args.map(String).join(' ');
      if (/product_events|signup|mock_started|mock_completed|telemetry/i.test(line)) noisy.push(line);
    };
  }
  try {
    const api = require(outfile);
    await api.ready;

    /* guests: never tracked, nothing hits the network */
    await api.trackEvent('mock_started', { test: 'test1' });
    assert.equal(posts.length, 0, 'guest events must be no-ops');

    await api.authenticate({ mode: 'signin', email: user.email, password: 'unit-test' });
    assert.equal(posts.length, 0, 'sign-in itself is not a product event');

    /* happy path: user_id comes from the session, never from the caller */
    await api.trackEvent('mock_started', { test: 'test1', user_id: 'forged' });
    assert.equal(posts.length, 1, 'first tracked event recorded');
    assert.deepEqual(posts[0], { user_id: uid, event: 'mock_started', meta: { test: 'test1' } },
      'session owner is stamped and caller metadata stays clean');

    /* all three whitelisted events pass; a fourth name is refused locally */
    await api.trackEvent('signup', {});
    await api.trackEvent('mock_completed', { test: 'test1', section: 'speaking' });
    await api.trackEvent('click_count', {});
    await api.trackEvent('mock_started_extra', { test: 'test9' });
    assert.equal(posts.length, 3, 'only whitelisted events are sent');
    assert.equal(posts[1].event, 'signup');
    assert.equal(posts[2].event, 'mock_completed');
    assert.deepEqual(posts[2].meta, { test: 'test1', section: 'speaking' });

    /* metadata hygiene: non-scalars and oversize values are dropped locally */
    await api.trackEvent('mock_started', { test: 'test2', blob: { a: 1 }, fn: () => 1, note: 'x'.repeat(500), empty: null });
    assert.deepEqual(posts[3].meta, { test: 'test2' }, 'only small scalars survive');

    /* the whole payload is capped — oversized aggregates stay local */
    const huge = {};
    for (let i = 0; i < 60; i++) huge['pad' + i] = 'v'.repeat(25);
    await api.trackEvent('mock_started', huge);
    assert.equal(posts.length, 4, 'oversized aggregate metadata is not sent');

    /* fail-open: a server-side insert failure never throws into the app */
    insertFails = true;
    await api.trackEvent('signup', {});
    assert.equal(posts.length, 5, 'the failing insert was still attempted once');
    insertFails = false;

    /* after logout the tracker is silent again */
    await api.logout();
    await api.trackEvent('mock_completed', { test: 'test9' });
    assert.equal(posts.length, 5, 'logged-out events are no-ops');

    assert.deepEqual(noisy, [], 'telemetry must never write to the console');
  } finally {
    for (const level of ['log', 'warn', 'error']) console[level] = originalConsole[level];
    delete require.cache[require.resolve(outfile)];
    try { fs.unlinkSync(outfile); } catch { /* best effort */ }
  }
}

/* PART 3 … script.js lifecycle cheeks (stubbed DOM/CLOUD bridge) …………………… */
/* PART 3 … script.js lifecycle checks (stubbed DOM/CLOUD bridge) …………………… */
async function testLifecycle() {
  const elements = new Map();
  function element() {
    return {
      innerHTML: '', textContent: '', value: '', dataset: {}, style: {},
      classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
      querySelector() { return null; }, querySelectorAll: () => [],
      setAttribute() {}, getAttribute: () => null, addEventListener() {},
      appendChild() {}, focus() {}, scrollIntoView() {}
    };
  }
  const storage = new Map();
  const uid = '00000000-0000-4000-8000-0000000000cc';
  const state = { status: 'ready', user: null, profile: null };
  const events = [];
  let telemetryBroken = false;
  const helpers = require('../lib/mockResults');
  const cloud = {
    ...helpers,
    ready: new Promise(() => {}),
    getState: () => state,
    /* Records like a healthy client does; throws when simulating an outage —
       the app layer must swallow BOTH shapes of failure. */
    async trackEvent(event, meta) {
      if (telemetryBroken) throw new Error('telemetry outage');
      events.push({ event, meta });
    },
    async authenticate({ mode }) {
      /* signup without email-confirm off always needs the OTP form here; a
         completed auth must expose the session user via getState(), exactly
         like the real client whose module auth state updates on verify. */
      if (mode === 'signup') return { session: null, user: null };
      state.user = makeUser();
      return { session: { access_token: 'x' }, user: state.user };
    },
    async verifySignupOtp() {
      state.user = makeUser();
      return { session: { access_token: 'x' }, user: state.user };
    },
    async resendSignupOtp() { return {}; },
    async loadMockResults() { return []; },
    async saveMockSection() {},
    async addUserCoins() { return { awarded_coins: 0, coins_balance: 0 }; }
  };
  function makeUser() { return { id: uid, email: 'aziz@example.com', user_metadata: { name: 'Aziz' } }; }

  const context = vm.createContext({
    console, Date, JSON, Map, Set, Number, String, Array, Object, Math, Promise, RegExp, Error, Intl,
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    location: { hash: '#/login' },
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k)
    },
    document: {
      querySelector(sel) { if (!elements.has(sel)) elements.set(sel, element()); return elements.get(sel); },
      querySelectorAll: () => [], createElement: element, addEventListener() {}
    },
    window: { IELTS_CLOUD: cloud, addEventListener() {}, scrollY: 0, speechSynthesis: null },
    confirm: () => true,
    fetch: () => Promise.reject(new Error('network disabled in lifecycle test')),
    /* Mirrors the browser: FormData reads LIVE field values from the form —
       the OTP handler pulls the code through `.get('token')`. */
    FormData: class {
      get(key) {
        if (key === 'token') return String(elements.get('#signup-otp-code').value || '');
        return { name: 'Aziz', email: 'aziz@example.com', password: 'unit-secret' }[key] || '';
      }
    }
  });
  for (const file of ['data.js', 'content2.js', 'content3.js', 'content4.js', 'i18n.js', 'services.js', 'script.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  const run = code => vm.runInContext(code, context);
  const countOf = name => events.filter(e => e.event === name).length;

  /* ── A) signup: auth form (register) → OTP form → exactly one event ── */
  run('render()'); // renders the login page and binds the auth form
  const authForm = elements.get('#auth-form');
  authForm.dataset.authMode = 'signup';
  await authForm.onsubmit({ preventDefault() {} });
  elements.get('#signup-otp-code').value = '123456';
  await elements.get('#signup-otp-form').onsubmit({ preventDefault() {} });
  assert.equal(run('store.user && store.user.id'), uid, 'OTP success signed the learner in');
  assert.equal(countOf('signup'), 1, 'signup event fired exactly once on verification');
  assert.deepEqual(events[0].meta, {}, 'signup carries no personal metadata');
  /* a repeated submit is rejected by the handler guard → no double-fire */
  await elements.get('#signup-otp-form').onsubmit({ preventDefault() {} });
  assert.equal(countOf('signup'), 1, 'repeated OTP submit does not re-fire');

  /* ── B) mock_started: warn-modal start ⇒ once per fresh attempt ── */
  const warnStart = elements.get('[data-warn-start]');
  warnStart.dataset.warnStart = 'listening:40';
  run(`store.selectedTest = 'test1'; save()`);
  for (const key of [...storage.keys()]) if (key.includes(':deadline:listening:')) storage.delete(key);
  warnStart.onclick();
  assert.equal(countOf('mock_started'), 1, 'fresh listening start fires once');
  assert.deepEqual(events.find(e => e.event === 'mock_started').meta, { test: 'test1' });
  warnStart.onclick(); // stale-element double-click race
  assert.equal(countOf('mock_started'), 1, 're-clicking the same start does not re-fire');
  run(`store.selectedTest = 'test2'; save()`); // a different test IS a new lifecycle
  warnStart.onclick();
  assert.equal(countOf('mock_started'), 2, 'starting another test fires again');
  run(`store.selectedTest = 'test1'; save()`);

  /* ── C) mock_completed: the fourth section submit completes the mock ── */
  run(`store.attempts = [
    {section:'listening',test:'test1',band:7,date:100},
    {section:'reading',  test:'test1',band:7,date:200},
    {section:'writing',  test:'test1',band:6,date:300}];
    store.selectedTest = 'test1'; save()`);
  run(`recordMockAttempt({section:'speaking',test:'test1',band:6.5,date:400})`);
  assert.equal(countOf('mock_completed'), 1, 'completing all four sections fires once');
  assert.deepEqual(events.find(e => e.event === 'mock_completed').meta, { test: 'test1', section: 'speaking' });
  /* viewing/composing results afterwards is exactly where re-fires used to
     sneak in — single-section retakes must not complete a NEW mock */
  run(`recordMockAttempt({section:'listening',test:'test1',band:8,date:500})`);
  assert.equal(countOf('mock_completed'), 1, 'a retake after completion does not re-fire');
  run(`store.selectedTest = 'test2'; save()`);
  run(`recordMockAttempt({section:'listening',test:'test2',band:7,date:600})`);
  assert.equal(countOf('mock_completed'), 1, 'a partial attempt of another test does not fire');

  /* ── D) fail-open end-to-end: telemetry outage never breaks the flows ── */
  telemetryBroken = true;
  run(`store.selectedTest = 'test3'; save()`);
  for (const key of [...storage.keys()]) if (key.includes(':deadline:listening:')) storage.delete(key);
  warnStart.onclick(); // would throw if the app layer leaked the failure
  run(`store.attempts = [
    {section:'listening',test:'test3',band:7,date:700},
    {section:'reading',  test:'test3',band:7,date:701},
    {section:'writing',  test:'test3',band:7,date:702}];
    store.selectedTest = 'test3'; save()`);
  run(`recordMockAttempt({section:'speaking',test:'test3',band:7,date:703})`);
  telemetryBroken = false;
  assert.equal(countOf('mock_started'), 2, 'outage did not record nor crash the start');
  assert.equal(countOf('mock_completed'), 1, 'outage did not record nor crash the completion');
}

(async () => {
  await check('PART 1 — migration chain + RLS: owner insert, forged-id/unknown-event/anon denials, learner-select empty, admin read', testRLS);
  await check('PART 2 — trackEvent: whitelist, session-owned id, meta hygiene + cap, fail-open, console silence', testClientHelper);
  await check('PART 3 — lifecycle: single-fire signup / mock_started / mock_completed, dedupe, fail-open flows', testLifecycle);
  if (failed) { console.log('\nproductEvents suite FAILED (' + failed + ')'); process.exit(1); }
  console.log('\nproductEvents suite: all 3 parts green');
})();
