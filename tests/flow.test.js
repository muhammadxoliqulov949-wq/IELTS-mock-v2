/* Test-flow regression test: sign-in gate → warning modal → live timer → lock.
 *
 * Verifies:
 *  - guests cannot open a test section (sign-in gate instead of questions)
 *  - signed-in users see the "timer cannot be stopped" warning before start
 *  - the timer only runs after an explicit start (deadline persisted)
 *  - a completed section is locked: results-only view, no retake
 *  - data is stored per email: invisible to guests and other accounts
 *  - #/fullmock aliases the unified Mock Test page
 */
const fs = require('fs');
const path = require('path').join(__dirname, '..');

function makeEl() {
  return {
    textContent: '', innerHTML: '', value: '', disabled: false, className: '',
    style: {}, dataset: {}, onclick: null, onchange: null, oninput: null, onsubmit: null,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (f) this._s.add(c); else this._s.delete(c); } },
    addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView() {}, scrollTo() {}, focus() {},
    setAttribute() {}, getAttribute: () => null, closest: () => null
  };
}

const els = new Map();
global.document = {
  querySelector: (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); },
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener() {}
};
global.location = { hash: '#/' };
const storage = new Map();
global.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k)
};
global.window = { addEventListener() {}, scrollY: 0, speechSynthesis: null };
global.confirm = () => true;
global.fetch = () => Promise.reject(new Error('network disabled in tests'));

const src = fs.readFileSync(path + '/script.js', 'utf8');
const fn = new Function('document', 'localStorage', 'location', 'window', 'confirm', 'fetch',
  src + '\n;globalThis.__hooks = { render, signIn, signOut, store: () => store };');
let failed = 0;
function check(name, cond) {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name);
  if (!cond) failed++;
}

try {
  eval(fs.readFileSync(path + '/data.js', 'utf8'));
  eval(fs.readFileSync(path + '/i18n.js', 'utf8'));
  eval(fs.readFileSync(path + '/content2.js', 'utf8'));
  eval(fs.readFileSync(path + '/services.js', 'utf8'));
  fn(global.document, global.localStorage, global.location, global.window, global.confirm, global.fetch);
  const { render, signIn, signOut, store } = globalThis.__hooks;
  const app = () => document.querySelector('#app').innerHTML;

  /* 1 — guest hits a test section: gate, no questions */
  global.location.hash = '#/listening';
  render();
  check('guest: sign-in gate instead of the test', app().includes('Sign in to start this test')
    && app().includes('#/login') && !app().includes('data-l-submit') && !app().includes('warnBackdrop'));

  /* 2 — signed in: warning modal before the timer starts */
  signIn({ name: 'Aziz', email: 'aziz@example.com', picture: '' });
  global.location.hash = '#/listening';
  render();
  check('signed-in: warning modal before start', app().includes('warnBackdrop')
    && app().includes('Before you start') && app().includes('data-warn-start="listening:30"'));
  check('signed-in: timer not running before start', !storage.has('ielts-v2-store:aziz@example.com:deadline:listening:test1'));

  /* 3 — explicit start persists the deadline and removes the modal
     (the fake DOM does not parse attributes, so set dataset like the markup would) */
  const warnBtn = document.querySelector('[data-warn-start]');
  warnBtn.dataset.warnStart = 'listening:30';
  warnBtn.onclick();
  check('start: modal gone, timer element updated', !app().includes('warnBackdrop'));
  const dl = Number(storage.get('ielts-v2-store:aziz@example.com:deadline:listening:test1'));
  check('start: deadline persisted ~30 min ahead', dl > Date.now() + 29 * 60000 && dl < Date.now() + 31 * 60000);

  /* 4 — completed section is locked to a results-only view */
  const s = store();
  s.attempts.push({ section: 'listening', test: 'test1', band: 7, raw: 30, total: 40, date: Date.now() });
  global.location.hash = '#/listening';
  render();
  check('completed: results-only view, no retake', app().includes('Test completed')
    && !app().includes('data-l-submit') && !app().includes('warnBackdrop') && !app().includes('data-l-text'));
  check('completed: shows the band of that attempt', app().includes('result-band'));

  /* 5 — per-email isolation */
  signOut();
  const guestRaw = JSON.parse(storage.get('ielts-v2-store') || '{}');
  check('sign-out: guest store has no account attempts', !(guestRaw.attempts || []).length);
  global.location.hash = '#/listening';
  render();
  check('sign-out: gate again for guests', app().includes('Sign in to start this test'));
  signIn({ name: 'Other', email: 'other@example.com', picture: '' });
  check('other account: starts clean', store().attempts.length === 0);
  global.location.hash = '#/listening';
  render();
  check('other account: warning modal, not the previous user result', app().includes('warnBackdrop') && !app().includes('Test completed'));

  /* 6 — #/fullmock aliases the unified mock page */
  global.location.hash = '#/fullmock';
  render();
  check('fullmock alias renders unified mock page', app().includes('mock-flow') && app().includes('Combined result'));

  console.log(failed === 0 ? 'FLOW TESTS OK ✓' : `FLOW TESTS FAILED: ${failed}`);
} catch (e) {
  console.log('FLOW TEST CRASH:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}
process.exit(failed === 0 ? 0 : 1);
