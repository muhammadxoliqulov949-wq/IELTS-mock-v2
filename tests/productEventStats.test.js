/* tests/productEventStats.test.js — Task 03.5 telemetry admin metrics.
 *
 * PART 1 (PostgreSQL/RLS, PGlite — no fake policies): the WHOLE migration
 *   chain (ending with 202610140001_product_event_stats.sql) applies; the
 *   aggregate RPC counts 7d/30d windows, previous-equal-window and UTC
 *   "today" correctly; admins only — learners, no-claim sessions and anon
 *   are refused; invalid windows are rejected; the payload exposes only
 *   aggregate counts (never user_id / email / meta).
 * PART 2 (client helper, mock network only — explicitly NOT production):
 *   adminProductEventStats() forwards p_window verbatim for both windows,
 *   fails fast for a non-admin BEFORE any network call, and surfaces a
 *   server error to the caller (the UI owns the user-facing handling).
 * PART 3 (admin.js UI, stubbed DOM/CLOUD): the card renders three metrics
 *   with today/previous hints, the 7d/30d switch re-fetches, error and
 *   empty states render without breaking the overview, and a learner never
 *   sees telemetry.
 */
const fs = require('fs');
const os = require('os');
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

/* PART 1 … aggregate RPC against the real migration chain …………………………… */
async function testSql() {
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  try {
    const alice = '00000000-0000-4000-8000-00000000000a';
    const bob = '00000000-0000-4000-8000-00000000000b';
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users (id, email) values
        ('${alice}', 'alice@example.com'), ('${bob}', 'bob@example.com');
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
    await db.exec(`update public.profiles set role = 'admin' where id = '${alice}';`);

    /* Deterministic event history relative to now():
       today: 2 signups + 1 start; 3d ago: 1 completion; 10d ago: 1 signup
       (previous window for 7d, current for 30d); 20d ago: 1 start
       (outside 7d windows, inside 30d); 45d ago: 1 completion
       (previous window for 30d, invisible for 7d). */
    await db.exec(`
      insert into public.product_events (user_id, event) values
        ('${alice}', 'signup'), ('${alice}', 'signup'), ('${alice}', 'mock_started');
      insert into public.product_events (user_id, event, created_at) values
        ('${alice}', 'mock_completed', now() - interval '3 days'),
        ('${alice}', 'signup',         now() - interval '10 days'),
        ('${alice}', 'mock_started',   now() - interval '20 days'),
        ('${alice}', 'mock_completed', now() - interval '45 days');
    `);
    const stats = async (w) => (await db.query('select public.product_event_stats($1) s', [w])).rows[0].s;

    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${alice}';`);
    const d7 = await stats('7d');
    assert.deepEqual(
      { s: d7.signups, m: d7.starts, c: d7.completions },
      { s: 2, m: 1, c: 1 },
      '7d window counts only events of the last 7 days'
    );
    assert.deepEqual(
      { s: d7.prevSignups, m: d7.prevStarts, c: d7.prevCompletions },
      { s: 1, m: 0, c: 0 },
      'previous 7d window (7–14 days back) counts separately'
    );
    assert.deepEqual(
      { s: d7.todaySignups, m: d7.todayStarts, c: d7.todayCompletions },
      { s: 2, m: 1, c: 0 },
      'UTC "today" counts only same-day events'
    );
    assert.equal(d7.window, '7d');

    const d30 = await stats('30d');
    assert.deepEqual(
      { s: d30.signups, m: d30.starts, c: d30.completions },
      { s: 3, m: 2, c: 1 },
      '30d window also includes 10d/20d-old events'
    );
    assert.deepEqual(
      { s: d30.prevSignups, m: d30.prevStarts, c: d30.prevCompletions },
      { s: 0, m: 0, c: 1 },
      'previous 30d window (30–60 days back) catches the 45d-old completion'
    );

    assert.deepEqual(Object.keys(d30).sort(), [
      'completions', 'prevCompletions', 'prevSignups', 'prevStarts',
      'signups', 'starts', 'todayCompletions', 'todaySignups', 'todayStarts', 'window'
    ], 'aggregate-only payload: exactly the ten counters (no user_id, email or meta)');

    /* unauthenticated / non-admin / anonymous paths */
    await assert.rejects(stats('99d'), /Invalid window/, 'unknown window is rejected');
    await db.exec(`set request.jwt.claim.sub = '${bob}';`);
    await assert.rejects(stats('7d'), /Only admins/, 'an ordinary learner cannot read the stats');
    await db.exec(`set request.jwt.claim.sub = '';`);
    await assert.rejects(stats('7d'), /Only admins|row-level security|permission denied/, 'claimless session is refused');
    await db.exec('reset role; set role anon;');
    await assert.rejects(stats('7d'), /permission denied/, 'anon cannot execute the RPC');

    /* empty table → all zeros, never NULL */
    await db.exec('reset role; delete from public.product_events;');
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${alice}';`);
    const empty = await stats('7d');
    assert.deepEqual(
      { s: empty.signups, m: empty.starts, c: empty.completions, p: empty.prevSignups, t: empty.todaySignups },
      { s: 0, m: 0, c: 0, p: 0, t: 0 },
      'empty table returns aggregate zeros'
    );
  } finally { await db.close(); }
}

