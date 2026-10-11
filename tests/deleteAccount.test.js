'use strict';
/* Delete Account regression tests.
 *
 * Three layers, matching how the feature is built:
 *   1. api/delete-account.js — the JWT identifies the caller, the service-role
 *      client wipes every owned row and finally removes the auth user.
 *   2. supabaseClient.js — the browser sends its own token and clears the
 *      local session only after the server confirms the deletion.
 *   3. script.js — Settings has a Danger Zone whose button opens a second
 *      confirmation dialog; nothing is deleted before that confirmation.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const http = require('node:http');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const ADMIN_MIGRATIONS = ['202610040001_mock_results.sql', '202610050001_admin.sql',
  '202610060001_roadmap_gamification.sql', '202610060003_interactive_learning.sql',
  '202610100001_adaptive_drills.sql'];

/* ===================================================================
 * 1. THE ENDPOINT
 * =================================================================== */
const supabaseEntry = require.resolve('@supabase/supabase-js');

/* Install a fake @supabase/supabase-js for the duration of `run`. The handler
   is loaded inside the scope so its top-level require picks up the mock. */
function withSupabaseMock(mock, run) {
  const previous = require.cache[supabaseEntry];
  require.cache[supabaseEntry] = {
    id: supabaseEntry, filename: supabaseEntry, loaded: true, exports: mock, children: [], paths: []
  };
  try { return run(); }
  finally {
    if (previous) require.cache[supabaseEntry] = previous;
    else delete require.cache[supabaseEntry];
  }
}

function loadHandler() {
  const source = fs.readFileSync(path.join(root, 'api/delete-account.js'), 'utf8');
  const module = { exports: {} };
  new Function('module', 'require', 'process', source)(module, require, process);
  return module.exports;
}

function supabaseMock({ user = { id: '11111111-1111-4111-8111-111111111111' },
  validToken = 'the-users-own-jwt', authError = null, deleteError = null, tableErrors = {} } = {}) {
  const calls = { clients: [], deletes: [], getUser: null, deletedUsers: [] };
  const createClient = (url, key, options) => {
    calls.clients.push({ url, key, options });
    return {
      auth: {
        async getUser(token) {
          calls.getUser = { url, key, token };
          /* Supabase Auth verifies the JWT signature/expiry; here only the one
             token this test issued is valid. */
          if (authError || token !== validToken) {
            return { data: { user: null }, error: authError || { status: 401, message: 'invalid claim: missing sub claim' } };
          }
          return { data: { user }, error: null };
        },
        admin: {
          async deleteUser(id, soft) {
            calls.deletedUsers.push({ id, soft });
            return deleteError ? { data: { user: null }, error: deleteError } : { data: { user: { id } }, error: null };
          }
        }
      },
      from(table) {
        return {
          delete() {
            return {
              async eq(column, value) {
                calls.deletes.push({ table, column, value });
                return { error: tableErrors[table] || null };
              }
            };
          }
        };
      }
    };
  };
  return { createClient, calls };
}

function request({ method = 'POST', ip = '10.0.0.1', token } = {}) {
  const headers = { 'x-forwarded-for': ip };
  if (token !== undefined && token !== null) headers.authorization = `Bearer ${token}`;
  return { method, headers, socket: {}, body: {} };
}

function response() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

const VALID_TOKEN = 'the-users-own-jwt';

