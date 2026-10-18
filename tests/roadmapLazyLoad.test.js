/* Lazy roadmap catalogue tests (Task 02.10, architecture report P1-2 part b).
 *
 * lib/roadmapContent.js (310KB public lesson bank) is only ever read by
 * GUEST users of #/roadmap — signed-in learners receive topics from
 * Supabase. index.html therefore no longer loads it eagerly; script.js
 * injects it on demand, once a guest passes the diagnostic gate.
 *
 * This suite boots the REAL script.js against a fake DOM whose document
 * records injected <script> tags, and executes the REAL generated
 * roadmapContent.js when the fake download completes. It pins:
 *
 *   • static wiring — no eager tag, other learning modules stay eager,
 *     the catalogue stays precached by the SW and shipped by the build
 *   • precision — public routes and pre-diagnostic guests download nothing
 *   • exactly one insertion, deduped across renders and route hops
 *   • the download state is visible (existing skeleton), retry works
 *   • after execution the real 40-lesson catalogue renders
 *   • signed-in users never trigger the guest catalogue download
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
check('static: index.html no longer eagerly loads lib/roadmapContent.js',
  !/<script src="lib\/roadmapContent\.js/.test(html));
check('static: the small learning modules stay eager (they are needed at boot / are boot-bound)',
  html.includes('lib/learningPath.js') && html.includes('lib/adaptiveDrills.js') && html.includes('miniGames.js'));
check('static: loader keeps execution order and the ?v=1 fingerprint',
  /el\.src = 'lib\/roadmapContent\.js\?v=1'/.test(script) && /el\.async = false/.test(script));
check('static: single in-flight promise (dedupe) with reset-on-failure',
  /if \(roadmapContentPromise\) return roadmapContentPromise;/.test(script)
  && /roadmapContentPromise = null;[\s\S]{0,120}roadmapContentFailed = true;/.test(script));
check('static: the download kicks only for guests past the diagnostic gate',
  /if \(!signedIn && !window\.IELTS_ROADMAP_CONTENT && !roadmapContentPromise && !roadmapContentFailed\) kickRoadmapContent\(\);/.test(script));
check('static: settle re-render is scoped to the roadmap route',
  /kickRoadmapContent\(\) \{[\s\S]{0,260}route\(\) === '\/roadmap'/.test(script));
check('static: service worker still precaches the catalogue (offline first lazy fetch works)',
  read('/sw.js').includes("'/lib/roadmapContent.js'"));
check('static: build still ships the catalogue',
  read('/scripts/build.js').includes("'lib/roadmapContent.js'"));
check('static: the failure branch reuses the existing roadmap error/retry keys',
  script.includes("data-roadmap-retry") && /roadmap_load_error/.test(script));

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

function boot({ signedIn = false, attempts = null, hash = '#/' } = {}) {
  const els = new Map();
  const inserted = [];
  const qs = (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); };
  global.document = {
    querySelector: qs,
    querySelectorAll: (sel) => [qs(sel)], /* one synthesized node per selector — enough for binding */
    createElement: (tag) => (tag === 'script'
      ? { tag: 'script', src: '', async: true, dataset: {}, onload: null, onerror: null }
      : makeEl()),
    addEventListener() {},
    documentElement: {},
    body: { dataset: {}, appendChild(el) { if (el && el.tag === 'script') inserted.push(el); } },
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
  const user = signedIn ? { id: 'u-1', email: 'u@example.com' } : null;
  global.window = {
    IELTS_CLOUD: {
      getState: () => ({ status: 'ready', user, error: '', oauthError: '', profile: user ? { id: user.id, role: 'user' } : null, isAdmin: false }),
      ready: new Promise(() => {}),
      subscribe: () => () => {},
      loadProfile: async () => null,
      loadPublishedTests: async () => ({ rows: [], meta: [] }),
      loadLearningActivities: async () => ({ activities: [], progress: {}, games: {}, wallet: null })
    },
    addEventListener() {}, scrollY: 0, speechSynthesis: null,
    location: { hash, search: '', origin: 'https://example.com' },
    matchMedia: () => ({ matches: false })
  };
  global.confirm = () => true;

  /* Mirror the NEW index.html: everything eager EXCEPT the guest catalogue.
     UMD files (miniGames.js & co.) must NOT see Node's module/require — hide
     them so the browser branch (root.IELTS_*) is taken, like a real page. */
  ['/data.js', '/i18n.js', '/content2.js', '/content3.js', '/content4.js',
   '/services.js', '/lib/learningPath.js', '/lib/adaptiveDrills.js', '/miniGames.js']
    .forEach((f) => new Function('module', 'require', 'exports', read(f))(undefined, undefined, undefined));
  new Function('document', 'localStorage', 'location', 'window', 'confirm',
    read('/script.js')
    + (signedIn ? "\n;signIn({ id: 'u-1', auth: 'supabase', name: 'Learner', email: 'u@example.com' });" : '')
    + (attempts ? '\n;store.attempts = ' + JSON.stringify(attempts) + ';' : '')
    + '\n;globalThis.__render = render;'
    + '\n;globalThis.__topics = roadmapTopics;'
    + '\n;globalThis.__ensureRC = ensureRoadmapContent;'
    + '\n;globalThis.__lazyRC = () => ({ inFlight: roadmapContentPromise, failed: roadmapContentFailed });'
  )(global.document, global.localStorage, global.location, global.window, global.confirm);

  return {
    inserted,
    render: globalThis.__render,
    topics: globalThis.__topics,
    ensure: globalThis.__ensureRC,
    lazy: globalThis.__lazyRC,
    html: () => document.querySelector('#app').innerHTML,
    el: (sel) => document.querySelector(sel),
    /* Execute the real file like the browser would (browser UMD branch —
       module/require hidden), then mark the fake download done. */
    execute(el, file) {
      new Function('module', 'require', 'exports', read(file))(undefined, undefined, undefined);
      el.onload && el.onload();
    },
    fail(el) { el.onerror && el.onerror(); }
  };
}

