/* Admin panel regression test.
 *
 * The panel can read and change every account on the platform, so this suite
 * is mostly about the parts that must never quietly regress:
 *
 *   • the guard — a learner must be bounced out of #/admin, and the URL must
 *     change with them so a refresh cannot put them back
 *   • visibility — the Admin entry only exists for admins
 *   • the SQL — recursion-safe admin check, RLS everywhere, role changes that
 *     cannot lock the last admin out
 *   • the editor — payload normalising and validation, because a badly shaped
 *     payload silently breaks a test for every learner
 *   • escaping — admin-visible content is user-supplied
 */
const fs = require('fs');
const root = require('path').join(__dirname, '..');

const read = (p) => fs.readFileSync(root + p, 'utf8');

let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

/* ------------------------------------------------------------------ */
/* 1. Wiring: the file is shipped, loaded and precached                 */
/* ------------------------------------------------------------------ */
const html = read('/index.html');
check('admin.js exists', fs.existsSync(root + '/admin.js'));
check('index.html loads admin.js after script.js',
  html.indexOf('script.js') < html.indexOf('admin.js') && html.includes('admin.js'));
check('service worker precaches admin.js', read('/sw.js').includes("'/admin.js'"));
check('build ships admin.js', read('/scripts/build.js').includes("'admin.js'"));
check('migration file exists',
  fs.existsSync(root + '/supabase/migrations/202610050001_admin.sql'));

/* ------------------------------------------------------------------ */
/* 2. The SQL: what actually protects the data                          */
/* ------------------------------------------------------------------ */
const sql = read('/supabase/migrations/202610050001_admin.sql');
check('sql: creates public.profiles', /create table if not exists public\.profiles/.test(sql));
check('sql: creates public.mock_tests', /create table if not exists public\.mock_tests/.test(sql));
check('sql: creates public.mock_test_meta', /create table if not exists public\.mock_test_meta/.test(sql));
check('sql: role is constrained to user/admin', /role\s+text\s+not null default 'user' check \(role in \('user', 'admin'\)\)/.test(sql));
check('sql: is_admin() is SECURITY DEFINER (no policy recursion)',
  /create or replace function public\.is_admin\(\)[\s\S]{0,200}security definer/.test(sql));
check('sql: is_admin() pins search_path', /function public\.is_admin\(\)[\s\S]{0,260}set search_path = ''/.test(sql));
check('sql: RLS enabled on every new table',
  (sql.match(/enable row level security/g) || []).length >= 3);
check('sql: no FORCE ROW LEVEL SECURITY (would break the definer bypass)',
  !/force row level security/i.test(sql));
