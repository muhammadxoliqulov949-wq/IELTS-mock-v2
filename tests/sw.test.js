/* Service Worker cache-fingerprint tests (Task 02.8, finding P2-3 / AUDIT F6).
 *
 * sw.js precaches plain paths ('/script.js') but index.html requests every
 * asset with a ?v= fingerprint. The old offline matcher compared the full
 * URL, so a fresh install offline could not find ANY precached asset and a
 * script request was answered with index.html.
 *
 * This suite executes the REAL sw.js twice — the pre-fix version straight
 * from git (HEAD) and the working-tree version — against the same mocked
 * Cache API, so it both demonstrates the original failure and pins the fix:
 *
 *   • versioned asset URL resolves to its precached content offline
 *   • genuinely-uncached assets fail (never receive index.html as a body)
 *   • navigation offline still gets the app-shell fallback
 *   • POST / cross-origin / /api/ requests are bypassed
 *   • old cache is deleted on activate, new one kept (no cross-version mix)
 *   • index.html fingerprinted paths are all actually precached
 */
const fs = require('fs');
const cp = require('child_process');
const root = require('path').join(__dirname, '..');

const read = (p) => fs.readFileSync(root + p, 'utf8');

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

const ORIGIN = 'https://ielts.test';
const CURRENT_SW = read('/sw.js');
/* The genuine pre-fix code, frozen as a fixture. It used to be read from
   `git show HEAD:sw.js`, but that only worked while the fix was an
   uncommitted working-tree change: after the fix was committed, HEAD
   became post-fix and the bug-demo checks could no longer fail. Reading
   the pinned snapshot keeps the demonstration reproducible at any future
   HEAD. Fallback chain is kept for robustness, never printing errors. */
let PREFIX_SW;
try { PREFIX_SW = read('/tests/fixtures/sw-prefix-02.8.js'); }
catch (e) { PREFIX_SW = null; }
if (!PREFIX_SW) {
  for (const rev of ['HEAD^:sw.js', 'HEAD:sw.js']) {
    try { PREFIX_SW = cp.execSync('git show ' + rev, { cwd: root, encoding: 'utf8' }); } catch (e) { /* keep trying */ }
    if (PREFIX_SW) break;
  }
}

/* ------------------------------------------------------------------ */
/* Mocked Service Worker environment                                   */
/* ------------------------------------------------------------------ */
function makeEnv(swSrc) {
  /* The Cache API keys Requests by their URL — normalise first, exactly
     like the browser does (passing a Request into String() is the classic
     mock bug: '[object Object]'). */
  const keyOf = (k) => (typeof k === 'string' ? k : k.url);
  const abs = (k) => (keyOf(k).startsWith('http') ? keyOf(k) : ORIGIN + keyOf(k));
  const stores = []; /* [{ name, map }] — insertion order = cache iteration order */
  function lookup(map, key, opts) {
    const exact = map.get(abs(key));
    if (exact) return exact;
    if (opts && opts.ignoreSearch) {
      let want;
      try { want = new URL(abs(key)); } catch { return undefined; }
      for (const [entryKey, res] of map) {
        let have;
        try { have = new URL(entryKey); } catch { continue; }
        if (have.origin === want.origin && have.pathname === want.pathname) return res;
      }
    }
    return undefined;
  }
  const caches = {
    open(name) {
      let s = stores.find((c) => c.name === name);
      if (!s) { s = { name, map: new Map() }; stores.push(s); }
      return Promise.resolve({
        addAll(urls) { for (const u of urls) s.map.set(abs(u), { tag: 'P:' + u }); return Promise.resolve(); },
        put(req, res) { s.map.set(abs(req.url || req), res); return Promise.resolve(); },
        match(key, opts) { return Promise.resolve(lookup(s.map, key, opts)); }
      });
    },
    match(key, opts) {
      for (const s of stores) {
        const hit = lookup(s.map, key, opts);
        if (hit) return Promise.resolve(hit);
      }
      return Promise.resolve(undefined);
    },
    keys() { return Promise.resolve(stores.map((s) => s.name)); },
    delete(name) { const i = stores.findIndex((s) => s.name === name); if (i > -1) stores.splice(i, 1); return Promise.resolve(i > -1); },
    _stores: stores
  };
  let online = true;
  function fetchStub(req) {
    if (!online) return Promise.reject(new Error('offline'));
    const tag = 'NET:' + (req.url || req);
    const res = { tag, clone() { return { tag: tag + ' (clone)' }; } };
    return Promise.resolve(res);
  }
  const self = {
    location: { origin: ORIGIN },
    listeners: {},
    skipped: false,
    claimed: false,
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    skipWaiting() { this.skipped = true; },
    clients: { claim() { self.claimed = true; return Promise.resolve(); } }
  };
  /* Execute the real worker source in this fake realm. */
  new Function('self', 'caches', 'fetch', 'URL', swSrc)(self, caches, fetchStub, URL);

  const env = {
    self, caches,
    goOffline() { online = false; },
    currentCacheMap(name) { const s = stores.find((c) => c.name === name); return s ? s.map : null; },
    async fireInstall() {
      const p = [];
      self.listeners.install[0]({ waitUntil(x) { p.push(x); } });
      await Promise.all(p);
    },
    async fireActivate() {
      const p = [];
      self.listeners.activate[0]({ waitUntil(x) { p.push(x); } });
      await Promise.all(p);
    },
    async fireFetch(req) {
      const ev = { request: req, _p: null, _used: false, respondWith(p2) { this._used = true; this._p = p2; } };
      self.listeners.fetch[0](ev);
      return { respond: ev._used ? ev._p : null };
    }
  };
  return env;
}
const req = (path, mode = 'no-cors', method = 'GET', origin = ORIGIN) => ({ url: origin + path, method, mode });

