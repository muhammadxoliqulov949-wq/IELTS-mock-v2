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
  function query(key) {
    const markup = elements.get('#app')?.innerHTML || '';
    const needed = {
      '#auth-form': 'id="auth-form"', '#signup-otp-form': 'id="signup-otp-form"',
      '#signup-otp-code': 'id="signup-otp-code"', '[data-resend-signup-otp]': 'data-resend-signup-otp',
      '[data-change-signup-email]': 'data-change-signup-email', '[data-google-auth]': 'data-google-auth'
    }[key];
    if (needed && !markup.includes(needed)) return null;
    return select(key);
  }
  const user = { id: 'real-user-uuid', email: 'aziz@gmail.com', user_metadata: { name: 'Aziz' } };
  const state = { status, user: null };
  let outcome = 'confirmation';
  let verifyOutcome = 'success';
  let resendOutcome = 'success';
  let calls = 0;
  let verifyCalls = 0;
  let resendCalls = 0;
  let lastVerifyArgs = null;
  let lastResendArgs = null;
  let googleCalls = 0;
  let googleFails = false;
  let logoutCalls = 0;
  let logoutFails = false;
  let release;
  const formData = { name: 'Aziz', email: 'aziz@gmail.com', password: 'correct-password', token: '123456' };
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
    async verifySignupOtp(args) {
      verifyCalls++; lastVerifyArgs = args;
      if (verifyOutcome === 'error') throw new Error('Token has expired or is invalid');
      if (verifyOutcome === 'pending') await new Promise(resolve => { release = resolve; });
      state.user = user;
      return { user, session: { user } };
    },
    async resendSignupOtp(args) {
      resendCalls++; lastResendArgs = args;
      if (resendOutcome === 'error') throw new Error('Resend failed');
      return { user };
    },
    async logout() { logoutCalls++; if (logoutFails) throw new Error('Unable to sign out'); state.user = null; },
    async loadMockResults() { return []; }, async saveMockSection() {},
    async googleSignIn() { googleCalls++; if (googleFails) throw new Error('Google sign-in failed'); }
  };
  const ctx = vm.createContext({
    console, Date, JSON, Map, Set, Number, String, Array, Math, Promise,
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    location: { hash: '#/signup' },
    FormData: class { get(key) { return formData[key]; } },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    document: { querySelector: query, querySelectorAll: s => s === '[data-logout]' ? [select('logout')] : [], createElement: el, addEventListener() {} },
    window: { ...(missingClient ? {} : { IELTS_CLOUD: cloud }), addEventListener() {} }
  });
  for (const file of ['data.js', 'content2.js', 'content3.js', 'content4.js', 'i18n.js', 'services.js', 'script.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  const run = code => vm.runInContext(code, ctx);
  select('#auth-form').dataset.authMode = 'signup';
  return {
    run, state, storage, select, cloud, formData,
    setOutcome: value => { outcome = value; }, setVerifyOutcome: value => { verifyOutcome = value; },
    setResendOutcome: value => { resendOutcome = value; },
    failLogout: value => { logoutFails = value; }, release: () => release(),
    failGoogle: value => { googleFails = value; },
    get calls() { return calls; }, get verifyCalls() { return verifyCalls; }, get resendCalls() { return resendCalls; },
    get lastVerifyArgs() { return lastVerifyArgs; }, get lastResendArgs() { return lastResendArgs; },
    get logoutCalls() { return logoutCalls; }, get googleCalls() { return googleCalls; },
    submit: () => select('#auth-form').onsubmit({ preventDefault() {} }),
    submitOtp: () => select('#signup-otp-form').onsubmit({ preventDefault() {} }),
    resendOtp: () => select('[data-resend-signup-otp]').onclick(),
    message: () => select('#auth-feedback').innerHTML
  };
}

async function uiTests() {
  const h = appHarness();
  assert.equal(h.run('store.user'), null, 'demo/legacy local identity must not authenticate');
  assert(!h.storage.has('ielts-v2-user'));
  assert.throws(() => h.run("signIn({id:'fake',auth:'supabase',email:'fake@gmail.com'})"), /valid Supabase session/);
  h.run("I18N.setLang('uz'); render()");
  await h.submit();
  assert(h.message().includes('Emailingizga 6 xonali tasdiqlash kodi yuborildi'));
  assert(h.message().includes('role="status"'));
  assert.equal(h.run('store.user'), null, 'unconfirmed signup does not log in');
  assert.equal(h.run('pendingSignupOtp.email'), 'aziz@gmail.com');
  assert(h.select('#app').innerHTML.includes('id="signup-otp-form"'), 'signup immediately switches to its in-app OTP form');
  assert(h.select('#app').innerHTML.includes('inputmode="numeric"'));
  assert(h.select('#app').innerHTML.includes('Kodni qayta yuborish'));
  h.run('render()');
  assert(h.select('#app').innerHTML.includes('Emailingizga 6 xonali tasdiqlash kodi yuborildi'), 'OTP notice survives rerender');

  h.setVerifyOutcome('error');
  await h.submitOtp();
  assert.equal(h.verifyCalls, 1);
  assert.equal(h.lastVerifyArgs.email, 'aziz@gmail.com');
  assert.equal(h.lastVerifyArgs.token, '123456');
  assert.equal(h.run('authNotice.message'), "Tasdiqlash kodi noto'g'ri", 'invalid code is reported in Uzbek');
  assert(h.message().includes('role="alert"'));

  await h.resendOtp();
  assert.equal(h.resendCalls, 1);
  assert.equal(h.lastResendArgs.email, 'aziz@gmail.com');
  assert(h.message().includes('Yangi tasdiqlash kodi emailingizga yuborildi.'));

  h.setVerifyOutcome('success');
  await h.submitOtp();
  assert.equal(h.run('pendingSignupOtp'), null);
  assert.equal(h.calls, 1, 'verification does not call sign-in a second time');
  assert.equal(h.run('store.user.id'), 'real-user-uuid', 'valid signup OTP establishes the user session automatically');
  assert.equal(h.run('location.hash'), '/dashboard');
  assert.equal(h.run('storageKey()'), 'ielts-v2-store:supabase:real-user-uuid');

  const l = appHarness();
  l.run("location.hash = '#/login'; render()");
  l.select('#auth-form').dataset.authMode = 'login';
  l.setOutcome('error');
  await l.submit();
  assert(l.message().includes('Invalid login credentials'));
  assert(l.message().includes('role="alert"'));
  assert(!l.select('[type="submit"]').disabled);
  assert.equal(l.run('store.user'), null);
  l.setOutcome('html-error'); await l.submit();
  assert(l.message().includes('&lt;img'));
  assert(!l.message().includes('<img'));

  l.setOutcome('pending');
  const login = l.submit();
  const calls = l.calls;
  await l.submit();
  assert.equal(l.calls, calls, 'double click makes only one request');
  assert(l.select('[type="submit"]').disabled);
  l.release(); await login;
  assert.equal(l.run('store.user.id'), 'real-user-uuid');
  assert.equal(l.run('storageKey()'), 'ielts-v2-store:supabase:real-user-uuid');
  assert.equal(l.run('location.hash'), '/dashboard');
  l.run('render()');
  l.failLogout(true); await l.select('logout').onclick();
  assert.equal(l.run('store.user.id'), 'real-user-uuid', 'failed sign-out must not pretend success');
  assert(l.select('#toast').textContent.includes('Unable to sign out'));
  l.failLogout(false); await l.select('logout').onclick();
  assert.equal(l.logoutCalls, 2);
  assert.equal(l.run('store.user'), null);
  assert.equal(l.run('location.hash'), '/login');

  for (const [status, missing] of [['disabled', false], ['loading', false], ['error', false], ['ready', true]]) {
    const closed = appHarness(status, missing);
    assert(closed.run('authControlsDisabled()'));
    await closed.submit();
    assert.equal(closed.calls, 0);
    assert.equal(closed.run('store.user'), null);
    await closed.select('[data-google-auth]').onclick();
    assert.equal(closed.googleCalls, 0, 'Google button is inert until Supabase is ready');
    closed.run("location.hash='#/listening'; render()");
    assert(!closed.select('#app').innerHTML.includes('data-l-submit'));
  }
  // A Supabase session, not the old profile cache, restores login after reload.
  const restored = appHarness();
  restored.state.user = { id: 'restored-id', email: 'restored@gmail.com', user_metadata: { name: 'Restored' } };
  restored.run('applyCloudUser(CLOUD.getState().user)');
  assert.equal(restored.run('store.user.id'), 'restored-id');
  console.log('✓ auth UI: signup OTP, invalid-code feedback, resend, automatic login, escaped errors, login/logout and restored identity');

  // The Google button hands the browser to the Supabase Google OAuth flow.
  const g = appHarness();
  g.run("location.hash = '#/login'; render()");
  assert.equal(g.select('[data-google-auth]').disabled, false, 'Google button is enabled when Supabase is ready');
  await g.select('[data-google-auth]').onclick();
  assert.equal(g.googleCalls, 1, 'Google button starts the Supabase OAuth redirect');
  assert.equal(g.run('store.user'), null, 'no local identity is invented before the OAuth redirect');
  g.failGoogle(true);
  await g.select('[data-google-auth]').onclick();
  assert.equal(g.googleCalls, 2);
  assert(g.message().includes('Google sign-in failed'), 'OAuth errors stay in the persistent notice');
  assert(!g.select('[data-google-auth]').disabled, 'Google button is re-enabled after a failed redirect');
  g.failGoogle(false);
  console.log('✓ auth UI: Google button starts OAuth and surfaces redirect errors');
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
  let verifyBody;
  let resendBody;
  let errorMode = false;
  let otpErrorMode = false;
  let verifier = uid;
  const requests = [];
  global.window = { location: { origin: 'https://preview.example' } };
  global.fetch = async (url, opts = {}) => {
    const u = String(url); requests.push(u);
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    if (u === '/api/config') return json({ configured: true, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_test' });
    if (u.includes('/auth/v1/signup')) { signupBody = JSON.parse(opts.body); return json({ ...user, email_confirmed_at: null, identities: [{ id: uid }] }); }
    if (u.includes('/auth/v1/verify')) {
      verifyBody = JSON.parse(opts.body);
      if (otpErrorMode) return json({ msg: 'Token has expired or is invalid', error_code: 'otp_expired' }, 400);
      return json({ access_token: 'otp.' + Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.test', refresh_token: 'refresh-otp', expires_in: 3600, token_type: 'bearer', user });
    }
    if (u.includes('/auth/v1/resend')) { resendBody = JSON.parse(opts.body); return json({}); }
    if (u.includes('/auth/v1/token')) {
      if (errorMode) return json({ msg: 'Invalid login credentials', error_code: 'invalid_credentials' }, 400);
      return json({ access_token: 'test.' + Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.test', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user });
    }
    if (u.includes('/auth/v1/user')) return json({ ...user, id: verifier });
    if (u.includes('/rest/v1/rpc/update_daily_streak')) return json(null);
    if (u.includes('/rest/v1/profiles')) return json([]);
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
    otpErrorMode = true;
    await assert.rejects(sdk.verifySignupOtp({ email: user.email, token: '000000' }), /Token has expired or is invalid/);
    assert.equal(sdk.getState().user, null, 'an invalid signup OTP does not create a session');
    otpErrorMode = false;
    await sdk.resendSignupOtp({ email: user.email });
    assert.equal(resendBody.type, 'signup');
    assert.equal(resendBody.email, user.email);
    const verified = await sdk.verifySignupOtp({ email: user.email, token: '012345' });
    assert.equal(verifyBody.type, 'signup');
    assert.equal(verifyBody.email, user.email);
    assert.equal(verifyBody.token, '012345', 'the six-digit code is passed unchanged to Supabase');
    assert.equal(verified.session.user.id, uid);
    assert.equal(sdk.getState().user.id, uid, 'valid signup OTP establishes the verified Supabase user');
    await sdk.logout();
    assert.equal(sdk.getState().user, null);
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
    console.log('✓ real Supabase SDK/mock HTTP: signUp, signup OTP verify/resend, signInWithPassword errors, getUser ownership, filtered reads, signOut');
  } finally {
    if (sdk && sdk.getState().user) await sdk.logout();
    global.fetch = oldFetch;
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
  }
}

/* Real Supabase SDK + mock HTTP for the Google button: pressing it must call
 * signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
 * so the browser is sent to Supabase, and the one-time ?code= that Google sends
 * back to that origin must be exchanged into a signed-in session. */
async function googleOAuthTests() {
  const source = esbuild.buildSync({ entryPoints: [path.join(root, 'supabaseClient.js')], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
  const ORIGIN = 'https://preview.example';
  const uid = '11111111-1111-4111-8111-111111111111';
  const user = { id: uid, email: 'aziz@gmail.com', user_metadata: { name: 'Aziz' }, email_confirmed_at: new Date().toISOString() };
  const oldFetch = global.fetch;
  const oldWindow = global.window;
  const oldDocument = global.document;
  const oldStorage = global.localStorage;
  const oldBroadcast = global.BroadcastChannel;
  const storage = new Map(); // browser localStorage survives the Google round trip
  const requests = [];
  let assigned = null;
  let href = ORIGIN + '/#/login';
  let search = '';
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  global.document = {};
  // The SDK opens a BroadcastChannel for multi-tab sync when it detects a
  // browser; Node's implementation would keep this process alive forever.
  global.BroadcastChannel = undefined;
  global.localStorage = {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k)
  };
  global.fetch = async (url) => {
    const u = String(url);
    requests.push(u);
    if (u === '/api/config') return json({ configured: true, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_test' });
    if (u.includes('/auth/v1/token')) return json({ access_token: 'google.' + Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.sig', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user });
    if (u.includes('/auth/v1/user')) return json(user);
    if (u.includes('/auth/v1/logout')) return json({});
    throw new Error('Unexpected request ' + u);
  };
  global.window = {
    location: {
      origin: ORIGIN,
      get href() { return href; },
      get search() { return search; },
      assign(url) { assigned = url; },
      replace(url) { assigned = url; }
    },
    history: { state: null, replaceState(_state, _title, url) { href = String(url); search = new URL(String(url), ORIGIN).search; } },
    addEventListener() {}
  };
  const load = () => {
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', source)(require, mod, mod.exports);
    return mod.exports;
  };
  let sdk;
  let returned;
  let refused;
  try {
    sdk = load();
    await sdk.ready;
    assert.equal(sdk.getState().status, 'ready');
    await sdk.googleSignIn();
    assert(assigned, 'the Google button sends the browser to Supabase');
    const authorize = new URL(assigned);
    assert.equal(authorize.origin + authorize.pathname, 'https://test.supabase.co/auth/v1/authorize');
    assert.equal(authorize.searchParams.get('provider'), 'google');
    assert.equal(authorize.searchParams.get('redirect_to'), window.location.origin, 'redirectTo is window.location.origin');
    assert(authorize.searchParams.get('code_challenge'), 'PKCE challenge is generated');

    // Google sends the user back to that origin with a one-time code.
    href = ORIGIN + '/?code=google-auth-code';
    search = '?code=google-auth-code';
    returned = load();
    await returned.ready;
    await new Promise(resolve => setTimeout(resolve, 20)); // SIGNED_IN arrives on a macrotask
    assert.equal(returned.getState().status, 'ready');
    assert.equal(returned.getState().user && returned.getState().user.id, uid, 'the Google code is exchanged into a signed-in session');
    assert(requests.some(u => u.includes('/auth/v1/token?grant_type=pkce')), 'the returned code is exchanged for a token');
    assert(!href.includes('code='), 'the consumed code is removed from the URL');

    // A refused sign-in comes back as ?error= and must be explained, not swallowed.
    // A fresh browser (no stored session) is what a first-time visitor sees.
    storage.clear();
    href = ORIGIN + '/?error=access_denied&error_code=403&error_description=User%20cancelled';
    search = '?error=access_denied&error_code=403&error_description=User%20cancelled';
    refused = load();
    await refused.ready;
    assert.equal(refused.getState().user, null, 'a refused OAuth attempt signs nobody in');
    assert.equal(refused.getState().oauthError, 'User cancelled', 'the OAuth error is reported to the app');
    assert(!href.includes('error='), 'the stale error is removed from the URL');
  } finally {
    for (const client of [refused, returned, sdk]) {
      if (client && client.getState().user) await client.logout();
    }
    global.fetch = oldFetch;
    global.document = oldDocument;
    global.localStorage = oldStorage;
    global.BroadcastChannel = oldBroadcast;
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
  }
  console.log('✓ real Supabase SDK/mock HTTP: Google button -> authorize URL with redirectTo=origin, code exchanged into a session, refused sign-in reported, URL cleaned');
}
(async () => { await uiTests(); await sdkTests(); await googleOAuthTests(); console.log('AUTH TESTS OK ✓'); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