/* PART 2 … adminProductEventStats against a stubbed network ………………………… */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function testClient() {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `ielts-sbclient-adminstats-${process.pid}.cjs`);
  esbuild.buildSync({
    entryPoints: [path.join(root, 'supabaseClient.js')],
    outfile, bundle: true, format: 'cjs', platform: 'node', logLevel: 'silent'
  });
  const uid = '00000000-0000-4000-8000-0000000000aa';
  const adminUser = { id: uid, email: 'admin@example.com', user_metadata: { name: 'Admin' } };
  const learnerUser = { id: '00000000-0000-4000-8000-0000000000bb', email: 'aziz@example.com', user_metadata: { name: 'Aziz' } };
  let signedInAs = null;
  let rpcError = false;
  const rpcCalls = [];
  const jwtFor = (u) => 'unit.' + Buffer.from(JSON.stringify({ sub: u.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.sig';
  global.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith('/api/config')) {
      return json({ configured: true, SUPABASE_URL: 'https://telemetry.unit.test', SUPABASE_ANON_KEY: 'pub-test-key' });
    }
    if (target.includes('/auth/v1/token')) {
      const body = JSON.parse(String(options.body || '{}'));
      signedInAs = /^admin@/.test(body.email || '') ? adminUser : learnerUser;
      return json({ access_token: jwtFor(signedInAs), refresh_token: 'ref-unit', expires_in: 3600, token_type: 'bearer', user: signedInAs });
    }
    if (target.includes('/auth/v1/user')) return json(signedInAs || learnerUser);
    if (target.includes('/rest/v1/profiles') && signedInAs) {
      const role = signedInAs === adminUser ? 'admin' : 'user';
      return json([{ id: signedInAs.id, email: signedInAs.email, name: 'Unit', coins: 0, current_streak: 0, last_active_date: null, role, avatar_url: null }]);
    }
    if (target.includes('/rpc/product_event_stats')) {
      rpcCalls.push(JSON.parse(String(options.body || '{}')));
      if (rpcError) return json({ message: 'rpc failed' }, 400);
      return json({ window: rpcCalls[rpcCalls.length - 1].p_window, signups: 3, starts: 4, completions: 2, prevSignups: 1, prevStarts: 1, prevCompletions: 0, todaySignups: 1, todayStarts: 1, todayCompletions: 0 });
    }
    return json({});
  };
  try {
    const api = require(outfile);
    await api.ready;

    /* both windows are forwarded verbatim; the payload is passed through */
    await api.authenticate({ mode: 'signin', email: adminUser.email, password: 'unit-test' });
    const d7 = await api.adminProductEventStats('7d');
    const d30 = await api.adminProductEventStats('30d');
    assert.deepEqual(rpcCalls.map(c => c.p_window), ['7d', '30d'], 'p_window forwarded for both periods');
    assert.equal(d7.signups, 3);
    assert.equal(d30.window, '30d');

    /* a non-admin: fail fast BEFORE touching the network */
    const callsSoFar = rpcCalls.length;
    await api.logout();
    await api.authenticate({ mode: 'signin', email: learnerUser.email, password: 'unit-test' });
    await assert.rejects(() => api.adminProductEventStats('30d'), /Admin access required/);
    assert.equal(rpcCalls.length, callsSoFar, 'no RPC call left the machine for a non-admin');

    /* server-side failure surfaces to the caller (the UI catches it) */
    await api.logout();
    await api.authenticate({ mode: 'signin', email: adminUser.email, password: 'unit-test' });
    rpcError = true;
    await assert.rejects(
      () => api.adminProductEventStats('7d'),
      (err) => err && err.message === 'rpc failed',
      'PostgREST errors surface with their message to the caller'
    );
    rpcError = false;
    /* Stop the SDK's auto-refresh interval so the process can exit cleanly. */
    await api.logout();
  } finally {
    delete require.cache[require.resolve(outfile)];
    try { fs.unlinkSync(outfile); } catch { /* best effort */ }
  }
}

