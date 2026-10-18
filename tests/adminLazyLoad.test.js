/* Lazy admin-bundle tests (Task 02.3).
 *
 * admin.js (~75KB panel) and mockGenerator.js (1-Click AI generator) only
 * matter on #/admin, so the public app must not download them eagerly.
 * script.js injects <script> tags for them the first time an admin route is
 * rendered. This suite boots the real script.js against a fake DOM with a
 * script-inserting document stub and verifies:
 *
 *   • static wiring — no eager tags in index.html, loader present, both
 *     files still precached by the service worker and shipped by the build
 *   • public routes render without ever requesting the two files
 *   • a learner hitting #/admin is bounced BEFORE any download (lazy
 *     loading is an optimization, never the authorization mechanism)
 *   • an admin landing directly on #/admin gets exactly one <script> per
 *     file, in order, even across rapid route changes and repeated renders
 *   • concurrent kicks share ONE in-flight promise — no duplicate inserts
 *   • a failed download shows a retry shell (never a stuck UI), the Retry
 *     button works, and a generator-only failure retries just that file
 *     while the already-loaded panel stays usable
 *
 * The harness executes the REAL admin.js / mockGenerator.js when a fake
 * <script> fires onload — the same sequence the browser performs.
 */
const fs = require('fs');
const root = require('path').join(__dirname, '..');

const read = (p) => fs.readFileSync(root + p, 'utf8');
const flush = () => new Promise((r) => setTimeout(r, 0));

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

/* ==================================================================== */
/* 0. Static wiring                                                      */
/* ==================================================================== */
const html = read('/index.html');
const script = read('/script.js');
check('static: index.html has no eager admin.js tag', !/<script src="admin\.js/.test(html));
check('static: index.html has no eager mockGenerator.js tag', !/<script src="mockGenerator\.js/.test(html));
check('static: topic pool stays eager (the generator reads it at open time)',
  html.includes('lib/topicPool.js'));
check('static: loader injects admin.js before mockGenerator.js',
  script.indexOf("steps.push('admin.js") > -1
  && script.indexOf("steps.push('admin.js") < script.indexOf("steps.push('mockGenerator.js"));
check('static: injected scripts serialize execution order (el.async = false)',
  /el\.async = false/.test(script));
check('static: a failed download resets the in-flight promise (retry-safe)',
  /adminScriptsPromise = null;[\s\S]{0,120}adminScriptsFailed = true;/.test(script));
/* Authorization must precede any download: inside adminPage the non-admin
   redirect comes before the lazy kick. */
const adminPageBody = script.slice(
  script.indexOf('function adminPage()'),
  script.indexOf('function adminPage()') + 2200);
check('static: adminPage redirects non-admins BEFORE touching the lazy loader',
  adminPageBody.indexOf('isAdminUser()') > -1
  && adminPageBody.indexOf('isAdminUser()') < adminPageBody.indexOf('kickAdminScripts'));
check('static: service worker still precaches both files (offline admin visits work)',
  read('/sw.js').includes("'/admin.js'") && read('/sw.js').includes("'/mockGenerator.js'"));
check('static: build still ships both files',
  read('/scripts/build.js').includes("'admin.js'") && read('/scripts/build.js').includes("'mockGenerator.js'"));
check('static: i18n has admin_load_failed in all three languages',
  (read('/i18n.js').match(/admin_load_failed/g) || []).length === 3);
check('static: a missing generator module degrades to a message, not a stuck UI',
  /admin_ai_missing_module/.test(read('/admin.js')));

/* ==================================================================== */
/* Harness                                                               */
/* ==================================================================== */
function makeEl() {
  return {
    textContent: '', innerHTML: '', value: '', disabled: false, className: '',
    style: {}, dataset: {}, onclick: null, onchange: null, oninput: null, onsubmit: null,
    selectionStart: null, selectionEnd: null, type: '',
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (f) this._s.add(c); else this._s.delete(c); }
    },
    addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView() {}, scrollTo() {}, focus() {},
    setAttribute() {}, getAttribute: () => null, closest: () => null
  };
}