const ATTEMPTS = ['listening', 'reading', 'writing', 'speaking']
  .map((section, i) => ({ section, test: 'test1', band: [6, 5.5, 6.5, 6][i], date: Date.now() + i }));

(async () => {
  /* --- 1. Precision: routes that never show lessons download nothing -- */
  try {
    const app = boot({ signedIn: false, attempts: ATTEMPTS, hash: '#/' });
    ['#/', '#/mock', '#/login', '#/results', '#/leaderboard'].forEach((h) => {
      global.location.hash = h;
      app.render();
    });
    await flush();
    check('precision: public routes never download the guest catalogue',
      app.inserted.length === 0 && !global.window.IELTS_ROADMAP_CONTENT);
  } catch (e) {
    check('precision scenario ran without crashing (' + e.message + ')', false);
  }

  /* --- 2. Pre-diagnostic guests are not charged ----------------------- */
  try {
    const app = boot({ signedIn: false, attempts: null, hash: '#/roadmap' });
    app.render();
    await flush();
    check('precision: a guest without a diagnostic sees the gate…',
      app.html().includes('diagnostic-gate'));
    check('precision: …and still downloads nothing behind it',
      app.inserted.length === 0);
  } catch (e) {
    check('gate scenario ran without crashing (' + e.message + ')', false);
  }

  /* --- 3. Guest past the gate: load, dedupe, failure, retry, success -- */
  try {
    const app = boot({ signedIn: false, attempts: ATTEMPTS, hash: '#/roadmap' });
    app.render();
    await flush(); /* first insertion lands in a microtask */
    check('guest roadmap: exactly one insertion, fingerprinted and ordered',
      app.inserted.length === 1 && app.inserted[0].src === 'lib/roadmapContent.js?v=1' && app.inserted[0].async === false);
    check('guest roadmap: the existing skeleton signals the in-flight download (no stuck UI)',
      app.html().includes('roadmap-path-skeleton') && !app.html().includes('roadmap-state--error'));
    check('dedupe: repeated renders insert nothing twice',
      (app.render(), app.render(), app.inserted.length === 1));
    const p = app.lazy().inFlight;
    ['#/mock', '#/dashboard', '#/roadmap', '#/results', '#/roadmap'].forEach((h) => {
      global.location.hash = h;
      app.render();
    });
    app.ensure(); app.ensure();
    await flush();
    check('race: route hopping shares ONE promise, ONE insertion',
      app.inserted.length === 1 && app.lazy().inFlight === p && app.ensure() === p);

    /* Failure → visible error + working retry, never an endless skeleton. */
    global.location.hash = '#/roadmap';
    app.fail(app.inserted[0]);
    await flush();
    check('failure: promise reset and failure flagged',
      app.lazy().failed === true && app.lazy().inFlight === null);
    app.render();
    check('failure: the roadmap shows its existing error/retry card',
      app.html().includes('roadmap-state--error') && app.html().includes('data-roadmap-retry'));
    app.render(); /* bindRoadmap rebinds the retry handler */
    app.el('[data-roadmap-retry]').onclick();
    await flush();
    check('retry: the existing retry button re-requests the catalogue once',
      app.inserted.length === 2 && app.inserted[1].src === 'lib/roadmapContent.js?v=1' && app.lazy().failed === false);

    /* Success: run the REAL generated catalogue, then render the lessons. */
    app.execute(app.inserted[1], '/lib/roadmapContent.js');
    await flush();
    check('settled: real catalogue executed (40 lessons)',
      Array.isArray(global.window.IELTS_ROADMAP_CONTENT) && global.window.IELTS_ROADMAP_CONTENT.length === 40);
    check('settled: roadmapTopics() now serves the full public bank',
      app.topics().length === 40 && app.topics().every((t) => t && t.id && t.title));
    app.render();
    check('settled: the roadmap renders real lesson cards for the guest',
      app.html().includes('roadmap-path') && app.html().includes('roadmap-topic-card'));
    ['#/mock', '#/roadmap', '#/dashboard', '#/roadmap'].forEach((h) => {
      global.location.hash = h;
      app.render();
    });
    app.ensure(); app.ensure();
    await flush();
    check('settled: later visits never re-download or re-execute',
      app.inserted.length === 2 && app.topics().length === 40);
  } catch (e) {
    console.log(e.stack.split('\n').slice(0, 4).join('\n'));
    check('guest-catalogue scenario ran without crashing (' + e.message + ')', false);
  }

  /* --- 4. Signed-in users never see the guest download ---------------- */
  try {
    const app = boot({ signedIn: true, attempts: ATTEMPTS, hash: '#/roadmap' });
    app.render();
    app.render();
    await flush();
    check('signed-in: roadmap uses Supabase topics — the guest catalogue is never requested',
      app.inserted.length === 0 && !global.window.IELTS_ROADMAP_CONTENT);
    ['#/mock', '#/roadmap'].forEach((h) => { global.location.hash = h; app.render(); });
    await flush();
    check('signed-in: repeated visits stay download-free',
      app.inserted.length === 0);
  } catch (e) {
    console.log(e.stack.split('\n').slice(0, 4).join('\n'));
    check('signed-in scenario ran without crashing (' + e.message + ')', false);
  }

  console.log('\n' + (failed ? failed + ' FAILURE(S)' : 'ALL CHECKS PASSED') + ' — tests/roadmapLazyLoad.test.js');
  process.exit(failed ? 1 : 0);
})();
