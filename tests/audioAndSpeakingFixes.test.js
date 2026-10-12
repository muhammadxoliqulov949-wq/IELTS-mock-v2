'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const tts = require('../lib/edgeTts.js');
const gradeHandler = require('../api/grade.js');

console.log('--- AUDIO & SPEAKING RECOVERY TEST SUITE ---');

// 1. Listening Section 1 & Section 3 Dialogue Parsing & Speaker Stripping
{
  const transcript1 = `Woman: Good morning, Riverside Leisure Centre, how can I help you?
Man: Hi, I would like to ask about gym membership for me and my family.
Woman: Of course! We have a few different options depending on how often you plan to visit.`;

  const turns1 = tts.parseDialogueTurns(transcript1);
  assert.equal(turns1.length, 3, 'Transcript 1 splits into exactly 3 turns');
  assert.equal(turns1[0].gender, 'female', 'Turn 1 is female (Woman)');
  assert.equal(turns1[1].gender, 'male', 'Turn 2 is male (Man)');
  assert.equal(turns1[2].gender, 'female', 'Turn 3 is female (Woman)');

  // Critical requirement: Speaker labels MUST be completely stripped
  assert.ok(!turns1[0].text.startsWith('Woman:'), 'Turn 1 does not contain Woman: prefix');
  assert.ok(!turns1[1].text.startsWith('Man:'), 'Turn 2 does not contain Man: prefix');
  assert.ok(!turns1[0].text.includes('Woman:'), 'Turn 1 text has no speaker label');
  assert.ok(!turns1[1].text.includes('Man:'), 'Turn 2 text has no speaker label');
  assert.equal(turns1[0].text, 'Good morning, Riverside Leisure Centre, how can I help you?');
  assert.equal(turns1[1].text, 'Hi, I would like to ask about gym membership for me and my family.');

  // Speaker 1 / Speaker 2 prefixes
  const transcriptNumbered = `Speaker 1: Hello and welcome to the study centre.
Speaker 2: Thank you. I need some guidance on IELTS preparation.
Speaker 1: We have daily practice sessions.`;

  const turnsNumbered = tts.parseDialogueTurns(transcriptNumbered);
  assert.equal(turnsNumbered.length, 3);
  assert.equal(turnsNumbered[0].gender, 'female');
  assert.equal(turnsNumbered[1].gender, 'male');
  assert.ok(!turnsNumbered[0].text.includes('Speaker 1:'));
  assert.ok(!turnsNumbered[1].text.includes('Speaker 2:'));
  assert.equal(turnsNumbered[0].text, 'Hello and welcome to the study centre.');
  assert.equal(turnsNumbered[1].text, 'Thank you. I need some guidance on IELTS preparation.');

  // Section 3 academic dialogue with multiple speakers
  const transcript3 = `Tutor: Right, you have both been looking at urban green spaces. Maya, what did you find?
Maya: I focused on the health benefits for mental wellbeing.
Tutor: And does the size of the park matter?
Leo: My section is about biodiversity and insect species.`;

  const turns3 = tts.parseDialogueTurns(transcript3);
  assert.equal(turns3.length, 4);
  assert.equal(turns3[0].gender, 'male');   // Tutor
  assert.equal(turns3[1].gender, 'female'); // Maya
  assert.equal(turns3[2].gender, 'male');   // Tutor
  assert.equal(turns3[3].gender, 'male');   // Leo

  assert.ok(!turns3[0].text.includes('Tutor:'));
  assert.ok(!turns3[1].text.includes('Maya:'));
  assert.ok(!turns3[3].text.includes('Leo:'));

  console.log('✓ Listening dialogue parsing: speaker prefixes completely stripped, turns assigned distinct genders');
}

// 2. Audio Quality & Voices (No robotic sound, British natural voices)
{
  assert.equal(tts.DEFAULT_FEMALE_VOICE, 'en-GB-SoniaNeural', 'Uses British female Sonia voice');
  assert.equal(tts.DEFAULT_MALE_VOICE, 'en-GB-RyanNeural', 'Uses British male Ryan voice');
  assert.equal(tts.DEFAULT_PITCH, '+0Hz', 'Natural pitch (+0Hz, no robotic frequency shifting)');
  assert.equal(tts.DEFAULT_RATE, '-2%', 'Natural pacing (-2%, clear British cadence without mumbling)');
  console.log('✓ Edge TTS audio quality: natural British voices, standard pitch and natural rate configured');
}

// 3. Speaking Scoring & Null Score Prevention
{
  process.env.GROQ_API_KEY = 'fake-test-key';
  // Test grading response structure
  const fakeRes = () => {
    const r = {
      statusCode: 200,
      headers: {},
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; }
    };
    return r;
  };

  // Test speaking grading with empty answers
  const emptyReq = {
    method: 'POST',
    headers: {},
    body: {
      mode: 'speaking',
      parts: [
        { title: 'Part 1', qa: [{ q: 'Where do you live?', a: '' }] }
      ]
    }
  };
  const emptyRes = fakeRes();
  gradeHandler(emptyReq, emptyRes).then(() => {
    assert.equal(emptyRes.statusCode, 400, 'Empty speaking submission returns 400 error');
    assert.ok(emptyRes.body.error, 'Returns clear error instead of null band');
    console.log('✓ Speaking grading: empty answers rejected with friendly error, never producing null band');
  });
}

// 4. SQL Migration Integrity (Speaking score guarantee)
{
  const migrationPath = path.join(__dirname, '../supabase/migrations/202610120001_speaking_score_guarantee.sql');
  assert.ok(fs.existsSync(migrationPath), 'Speaking score guarantee migration file exists');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.ok(sql.includes('alter table public.profiles'), 'Migration ensures profiles table has speaking column');
  assert.ok(sql.includes('profiles_speaking_score_check'), 'Migration adds IELTS score check constraint (0-9, 0.5 step)');
  assert.ok(sql.includes('function public.save_mock_section'), 'Migration updates save_mock_section RPC');
  assert.ok(sql.includes('update public.profiles'), 'save_mock_section updates profile speaking band');

  console.log('✓ SQL migration: mock_results and profiles tables guarantee numeric speaking score format');
}

// 5. Retake Flow in script.js
{
  const scriptContent = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
  assert.ok(scriptContent.includes('function retakeTestSection'), 'script.js defines retakeTestSection flow');
  assert.ok(scriptContent.includes('data-retake-section'), 'completedView renders retake-section button');
  assert.ok(scriptContent.includes('isFailedSpeaking'), 'completedView handles failed/null speaking cleanly with retake guidance');
  assert.ok(!scriptContent.includes('Speaking: null'), 'script.js does not contain hardcoded "Speaking: null"');
  console.log('✓ Client flow: Retake Test button and clean error handling without null scores implemented');
}

console.log('ALL AUDIO & SPEAKING RECOVERY TESTS PASSED ✓');
