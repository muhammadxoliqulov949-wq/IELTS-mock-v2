'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ADAPTIVE = require('../lib/adaptiveDrills');
const root = path.join(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');

function services() {
  const context = { window: {} };
  vm.runInNewContext(source('services.js'), context, { filename: 'services.js' });
  return context.window.IELTS_SERVICES;
}

function run() {
  assert.equal(ADAPTIVE.tierForBand(4.5), 1);
  assert.equal(ADAPTIVE.tierForBand(5.5), 1, 'shared 5.5 boundary stays in the foundation tier');
  assert.equal(ADAPTIVE.tierForBand(6), 2);
  assert.equal(ADAPTIVE.tierForBand(6.5), 2);
  assert.equal(ADAPTIVE.tierForBand(7), 3);
  assert.equal(ADAPTIVE.tierForBand(8.5), 3);

  const partial = [
    { section: 'listening', test: 'test1', band: 6, date: 10 },
    { section: 'reading', test: 'test2', band: 5, date: 11 },
    { section: 'writing', test: 'test1', band: 6, date: 12 },
    { section: 'speaking', test: 'test1', band: 7, date: 13 }
  ];
  assert.equal(ADAPTIVE.diagnosticFor(partial), null, 'scores across different mock IDs do not create a diagnostic');
  assert.equal(ADAPTIVE.diagnosticFor(['listening', 'reading', 'writing', 'speaking'].map(section => ({ section, test: 'test1', band: section === 'speaking' ? null : 6, date: 20 }))), null, 'ungraded timeout attempts do not count as a score');
  const attempts = partial.concat([
    { section: 'reading', test: 'test1', band: 5.5, date: 14 },
    { section: 'listening', test: 'test1', band: 6.5, date: 15 },
    { section: 'reading', test: 'test1', band: 5, date: 9 },
    { section: 'listening', test: 'test3', band: 9, date: 99 }
  ]);
  const assessment = ADAPTIVE.diagnosticFor(attempts);
  assert.deepEqual(JSON.parse(JSON.stringify(assessment.bands)), {
    listening: 6.5, reading: 5.5, writing: 6, speaking: 7
  });
  assert.equal(assessment.overall, 6.5);
  assert.equal(assessment.tier, 2);
  assert.equal(assessment.weakestSkill, 'reading');
  assert.equal(assessment.test, 'test1');

  const today = '2026-10-10';
  const quests = ADAPTIVE.dailyQuests(assessment, today, [
    { kind: 'drill', skill: 'reading', activity_date: today },
    { kind: 'drill', skill: 'writing', activity_date: '2026-10-09' },
    { kind: 'mock', skill: 'speaking', activity_date: today }
  ]);
  assert.equal(quests.length, 4);
  assert.equal(quests[0].skill, 'reading', 'weakest skill leads the quest order');
  assert(quests[0].priority);
  assert(quests[0].completed);
  assert(!quests.find(quest => quest.skill === 'writing').completed, 'yesterday does not complete today’s quest');
  assert.equal(quests[0].tier, 2);
  assert(quests.every(quest => quest.id.startsWith(`quest-${today}-`)));

  for (const tier of [1, 2, 3]) {
    assert(ADAPTIVE.writingRound(tier, today).source);
    assert(ADAPTIVE.dictationRound(tier, today).length >= 3);
    const reading = ADAPTIVE.readingRound(tier, today);
    const spans = reading.paragraph.filter(part => part.id);
    assert.deepEqual(spans.map(part => part.id).sort(), ['distractor', 'key']);
    assert(!Object.hasOwn(reading, 'distractor'), 'distractor is only presented inline in the paragraph');
    assert(reading.paragraph.some(part => part.id === reading.distractorId));
  }
  const match = ADAPTIVE.transcriptMatch('Not only does learning broaden opportunities.', 'Not only learning broadens opportunities');
  assert(match.score > 0 && match.score < 100);
  assert(ADAPTIVE.dictationCorrect({ answer: '£17.50', aliases: ['17.50'] }, '17.50'));

  const S = services();
  const currentUtcDay = new Date().toISOString().slice(0, 10);
  const attemptsToday = [{ section: 'listening', test: 'test1', date: Date.parse(`${currentUtcDay}T12:00:00Z`) }];
  const activityToday = [
    { kind: 'mock', reference: 'mock:test1:listening', activity_date: currentUtcDay },
    { kind: 'drill', reference: 'adaptive:one', skill: 'reading', activity_date: currentUtcDay, duration_seconds: 75 },
    { kind: 'game', reference: 'lesson:word_match', activity_date: currentUtcDay }
  ];
  const weekly = S.weeklyActivity(attemptsToday, activityToday);
  assert.equal(weekly.at(-1).count, 3, 'mock trigger copy is de-duplicated while drills and games are included');
  assert.equal(S.studyMinutes(attemptsToday, activityToday), 32, 'drill minutes augment estimated mock study time');

  const script = source('script.js');
  assert(script.includes("else if (r === '/drills') html = adaptiveDrillsPage()"));
  assert(script.includes("if (r === '/drills') bindAdaptiveDrills()"));
  assert(script.includes("if (['/roadmap', '/drills', '/dashboard'].includes(r)) loadLearningActivities()"));
  const html = source('index.html');
  assert(html.indexOf('lib/adaptiveDrills.js') >= 0 && html.indexOf('lib/adaptiveDrills.js') < html.indexOf('script.js'));
  console.log('ADAPTIVE DRILLS TESTS OK ✓');
}

run();