function makeCloud({ admin = false, signedOut = false } = {}) {
  const user = signedOut ? null : { id: 'u-1', email: 'u@example.com' };
  return {
    getState: () => ({
      status: 'ready', user, error: '', oauthError: '',
      profile: user ? { id: user.id, email: user.email, name: 'User', role: admin ? 'admin' : 'user' } : null,
      isAdmin: !!admin
    }),
    ready: new Promise(() => {}),
    subscribe: () => () => {},
    loadProfile: async () => null,
    loadPublishedTests: async () => ({ rows: [], meta: [] }),
    adminStats: async () => ({ users: 2, admins: 1, newUsers7d: 1, submissions: 3, completed: 2, avgBand: 6.5, tests: 1 }),
    adminListProfiles: async () => [],
    adminListSubmissions: async () => [],
    adminListTests: async () => ({ rows: [], meta: [] }),
    adminDeleteSubmission: async () => {},
    adminSetRole: async () => {},
    adminDeleteUser: async () => {},
    adminSaveTest: async () => ({}),
    adminDeleteTest: async () => {},
    adminSaveTestMeta: async () => ({}),
    adminDeleteTestMeta: async () => {}
  };
}

/* Boot script.js against a fake DOM whose document can record injected
   <script> tags. onload/onerror are fired manually to simulate network. */
function boot({ admin = false, signedOut = false, hash = '#/' } = {}) {
  const els = new Map();
  const inserted = []; /* every <script> the app appends, in order */
  global.document = {
    querySelector: (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); },
    querySelectorAll: () => [],
    createElement: (tag) => {
      if (tag === 'script') {
        return { tag: 'script', src: '', async: true, dataset: {}, onload: null, onerror: null };
      }
      return makeEl();
    },
    addEventListener() {},
    documentElement: {},
    body: {
      dataset: {},
      appendChild(el) { if (el && el.tag === 'script') inserted.push(el); }
    },
    getElementById: () => null,
    activeElement: null
  };
  global.location = { hash, search: '' };
  const storage = new Map();
  global.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  };
  global.window = {
    IELTS_CLOUD: makeCloud({ admin, signedOut }),
    addEventListener() {}, scrollY: 0, speechSynthesis: null,
    location: { hash, search: '', origin: 'https://example.com' },
    matchMedia: () => ({ matches: false })
  };
  global.confirm = () => true;

  ['/data.js', '/i18n.js', '/content2.js', '/content3.js', '/content4.js',
   '/services.js', '/lib/adaptiveDrills.js', '/lib/topicPool.js']
    .forEach((f) => eval(read(f)));
  new Function('document', 'localStorage', 'location', 'window', 'confirm',
    read('/script.js')
    + (signedOut ? '' : "\n;signIn({ id: 'u-1', auth: 'supabase', name: 'User', email: 'u@example.com' });")
    + '\n;globalThis.__render = render;'
    + '\n;globalThis.__ensure = ensureAdminScripts;'
    + '\n;globalThis.__lazy = () => ({ inFlight: adminScriptsPromise, failed: adminScriptsFailed });'
    /* Harness-only hook: the same "failed = false" reset the Retry button
       performs, for driving ensure() directly from this test. */
    + '\n;globalThis.__resetLazy = () => { adminScriptsFailed = false; };'
  )(global.document, global.localStorage, global.location, global.window, global.confirm);

  return {
    inserted,
    render: globalThis.__render,
    ensure: globalThis.__ensure,
    lazy: globalThis.__lazy,
    resetLazy: globalThis.__resetLazy,
    html: () => document.querySelector('#app').innerHTML,
    el: (sel) => document.querySelector(sel),
    /* Simulate the network+execution of an injected file: run the real
       bundle like the browser would, then mark the download done. */
    execute(el, file) { eval(read(file)); el.onload && el.onload(); },
    fail(el) { el.onerror && el.onerror(); }
  };
}

