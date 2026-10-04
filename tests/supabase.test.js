const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { PGlite } = require('@electric-sql/pglite');
const helpers = require('../lib/mockResults');
const config = require('../api/config');
const root = path.join(__dirname, '..');

function testConfig() {
  const original = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
  const call = (method = 'GET') => {
    const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(v) { this.code = v; return this; }, json(v) { this.body = v; } };
    config({ method }, res); return res;
  };
  try {
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY;
    assert.deepEqual(call().body, { configured: false });
    assert.equal(call().headers['Cache-Control'], 'no-store');
    assert.equal(call('POST').code, 405);
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'sb_secret_do_not_expose';
    assert.equal(call().code, 503);
    assert(!JSON.stringify(call()).includes('sb_secret_do_not_expose'));
    const jwt = role => 'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';
    process.env.SUPABASE_ANON_KEY = jwt('service_role');
    assert.equal(call().code, 503);
    process.env.SUPABASE_ANON_KEY = jwt('anon');
    assert.equal(call().body.configured, true);
    assert.deepEqual(Object.keys(call().body).sort(), ['SUPABASE_ANON_KEY', 'SUPABASE_URL', 'configured']);
    process.env.SUPABASE_ANON_KEY = 'sb_publishable_test';
    assert.equal(call().code, 200);
    process.env.SUPABASE_URL = 'not a URL';
    assert.equal(call().code, 503);
  } finally {
    if (original.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = original.url;
    if (original.key === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = original.key;
  }
  console.log('✓ public config: optional setup, no secrets, fail closed, no caching');
}

async function testSQL() {
  const db = new PGlite();
  const alice = '11111111-1111-4111-8111-111111111111';
  const bob = '22222222-2222-4222-8222-222222222222';
  try {
    // Emulate only Supabase Auth's database primitives; actual PostgreSQL runs
    // the real migration, policies, constraints and function below.
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('${alice}'), ('${bob}');
    `);
    await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/202610040001_mock_results.sql'), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${alice}';`);
    const write = async (section, band, date = 1000, owner = alice, test = 'test1') => db.query(
      'select public.save_mock_section($1,$2,$3,$4,$5::jsonb,$6::uuid)',
      [test, section, band, 'Aziz', JSON.stringify({ date, raw: 30, total: 40 }), owner]
    );
    await write('listening', 7);
    let rows = (await db.query('select * from public.mock_results')).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].overall_band, null);
    await write('listening', 7); // idempotent replay
    assert.equal((await db.query('select * from public.mock_results')).rows.length, 1);
    await write('reading', 6.5);
    await write('writing', null);
    await write('speaking', 7.5);
    assert.equal((await db.query('select overall_band from public.mock_results')).rows[0].overall_band, null);
    await write('writing', 6); // delayed AI grade updates the same timeout attempt
    rows = (await db.query('select * from public.mock_results')).rows;
    assert.equal(Number(rows[0].overall_band), 7); // 6.75 -> 7.0
    assert.equal(Object.keys(rows[0].scores).length, 4);
    await write('reading', 3, 999); // stale tab must not roll back a newer result
    assert.equal(Number((await db.query('select reading from public.mock_results')).rows[0].reading), 6.5);
    await assert.rejects(write('writing', 9.5), /Invalid band/);
    await assert.rejects(write('writing', 6.3), /Invalid band/);
    await assert.rejects(write('invalid', 5), /Invalid section/);
    await assert.rejects(write('reading', 7, 2000, bob), /account changed/);
    await db.exec(`set request.jwt.claim.sub = '${bob}';`);
    assert.equal((await db.query('select * from public.mock_results')).rows.length, 0);
    await assert.rejects(db.query('insert into public.mock_results(user_id,name,test_id) values ($1,$2,$3)', [alice, 'intruder', 'test2']), /row-level security/);
    assert.equal((await db.query('update public.mock_results set listening=9 returning id')).rows.length, 0);
    await write('listening', 5, 2000, bob);
    assert.equal((await db.query('select * from public.mock_results')).rows.length, 1);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from public.mock_results'), /permission denied/);
    await assert.rejects(write('reading', 7), /permission denied/);
    console.log('✓ PostgreSQL: migration, band rounding, NULL grades, atomic merges, duplicate/stale saves, RLS ownership and anonymous denial');
  } finally { await db.close(); }
}