check('sql: admin_set_role + admin_delete_user + admin_stats',
  /function public\.admin_set_role\(/.test(sql)
  && /function public\.admin_delete_user\(/.test(sql)
  && /function public\.admin_stats\(\)/.test(sql));
check('sql: role changes are admin-only inside the function',
  /function public\.admin_set_role[\s\S]{0,400}if not public\.is_admin\(\) then[\s\S]{0,80}raise exception/.test(sql));
check('sql: you cannot demote yourself', /cannot remove your own admin role/i.test(sql));
check('sql: the last admin can never be removed',
  (sql.match(/at least one admin must remain/gi) || []).length >= 2);
check('sql: you cannot delete your own account', /cannot delete your own account/i.test(sql));
check('sql: new users get a profile automatically',
  /create trigger on_auth_user_created[\s\S]{0,120}after insert on auth\.users/.test(sql));
check('sql: existing users are backfilled', /from auth\.users u/.test(sql));
check('sql: published-only reads for learners', /is_published or public\.is_admin\(\)/.test(sql));
check('sql: widens mock_results.test_id so admin tests (test5+) can be stored',
  /mock_results_test_id_check[\s\S]{0,200}\^test\[1-9\]/.test(sql));
check('sql: bootstraps the first admin by email',
  /update public\.profiles\s+set role = 'admin'/.test(sql)
  && /muhammadxoliqulov949@gmail\.com/i.test(sql));

/* ------------------------------------------------------------------ */
/* 3. Admin API surface on the Supabase client                          */
/* ------------------------------------------------------------------ */
const clientSrc = read('/supabaseClient.js');
['loadProfile', 'adminStats', 'adminListProfiles', 'adminListSubmissions',
  'adminDeleteSubmission', 'adminSetRole', 'adminDeleteUser', 'adminListTests',
  'adminSaveTest', 'adminDeleteTest', 'adminSaveTestMeta', 'adminDeleteTestMeta',
  'loadPublishedTests'
].forEach(fn => check('client exposes ' + fn + '()', clientSrc.includes('export async function ' + fn)
  || clientSrc.includes('export function ' + fn)));
check('client: isAdmin comes from the profile role, not a hard-coded email',
  clientSrc.includes("isAdmin: !!(profile && profile.role === 'admin')"));
check('client: every admin call goes through the admin guard',
  (clientSrc.match(/await requireAdminClient\(\)/g) || []).length >= 11);
check('client: published tests are readable by any signed-in learner (not admin-only)',
  /export async function loadPublishedTests\(\)[\s\S]{0,200}await requireClient\(\)/.test(clientSrc));

/* ------------------------------------------------------------------ */
/* 4. Boot the app twice: once as a learner, once as an admin           */
/* ------------------------------------------------------------------ */
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

function makeCloud({ admin, profiles, submissions, tests }) {
  const user = { id: 'admin-1', email: 'admin@example.com' };
  const noop = () => () => {};
  return {
    getState: () => ({
      status: 'ready', user, error: '', oauthError: '',
      profile: { id: user.id, email: user.email, name: 'Admin', role: admin ? 'admin' : 'user' },
      isAdmin: !!admin
    }),
    ready: new Promise(() => {}),
    subscribe: noop,
    loadProfile: async () => null,
    loadPublishedTests: async () => ({ rows: [], meta: [] }),
    adminStats: async () => ({ users: 42, admins: 2, newUsers7d: 5, submissions: 130, completed: 88, avgBand: 6.5, tests: 1 }),
    adminListProfiles: async () => profiles || [],
    adminListSubmissions: async () => submissions || [],
    adminListTests: async () => tests || { rows: [], meta: [] },
    adminDeleteSubmission: async () => {},
    adminSetRole: async () => {},
    adminDeleteUser: async () => {},
    adminSaveTest: async () => ({}),
    adminDeleteTest: async () => {},
    adminSaveTestMeta: async () => ({}),
    adminDeleteTestMeta: async () => {}
  };
}

/* Boot script.js + admin.js against a fake DOM, as an admin or a learner. */
function boot({ admin = false, profiles, submissions, tests, hash = '#/' } = {}) {
  const els = new Map();
  global.document = {
    querySelector: (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); },
    querySelectorAll: () => [],
    createElement: () => makeEl(),
    addEventListener() {},
    documentElement: {}, body: { dataset: {} },
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
    IELTS_CLOUD: makeCloud({ admin, profiles, submissions, tests }),
    addEventListener() {}, scrollY: 0, speechSynthesis: null,
    location: { hash, search: '', origin: 'https://example.com' },
    matchMedia: () => ({ matches: false })
  };
  global.confirm = () => true;

  ['/data.js', '/i18n.js', '/content2.js', '/content3.js', '/content4.js', '/services.js']
    .forEach(f => eval(read(f)));
  /* Sign the fake session in so the shell renders the account menu too. */
  new Function('document', 'localStorage', 'location', 'window', 'confirm',
    read('/script.js')
    + "\n;signIn({ id: 'admin-1', auth: 'supabase', name: 'Admin', email: 'admin@example.com' });"
    + '\n;globalThis.__render = render; globalThis.__adminPage = adminPage;'
  )(global.document, global.localStorage, global.location, global.window, global.confirm);
  new Function('window', 'document', 'localStorage', 'location',
    read('/admin.js'))(global.window, global.document, global.localStorage, global.location);

  return {
    render: globalThis.__render,
    html: () => document.querySelector('#app').innerHTML,
    admin: global.window.IELTS_ADMIN
  };
}

/* --- as a learner --------------------------------------------------- */
let app;
try {
  app = boot({ admin: false, hash: '#/admin' });
  check('guard: a learner is not an admin', app.admin.isAdmin() === false);
  globalThis.__render();
  check('guard: #/admin redirects the URL to #/dashboard', global.location.hash === '#/dashboard');
  check('guard: the learner sees the dashboard, not the panel',
    app.html().includes('dashboard') && !app.html().includes('admin-tabs'));
  check('nav: no Admin entry for a learner', !app.html().includes('admin-chip')
    && !app.html().includes('#/admin'));
  check('guard: body() shows the denied card when called without admin',
    /admin-denied/.test(app.admin.body()));
} catch (e) {
  console.log('LEARNER BOOT CRASH:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}

/* --- as an admin ---------------------------------------------------- */
const people = [
  { id: 'u1', email: 'aziz@example.com', name: 'Aziz Karimov', role: 'user', created_at: '2026-01-02T10:00:00Z' },
  { id: 'u2', email: 'admin@example.com', name: 'Admin', role: 'admin', created_at: '2026-01-01T10:00:00Z' }
];
const results = [
  { id: 'r1', user_id: 'u1', name: 'Aziz', test_id: 'test1', listening: 6.5, reading: 7, writing: 6, speaking: 6.5, overall_band: 6.5, updated_at: '2026-02-01T10:00:00Z' }
];

try {
  app = boot({ admin: true, hash: '#/admin', profiles: people, submissions: results });
  check('admin: isAdmin() is true', app.admin.isAdmin() === true);
  globalThis.__render();
  const h = app.html();
  check('admin: #/admin renders the panel', h.includes('admin-tabs') && h.includes('admin-head'));
  check('nav: the Admin entry appears for an admin', h.includes('admin-chip') && h.includes('href="#/admin"'));
  check('nav: the hamburger menu carries the Admin entry', /mm-rest[\s\S]*#\/admin/.test(h));
  check('nav: the account menu carries the Admin entry', /user-menu[\s\S]*#\/admin/.test(h));
  check('admin: the URL stays on #/admin', global.location.hash === '#/admin');

  /* tabs render their own markup */
  const A = app.admin;
  A.state.tab = 'overview'; check('tab overview renders stat cards', /admin-stats/.test(A.body()));
  A.state.tab = 'users';
  A.state.profiles = people; A.state.submissions = results;
  const usersHtml = A.body();
  check('tab users renders the table', usersHtml.includes('admin-table') && usersHtml.includes('aziz@example.com'));
  check('tab users shows the role pill', usersHtml.includes('role-pill--admin') || usersHtml.includes('role-pill--user'));
  A.state.tab = 'submissions';
  const subHtml = A.body();
  check('tab submissions renders rows', subHtml.includes('test1') && subHtml.includes('6.5'));
  A.state.tab = 'tests';
  check('tab tests renders the catalogue', /admin-test-grid/.test(A.body()));
} catch (e) {
  console.log('ADMIN BOOT CRASH:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 5. Escaping — every string in the users table is user-supplied       */
/* ------------------------------------------------------------------ */
try {
  const nasty = [{ id: 'x', email: 'e"v@il.com', name: '<img src=x onerror=alert(1)>', role: 'user', created_at: '2026-01-01T00:00:00Z' }];
  const app2 = boot({ admin: true, hash: '#/admin', profiles: nasty, submissions: [] });
  const A2 = app2.admin;
  A2.state.tab = 'users';
  A2.state.profiles = nasty;
  const out = A2.body();
  check('xss: script markup is escaped', !out.includes('<img src=x onerror=alert(1)>'));
  check('xss: encoded form is present instead', out.includes('&lt;img src=x onerror=alert(1)&gt;'));
  check('xss: a quote in an email cannot break the attribute',
    !out.includes('data-name="<img') && !/data-name="[^"]*"[^>]*<img/.test(out));
} catch (e) {
  console.log('XSS CRASH:', e.message);
  failed++;
}

/* ------------------------------------------------------------------ */
/* 6. Editor internals                                                 */
/* ------------------------------------------------------------------ */
try {
  const app3 = boot({ admin: true, hash: '#/admin' });
  const I = app3.admin._internal;

  check('nextTestId: skips the four built-in tests', I.nextTestId() === 'test5');
  app3.admin.state.tests = { rows: [], meta: [{ test_id: 'test5', label: 'Five' }] };
  check('nextTestId: skips an existing custom test', I.nextTestId() === 'test6');

  const p = I.emptyPayload('listening');
  p.parts[0].questions[0].prompt = 'Q1';
  p.parts[0].questions[0].answer = '42';
  check('validatePayload: accepts a well-formed listening payload', I.validatePayload('listening', p).length === 0);

  const bad = I.emptyPayload('listening');
  check('validatePayload: rejects an empty prompt', I.validatePayload('listening', bad).some(x => /prompt/i.test(x)));
  bad.parts[0].questions[0].prompt = 'Q1';
  check('validatePayload: rejects a missing answer', I.validatePayload('listening', bad).length === 1);
  bad.parts[0].questions[0].answer = '42';
  bad.parts[0].questions[0].type = 'multiple-choice';
  check('validatePayload: demands options for multiple choice',
    I.validatePayload('listening', bad).some(x => /option/i.test(x)));

  check('validatePayload: writing demands a prompt', I.validatePayload('writing', { tasks: [{ title: 'T1' }] }).length === 1);
  check('validatePayload: speaking demands a part', I.validatePayload('speaking', { parts: [] }).length === 1);

  const norm = I.normalizePayload('listening', {
    parts: [
      { title: 'A', questions: [{ prompt: 'p1', answer: 'a1' }, { prompt: 'p2', answer: 'a2' }] },
      { title: 'B', questions: [{ prompt: 'p3', answer: 'a3' }] }
    ]
  });
  check('normalizePayload: renumbers parts', norm.parts[0].partNumber === 1 && norm.parts[1].partNumber === 2);
  check('normalizePayload: assigns sequential question ids',
    norm.parts[0].questions[0].id === 'l1' && norm.parts[0].questions[1].id === 'l2' && norm.parts[1].questions[0].id === 'l3');
  check('normalizePayload: fills in block ids', !!norm.parts[0].id && !!norm.parts[1].id);
  check('normalizePayload: sets the human skill label', norm.skill === 'Listening');

  const reading = I.normalizePayload('reading', { passages: [{ title: 'P', questions: [{ prompt: 'x', answer: 'y' }] }] });
  check('normalizePayload: reading uses passages and r-prefixed ids',
    Array.isArray(reading.passages) && reading.passages[0].passageNumber === 1 && reading.passages[0].questions[0].id === 'r1');

  check('countQuestions: counts across blocks', I.countQuestions(norm) === 3);
  check('countQuestions: survives a broken payload', I.countQuestions(null) === 0);
} catch (e) {
  console.log('EDITOR CRASH:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 7. Editing a test must republish it to learners                     */
/* ------------------------------------------------------------------ */
check('script.js: published admin tests are merged into IELTS_CONTENT',
  read('/script.js').includes('function loadDynamicTests'));
check('script.js: dynamic tests are registered under testN keys',
  /const key = row\.skill \+ suffix/.test(read('/script.js')));
check('script.js: the content loader is re-run after a save',
  read('/admin.js').includes('h.reloadTests'));
check('script.js: dynamic tests are cleared when nobody is signed in',
  /!state\.user[\s\S]{0,80}clearDynamicTests\(\)/.test(read('/script.js')));

/* ------------------------------------------------------------------ */
/* 8. i18n + CSS                                                       */
/* ------------------------------------------------------------------ */
global.window = {}; global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = { documentElement: {}, body: {} };
eval(read('/i18n.js'));
const dict = window.IELTS_I18N.dict;
const adminKeys = Object.keys(dict.en).filter(k => k.startsWith('admin_'));
check('i18n: admin strings defined (' + adminKeys.length + ')', adminKeys.length >= 100);
['en', 'uz', 'ru'].forEach(lang => {
  const missing = adminKeys.filter(k => !dict[lang][k] || dict[lang][k] === k);
  check('i18n: ' + lang + ' has every admin string', missing.length === 0);
});

const css = read('/styles.css');
['.admin-chip', '.admin-tabs', '.admin-stat', '.admin-table', '.admin-test-card',
  '.admin-skill', '.admin-modal', '.admin-question', '.admin-json', '.role-pill'
].forEach(sel => check('css: styles ' + sel, css.includes(sel)));
check('css: the admin chip is hidden on small screens', /@media \(max-width: 900px\)[\s\S]*\.admin-chip \{ display: none/.test(css));

console.log(failed === 0 ? 'ADMIN TESTS OK ✓' : `ADMIN TESTS FAILED: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