(async () => {
  /* ------------------------------------------------------------------ */
  /* Static wiring                                                       */
  /* ------------------------------------------------------------------ */
  check('static: the offline matcher ignores the ?v= fingerprint query',
    CURRENT_SW.includes('caches.match(req, { ignoreSearch: true })'));
  check('static: the app-shell fallback is scoped to navigations (an asset must never receive index.html)',
    /req\.mode === 'navigate'/.test(CURRENT_SW));
  check('static: one deploy = one cache name (bumped for this change)',
    /const CACHE = 'bandly-v20'/.test(CURRENT_SW));
  check('static: API traffic and non-GET requests stay bypassed',
    CURRENT_SW.includes("url.pathname.startsWith('/api/')") && CURRENT_SW.includes("req.method !== 'GET'"));

  /* ------------------------------------------------------------------ */
  /* install / activate lifecycle                                        */
  /* ------------------------------------------------------------------ */
  const post = await makeEnv(CURRENT_SW);
  await post.fireInstall();
  const CACHE_NAME = 'bandly-v20';
  const map = post.currentCacheMap(CACHE_NAME);
  check('install: precache populated (28+ entries) including the plain asset keys',
    !!map && map.size >= 28 && map.has(ORIGIN + '/script.js') && map.has(ORIGIN + '/index.html') && map.has(ORIGIN + '/'));
  check('install: skipWaiting() called', post.self.skipped === true);

  /* index.html's fingerprinted tags must all be covered by the precache */
  const html = read('/index.html');
  const fingerprints = [...html.matchAll(/(?:src|href)="([^"?]+)\?v=\d+"/g)].map((m) => m[1]);
  check('install: index.html actually uses ?v= fingerprints (' + fingerprints.length + ' tags)', fingerprints.length >= 10);
  check('install: every fingerprinted index.html asset is precached (plain path keys)',
    fingerprints.every((p) => {
      const path = p.startsWith('/') ? p : '/' + p;
      return [...map.keys()].some((k) => new URL(k).pathname === path);
    }));

  /* Old-cache cleanup: seed a stale cache like a previous deploy would have */
  const stale = await post.caches.open('bandly-v19');
  await stale.put({ url: ORIGIN + '/script.js?v=13' }, { tag: 'OLD-DEPLOY-SCRIPT' });
  await post.fireActivate();
  check('activate: previous deploy cache deleted — versions never mix',
    !post.caches._stores.some((s) => s.name === 'bandly-v19'));
  check('activate: old cache name gone, current kept',
    (await post.caches.keys()).join() === CACHE_NAME);
  check('activate: clients.claim() called', post.self.claimed === true);

  /* ------------------------------------------------------------------ */
  /* Online behavior unchanged (network-first + runtime caching)          */
  /* ------------------------------------------------------------------ */
  const onlineFetch = await post.fireFetch(req('/styles.css?v=13'));
  const onlineRes = await onlineFetch.respond;
  check('online: network-first serves the live response', onlineRes && onlineRes.tag === 'NET:' + ORIGIN + '/styles.css?v=13');
  check('online: the runtime entry is stored under the exact requested URL',
    map.has(ORIGIN + '/styles.css?v=13'));

  /* ------------------------------------------------------------------ */
  /* THE BUG: fresh install goes offline, asks for a fingerprinted asset  */
  /* ------------------------------------------------------------------ */
  const pre = PREFIX_SW ? await makeEnv(PREFIX_SW) : null;
  if (pre) await pre.fireInstall();
  pre && pre.goOffline();
  post.goOffline();

  const buggy = pre ? await (await pre.fireFetch(req('/script.js?v=14'))).respond : null;
  const fixed = await (await post.fireFetch(req('/script.js?v=14'))).respond;
  check('bug demo: pre-fix sw.js answered script.js?v=14 with the HTML shell (fingerprint mismatch)',
    buggy && buggy.tag === 'P:/index.html');
  check('fix: offline, script.js?v=14 now resolves to its precached JS content',
    fixed && fixed.tag === 'P:/script.js');

  /* Genuinely missing asset: fail instead of disguising HTML as JS */
  const preMiss = pre ? await (await pre.fireFetch(req('/logo-nope.svg?v=9'))).respond : null;
  const miss = await (await post.fireFetch(req('/logo-nope.svg?v=9'))).respond;
  check('bug demo: pre-fix sw.js answered a missing asset with index.html (wrong body for a script)',
    preMiss && preMiss.tag === 'P:/index.html');
  check('fix: a genuinely uncached asset fails offline instead of receiving the shell',
    miss === undefined);

  /* Navigation fallback preserved */
  const nav = await (await post.fireFetch(req('/some/spa/route', 'navigate'))).respond;
  check('offline navigation still falls back to the app shell',
    nav && nav.tag === 'P:/index.html');
  const navRoot = await (await post.fireFetch(req('/', 'navigate'))).respond;
  check('offline navigation to / serves the precached root',
    navRoot && navRoot.tag === 'P:/');

  /* Cross-version safety: after activate, old-deploy content is unreachable */
  const oldAsset = await (await post.fireFetch(req('/script.js?v=13'))).respond;
  check('no mixing: a stale fingerprint never resolves to the previous deploy\'s cache entry',
    oldAsset && oldAsset.tag === 'P:/script.js');
  check('no mixing: the OLD-DEPLOY-SCRIPT entry is unreachable after activate',
    (await post.caches.match(ORIGIN + '/script.js?v=13', { ignoreSearch: true })).tag !== 'OLD-DEPLOY-SCRIPT');

  /* Runtime + precache coexistence: versioned URL cached online stays usable */
  const rehit = await (await post.fireFetch(req('/styles.css?v=13'))).respond;
  check('offline: an asset cached at runtime (versioned key) also resolves',
    !!rehit && /styles\.css/.test(rehit.tag));

  /* ------------------------------------------------------------------ */
  /* Bypasses                                                            */
  /* ------------------------------------------------------------------ */
  const postReq = await post.fireFetch(req('/script.js', 'no-cors', 'POST'));
  check('bypass: non-GET requests are never respondWith-handled', postReq.respond === null);
  const apiReq = await post.fireFetch(req('/api/quiz'));
  check('bypass: /api/ traffic is never respondWith-handled', apiReq.respond === null);
  const extReq = await post.fireFetch(req('/rest/v1/profiles', 'cors', 'GET', 'https://xyz.supabase.co'));
  check('bypass: cross-origin requests are never respondWith-handled', extReq.respond === null);

  console.log('\n' + (failed ? failed + ' FAILURE(S)' : 'ALL CHECKS PASSED') + ' — tests/sw.test.js');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('SW TEST CRASH:', e); process.exit(1); });
