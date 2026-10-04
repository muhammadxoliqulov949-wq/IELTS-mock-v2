const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const helpers = require('../lib/mockResults');
const root = path.join(__dirname, '..');

function appHarness(status = 'ready', missingClient = false) {
  const elements = new Map();
  const storage = new Map([
    ['ielts-v2-user', JSON.stringify({ name: 'Fake', email: 'fake@gmail.com', auth: 'demo' })],
    ['ielts-v2-store', JSON.stringify({ user: { name: 'Legacy', email: 'legacy@gmail.com' }, lang: 'uz' })]
  ]);
  function el() { return { innerHTML: '', textContent: '', value: '', disabled: false, dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute(k, v) { this[k] = v; }, addEventListener() {}, querySelector: select, querySelectorAll: () => [] }; }
  function select(key) { if (!elements.has(key)) elements.set(key, el()); return elements.get(key); }
  const user = { id: 'real-user-uuid', email: 'aziz@gmail.com', user_metadata: { name: 'Aziz' } };
  const state = { status, user: null };
  let outcome = 'confirmation';
  let calls = 0;
  let logoutCalls = 0;
  let logoutFails = false;
  let release;
  const formData = { name: 'Aziz', email: 'aziz@gmail.com', password: 'correct-password' };
  const cloud = { ...helpers, getState: () => state, ready: new Promise(() => {}),
    async authenticate() {
      calls++;
      if (outcome === 'pending') await new Promise(resolve => { release = resolve; });
      if (outcome === 'error') throw new Error('Invalid login credentials');
      if (outcome === 'html-error') throw new Error('<img src=x onerror=alert(1)>');
      if (outcome === 'confirmation') return { user, session: null };
      state.user = user;
      return { user, session: { user } };
    },
    async logout() { logoutCalls++; if (logoutFails) throw new Error('Unable to sign out'); state.user = null; },
    async loadMockResults() { return []; }, async saveMockSection() {},
    async googleSignIn() {}
  };
  const ctx = vm.createContext({
    console, Date, JSON, Map, Set, Number, String, Array, Math, Promise,
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    location: { hash: '#/signup' },
    FormData: class { get(key) { return formData[key]; } },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    document: { querySelector: select, querySelectorAll: s => s === '[data-logout]' ? [select('logout')] : [], createElement: el, addEventListener() {} },
    window: { ...(missingClient ? {} : { IELTS_CLOUD: cloud }), addEventListener() {} }
  });
  for (const file of ['data.js', 'content2.js', 'content3.js', 'content4.js', 'i18n.js', 'services.js', 'script.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  const run = code => vm.runInContext(code, ctx);
  select('#auth-form').dataset.authMode = 'signup';
  return {
    run, state, storage, select, cloud, formData,
    setOutcome: value => { outcome = value; }, failLogout: value => { logoutFails = value; }, release: () => release(),
    get calls() { return calls; }, get logoutCalls() { return logoutCalls; },
    submit: () => select('#auth-form').onsubmit({ preventDefault() {} }),
    message: () => select('#auth-feedback').innerHTML
  };
}

async function uiTests() {
  const h = appHarness();
  assert.equal(h.run('store.user'), null, 'demo/legacy local identity must not authenticate');
  assert(!h.storage.has('ielts-v2-user'));
  assert.throws(() => h.run("signIn({id:'fake',auth:'supabase',email:'fake@gmail.com'})"), /valid Supabase session/);
  await h.submit();
  assert(h.message().includes('Pochtangizga tasdiqlash xati yuborildi, pochtangizni tekshiring'));
  assert(h.message().includes('role="status"'));
  assert.equal(h.run('store.user'), null, 'unconfirmed signup does not log in');
  h.run('render()');
  assert(h.select('#app').innerHTML.includes('Pochtangizga tasdiqlash xati yuborildi'), 'notice survives rerender');

  h.run("location.hash = '#/login'; render()");
  h.select('#auth-form').dataset.authMode = 'login';
  h.setOutcome('error');
  await h.submit();
  assert(h.message().includes('Invalid login credentials'));
  assert(h.message().includes('role="alert"'));
  assert(!h.select('[type="submit"]').disabled);
  assert.equal(h.run('store.user'), null);
  h.setOutcome('html-error'); await h.submit();
  assert(h.message().includes('&lt;img'));
  assert(!h.message().includes('<img'));

  h.setOutcome('pending');
  const login = h.submit();
  const calls = h.calls;
  await h.submit();
  assert.equal(h.calls, calls, 'double click makes only one request');
  assert(h.select('[type="submit"]').disabled);
  h.release(); await login;
  assert.equal(h.run('store.user.id'), 'real-user-uuid');
  assert.equal(h.run('storageKey()'), 'ielts-v2-store:supabase:real-user-uuid');
  assert.equal(h.run('location.hash'), '/dashboard');
  h.run('render()');
  h.failLogout(true); await h.select('logout').onclick();
  assert.equal(h.run('store.user.id'), 'real-user-uuid', 'failed sign-out must not pretend success');
  assert(h.select('#toast').textContent.includes('Unable to sign out'));
  h.failLogout(false); await h.select('logout').onclick();
  assert.equal(h.logoutCalls, 2);
  assert.equal(h.run('store.user'), null);
  assert.equal(h.run('location.hash'), '/login');

  for (const [status, missing] of [['disabled', false], ['loading', false], ['error', false], ['ready', true]]) {
    const closed = appHarness(status, missing);
    assert(closed.run('authControlsDisabled()'));
    await closed.submit();
    assert.equal(closed.calls, 0);
    assert.equal(closed.run('store.user'), null);
    closed.run("location.hash='#/listening'; render()");
    assert(!closed.select('#app').innerHTML.includes('data-l-submit'));
  }
  // A Supabase session, not the old profile cache, restores login after reload.
  const restored = appHarness();
  restored.state.user = { id: 'restored-id', email: 'restored@gmail.com', user_metadata: { name: 'Restored' } };
  restored.run('applyCloudUser(CLOUD.getState().user)');
  assert.equal(restored.run('store.user.id'), 'restored-id');
  console.log('✓ auth UI: no demo fallback, confirmation, persistent escaped errors, double-submit guard, login, logout, restored identity');
}

async function sdkTests() {
  // Exercise the actual installed Supabase SDK with mock HTTP, not a fake SDK.
  const source = esbuild.buildSync({ entryPoints: [path.join(root, 'supabaseClient.js')], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
  const oldFetch = global.fetch;
  const oldWindow = global.window;
  const uid = '11111111-1111-4111-8111-111111111111';
  const user = { id: uid, email: 'aziz@gmail.com', user_metadata: { name: 'Aziz' }, email_confirmed_at: new Date().toISOString() };
  let saved;
  let signupBody;
  let errorMode = false;
  let verifier = uid;
  const requests = [];
  global.window = { location: { origin: 'https://preview.example' } };
  global.fetch = async (url, opts = {}) => {
    const u = String(url); requests.push(u);
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    if (u === '/api/config') return json({ configured: true, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_test' });
    if (u.includes('/auth/v1/signup')) { signupBody = JSON.parse(opts.body); return json({ ...user, email_confirmed_at: null, identities: [{ id: uid }] }); }
    if (u.includes('/auth/v1/token')) {
      if (errorMode) return json({ msg: 'Invalid login credentials', error_code: 'invalid_credentials' }, 400);
      return json({ access_token: 'test.' + Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.test', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user });
    }
    if (u.includes('/auth/v1/user')) return json({ ...user, id: verifier });
    if (u.includes('/rest/v1/rpc/save_mock_section')) { saved = JSON.parse(opts.body); return json(null); }
    if (u.includes('/rest/v1/mock_results')) return json([{ test_id: 'test1', user_id: uid }]);
    if (u.includes('/auth/v1/logout')) return json({});
    throw new Error('Unexpected request ' + u);
  };
  const module = { exports: {} };
  let sdk;
  try {
    new Function('require', 'module', 'exports', source)(require, module, module.exports);
    sdk = module.exports;
    await sdk.ready;
    const signup = await sdk.authenticate({ mode: 'signup', email: user.email, password: 'secret-password', name: 'Aziz' });
    assert.equal(signup.session, null);
    assert.equal(signupBody.email, user.email);
    assert.equal(signupBody.password, 'secret-password');
    assert.equal(signupBody.data.name, 'Aziz');
    errorMode = true;
    await assert.rejects(sdk.authenticate({ mode: 'login', email: 'missing@gmail.com', password: 'wrong' }), /Invalid login credentials/);
    assert.equal(sdk.getState().user, null);
    errorMode = false;
    await sdk.authenticate({ mode: 'login', email: user.email, password: 'secret-password' });
    assert.equal(sdk.getState().user.id, uid);
    await sdk.saveMockSection({ p_test_id: 'test1', p_section: 'listening', p_band: 7, p_name: 'Aziz', p_details: { date: 1000 }, p_owner: 'forged' }, uid);
    assert.equal(saved.p_owner, uid, 'RPC owner is taken from Supabase getUser, never supplied data');
    verifier = 'different-user';
    await assert.rejects(sdk.saveMockSection({}, uid), /Account changed/);
    verifier = uid;
    assert.equal((await sdk.loadMockResults())[0].user_id, uid);
    assert(requests.some(url => url.includes('user_id=eq.' + uid)));
    await sdk.logout();
    assert.equal(sdk.getState().user, null);
    assert(requests.some(url => url.includes('/auth/v1/logout')));
    console.log('✓ real Supabase SDK/mock HTTP: signUp, signInWithPassword errors, getUser ownership, filtered reads, signOut');
  } finally {
    if (sdk && sdk.getState().user) await sdk.logout();
    global.fetch = oldFetch;
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
  }
}

(async () => { await uiTests(); await sdkTests(); console.log('AUTH TESTS OK ✓'); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
