'use strict';
/* Premium pack tests: Test 2 content, explanations, i18n, dashboard/quiz helpers. */
const fs = require('fs');
const path = require('path').join(__dirname, '..');

global.window = {};
global.localStorage = {
  getItem: () => null, setItem: () => {}, removeItem: () => {}
};
global.document = { documentElement: {}, body: undefined };

const vm = () => {
  const fn = new Function('window', 'localStorage', 'document', `
    ${fs.readFileSync(path + '/data.js', 'utf8')}
    ${fs.readFileSync(path + '/content2.js', 'utf8')}
    ${fs.readFileSync(path + '/i18n.js', 'utf8')}
    ${fs.readFileSync(path + '/services.js', 'utf8')}
  `);
  fn(global.window, global.localStorage, global.document);
  return global.window;
};

function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } }

const win = vm();

/* --- Test 2 existence + completeness --- */
assert(win.IELTS_CONTENT.listening2, 'listening2 missing');
assert(win.IELTS_CONTENT.reading2, 'reading2 missing');
assert(win.IELTS_CONTENT.writing2, 'writing2 missing');
assert(win.IELTS_CONTENT.speaking2, 'speaking2 missing');

assert(win.IELTS_CONTENT.listening2.parts.reduce((s, p) => s + p.questions.length, 0) === 40, 'listening2 should have 40 questions');
assert(win.IELTS_CONTENT.reading2.passages.reduce((s, p) => s + p.questions.length, 0) === 40, 'reading2 should have 40 questions');

const allL2 = win.IELTS_CONTENT.listening2.parts.flatMap(p => p.questions);
const allR2 = win.IELTS_CONTENT.reading2.passages.reduce((s, p) => s.concat(p.questions), []);
[...allL2, ...allR2].forEach(q => assert(q.explanation && q.explanation.length > 8, 'question needs an explanation: ' + q.id));

/* --- Content helpers --- */
const S = win.IELTS_SERVICES;
assert(S.getSkillContent('listening', 'test2').id === 'listening-02', 'getSkillContent test2');
assert(S.getSkillContent('reading', 'test1').id === 'reading-01', 'getSkillContent test1');
assert(S.testLabel('test2', 'en') === 'Practice Test 2', 'testLabel en');
assert(S.testLabel('test2', 'uz') === 'Amaliyot testi 2', 'testLabel uz');

/* --- Explanations --- */
assert(S.explanationFor(allL2[0], 'listening', 0).length > 10, 'explanation from question');
assert(S.explanationFor({ id: 'l1', type: 'sentence-completion' }, 'listening', 0).includes('forty-two'), 'test-1 curated explanation');
const mcq = { id: 'x', type: 'multiple-choice', options: ['A', 'B'], answer: 1 };
assert(S.explanationFor(mcq).includes('option B'), 'multiple-choice fallback');

/* --- Dashboard/quiz helpers --- */
const attempts = [
  { section: 'listening', band: 6.5, date: Date.now() - 86400000 * 3 },
  { section: 'listening', band: 7.5, date: Date.now() - 86400000 },
  { section: 'writing', band: 7, date: Date.now() - 3600000 }
];
assert(S.overallBand(attempts) === 7.5, 'overallBand rounds to nearest 0.5 => 7.5, got ' + S.overallBand(attempts));
assert(S.studyMinutes(attempts) === 120, 'studyMinutes 30+60+60? got ' + S.studyMinutes(attempts));
assert(S.bandTrend(attempts).length === 3, 'bandTrend count');
assert(S.weeklyActivity(attempts).length === 7, 'weeklyActivity 7 bars');
assert((S.personalPlan(attempts) || []).length >= 6, 'personalPlan length');
assert(S.quizFrom(win.IELTS_CONTENT.quiz, 4).length === 4, 'quizFrom default 4');
assert(S.vocabMastery(2, 5) === 40, 'vocabMastery 40%');

/* --- i18n --- */
const I = win.IELTS_I18N;
assert(I.t('nav_dashboard') === 'Dashboard', 'i18n en');
assert(I.dict.uz['nav_dashboard'] === 'Dashboard', 'i18n uz dict');
assert(I.dict.ru['nav_dashboard'] === 'Дашборд', 'i18n ru dict');

console.log('PREMIUM CONTENT OK ✓');
console.log('listening2 questions:', allL2.length, '| reading2 questions:', allR2.length, '| vocab sets:', Object.keys(win.IELTS_CONTENT.vocabulary).length, '| lessons:', win.IELTS_CONTENT.lessons.length);
