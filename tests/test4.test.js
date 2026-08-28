/* Test 4 (upper-intermediate) content regression suite.
 * Verifies structure, answer keys and app wiring for Practice Test 4. */
const fs = require('fs');
const path = require('path').join(__dirname, '..');

global.window = {};
eval(fs.readFileSync(path + '/data.js', 'utf8'));
eval(fs.readFileSync(path + '/content2.js', 'utf8'));
eval(fs.readFileSync(path + '/content3.js', 'utf8'));
eval(fs.readFileSync(path + '/content4.js', 'utf8'));
eval(fs.readFileSync(path + '/services.js', 'utf8'));

const C = window.IELTS_CONTENT;
const S = window.IELTS_SERVICES;
let failures = 0;
const check = (cond, label) => {
  console.log((cond ? '  ok  ' : '  FAIL ') + label);
  if (!cond) failures++;
};

console.log('TEST 4 CONTENT SUITE');

/* 1. All four skills exist with the right shapes */
check(C.listening4 && C.listening4.parts.length === 4, 'listening4 has 4 parts');
check(C.listening4 && C.listening4.parts.reduce((n, p) => n + p.questions.length, 0) === 40, 'listening4 has 40 questions');
check(C.reading4 && C.reading4.passages.length === 3, 'reading4 has 3 passages');
check(C.reading4 && C.reading4.passages.reduce((n, p) => n + p.questions.length, 0) === 40, 'reading4 has 40 questions');
check(C.writing4 && C.writing4.tasks.length === 2, 'writing4 has 2 tasks');
check(C.writing4 && C.writing4.tasks[0].chartData && C.writing4.tasks[0].chartData.length > 100, 'writing4 Task 1 has map data');
check(C.speaking4 && C.speaking4.parts.length === 3, 'speaking4 has 3 parts');
check(C.speaking4.parts[1].topic && Array.isArray(C.speaking4.parts[1].bullets) && C.speaking4.parts[1].bullets.length === 4, 'speaking4 Part 2 has cue card with 4 bullets');

/* 2. Unique ids + explanations + valid answers, and no id collisions with Tests 1–3 */
const allQ = [];
C.listening4.parts.forEach(p => p.questions.forEach(q => allQ.push(q)));
C.reading4.passages.forEach(p => p.questions.forEach(q => allQ.push(q)));
const ids = new Set();
const prevIds = new Set();
['listening', 'reading', 'listening2', 'reading2', 'listening3', 'reading3'].forEach(k => {
  const t = C[k];
  if (!t) return;
  if (t.parts) t.parts.forEach(p => p.questions.forEach(q => prevIds.add(q.id)));
  if (t.passages) t.passages.forEach(p => p.questions.forEach(q => prevIds.add(q.id)));
});
let dupIds = 0, noExpl = 0, badMCQ = 0, badTFNG = 0, badSC = 0, crossDup = 0;
for (const q of allQ) {
  if (ids.has(q.id)) dupIds++;
  ids.add(q.id);
  if (prevIds.has(q.id)) crossDup++;
  if (!q.explanation) noExpl++;
  if (q.type === 'multiple-choice') {
    if (!Array.isArray(q.options) || q.answer < 0 || q.answer >= q.options.length) badMCQ++;
    else if (new Set(q.options).size !== q.options.length) badMCQ++;
  } else if (q.type === 'true-false-not-given') {
    if (!['TRUE', 'FALSE', 'NOT GIVEN'].includes(q.answer)) badTFNG++;
  } else if (String(q.answer || '').split(/\s+/).length > 3) badSC++;
}
check(allQ.length === 80, '80 listening+reading questions total');
check(dupIds === 0, 'no duplicate question ids within test 4');
check(crossDup === 0, 'no id collisions with tests 1–3');
check(noExpl === 0, 'every question has an explanation');
check(badMCQ === 0, 'all MCQ answers are valid option indexes');
check(badTFNG === 0, 'all T/F/NG answers are TRUE/FALSE/NOT GIVEN');
check(badSC === 0, 'all sentence-completion answers are ≤3 words');

/* 3. T/F/NG balance (trap items must exist) */
const tfng = allQ.filter(q => q.type === 'true-false-not-given').map(q => q.answer);
check(tfng.length >= 9, 'has a meaningful number of T/F/NG items (' + tfng.length + ')');
check(tfng.includes('NOT GIVEN'), 'includes NOT GIVEN trap items');
check(tfng.includes('TRUE') && tfng.includes('FALSE'), 'includes TRUE and FALSE items');

/* 4. App wiring: selector + content resolution for all four tests */
check(Array.isArray(C.testMeta.tests) && C.testMeta.tests.some(t => t.id === 'test4'), 'testMeta lists test4');
check(C.testMeta.tests.length === 4, 'testMeta lists exactly 4 tests');
check(S.getSkillContent('listening', 'test4') === C.listening4, 'getSkillContent(listening, test4) → listening4');
check(S.getSkillContent('reading', 'test4') === C.reading4, 'getSkillContent(reading, test4) → reading4');
check(S.getSkillContent('writing', 'test4') === C.writing4, 'getSkillContent(writing, test4) → writing4');
check(S.getSkillContent('speaking', 'test4') === C.speaking4, 'getSkillContent(speaking, test4) → speaking4');
check(S.getSkillContent('listening', 'test3') === C.listening3, 'test3 still resolves');
check(S.getSkillContent('listening', 'test2') === C.listening2, 'test2 still resolves');
check(S.testLabel('test4', 'uz') === 'Amaliyot testi 4', 'uz label for test4');

/* 5. index.html loads content4.js before script.js */
const html = fs.readFileSync(path + '/index.html', 'utf8');
const c4 = html.search(/content4\.js/);
const app = html.search(/script\.js\?v=\d+">/);
check(c4 > -1 && app > -1 && c4 < app, 'index.html loads content4.js before script.js');

console.log(failures === 0 ? 'TEST 4 SUITE OK ✓' : 'TEST 4 FAILURES: ' + failures);
process.exit(failures === 0 ? 0 : 1);