async function testEndpoint() {
  const USER = '11111111-1111-4111-8111-111111111111';
  const original = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  try {
    /* --- unconfigured / wrong method / unauthenticated --- */
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    {
      const mock = supabaseMock();
      const handler = withSupabaseMock(mock, loadHandler);
      let r = response();
      await handler(request({ ip: '10.1.0.1', token: 'jwt' }), r);
      assert.equal(r.statusCode, 503, 'no Supabase settings -> 503');
      assert.equal(mock.calls.clients.length, 0, 'no client is created without configuration');

      process.env.SUPABASE_URL = 'https://example.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'anon-public-key';
      r = response();
      await handler(request({ ip: '10.1.0.2', token: 'jwt' }), r);
      assert.equal(r.statusCode, 503, 'a missing service-role key disables deletion');
      assert.match(r.body.error, /SUPABASE_SERVICE_ROLE_KEY/);
      assert(!JSON.stringify(r.body).includes('secret'), 'the response never echoes a key');

      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret-key';
      r = response();
      await handler(request({ method: 'GET', ip: '10.1.0.3', token: 'jwt' }), r);
      assert.equal(r.statusCode, 405, 'only POST is accepted');

      r = response();
      await handler(request({ ip: '10.1.0.4', token: null }), r);
      assert.equal(r.statusCode, 401, 'a request without a token is refused');
      assert.equal(mock.calls.deletedUsers.length, 0);

      r = response();
      await handler(request({ ip: '10.1.0.5', token: 'not-a-real-token' }), r);
      assert.equal(r.statusCode, 401, 'an expired/forged token (getUser error) is refused');
      assert.equal(mock.calls.deletedUsers.length, 0, 'no auth user is deleted for an unverified token');
      assert.equal(mock.calls.deletes.length, 0, 'no rows are touched for an unverified token');
    }

    /* --- the happy path --- */
    {
      const mock = supabaseMock({ user: { id: USER } });
      const handler = withSupabaseMock(mock, loadHandler);
      const res = response();
      await handler(request({ ip: '10.2.0.1', token: 'the-users-own-jwt' }), res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual({ ok: res.body.ok, deleted: res.body.deleted, userId: res.body.userId },
        { ok: true, deleted: true, userId: USER });

      assert.equal(mock.calls.getUser.token, 'the-users-own-jwt', 'the caller JWT is what identifies the account');
      assert.equal(mock.calls.getUser.key, 'anon-public-key', 'the identity check uses the public anon key');
      assert.equal(mock.calls.deletedUsers.length, 1, 'the auth user is deleted exactly once');
      assert.equal(mock.calls.deletedUsers[0].id, USER);
      assert.equal(mock.calls.deletedUsers[0].soft, false, 'deletion is permanent, not a soft delete');

      const adminCalls = mock.calls.clients.filter(c => c.key === 'service-role-secret-key');
      assert.equal(adminCalls.length, 1, 'the admin client is built with the service-role key');
      assert.equal(adminCalls[0].options.auth.persistSession, false, 'the admin client never persists a session');

      const expected = handler.OWNED_TABLES;
      assert.deepEqual(mock.calls.deletes.map(d => d.table), expected.map(([table]) => table));
      assert(mock.calls.deletes.every(d => d.value === USER), 'every row delete is scoped to the verified user');
      assert.deepEqual(mock.calls.deletes.map(d => d.column), expected.map(([, column]) => column));
      assert(!JSON.stringify(res.body).includes('service-role-secret-key'), 'the key never leaves the server');

      /* The body can never name somebody else. */
      const forged = response();
      const forgedMock = supabaseMock({ user: { id: USER } });
      const forgedHandler = withSupabaseMock(forgedMock, loadHandler);
      await forgedHandler({
        method: 'POST', headers: { authorization: 'Bearer the-users-own-jwt', 'x-forwarded-for': '10.2.0.2' }, socket: {},
        body: { userId: '22222222-2222-4222-8222-222222222222', id: '22222222-2222-4222-8222-222222222222' }
      }, forged);
      assert.deepEqual(forgedMock.calls.deletedUsers.map(d => d.id), [USER], 'the JWT owner is deleted, never the body');
      assert(forgedMock.calls.deletes.every(d => d.value === USER), 'row deletes ignore the request body');
    }

    /* --- failures --- */
    {
      const mock = supabaseMock({ user: { id: USER }, deleteError: { message: 'Auth service unavailable' } });
      const handler = withSupabaseMock(mock, loadHandler);
      const res = response();
      await handler(request({ ip: '10.3.0.1', token: 'the-users-own-jwt' }), res);
      assert.equal(res.statusCode, 500, 'a refused auth deletion is reported as a failure');
      assert.equal(res.body.deleted, undefined, 'nothing is reported as deleted');
      assert.match(res.body.error, /Auth service unavailable/);
    }
    {
      /* A table from an unapplied migration must not block deletion, but a real
         error is surfaced as a warning without pretending the rows are gone. */
      const mock = supabaseMock({
        user: { id: USER },
        tableErrors: {
          coin_transactions: { code: 'PGRST205', message: "Could not find the table 'public.coin_transactions'" },
          mock_results: { code: '42501', message: 'permission denied for table mock_results' }
        }
      });
      const handler = withSupabaseMock(mock, loadHandler);
      const res = response();
      await handler(request({ ip: '10.4.0.1', token: 'the-users-own-jwt' }), res);
      assert.equal(res.statusCode, 200, 'a missing optional table cannot lock a user out of deleting their account');
      assert(!res.body.cleared.includes('coin_transactions'), 'a failed table is not reported as cleared');
      assert(res.body.cleared.includes('mock_results') === false, 'a denied table is not reported as cleared');
      assert.equal(res.body.warnings.length, 1, 'only the real error is warned about');
      assert.match(res.body.warnings[0], /mock_results: permission denied/);
    }
    {
      const mock = supabaseMock({ authError: { status: 401, message: 'invalid JWT' } });
      const handler = withSupabaseMock(mock, loadHandler);
      const res = response();
      await handler(request({ ip: '10.5.0.1', token: 'expired' }), res);
      assert.equal(res.statusCode, 401);
      assert.equal(mock.calls.deletedUsers.length, 0);
    }
    {
      /* The rate limiter stops a scripted flood without blocking a real user. */
      const mock = supabaseMock({ user: { id: USER } });
      const handler = withSupabaseMock(mock, loadHandler);
      const results = [];
      for (let i = 0; i < 6; i++) {
        const res = response();
        await handler(request({ ip: '10.6.0.1', token: 'the-users-own-jwt' }), res);
        results.push(res.statusCode);
      }
      assert.deepEqual(results.slice(0, 5), [200, 200, 200, 200, 200]);
      assert.equal(results[5], 429, 'the sixth attempt in a minute is throttled');
      handler._ipHits.clear();
    }

    /* Every table that stores rows for one learner is covered. */
    {
      const mock = supabaseMock();
      const handler = withSupabaseMock(mock, loadHandler);
      const owned = new Set(handler.OWNED_TABLES.map(([table]) => table));
      const withUserColumn = new Set();
      for (const file of ADMIN_MIGRATIONS) {
        const sql = fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8');
        const blocks = sql.split(/create table if not exists public\./i).slice(1);
        for (const block of blocks) {
          const name = block.trim().split(/[\s(]/)[0];
          if (/(^|\n)\s*user_id\s+uuid/i.test(block) || /(^|\n)\s*id\s+uuid primary key references auth\.users/i.test(block)) {
            withUserColumn.add(name);
          }
        }
      }
      assert(withUserColumn.size >= 6, 'the migrations define the per-user tables');
      const missed = [...withUserColumn].filter(table => !owned.has(table));
      assert.deepEqual(missed, [], 'every per-user table is swept by the endpoint: missing ' + missed.join(', '));
    }

    console.log('✓ delete-account API: JWT identity, JWT-only ownership, service-role sweep of every owned table, permanent auth deletion, 401/405/429/503/500 handling, key never leaked');
  } finally {
    if (original.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = original.url;
    if (original.anon === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = original.anon;
    if (original.service === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = original.service;
  }
}

/* ===================================================================
 * 2. THE REAL SDK AGAINST A MOCK SUPABASE
 * -------------------------------------------------------------------
 * No require() mocking here: the installed @supabase/supabase-js talks to a
 * local HTTP server that answers like Supabase Auth and PostgREST. This proves
 * the endpoint issues the requests Supabase actually expects — the user's JWT
 * to /auth/v1/user, one filtered DELETE per table, and an admin DELETE of the
 * auth user with should_soft_delete=false.
 * =================================================================== */
async function testRealSdkOverHttp() {
  const USER = '11111111-1111-4111-8111-111111111111';
  const seen = { requests: [] };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const url = new URL(req.url, 'http://127.0.0.1');
      const record = {
        method: req.method, path: url.pathname, query: url.search,
        apikey: req.headers.apikey || '', authorization: req.headers.authorization || '', body
      };
      seen.requests.push(record);
      if (url.pathname === '/auth/v1/user') {
        if (record.authorization === 'Bearer ' + VALID_TOKEN && record.apikey === 'anon-public-key') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ id: USER, email: 'aziz@gmail.com' }));
        }
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'invalid JWT' }));
      }
      if (url.pathname.startsWith('/rest/v1/') && req.method === 'DELETE') {
        res.writeHead(204);
        return res.end();
      }
      if (url.pathname === '/auth/v1/admin/users/' + USER && req.method === 'DELETE') {
        if (record.authorization !== 'Bearer service-role-secret') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'missing service role' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ id: USER }));
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'unexpected ' + req.method + ' ' + url.pathname }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const original = {
    url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.SUPABASE_ANON_KEY = 'anon-public-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
  try {
    const handler = loadHandler();          /* the real, un-mocked endpoint */
    handler._ipHits.clear();
    const res = response();
    await handler(request({ ip: '10.9.0.1', token: VALID_TOKEN }), res);

    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.warnings, [], 'the real SDK reports no warnings: ' + JSON.stringify(res.body.warnings));

    const identity = seen.requests.find(r => r.path === '/auth/v1/user');
    assert(identity, 'the endpoint asks Supabase who owns the token');
    assert.equal(identity.authorization, 'Bearer ' + VALID_TOKEN, 'the caller JWT is forwarded, never a service key');
    assert.equal(identity.apikey, 'anon-public-key', 'the identity check carries only the public key');

    const deletes = seen.requests.filter(r => r.method === 'DELETE' && r.path.startsWith('/rest/v1/'));
    assert.deepEqual(deletes.map(r => r.path.replace('/rest/v1/', '')),
      handler.OWNED_TABLES.map(([table]) => table), 'one filtered DELETE per owned table');
    assert(deletes.every(r => r.query === `?user_id=eq.${USER}` || r.query === `?id=eq.${USER}`),
      'every row delete is filtered to the verified user: ' + deletes.map(r => r.query).join(' '));
    assert(deletes.every(r => r.apikey === 'service-role-secret' && r.authorization === 'Bearer service-role-secret'),
      'the row sweep runs with the service-role key');

    const adminDelete = seen.requests.find(r => r.path === '/auth/v1/admin/users/' + USER);
    assert(adminDelete, 'the auth user itself is deleted through the admin API');
    assert.equal(adminDelete.method, 'DELETE');
    assert.equal(JSON.parse(adminDelete.body).should_soft_delete, false, 'permanent, not a soft delete');

    /* A forged token is rejected by the real SDK path too. */
    handler._ipHits.clear();
    const forged = response();
    await handler(request({ ip: '10.9.0.2', token: 'forged.jwt.value' }), forged);
    assert.equal(forged.statusCode, 401, 'the real SDK surfaces an invalid JWT as 401');
    assert.equal(seen.requests.filter(r => r.path.startsWith('/auth/v1/admin')).length, 1,
      'no admin deletion is attempted for a forged token');

    console.log('✓ delete-account endpoint + real Supabase SDK over HTTP: /auth/v1/user identity check with the caller JWT, filtered DELETEs per table, admin deleteUser(should_soft_delete=false), forged tokens refused');
  } finally {
    if (original.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = original.url;
    if (original.anon === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = original.anon;
    if (original.service === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = original.service;
    await new Promise(resolve => server.close(resolve));
  }
}

/* ===================================================================
 * 3. THE CLIENT HELPER — real Supabase SDK, mock HTTP
 * =================================================================== */
async function testClientHelper() {
  const source = esbuild.buildSync({
    entryPoints: [path.join(root, 'supabaseClient.js')], bundle: true,
    platform: 'node', format: 'cjs', write: false
  }).outputFiles[0].text;
  assert(!/SUPABASE_SERVICE_ROLE_KEY/.test(source), 'the browser bundle never mentions the service-role key');

  const uid = '11111111-1111-4111-8111-111111111111';
  const user = { id: uid, email: 'aziz@gmail.com', user_metadata: { name: 'Aziz' }, email_confirmed_at: new Date().toISOString() };
  const token = 'test.' + Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.test';
  const oldFetch = global.fetch;
  const oldWindow = global.window;
  const storage = new Map();
  const oldStorage = global.localStorage;
  let deleteResponse = () => new Response(JSON.stringify({ ok: true, deleted: true, userId: uid }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  let sent = null;
  let ready;
  global.window = { location: { origin: 'https://preview.example' } };
  global.localStorage = {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k)
  };
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    if (u === '/api/config') return json({ configured: true, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_test' });
    if (u === '/api/delete-account') { sent = { url: u, options: opts }; return deleteResponse(); }
    if (u.includes('/auth/v1/token')) return json({ access_token: token, refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user });
    if (u.includes('/auth/v1/user')) return json(user);
    if (u.includes('/rest/v1/rpc/update_daily_streak')) return json(null);
    if (u.includes('/rest/v1/profiles')) return json([]);
    throw new Error('Unexpected request ' + u);
  };
  try {
    const module = { exports: {} };
    new Function('require', 'module', 'exports', source)(require, module, module.exports);
    const sdk = module.exports;
    await sdk.ready;

    /* Failure cases first: nothing may be cleared when the server refuses. */
    await sdk.authenticate({ mode: 'login', email: user.email, password: 'secret-password' });
    assert.equal(sdk.getState().user.id, uid, 'signed in before deleting');
    deleteResponse = () => new Response(JSON.stringify({ error: 'Account deletion failed.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(sdk.deleteAccount(), /Account deletion failed/);
    assert.equal(sdk.getState().user.id, uid, 'a failed deletion keeps the local session');

    deleteResponse = () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(sdk.deleteAccount(), /Nothing was deleted/, '200 without deleted:true is not a deletion');

    const offline = global.fetch;
    global.fetch = async (url, opts) => {
      if (String(url) === '/api/delete-account') throw new TypeError('Failed to fetch');
      return offline(url, opts);
    };
    await assert.rejects(sdk.deleteAccount(), /could not be reached/);
    global.fetch = offline;
    assert.equal(sdk.getState().user.id, uid, 'a network error keeps the account intact');

    /* The request itself: the user's own bearer token, never a service key. */
    deleteResponse = () => new Response(JSON.stringify({ ok: true, deleted: true, userId: uid }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const payload = await sdk.deleteAccount();
    assert.equal(sent.url, '/api/delete-account');
    assert.equal(sent.options.method, 'POST');
    assert.equal(sent.options.headers.Authorization, 'Bearer ' + token, 'the browser sends its own Supabase access token');
    assert.equal(JSON.parse(sent.options.body).confirm, true, 'the second confirmation is explicit in the request');
    assert(!JSON.stringify(sent.options.headers).includes('service'), 'no privileged key is ever sent');
    assert.deepEqual(payload, { ok: true, deleted: true, userId: uid });

    /* After a confirmed deletion the browser keeps no session behind. */
    assert.equal(sdk.getState().user, null, 'the local session is cleared after deletion');
    assert.equal(ready = [...storage.keys()].filter(k => /auth-token/.test(k)).length, 0, 'stored Supabase tokens are removed');
    await assert.rejects(sdk.deleteAccount(), /Sign in to delete your account/, 'a deleted account cannot delete itself twice');

    console.log('✓ delete-account client: own JWT in the Authorization header, session cleared only after the server confirms, failures keep the account');
  } finally {
    global.fetch = oldFetch;
    global.localStorage = oldStorage;
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
  }
}

/* ===================================================================
 * 4. THE UI — Settings → Danger Zone → confirmation dialog
 * =================================================================== */
function uiHarness() {
  const storage = new Map();
  const nodes = new Map();
  const listeners = {};
  const attr = (markup, name) => new RegExp('\\s' + name + '(?=[\\s=>/"\'])').test(markup);
  const cloudCalls = { deleteAccount: 0 };
  let release = null;
  let deleteMode = 'ok';

  const state = { status: 'ready', user: { id: 'user-a', email: 'aziz@gmail.com' }, profile: null, isAdmin: false };

  const appEl = makeNode('#app');
  const toastEl = makeNode('#toast');
  const deleteBtn = makeNode('[data-delete-account]');
  const cancelBtn = makeNode('[data-delete-account-cancel]');
  const confirmBtn = makeNode('[data-delete-account-confirm]');
  const backdrop = makeNode('#deleteAccountBackdrop');

  function makeNode(selector) {
    const el = {
      selector, innerHTML: '', textContent: '', value: '', disabled: false, dataset: {}, style: {}, focused: 0,
      classList: { _set: new Set(), add(c) { this._set.add(c); }, remove(c) { this._set.delete(c); }, toggle() {}, contains(c) { return this._set.has(c); } },
      setAttribute() {}, removeAttribute() {}, addEventListener() {}, focus() { this.focused++; },
      querySelector(sel) {
        const markup = appEl.innerHTML;
        if (selector === '#deleteAccountBackdrop') {
          if (sel === '[data-delete-account-cancel]') return attr(markup, 'data-delete-account-cancel') ? cancelBtn : null;
          if (sel === '[data-delete-account-confirm]') return attr(markup, 'data-delete-account-confirm') ? confirmBtn : null;
        }
        return null;
      },
      querySelectorAll() { return []; }
    };
    Object.defineProperty(el, 'onclick', { value: null, writable: true, enumerable: true });
    return el;
  }

  const document = {
    querySelector(selector) {
      if (selector === '#app') return appEl;
      if (selector === '#toast') return toastEl;
      if (selector === '#deleteAccountBackdrop') return attr(appEl.innerHTML, 'id="deleteAccountBackdrop"') || appEl.innerHTML.includes('id="deleteAccountBackdrop"') ? backdrop : null;
      if (!nodes.has(selector)) nodes.set(selector, makeNode(selector));
      return nodes.get(selector);
    },
    querySelectorAll(selector) {
      const markup = appEl.innerHTML;
      if (selector === '[data-delete-account]') return attr(markup, 'data-delete-account') ? [deleteBtn] : [];
      if (selector === '[data-logout]') return attr(markup, 'data-logout') ? [nodes.get('[data-logout]') || makeNode('[data-logout]')] : [];
      return [];
    },
    getElementById() { return null; },
    createElement: () => makeNode('created'),
    addEventListener(type, fn) { listeners[type] = fn; },
    documentElement: {}, body: { dataset: {}, style: {} }
  };

  const cloud = {
    ready: new Promise(() => {}),
    getState: () => state,
    subscribe() { return () => {}; },
    async deleteAccount() {
      cloudCalls.deleteAccount++;
      if (deleteMode === 'pending') await new Promise(resolve => { release = resolve; });
      if (deleteMode === 'fail') throw new Error('The server could not be reached. Nothing was deleted.');
      state.user = null;
      return { ok: true, deleted: true };
    },
    loadProfile: async () => null,
    loadMockResults: async () => []
  };

  const context = vm.createContext({
    console, Date, JSON, Map, Set, Number, String, Array, Math, Promise, URL, RegExp,
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    location: { hash: '#/settings', search: '' }, document,
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k),
      get length() { return storage.size; },
      key: i => [...storage.keys()][i] || null
    },
    window: { IELTS_CLOUD: cloud, addEventListener() {}, scrollY: 0, location: { hash: '#/settings', origin: 'https://preview.example' } }
  });
  for (const file of ['data.js', 'content2.js', 'content3.js', 'content4.js', 'i18n.js', 'services.js', 'script.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  const run = code => vm.runInContext(code, context);
  return {
    run, appEl, toastEl, deleteBtn, cancelBtn, confirmBtn, backdrop, cloudCalls, listeners, storage,
    press(handler) { return handler.onclick(); },
    setMode(mode) { deleteMode = mode; },
    release() { if (release) release(); },
    markup: () => appEl.innerHTML,
    /** Re-query the bindings after a render, exactly like a user's next click. */
    refresh() {
      run('bind()');
      run('render()');
    }
  };
}

async function testUi() {
  const h = uiHarness();
  h.storage.set('ielts-v2-store:supabase:user-a', JSON.stringify({ attempts: [{ section: 'listening', band: 7 }] }));
  h.storage.set('ielts-v2-store:supabase:user-a:deadline:listening:test1', '1700000000000');
  h.run("signIn({ id:'user-a', email:'aziz@gmail.com', name:'Aziz', auth:'supabase' }); location.hash='#/settings'; render()");

  /* The Danger Zone exists... */
  assert(h.markup().includes('data-danger-zone'), 'Settings shows a Danger Zone for a signed-in Supabase account');
  assert(h.markup().includes('data-delete-account'), 'the Danger Zone has a delete button');
  assert(h.markup().includes('btn-danger'), 'the delete button uses the red danger style');
  assert(h.markup().includes('Danger Zone'), 'the section is labelled in the active language');
  assert.equal(h.cloudCalls.deleteAccount, 0, 'rendering Settings never deletes anything');

  /* ...and the first click only opens the second confirmation. */
  h.press(h.deleteBtn);
  assert.equal(h.cloudCalls.deleteAccount, 0, 'the first click deletes nothing');
  assert(h.markup().includes('id="deleteAccountBackdrop"'), 'a confirmation dialog opens');
  assert(h.markup().includes('role="dialog"') && h.markup().includes('aria-modal="true"'), 'the dialog is a modal for assistive tech');
  assert(h.markup().includes('aziz@gmail.com'), 'the dialog names the account that would be deleted');
  assert(h.markup().includes('data-delete-account-confirm') && h.markup().includes('data-delete-account-cancel'), 'both choices are offered');
  assert(h.markup().includes('cannot be undone'), 'the dialog warns that the action is irreversible');
  assert(h.run('deleteAccountState.open') === true);
  assert(h.cancelBtn.focused > 0, 'focus starts on the safe choice, not on the delete button');

  /* Cancel keeps the account. */
  h.press(h.cancelBtn);
  assert.equal(h.cloudCalls.deleteAccount, 0, 'cancelling deletes nothing');
  assert.equal(h.run('deleteAccountState.open'), false, 'cancelling closes the dialog');
  assert(!h.markup().includes('id="deleteAccountBackdrop"'), 'the dialog is gone after cancelling');
  assert(h.markup().includes('data-danger-zone'), 'the Danger Zone is still there');

  /* Escape closes it too. */
  h.press(h.deleteBtn);
  assert(h.markup().includes('id="deleteAccountBackdrop"'));
  h.listeners.keydown({ key: 'Escape' });
  assert.equal(h.run('deleteAccountState.open'), false, 'Escape closes the dialog');

  /* A failing deletion keeps the learner signed in and explains why. */
  h.setMode('fail');
  h.press(h.deleteBtn);
  await h.press(h.confirmBtn);
  assert.equal(h.cloudCalls.deleteAccount, 1, 'the confirmation calls the API once');
  assert.equal(h.run('deleteAccountState.open'), true, 'a failed deletion keeps the dialog open');
  assert(h.markup().includes('Nothing was deleted'), 'the server reason is shown in the dialog');
  assert.equal(h.run('store.user && store.user.id'), 'user-a', 'the learner is still signed in after a failure');
  assert.equal(h.run('route()'), '/settings', 'a failed deletion does not navigate away');

  /* While the request is in flight the dialog cannot be double-submitted. */
  h.setMode('pending');
  h.press(h.deleteBtn);
  const pending = h.press(h.confirmBtn);
  assert.equal(h.run('deleteAccountState.busy'), true, 'the dialog reports that it is working');
  assert(h.markup().includes('Deleting'), 'the button is relabelled while deleting');
  await h.press(h.confirmBtn);
  assert.equal(h.cloudCalls.deleteAccount, 2, 'a second click during the request is ignored');
  h.release();

  /* Success: session cleared and back to the home page. */
  const done = await pending;
  assert.equal(done, undefined);
  assert.equal(h.run('deleteAccountState.open'), false, 'the dialog closes after the deletion');
  assert.equal(h.run('store.user'), null, 'the local account state is cleared');
  assert.equal(h.run('route()'), '/', 'the browser lands on the home page');
  assert(h.toastEl.textContent.includes('deleted'), 'the learner is told the account is gone: ' + h.toastEl.textContent);
  assert(!h.markup().includes('data-danger-zone'), 'no Danger Zone is offered to a signed-out visitor');

  const leftovers = [...h.storage.keys()].filter(key => key.startsWith('ielts-v2-store:supabase:user-a'));
  assert.deepEqual(leftovers, [], 'the deleted account\'s local cache (results, deadlines) is removed too');

  /* A signed-out visitor never sees the Danger Zone. */
  h.run("location.hash='#/settings'; render()");
  assert(!h.markup().includes('data-delete-account'), 'no delete button without a signed-in account');

  /* Copy exists in all three languages. */
  const dict = h.run('window.IELTS_I18N.dict');
  const keys = ['danger_zone_title', 'danger_zone_hint', 'delete_account', 'delete_account_title',
    'delete_account_body', 'delete_account_point_1', 'delete_account_point_2', 'delete_account_point_3',
    'delete_account_warning', 'delete_account_confirm', 'delete_account_cancel', 'delete_account_busy', 'delete_account_done'];
  for (const lang of ['en', 'uz', 'ru']) {
    const missing = keys.filter(key => !dict[lang] || !dict[lang][key]);
    assert.deepEqual(missing, [], lang + ' is missing delete-account copy: ' + missing.join(', '));
  }

  /* Wiring: the browser bundle, the preview server and the docs know the route. */
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert(server.includes("require('./api/delete-account.js')") && server.includes('/api/delete-account'), 'npm run preview serves the endpoint');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert(readme.includes('api/delete-account.js') && readme.includes('SUPABASE_SERVICE_ROLE_KEY'), 'README documents the endpoint and the server key');
  const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert(env.includes('SUPABASE_SERVICE_ROLE_KEY'), '.env.example lists the server-only key');
  const clientSource = fs.readFileSync(path.join(root, 'supabaseClient.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert(clientSource.includes("fetch('/api/delete-account'"), 'the client helper calls the endpoint');
  assert(appSource.includes('deleteAccountModalHtml') && appSource.includes('data-delete-account-confirm'), 'the app renders and binds the dialog');
  assert(!clientSource.includes('SERVICE_ROLE') && !appSource.includes('SERVICE_ROLE'), 'no privileged key is referenced by browser code');

  console.log('✓ delete-account UI: Danger Zone, second confirmation dialog, no deletion before it, failures stay visible, session cleared and home redirect on success, EN/UZ/RU copy, wiring');
}

/* ===================================================================
 * 5. A REAL DOM — jsdom loads index.html and the app scripts
 * -------------------------------------------------------------------
 * The stub harness above can only prove what it is told to expect. Here the
 * real index.html, the real script.js and real DOM events drive the flow:
 * click the Danger Zone button, click the dialog's confirm button and check
 * what the document looks like afterwards.
 * =================================================================== */
async function testRealDomFlow() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://preview.example/#/settings', pretendToBeVisual: true });
  const { window } = dom;
  let deleteCalls = 0;
  let fail = false;
  let release;
  const state = { status: 'ready', user: { id: 'user-a', email: 'aziz@gmail.com' }, profile: null, isAdmin: false };
  window.IELTS_CLOUD = {
    ready: Promise.resolve(),
    getState: () => state,
    subscribe() { return () => {}; },
    async deleteAccount() {
      deleteCalls++;
      if (fail) throw new Error('The server could not be reached. Nothing was deleted.');
      if (release) await new Promise(resolve => { release = resolve; });
      state.user = null;
      return { ok: true, deleted: true };
    },
    loadProfile: async () => null,
    loadMockResults: async () => []
  };
  window.fetch = async () => ({ ok: true, json: async () => ({ configured: false }) });
  /* Waits on a condition instead of a fixed delay, so a slow machine cannot
     turn a passing flow into a flaky one. */
  const tick = (ms = 5) => new Promise(resolve => setTimeout(resolve, ms));
  const waitFor = async (predicate, what) => {
    for (let i = 0; i < 100; i++) {
      if (predicate()) return;
      await tick();
    }
    assert.fail('timed out waiting for ' + what);
  };
  try {
    for (const file of ['data.js', 'content2.js', 'content3.js', 'content4.js', 'i18n.js', 'services.js', 'script.js']) {
      window.eval(fs.readFileSync(path.join(root, file), 'utf8'));
    }
    await waitFor(() => window.document.querySelector('.user-chip'), 'the restored Supabase account');
    window.location.hash = '#/settings';
    await waitFor(() => window.document.querySelector('[data-danger-zone]'), 'the Danger Zone');

    const zone = window.document.querySelector('[data-danger-zone]');
    assert(zone, 'the real Settings page renders the Danger Zone');
    const button = zone.querySelector('[data-delete-account]');
    assert(button && button.classList.contains('btn-danger'), 'the delete button is the red danger button');
    assert.equal(deleteCalls, 0, 'nothing happens before the click');

    button.click();
    await waitFor(() => window.document.querySelector('#deleteAccountBackdrop'), 'the confirmation dialog');
    const backdrop = window.document.querySelector('#deleteAccountBackdrop');
    assert(backdrop, 'the click opens a real confirmation dialog');
    assert(backdrop.querySelector('[data-delete-account-confirm]'), 'the dialog has a confirm button');
    assert(backdrop.querySelector('[data-delete-account-cancel]'), 'the dialog has a cancel button');
    assert(backdrop.textContent.includes('aziz@gmail.com'), 'the dialog names the account');
    assert(window.document.activeElement === backdrop.querySelector('[data-delete-account-cancel]'),
      'keyboard focus lands on the safe button');
    assert.equal(deleteCalls, 0, 'opening the dialog deletes nothing');

    /* Cancel: real click on the real button. */
    backdrop.querySelector('[data-delete-account-cancel]').click();
    await waitFor(() => !window.document.querySelector('#deleteAccountBackdrop'), 'the dialog to close');
    assert(!window.document.querySelector('#deleteAccountBackdrop'), 'cancelling removes the dialog');
    assert.equal(deleteCalls, 0, 'cancelling never calls the API');
    assert(window.document.querySelector('[data-danger-zone]'), 'the account is untouched after cancelling');

    /* Failure: the dialog stays and explains itself. */
    fail = true;
    window.document.querySelector('[data-delete-account]').click();
    await waitFor(() => window.document.querySelector('[data-delete-account-confirm]'), 'the dialog button');
    window.document.querySelector('[data-delete-account-confirm]').click();
    await waitFor(() => deleteCalls === 1 && window.document.querySelector('.danger-error'), 'the failure message');
    assert.equal(deleteCalls, 1, 'confirming calls the API once');
    const afterFailure = window.document.querySelector('#deleteAccountBackdrop');
    assert(afterFailure, 'a failed deletion keeps the dialog open');
    assert(afterFailure.querySelector('[data-delete-account-confirm]').disabled === false, 'the button is usable again');
    assert(afterFailure.textContent.includes('Nothing was deleted'), 'the failure reason is shown');
    assert(window.document.querySelector('.user-chip'), 'the learner is still signed in');

    /* Success: session cleared, dialog closed, home page shown. */
    fail = false;
    window.document.querySelector('[data-delete-account-confirm]').click();
    await waitFor(() => window.location.hash === '#/' && !window.document.querySelector('#deleteAccountBackdrop'), 'the home redirect');
    assert.equal(deleteCalls, 2);
    assert(!window.document.querySelector('#deleteAccountBackdrop'), 'the dialog closes after a real deletion');
    assert(window.document.activeElement !== window.document.querySelector('[data-delete-account-confirm]'));
    assert.equal(window.location.hash, '#/', 'the browser is sent to the home page');
    assert(window.document.querySelector('#toast').textContent.includes('deleted'), 'the learner is told the account is gone');
    assert(!window.document.querySelector('[data-danger-zone]'), 'no Danger Zone remains for a deleted account');
    assert.equal(window.localStorage.getItem('ielts-v2-store:supabase:user-a'), null, 'the local account cache is gone');

    console.log('✓ delete-account jsdom: real index.html/script.js, click → modal → cancel/confirm, failure stays, success signs out, clears the cache and goes home');
  } finally {
    await new Promise(resolve => dom.window.close());
  }
}

(async () => {
  await testEndpoint();
  await testRealSdkOverHttp();
  await testClientHelper();
  await testUi();
  await testRealDomFlow();
  console.log('DELETE ACCOUNT TESTS OK ✓');
})().catch(error => { console.error(error); process.exitCode = 1; });
