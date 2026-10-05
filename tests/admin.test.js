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
check('media Storage migration exists',
  fs.existsSync(root + '/supabase/migrations/202610050002_media_storage.sql'));
const mediaSql = read('/supabase/migrations/202610050002_media_storage.sql');
check('media Storage: bucket is public, size-limited, and restricted to media MIME types',
  /ielts-media[\s\S]{0,400}true[\s\S]{0,100}52428800[\s\S]{0,200}audio\/mpeg/.test(mediaSql));
check('media Storage: only admins may upload/update/delete',
  (mediaSql.match(/public\.is_admin\(\)/g) || []).length >= 3 && /for insert to authenticated/.test(mediaSql));

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
  'adminUploadMedia', 'adminRemoveMedia', 'loadPublishedTests'
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
/* 6. IELTS-specific editor: fixed section counts, question types,      */
/*    answer/explanation validation, data-shape compatibility          */
/* ------------------------------------------------------------------ */
try {
  const app3 = boot({ admin: true, hash: '#/admin' });
  const A = app3.admin;
  const I = A._internal;

  check('nextTestId: skips the four built-in tests', I.nextTestId() === 'test5');
  A.state.tests = { rows: [], meta: [{ test_id: 'test5', label: 'Five' }] };
  check('nextTestId: skips an existing custom test', I.nextTestId() === 'test6');

  const freshL = I.emptyPayload('listening');
  check('empty Listening is a clean 4-part IELTS payload', freshL.parts.length === 4
    && freshL.parts.every((part, i) => part.partNumber === i + 1 && !part.questions.length && !part.audioUrl));
  freshL.parts.forEach((part, i) => {
    part.audioUrl = `https://media.example/${i + 1}.mp3`;
    part.questions = [{ id: 'q', type: 'form-completion', prompt: `Field ${i + 1}`, answer: String(i + 1), explanation: 'The transcript states this value.', wordLimit: 'NO MORE THAN TWO WORDS' }];
  });
  check('validatePayload: accepts four Listening parts with required answers and explanations', I.validatePayload('listening', freshL).length === 0);
  const badQuestion = JSON.parse(JSON.stringify(freshL));
  badQuestion.parts[0].questions[0].prompt = '';
  check('validatePayload: rejects an empty question prompt', I.validatePayload('listening', badQuestion).some(x => /prompt/i.test(x)));
  badQuestion.parts[0].questions[0].prompt = 'Q1';
  badQuestion.parts[0].questions[0].answer = '';
  check('validatePayload: rejects a missing answer', I.validatePayload('listening', badQuestion).some(x => /answer/i.test(x)));
  badQuestion.parts[0].questions[0].answer = '1';
  badQuestion.parts[0].questions[0].explanation = '';
  check('validatePayload: rejects a missing explanation', I.validatePayload('listening', badQuestion).some(x => /explanation/i.test(x)));
  badQuestion.parts[0].questions[0] = { type: 'multiple-choice', prompt: 'Choose', options: [], answer: 'B', explanation: 'Reason.' };
  check('validatePayload: requires at least two options for choice questions', I.validatePayload('listening', badQuestion).some(x => /option/i.test(x)));
  badQuestion.parts[0].questions[0] = { type: 'multiple-choice-multi', prompt: 'Choose two', options: ['A', 'B', 'C'], answer: 'A', explanation: 'Reason.' };
  check('validatePayload: enforces exactly two answers for multiple-choice-multi', I.validatePayload('listening', badQuestion).some(x => /two/i.test(x)));

  const reading = I.emptyPayload('reading');
  check('empty Reading is a clean 3-passage payload', reading.passages.length === 3 && reading.passages.every(x => !x.questions.length));
  reading.passages.forEach((passage, i) => {
    passage.title = `Passage ${i + 1}`;
    passage.paragraphs = [{ label: 'A', text: `Academic paragraph ${i + 1}.` }];
    passage.questions = [{ type: 'matching-headings', prompt: `Match paragraph ${i + 1}`, options: ['Heading A', 'Heading B'], answer: 'A', explanation: 'The paragraph develops heading A.' }];
  });
  check('validatePayload: accepts 3 passages and matching headings', I.validatePayload('reading', reading).length === 0);
  reading.passages[0].questions[0] = { type: 'yes-no-not-given', prompt: 'Does the author agree?', answer: 'YES', explanation: 'The author states this view.' };
  check('validatePayload: accepts Yes / No / Not Given', I.validatePayload('reading', reading).length === 0);

  const writing = I.emptyPayload('writing');
  writing.tasks[0].prompt = 'Summarise the chart in at least 150 words.';
  writing.tasks[0].imageUrl = 'https://media.example/chart.png';
  writing.tasks[1].prompt = 'Write an essay of at least 250 words.';
  check('empty Writing is exactly 2 tasks with IELTS minimums', writing.tasks.length === 2 && writing.tasks[0].minWords === 150 && writing.tasks[1].minWords === 250);
  check('validatePayload: accepts 2 complete Writing tasks', I.validatePayload('writing', writing).length === 0);
  check('validatePayload: Writing task count is fixed', I.validatePayload('writing', { tasks: [writing.tasks[0]] }).some(x => /2/.test(x)));

  const speaking = I.emptyPayload('speaking');
  speaking.parts[0].topics.forEach((topic, i) => { topic.questions = [`Short interview question ${i + 1}?`]; });
  speaking.parts[1].topic = 'Describe a useful skill.';
  speaking.parts[1].bullets = ['what it is', 'how you would learn it', 'why it is useful'];
  speaking.parts[2].questions = ['Why do people learn new skills?', 'Should schools teach practical skills?', 'How might technology change learning?'];
  check('empty Speaking has exactly 3 parts and fixed Part 2 timers', speaking.parts.length === 3 && speaking.parts[1].prepSeconds === 60 && speaking.parts[1].talkSeconds === 120);
  check('validatePayload: accepts grouped Part 1 topics, cue card and linked discussion', I.validatePayload('speaking', speaking).length === 0);
  const normalizedSpeaking = I.normalizePayload('speaking', speaking);
  check('normalizePayload: auto-links Part 3 to the Part 2 cue-card topic', normalizedSpeaking.parts[2].linkedTopic === 'Describe a useful skill.');
  check('validatePayload: rejects fewer than three Part 1 topics', I.validatePayload('speaking', { ...speaking, parts: [{ ...speaking.parts[0], topics: speaking.parts[0].topics.slice(0, 2) }, ...speaking.parts.slice(1)] }).some(x => /topics/i.test(x)));

  const norm = I.normalizePayload('listening', {
    parts: [
      { title: 'A', questions: [{ prompt: 'p1', answer: 'a1', explanation: 'e1' }, { prompt: 'p2', answer: 'a2', explanation: 'e2' }] },
      { title: 'B', questions: [{ prompt: 'p3', answer: 'a3', explanation: 'e3' }] }
    ]
  });
  check('normalizePayload: preserves the legacy parts shape and renumbers blocks', norm.parts[0].partNumber === 1 && norm.parts[1].partNumber === 2);
  check('normalizePayload: assigns sequential question ids', norm.parts[0].questions[0].id === 'l1' && norm.parts[0].questions[1].id === 'l2' && norm.parts[1].questions[0].id === 'l3');
  check('normalizePayload: fills in legacy block ids and human skill label', !!norm.parts[0].id && norm.skill === 'Listening');
  const readingNorm = I.normalizePayload('reading', { passages: [{ title: 'P', paragraphs: [{ text: 'Paragraph A.' }, { text: 'Paragraph B.' }], questions: [{ prompt: 'x', answer: 'y', explanation: 'z' }] }] });
  check('normalizePayload: keeps the passages/questions structure and joins paragraphs as legacy text',
    Array.isArray(readingNorm.passages) && readingNorm.passages[0].passageNumber === 1 && readingNorm.passages[0].questions[0].id === 'r1' && readingNorm.passages[0].text.split('Paragraph B.')[0].includes('Paragraph A.'));
  check('normalizePayload: parses option letters to zero-based legacy answer indexes', I.normalizePayload('reading', { passages: [{ questions: [{ type: 'multiple-choice', prompt: 'Q', options: ['a', 'b'], answer: 'B' }] }] }).passages[0].questions[0].answer === 1);
  check('countQuestions: counts across blocks and survives broken data', I.countQuestions(norm) === 3 && I.countQuestions(null) === 0);
  check('question type palettes include IELTS formats', I.questionTypesFor('listening').includes('form-completion') && I.questionTypesFor('listening').includes('map-labelling') && I.questionTypesFor('reading').includes('matching-headings') && I.questionTypesFor('reading').includes('yes-no-not-given'));

  /* The same skill-scoped modal has dedicated upload controls and clean JSON
     per section. This guards against one test's fields leaking into another. */
  const modal = (skill) => {
    A.state.editor = { kind: 'skill', test_id: 'test5', skill, title: skill, is_published: false, payload: I.emptyPayload(skill), id: null, position: 100 };
    A.state.jsonMode = false; A.state.jsonError = ''; A.state.uploadError = '';
    return A.modalHtml();
  };
  const lHtml = modal('listening');
  check('visual Listening editor shows 4 audio upload controls + transcript fields', (lHtml.match(/data-admin-upload=/g) || []).length === 4 && lHtml.includes('transcript'));
  const rHtml = modal('reading');
  check('visual Reading editor shows paragraph split + 3 passages', (rHtml.match(/Passage [123]/g) || []).length >= 3 && rHtml.includes('data-edit-split-paragraphs'));
  const wHtml = modal('writing');
  check('visual Writing editor shows Task 1 upload and both word minimum instructions', (wHtml.match(/data-admin-upload=/g) || []).length === 1 && wHtml.includes('150') && wHtml.includes('250'));
  const sHtml = modal('speaking');
  check('visual Speaking editor shows grouped topics, cue-card timers and Part 3', sHtml.includes('data-edit-add-topic') && sHtml.includes('admin-fixed-timers') && sHtml.includes('Part 3'));
  A.state.editor = { kind: 'skill', test_id: 'test5', skill: 'reading', title: 'Fresh', is_published: false, payload: I.emptyPayload('reading'), id: null, position: 100 };
  A.state.jsonMode = true; A.state.jsonDraft = JSON.stringify(I.emptyPayload('reading'));
  check('JSON mode is skill-local and contains only the fresh Reading draft', A.modalHtml().includes('data-admin-json') && !A.modalHtml().includes('old-test-data'));
} catch (e) {
  console.log('EDITOR CRASH:', e.message);
  console.log(e.stack.split('\\n').slice(0, 4).join('\\n'));
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 7. Editing a test must republish it to learners                     */
/* ------------------------------------------------------------------ */
check('script.js: published admin tests are merged into IELTS_CONTENT',
  read('/script.js').includes('function loadDynamicTests'));
check('script.js: dynamic tests are registered under testN keys',
  /const key = row\.skill \+ suffix/.test(read('/script.js')));
check('script.js: partial custom tests are never exposed with another skill’s data',
  /SKILLS\.every\(skill => available\.has\(skill\)\)/.test(read('/script.js'))
  && /return Number\(n\[1\]\) <= 4 \? c\[skill\] : null/.test(read('/services.js')));
check('script.js: account changes clear cached custom tests before reloading',
  /function applyCloudUser\(user\)[\s\S]{0,300}clearDynamicTests\(\)/.test(read('/script.js')));
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