async function testBridge() {
  const elements = new Map();
  function element() { return { innerHTML: '', textContent: '', dataset: {}, style: {}, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, setAttribute() {}, addEventListener() {} }; }
  const storage = new Map();
  const writes = [];
  let rows = [];
  let fail = false;
  let release = null;
  let hold = false;
  const state = { status: 'ready', user: { id: 'user-a', email: 'a@test.com', user_metadata: { name: 'A' } } };
  const cloud = {
    ...helpers, ready: new Promise(() => {}), getState: () => state,
    async saveMockSection(payload, owner) { if (fail) throw new Error('offline'); writes.push({ payload, owner }); if (hold) await new Promise(resolve => { release = resolve; }); },
    async loadMockResults() { if (fail) throw new Error('offline'); return rows; }
  };
  const context = vm.createContext({
    console, Date, JSON, Map, Set, Number, String, Array, Math, Promise,
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    location: { hash: '#/results' },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    document: { querySelector(sel) { if (!elements.has(sel)) elements.set(sel, element()); return elements.get(sel); }, querySelectorAll: () => [], createElement: element, addEventListener() {} },
    window: { IELTS_CLOUD: cloud, addEventListener() {} }
  });
  for (const file of ['data.js', 'content2.js', 'content3.js', 'content4.js', 'i18n.js', 'services.js', 'script.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  const run = code => vm.runInContext(code, context);
  // A verified Supabase user receives a separate scope, not old demo data.
  run("signIn({ id:'user-a', email:'a@test.com', name:'A', auth:'supabase' }); store.attempts = [{section:'listening',test:'test1',band:7,raw:30,total:40,date:1000}]; save(true)");
  fail = true;
  await run('syncCloudResults(true)');
  assert.equal(run('cloudStatus'), 'error');
  assert.equal(run('store.attempts.length'), 1);
  assert.equal(run('Object.keys(store.cloudSynced || {}).length'), 0);
  fail = false;
  rows = [{ test_id: 'test1', name: 'A', listening: 7, reading: null, writing: null, speaking: null, overall_band: null, updated_at: new Date().toISOString(), scores: { listening: { date: 1000, raw: 30, total: 40 } } }];
  await run('syncCloudResults(true)');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].owner, 'user-a');
  assert.equal(run('cloudStatus'), 'synced');
  await run('syncCloudResults(true)');
  assert.equal(writes.length, 1, 'unchanged results are not resent');
  run('store.attempts = []; store.cloudSynced = {}; save(true)');
  await run('syncCloudResults(true)');
  assert.equal(run('store.attempts[0].band'), 7, 'cloud history hydrates new device');
  assert.equal(run('store.attempts[0].raw'), 30);
  assert(run('cloudResultsPanel()').includes('Supabase'));
  // A logout/account switch while a request is pending cannot hydrate old data.
  run("store.attempts.push({section:'reading',test:'test1',band:6,date:2000}); save(true)");
  hold = true;
  const pending = run('syncCloudResults(true)');
  await Promise.resolve();
  state.user = { id: 'user-b', email: 'b@test.com' };
  run("signIn({id:'user-b',email:'b@test.com',name:'B',auth:'supabase'})");
  release(); await pending;
  assert.equal(run('store.attempts.length'), 0);
  assert.equal(run('Object.keys(store.cloudSynced || {}).length'), 0);
  console.log('✓ app sync: offline retention, retry, deduplication, hydration, account-switch isolation');
}

(async () => {
  testConfig();
  const timedOut = { section: 'writing', test: 'test4', band: null, date: 1000, timedOut: true };
  assert.equal(helpers.sectionPayload(timedOut, 'Aziz').p_band, null);
  assert.equal(helpers.sectionPayload({ ...timedOut, band: 0 }, 'Aziz').p_band, 0);
  assert.throws(() => helpers.sectionPayload({ ...timedOut, test: 'other' }, 'Aziz'));
  assert.equal(helpers.rowsToAttempts([{ test_id: 'test4', writing: null, scores: { writing: { date: 1000, timedOut: true } } }])[0].band, null);
  await testSQL();
  await testBridge();
  console.log('SUPABASE TESTS OK ✓');
})().catch(error => { console.error(error); process.exitCode = 1; });
