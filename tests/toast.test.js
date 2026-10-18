/* Toast timer tests (Task 02.9, finding P2-4).
 *
 * `notify()` writes to a single shared #toast element, but every call used
 * to schedule a fresh `setTimeout(..., 2400)` without cancelling the old
 * one. Two rapid notifications then stacked: the FIRST toast's timer hid
 * the SECOND toast long before its 2400 ms were up.
 *
 * Strategy: cut the REAL notify() function out of script.js — once from the
 * working tree (post-fix) and once from the pinned fixture tests/fixtures/script-prefix-02.9.js (pre-fix)
 * — and run both against the same stub element + fake timers. That proves
 * the defect in the historical code and pins the fix in the current one,
 * with real source, not a re-typed copy.
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

/* ------------------------------------------------------------------ */
/* Static wiring                                                       */
/* ------------------------------------------------------------------ */
const script = read('/script.js');
check('static: notify cancels the pending hide before scheduling a new one',
  /if \(toastTimer\) clearTimeout\(toastTimer\)/.test(script));
check('static: the toast visibility window is still 2400 ms',
  /toastTimer = setTimeout\(\(\) => \{ toast\.classList\.remove\('show'\); toastTimer = null; \}, 2400\)/.test(script));
check('static: the old fire-and-forget stacking line is gone',
  !/classList\.add\('show'\); setTimeout\(/.test(script));
check('static: exactly ONE toast element exists (a single shared timer is the right model)',
  (read('/index.html').match(/id="toast"/g) || []).length === 1);
check('static: nothing else manipulates the toast timer state',
  (script.match(/toastTimer/g) || []).length === 5 /* declaration + 4 uses inside notify */);

/* ------------------------------------------------------------------ */
/* Extract the REAL notify() from a script.js source                    */
/* ------------------------------------------------------------------ */
function extractNotify(src, label) {
  const start = src.indexOf('function notify(msg)');
  const end = src.indexOf('function fmtTime(', start); /* fmtTime follows notify in both versions */
  if (start < 0 || end < 0) throw new Error('notify() not extractable from ' + label);
  let body = src.slice(start, end).trim();
  if (!body.includes('let toastTimer')) body = 'let toastTimer = null;\n' + body; /* pre-fix has no declaration */
  const toast = {
    textContent: '',
    classList: {
      _s: new Set(), _removed: 0,
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); this._removed++; },
      contains(c) { return this._s.has(c); }
    }
  };
  const timers = [];
  const setTimeoutFake = (fn, delay) => { const t = { id: timers.length + 1, fn, delay, cancelled: false }; timers.push(t); return t.id; };
  const clearTimeoutFake = (id) => { const t = timers.find((x) => x.id === id); if (t) t.cancelled = true; };
  const fire = (t) => { if (t && !t.cancelled) t.fn(); };
  const notify = new Function('toast', 'setTimeout', 'clearTimeout', body + '\n;return notify;')(toast, setTimeoutFake, clearTimeoutFake);
  return { notify, toast, timers, fire };
}

/* The genuine pre-fix script.js is frozen as a fixture. It used to be read
   from `git show HEAD:script.js`, which only worked while the fix was an
   uncommitted working-tree change: after the fix was committed, HEAD became
   post-fix and the pre-fix bug demonstration silently decayed. The pinned
   snapshot keeps the demonstration reproducible at any future HEAD. */
let preSrc = null;
try { preSrc = read('/tests/fixtures/script-prefix-02.9.js'); }
catch (e) { preSrc = null; }
if (!preSrc) {
  for (const rev of ['HEAD^:script.js', 'HEAD:script.js']) {
    try { preSrc = cp.execSync('git show ' + rev, { cwd: root, encoding: 'utf8' }); } catch (e) { /* keep trying */ }
    if (preSrc) break;
  }
}
const pre = extractNotify(preSrc, 'fixture tests/fixtures/script-prefix-02.9.js');
const post = extractNotify(script, 'working tree');
check('setup: real pre-fix and post-fix notify() extracted and load', typeof pre.notify === 'function' && typeof post.notify === 'function');

/* ------------------------------------------------------------------ */
/* Pre-fix: the stacking bug is reproduced from real HEAD code          */
/* ------------------------------------------------------------------ */
pre.notify('Welcome');
pre.notify('Second message');
check('pre-fix: two rapid toasts stacked two UNcancelled timers',
  pre.timers.length === 2 && pre.timers.every((t) => !t.cancelled));
pre.fire(pre.timers[0]); /* the first toast's 2400 ms expire… */
check('pre-fix bug: the OLD timer hides the NEW toast early (show removed while text is "Second message")',
  !pre.toast.classList.contains('show') && pre.toast.textContent === 'Second message');
pre.fire(pre.timers[1]);
check('pre-fix: both timers eventually remove the class (remove called twice)',
  pre.toast.classList._removed === 2);

/* ------------------------------------------------------------------ */
/* Post-fix: new toast cancels the old timer; window stays 2400 ms      */
/* ------------------------------------------------------------------ */
post.notify('Welcome');
post.notify('Second message');
check('fix: a new toast cancels the pending hide timer',
  post.timers.length === 2 && post.timers[0].cancelled === true && post.timers[1].cancelled === false);
check('fix: both timers still use the 2400 ms window',
  post.timers.every((t) => t.delay === 2400));
post.fire(post.timers[0]); /* cancelled — must not fire */
check('fix: the stale timer cannot hide the new toast early',
  post.toast.classList.contains('show') && post.toast.textContent === 'Second message' && post.toast.classList._removed === 0);
post.fire(post.timers[1]);
check('fix: the LATEST timer hides the toast after its full window, exactly once',
  !post.toast.classList.contains('show') && post.toast.classList._removed === 1);

/* Single-toast path unchanged: show, then hide once after 2400 ms */
const solo = extractNotify(script, 'working tree (solo)');
solo.notify('One message');
check('solo: toast shows immediately and one timer is pending',
  solo.toast.classList.contains('show') && solo.timers.length === 1 && !solo.timers[0].cancelled);
solo.fire(solo.timers[0]);
check('solo: the toast hides once when its timer fires',
  !solo.toast.classList.contains('show') && solo.toast.classList._removed === 1 && solo.toast.textContent === 'One message');

/* Three rapid toasts: the second timer already fired and nulled toastTimer,
   so the third call simply schedules a fresh one — still only the last
   timer is alive. */
post.notify('Third message');
check('fix: a third toast schedules one new, uncancelled timer (the old one already fired and cleared itself)',
  post.timers.length === 3 && post.timers[2].cancelled === false);
post.fire(post.timers[0]); /* still cancelled — must not fire */
post.fire(post.timers[2]);
check('fix: three rapid toasts → two removals total (one per visible message), latest hides last',
  post.toast.classList._removed === 2 && !post.toast.classList.contains('show') && post.toast.textContent === 'Third message');

console.log('\n' + (failed ? failed + ' FAILURE(S)' : 'ALL CHECKS PASSED') + ' — tests/toast.test.js');
process.exit(failed ? 1 : 0);