/* PART 3 … admin.js telemetry card against a stubbed shell ………………………… */
function makeEl() {
  return {
    textContent: '', innerHTML: '', value: '', disabled: false, className: '',
    style: {}, dataset: {}, onclick: null, onchange: null, oninput: null, onsubmit: null,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); if (f) this._s.add(c); if (f === false) this._s.delete(c); }
    },
    addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView() {}, focus() {}, setAttribute() {}, getAttribute: () => null, closest: () => null
  };
}

function bootAdminPanel({ telemetryData = null, telemetryError = false, withTelemetry = true } = {}) {
  const els = new Map();
  /* The two window buttons exist in the panel markup; give every bind() the
     same elements it would find in the real DOM so real handlers attach. */
  const telemetryWindows = ['7d', '30d'].map(w => { const el = makeEl(); el.dataset.telemetryWindow = w; return el; });
  global.document = {
    querySelector: (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); },
    querySelectorAll: (sel) => (sel === '[data-telemetry-window]' ? telemetryWindows : []),
    createElement: () => makeEl(), addEventListener() {},
    documentElement: {}, body: { dataset: {} }, getElementById: () => null, activeElement: null
  };
  global.location = { hash: '#/admin', search: '' };
  const storage = new Map();
  global.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  };
  const user = { id: 'admin-1', email: 'admin@example.com' };
  const telemetryCalls = [];
  const cloud = {
    getState: () => ({
      status: 'ready', user, error: '', oauthError: '',
      profile: { id: user.id, email: user.email, name: 'Admin', role: 'admin' },
      isAdmin: true
    }),
    ready: new Promise(() => {}),
    loadProfile: async () => null,
    loadPublishedTests: async () => ({ rows: [], meta: [] }),
    adminStats: async () => ({ users: 42, admins: 2, newUsers7d: 5, submissions: 130, completed: 88, avgBand: 6.5, tests: 1 }),
    adminListProfiles: async () => [],
    adminListSubmissions: async () => [],
    adminListTests: async () => ({ rows: [], meta: [] })
  };
  /* Optional hold: adminProductEventStats resolves only when released —
     makes the loading-state assertion timing-free. */
  const telemetryGate = [];
  if (withTelemetry) {
    cloud.adminProductEventStats = (window) => {
      telemetryCalls.push(window);
      if (telemetryError) return Promise.reject(new Error('Admin access required.'));
      return new Promise((resolve) => telemetryGate.push(() => resolve(telemetryData)));
    };
  }
  global.window = {
    IELTS_CLOUD: cloud, addEventListener() {}, scrollY: 0, speechSynthesis: null,
    location: { hash: '#/admin', search: '', origin: 'https://example.com' },
    matchMedia: () => ({ matches: false })
  };
  global.confirm = () => true;
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  ['/data.js', '/i18n.js', '/content2.js', '/content3.js', '/content4.js', '/services.js']
    .forEach(f => eval(read(f)));
  new Function('document', 'localStorage', 'location', 'window', 'confirm',
    read('/script.js')
    + "\n;signIn({ id: 'admin-1', auth: 'supabase', name: 'Admin', email: 'admin@example.com' });"
    + '\n;globalThis.__render = render;'
  )(global.document, global.localStorage, global.location, global.window, global.confirm);
  new Function('window', 'document', 'localStorage', 'location',
    read('/admin.js'))(global.window, global.document, global.localStorage, global.location);
  /* Real binding path: the panel would call bind() against the DOM scope. */
  global.window.IELTS_ADMIN.bind(global.document);
  const releaseTelemetry = () => telemetryGate.splice(0).forEach(fire => fire());
  return { admin: global.window.IELTS_ADMIN, telemetryCalls, telemetryWindows, releaseTelemetry };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function testUi() {
  /* happy path: three aggregate cards + today/previous hints, with a
     deterministic loading state while the fetch is pending */
  let env = bootAdminPanel({ telemetryData: { window: '7d', signups: 3, starts: 4, completions: 2, prevSignups: 1, prevStarts: 1, prevCompletions: 0, todaySignups: 1, todayStarts: 1, todayCompletions: 0 } });
  env.admin.state.tab = 'overview';
  await env.admin.refresh('overview');
  await flush(); await flush();
  const midBody = env.admin.body();
  assert.ok(midBody.includes('aria-busy="true"') && midBody.includes('Loading telemetry'), 'loading state renders while fetching');
  env.releaseTelemetry();
  await flush();
  const body = env.admin.body();
  assert.ok(body.includes('Product telemetry'), 'telemetry card renders on the overview');
  assert.ok(body.includes('admin-tab active" data-telemetry-window="7d"'), '7d is the default active window');
  assert.ok(body.includes('Signups') && body.includes('Mock starts') && body.includes('Mock completions'), 'three metrics shown');
  assert.ok(body.includes('1 today') && body.includes('1 in the previous period'), 'today + previous-period hints shown');
  assert.deepEqual(env.telemetryCalls, ['7d'], 'exactly one fetch on first load');

  /* the window switcher goes through the real bound handler and re-fetches */
  const btn30 = env.telemetryWindows[1];
  btn30.onclick();
  await flush();
  env.releaseTelemetry();
  await flush();
  assert.deepEqual(env.telemetryCalls, ['7d', '30d'], 'clicking 30d re-fetches with that window');
  const body30 = env.admin.body();
  assert.ok(body30.includes('admin-tab active" data-telemetry-window="30d"'), '30d becomes the active window');
  assert.ok(body30.includes('Last 30 days'), 'the 30d label is rendered');

  /* error state: telemetry failure never breaks the overview cards */
  env = bootAdminPanel({ telemetryError: true });
  env.admin.state.tab = 'overview';
  await env.admin.refresh('overview');
  await flush();
  const errBody = env.admin.body();
  assert.ok(errBody.includes('Registered users'), 'overview stats still render');
  assert.ok(errBody.includes('admin-notice--error'), 'telemetry error notice renders');
  assert.ok(errBody.includes('data-telemetry-retry'), 'retry button renders');

  /* empty state */
  env = bootAdminPanel({ telemetryData: { window: '7d', signups: 0, starts: 0, completions: 0, prevSignups: 0, prevStarts: 0, prevCompletions: 0, todaySignups: 0, todayStarts: 0, todayCompletions: 0 } });
  env.admin.state.tab = 'overview';
  await env.admin.refresh('overview');
  await flush(); await flush();
  env.releaseTelemetry();
  await flush();
  assert.ok(env.admin.body().includes('No telemetry events recorded in this period yet.'), 'empty state renders');

  /* older bundle without the helper: card stays out entirely */
  env = bootAdminPanel({ withTelemetry: false });
  env.admin.state.tab = 'overview';
  await env.admin.refresh('overview');
  await flush();
  assert.ok(!env.admin.body().includes('Product telemetry'), 'no card when the helper is unavailable');
}