/* ==================================================================== */
/* Scenarios                                                             */
/* ==================================================================== */
(async () => {
  /* --- 1. Public routes never touch the admin bundle ------------------ */
  try {
    const app = boot({ signedOut: true, hash: '#/' });
    ['#/', '#/mock', '#/login', '#/results', '#/leaderboard'].forEach((h) => {
      global.location.hash = h;
      app.render();
    });
    await flush(); /* let any scheduled (microtask) insert land before counting */
    check('public: no admin.js/mockGenerator.js download on public routes',
      app.inserted.length === 0);
    check('public: neither global is registered after public navigation',
      !global.window.IELTS_ADMIN && !global.window.IELTS_GENERATOR);

    /* Logged-in learner browsing around must also stay clean. */
    const learner = boot({ admin: false, hash: '#/dashboard' });
    ['#/dashboard', '#/mock', '#/results', '#/settings'].forEach((h) => {
      global.location.hash = h;
      learner.render();
    });
    await flush();
    check('public: a logged-in learner on normal routes downloads nothing',
      learner.inserted.length === 0);
  } catch (e) {
    check('public scenario booted without crashing (' + e.message + ')', false);
  }

  /* --- 2. Learner on #/admin: bounced BEFORE any download ------------- */
  try {
    const app = boot({ admin: false, hash: '#/admin' });
    app.render();
    await flush();
    check('guard: a learner typing #/admin is bounced to the dashboard',
      global.location.hash === '#/dashboard' && app.html().includes('dashboard'));
    check('guard: the bounce happens BEFORE any admin-file download request',
      app.inserted.length === 0);
    app.render(); app.render();
    await flush();
    check('guard: repeated renders never start a download', app.inserted.length === 0);
  } catch (e) {
    check('learner-guard scenario ran without crashing (' + e.message + ')', false);
  }

  /* --- 3. Admin: direct #/admin load, dedupe, failure, retry, success - */
  try {
    const app = boot({ admin: true, hash: '#/admin' });
    app.render();
    await flush(); /* the first <script> insertion lands in a microtask */

    check('direct #/admin: exactly one script requested first — admin.js',
      app.inserted.length === 1 && app.inserted[0].src === 'admin.js?v=2');
    check('direct #/admin: injected script keeps execution order',
      app.inserted[0].async === false);
    check('direct #/admin: the shell shows a loading state, not an error',
      !app.html().includes('data-admin-lazy-retry'));
    check('direct #/admin: the URL is not bounced while the bundle loads',
      global.location.hash === '#/admin');

    check('dedupe: repeated renders insert nothing twice',
      (app.render(), app.render(), app.inserted.length === 1));
    check('dedupe: ensure() returns the SAME in-flight promise',
      app.ensure() === app.ensure() && app.lazy().inFlight === app.ensure());

    /* Rapid /admin ⇄ elsewhere navigation must be race-free: the single
       in-flight promise means no duplicate insertion, no duplicate init. */
    const p = app.lazy().inFlight;
    ['#/mock', '#/dashboard', '#/admin', '#/results', '#/admin'].forEach((h) => {
      global.location.hash = h;
      app.render();
    });
    app.ensure(); app.ensure();
    await flush();
    check('race: concurrent navigation shares one promise, one insert',
      app.inserted.length === 1 && app.lazy().inFlight === p);
    check('race: no duplicate admin-sdk listeners can be registered',
      app.inserted.filter((s) => s.src === 'admin.js?v=2').length === 1);

    /* Download failure → retry shell, never a stuck UI. */
    global.location.hash = '#/admin';
    app.fail(app.inserted[0]);
    await flush();
    check('failure: the promise is reset and the failure is flagged',
      app.lazy().failed === true && app.lazy().inFlight === null);
    app.render();
    check('failure: the shell offers Retry instead of an endless loader',
      app.html().includes('data-admin-lazy-retry'));
    check('failure: the admin is NOT bounced and no new download fires',
      global.location.hash === '#/admin' && app.inserted.length === 1);

    /* Retry button works: re-request the missing file, show loading. */
    app.render(); /* bind() rebinds the retry handler to the current shell */
    app.el('[data-admin-lazy-retry]').onclick();
    await flush();
    check('retry: clicking Retry clears the flag and re-requests admin.js',
      app.inserted.length === 2 && app.inserted[1].src === 'admin.js?v=2');
    check('retry: lazy state is in-flight again after the click',
      app.lazy().failed === false && app.lazy().inFlight !== null);

    /* Success: execute the REAL admin.js (browser semantics), then the
       generator file is requested only afterwards. */
    app.execute(app.inserted[1], '/admin.js');
    await flush();
    check('load order: mockGenerator.js is requested only after admin.js lands',
      app.inserted.length === 2 + 1 && app.inserted[2].src === 'mockGenerator.js?v=1'
      && app.inserted[2].async === false);
    app.render();
    check('panel: after admin.js executes, #/admin renders the REAL panel',
      app.html().includes('admin-tabs') && app.html().includes('admin-head'));
    check('panel: the URL stays on #/admin', global.location.hash === '#/admin');

    /* Generator succeeds too — afterwards nothing is ever requested. */
    const adminRef = global.window.IELTS_ADMIN;
    app.execute(app.inserted[2], '/mockGenerator.js');
    await flush();
    check('generator: window.IELTS_GENERATOR registered after its file lands',
      typeof global.window.IELTS_GENERATOR === 'object'
      && typeof global.window.IELTS_GENERATOR.open === 'function');
    check('settled: failure flag cleared after a successful sequence',
      app.lazy().failed === false);
    ['#/mock', '#/admin', '#/dashboard', '#/admin'].forEach((h) => {
      global.location.hash = h;
      app.render();
    });
    app.ensure(); app.ensure();
    check('settled: no further downloads or re-initialization on later visits',
      app.inserted.length === 3 && global.window.IELTS_ADMIN === adminRef);
    check('settled: the panel still renders for the settled admin',
      app.html().includes('admin-tabs'));
  } catch (e) {
    console.log(e.stack.split('\n').slice(0, 4).join('\n'));
    check('admin scenario ran without crashing (' + e.message + ')', false);
  }

  /* --- 4. Generator-only failure: panel usable, retry just that file -- */
  try {
    const app = boot({ admin: true, hash: '#/admin' });
    app.render();
    await flush();
    app.execute(app.inserted[0], '/admin.js'); /* panel lands */
    await flush();
    check('partial: generator file is requested after the panel lands',
      app.inserted.length === 2 && app.inserted[1].src === 'mockGenerator.js?v=1');
    app.fail(app.inserted[1]); /* generator download dies */
    await flush();
    check('partial: the failure is recorded without wedging anything',
      app.lazy().failed === true && app.lazy().inFlight === null);
    app.render();
    app.render();
    app.render();
    check('partial: the panel stays fully usable when only the generator is missing',
      app.html().includes('admin-tabs') && !global.window.IELTS_GENERATOR);
    check('partial: the nudge does not spin an infinite retry loop',
      app.inserted.length === 2);

    /* Manual retry path (reload or future visit after a real fix): simulate
       a re-visit where ensure() is triggered fresh — it must fetch ONLY the
       missing generator file, not re-execute the whole bundle. */
    const adminRef = global.window.IELTS_ADMIN;
    app.resetLazy(); /* same reset the Retry click performs */
    app.ensure();
    await flush();
    check('partial retry: only the missing generator file is re-requested',
      app.inserted.length === 3 && app.inserted[2].src === 'mockGenerator.js?v=1');
    app.execute(app.inserted[2], '/mockGenerator.js');
    await flush();
    check('partial retry: panel object identity untouched (admin.js ran only once)',
      global.window.IELTS_ADMIN === adminRef && typeof global.window.IELTS_GENERATOR === 'object');
  } catch (e) {
    console.log(e.stack.split('\n').slice(0, 4).join('\n'));
    check('partial-failure scenario ran without crashing (' + e.message + ')', false);
  }

  console.log('\n' + (failed ? failed + ' FAILURE(S)' : 'ALL CHECKS PASSED') + ' — tests/adminLazyLoad.test.js');
  process.exit(failed ? 1 : 0);
})();