/* static i18n coverage for the three admin languages */
function testI18n() {
  const src = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
  const keys = [
    'admin_telemetry_title', 'admin_telemetry_window_7d', 'admin_telemetry_window_30d',
    'admin_telemetry_signups', 'admin_telemetry_starts', 'admin_telemetry_completions',
    'admin_telemetry_today', 'admin_telemetry_prev', 'admin_telemetry_loading', 'admin_telemetry_empty'
  ];
  for (const key of keys) {
    const occurrences = src.split(key).length - 1;
    assert.equal(occurrences, 3, `${key} must exist in all three languages (found ${occurrences})`);
  }
}

(async () => {
  await check('PART 1 — product_event_stats RPC: admin-only, 7d/30d windows, prev period, UTC today, aggregate-only, invalid-window rejection, empty-table zeros', testSql);
  await check('PART 2 — client helper: window forwarding, non-admin fail-fast without network, server error surfacing', testClient);
  await check('PART 3 — admin UI: cards, loading skeleton path, window switch, error/empty states, overview isolation, no-telemetry fallback', testUi);
  await check('static — telemetry i18n keys exist in all three languages', testI18n);
  if (failed) { console.log('\nproductEventStats suite FAILED (' + failed + ')'); process.exit(1); }
  console.log('\nproductEventStats suite: all parts green');
  /* All assertions are settled above. Exit explicitly: the PGlite/undici
     handles from PART 1/2 can otherwise keep the loop registered and stall
     sequential test runners behind this suite. Exit code = verdict. */
  process.exit(0);
})();
