'use strict';
/* Full interactive learning regression suite. No live Supabase credentials
 * required: execute both migrations in real PostgreSQL-compatible PGlite,
 * exercise the actual SDK with mock HTTP, and drive games with a fake clock. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const { PGlite } = require('@electric-sql/pglite');
const seed = require('../scripts/roadmap-seed');
const L = require('../lib/learningPath');
const Games = require('../miniGames');
const publicTopics = require('../lib/roadmapContent');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const log = message => console.log('✓ ' + message);
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const records = seed.buildCatalogue();
const keysFor = id => records.find(record => record.topic.id === id);
const quizAnswers = id => keysFor(id).quizKeys.map(answer => String(Array.isArray(answer) ? answer[0] : answer));

function catalogueTests() {
  seed.generate(true);
  assert.equal(publicTopics.length, 40);
  assert.deepEqual(publicTopics, records.map(record => record.topic));
  assert.equal(new Set(publicTopics.map(topic => topic.id)).size, 40);
  for (const stage of seed.stages) {
    const topics = publicTopics.filter(topic => topic.stage === stage);
    assert.equal(topics.length, 10);
    assert.deepEqual(topics.map(topic => topic.order_index), Array.from({ length: 10 }, (_, i) => i + 1));
  }
  for (const topic of publicTopics) {
    assert.equal(topic.questions.length, 5);
    assert(topic.summary.length > 80 && topic.ai_prompt.length > 100);
    assert(topic.questions.every(question => !Object.hasOwn(question, 'answer')));
    const data = topic.game_data;
    assert.equal(data.word_match.pairs.length * 2, 10);
    assert.equal(data.speed_vocabulary.duration_seconds, 60);
    assert.equal(data.speed_vocabulary.questions.length, 10);
    assert.equal(data.sentence_scramble.sentences.length, 3);
    const keys = keysFor(topic.id).gameKeys;
    for (const question of data.speed_vocabulary.questions) {
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options).size, 3);
      assert.equal(question.options[keys.speed_vocabulary[question.id]], data.speed_vocabulary.glossary.find(word => word.word === question.word).meaning);
      assert(!Object.hasOwn(question, 'answer'));
    }
    for (const sentence of data.sentence_scramble.sentences) {
      assert(L.sentenceIsCorrect(sentence, keys.sentence_scramble[sentence.id]));
      assert.equal(sentence.words.length, sentence.sentence.split(/\s+/).length);
    }
  }
  assert(!read('lib/roadmapContent.js').includes('quizKeys'));
  assert(!read('scripts/build.js').includes("'scripts/roadmap-seed.js'"));
  const html = read('index.html'), build = require('../scripts/build').staticFiles, sw = read('sw.js');
  for (const file of ['learning.css', 'miniGames.js', 'lib/learningPath.js', 'lib/roadmapContent.js']) {
    assert(html.includes(file) && sw.includes('/' + file) && build.includes(file));
  }
  assert(html.indexOf('miniGames.js') < html.indexOf('script.js'));
  log('40 synced lessons, 200 private-key quizzes, 120 usable games and complete build/PWA wiring');
}
function helperTests() {
  assert(L.isUnlocked(publicTopics[0].id, publicTopics, {}));
  assert(!L.isUnlocked(publicTopics[1].id, publicTopics, {}));
  const progress = Object.fromEntries(publicTopics.slice(0, 10).map(topic => [topic.id, { is_completed: true }]));
  assert(L.isUnlocked(publicTopics[10].id, publicTopics, progress));
  assert(!L.isUnlocked(publicTopics[11].id, publicTopics, progress));
  progress[publicTopics[33].id] = { is_completed: true };
  assert(L.isUnlocked(publicTopics[33].id, publicTopics, progress), 'old completed topics remain reviewable');
  assert(!L.isUnlocked(publicTopics[34].id, publicTopics, progress), 'legacy progress cannot skip incomplete prerequisites');
  const time = Date.parse('2026-10-06T23:59:59Z');
  assert.equal(L.effectiveStreak({ current_streak: 3, last_active_date: '2026-10-05' }, time), 3);
  assert.equal(L.effectiveStreak({ current_streak: 3, last_active_date: '2026-10-04' }, time), 0);
  assert.equal(L.effectiveStreak({ current_streak: 3, last_active_date: '2026-10-07' }, time), 0);
  assert.equal(L.effectiveStreak({ current_streak: 3, last_active_date: '2026-10-05' }, time + 1000), 0);
  assert.equal(L.effectiveStreak({ current_streak: 3, last_active_date: null }, time), 0);
  const week = L.streakWeek({ current_streak: 3, last_active_date: '2026-10-06' }, time);
  assert.equal(week.length, 7); assert.equal(week.filter(day => day.done).length, 3); assert(week[6].today);
  assert(L.activeToday({ last_active_date: '2026-10-06' }, time));
  const repeated = { sentence: 'the cat and the dog', words: ['the', 'dog', 'the', 'cat', 'and'] };
  assert(L.sentenceIsCorrect(repeated, [0, 3, 4, 2, 1]));
  assert(L.sentenceIsCorrect(repeated, [2, 3, 4, 0, 1]));
  assert(!L.sentenceIsCorrect(repeated, [0, 3, 4, 0, 1]));
  assert.equal(L.speedPoints(true, 1, 3000), 150);
  assert.equal(L.speedPoints(true, 5, 5000), 200);
  assert.equal(L.speedPoints(false, 0, 100), 0);
  assert.equal(L.speedReward(5, 5, 40000), 15);
  assert.equal(L.speedReward(4, 5, 40000), 0);
  assert.equal(L.speedReward(5, 10, 40000), 0);
  log('global locked progression, legacy review, duplicate-token handling, UTC midnight and streak expiry');
}

async function databaseTests() {
  const db = new PGlite();
  const alice = '11111111-1111-4111-8111-111111111111', bob = '22222222-2222-4222-8222-222222222222';
  const dave = '44444444-4444-4444-8444-444444444444', eve = '55555555-5555-4555-8555-555555555555';
  const migration = read('supabase/migrations/202610060003_interactive_learning.sql');
  const first = publicTopics[0];
  const call = async (sql, parameters = []) => (await db.query(sql, parameters)).rows[0]?.result;
  const as = async user => { await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${user}';`); };
  const admin = async () => db.exec('reset role;');
  const start = type => call('select public.start_topic_game($1,$2) result', [first.id, type]);
  const submit = (id, answers) => call('select public.submit_topic_game($1::uuid,$2::jsonb) result', [id, JSON.stringify(answers)]);
  const matches = Array.from({ length: 5 }, (_, i) => [i, i]);
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      create table public.profiles(id uuid primary key references auth.users(id),email text,name text,avatar_url text,role text default 'user',updated_at timestamptz default now());
      alter table public.profiles enable row level security;
      grant select on public.profiles to authenticated;
      grant update(name,avatar_url) on public.profiles to authenticated;
      create policy owner_profile on public.profiles for select to authenticated using(id=auth.uid());
      create policy owner_name on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
      create table public.mock_results(id uuid primary key default gen_random_uuid(),user_id uuid,name text,test_id text,scores jsonb default '{}',listening numeric,reading numeric,writing numeric,speaking numeric,updated_at timestamptz default now(),unique(user_id,test_id));
      alter table public.mock_results enable row level security;
      insert into auth.users values('${alice}'),('${bob}'),('${dave}'),('${eve}');
      insert into public.profiles(id,email,name) values('${alice}','secret-alice@example.com','Alice'),('${bob}','secret-bob@example.com','Bob'),('${dave}','dave-private@example.com','Dave'),('${eve}','eve-private@example.com','Eve');
    `);
    await db.exec(read('supabase/migrations/202610060001_roadmap_gamification.sql'));
    await db.exec(migration);
    const count = (await db.query('select stage,count(*) n from public.topics group by stage order by stage')).rows;
    assert(count.every(row => Number(row.n) === 10));
    await as(alice);
    for (const table of ['topic_answer_keys', 'topic_game_keys', 'topic_game_sessions']) await assert.rejects(db.query(`select * from public.${table}`), /permission denied/);
    for (const column of ['coins', 'current_streak', 'last_active_date']) await assert.rejects(db.query(`update public.profiles set ${column}=${column} where id='${alice}'`), /permission denied/);
    await db.query(`update public.profiles set name='Alice Learner' where id='${alice}'`);
    await assert.rejects(db.query("select public.record_learning_activity('game','fake')"), /permission denied/);
    await assert.rejects(db.query('select public.grade_topic_quiz_internal($1,$2::jsonb)', [first.id, JSON.stringify(quizAnswers(first.id))]), /permission denied/);
    for (const table of ['learning_activity', 'user_game_progress', 'coin_transactions']) await assert.rejects(db.query(`delete from public.${table}`), /permission denied/);
    let result = await call('select public.update_daily_streak() result');
    assert.equal(result.current_streak, 0); assert.equal(result.last_active_date, null);
    assert.equal((await call('select public.update_daily_streak() result')).current_streak, 0);
    await assert.rejects(db.query('select public.submit_topic_quiz($1,$2::jsonb)', [publicTopics[1].id, JSON.stringify(quizAnswers(publicTopics[1].id))]), /locked/);
    await assert.rejects(db.query('select public.start_topic_game($1,$2)', [publicTopics[10].id, 'word_match']), /locked/);
    await assert.rejects(start('unsupported'), /Unsupported mini-game/);
    log('SQL/RLS hides keys and sessions, protects balance/streak writes and blocks locked-lesson bypasses');

    // Even a private-key-only edit must invalidate a session snapshot.
    for (const type of ['word_match', 'speed_vocabulary']) {
      const stale = await start(type);
      await admin();
      const originalKeys = (await db.query('select answers from public.topic_game_keys where topic_id=$1', [first.id])).rows[0].answers;
      await db.query("update public.topic_game_keys set answers=answers || '{\"_revision\":\"key-only-edit\"}'::jsonb where topic_id=$1", [first.id]);
      await as(alice);
      await assert.rejects(type === 'word_match' ? submit(stale.session_id, matches) : call('select public.answer_speed_question($1,0,0) result', [stale.session_id]), /Lesson content changed/);
      await admin();
      await db.query('update public.topic_game_keys set answers=$2::jsonb where topic_id=$1', [first.id, JSON.stringify(originalKeys)]);
      await as(alice);
    }
    assert.equal((await db.query('select coins,current_streak from public.profiles')).rows[0].coins, 0);
    log('private-key-only changes invalidate game snapshots without crediting rewards');

    let round = await start('word_match');
    assert.equal(round.payload.pairs.length, 5);
    await assert.rejects(submit(round.session_id, [[0, 0], [0, 0], [2, 2], [3, 3], [4, 4]]), /exactly once/);
    await assert.rejects(submit(round.session_id, []), /all word pairs/);
    result = await submit(round.session_id, matches);
    assert.equal(result.score_percentage, 100); assert.equal(result.coins_awarded, 10); assert.equal(result.coins_balance, 10);
    assert.equal(result.current_streak, 1); assert.equal(result.active_today, true);
    const originalSession = round.session_id;
    result = await submit(round.session_id, matches);
    assert.equal(result.coins_awarded, 0); assert.equal(result.already_submitted, true);
    round = await start('word_match'); result = await submit(round.session_id, matches);
    assert.equal(result.coins_awarded, 0); assert.equal(result.daily_reward_claimed, true); assert.equal(result.current_streak, 1);
    assert.equal((await db.query("select * from public.user_game_progress where game_type='word_match'")).rows[0].attempt_count, 2);
    assert.equal((await db.query('select count(*) n from public.coin_transactions')).rows[0].n, 1);
    assert.equal((await db.query('select public.is_topic_unlocked($1) unlocked', [publicTopics[1].id])).rows[0].unlocked, false, 'games do not skip the mastery check');
    await assert.rejects(db.query("select public.add_user_coins('game','fake')"), /Unsupported coin reward source/);
    log('Word Match is server-validated: +10 once daily, idempotent retry, practice replays and no quiz bypass');

    round = await start('sentence_scramble');
    const sentences = round.payload.sentences;
    const answers = sentences.map(sentence => ({ sentence_id: sentence.id, order: keysFor(first.id).gameKeys.sentence_scramble[sentence.id] }));
    const invalid = JSON.parse(JSON.stringify(answers)); invalid[0].order[0] = invalid[0].order[1];
    await assert.rejects(submit(round.session_id, invalid), /every word exactly once/);
    result = await submit(round.session_id, answers);
    assert.equal(result.coins_awarded, 15); assert.equal(result.coins_balance, 25); assert.equal(result.current_streak, 1);
    round = await start('sentence_scramble');
    const wrong = answers.map(answer => ({ ...answer, order: answer.order.slice().reverse() }));
    result = await submit(round.session_id, wrong);
    assert.equal(result.is_completed, false); assert.equal(result.coins_awarded, 0); assert.equal(result.current_streak, 1);
    log('Sentence Scramble grades complete token permutations and awards +15 only for all three correct sentences');

    round = await start('speed_vocabulary');
    assert(round.remaining_ms > 58000 && round.remaining_ms <= 60000);
    assert.equal(round.payload.question.index, 0);
    assert(!Object.hasOwn(round.payload, 'answers'));
    await assert.rejects(submit(round.session_id, { points: 999999 }), /still running/);
    await assert.rejects(db.query('select public.answer_speed_question($1,2,0)', [round.session_id]), /current speed question/);
    let question = round.payload.question;
    let expected = keysFor(first.id).gameKeys.speed_vocabulary[question.id];
    result = await call('select public.answer_speed_question($1,$2,$3) result', [round.session_id, question.index, expected]);
    assert.equal(result.earned_points, 150); assert.equal(result.combo, 1); assert.equal(result.answered_count, 1);
    const duplicate = await call('select public.answer_speed_question($1,$2,$3) result', [round.session_id, 0, expected]);
    assert.equal(duplicate.points, result.points); assert.equal(duplicate.answered_count, 1);
    await assert.rejects(db.query('select public.answer_speed_question($1,0,$2)', [round.session_id, (expected + 1) % 3]), /already been answered/);
    question = result.question;
    for (let i = 1; i < 5; i++) {
      expected = keysFor(first.id).gameKeys.speed_vocabulary[question.id];
      result = await call('select public.answer_speed_question($1,$2,$3) result', [round.session_id, question.index, expected]);
      question = result.question;
    }
    assert.equal(result.max_combo, 5); assert.equal(result.points, 1000);
    expected = keysFor(first.id).gameKeys.speed_vocabulary[question.id];
    result = await call('select public.answer_speed_question($1,$2,$3) result', [round.session_id, question.index, (expected + 1) % 3]);
    assert.equal(result.combo, 0); assert.equal(result.points, 1000);
    question = result.question;
    await admin();
    await db.query("update public.topic_game_sessions set question_started_at=clock_timestamp()-interval '5 seconds' where id=$1", [round.session_id]);
    await as(alice);
    result = await call('select public.answer_speed_question($1,$2,$3) result', [round.session_id, question.index, keysFor(first.id).gameKeys.speed_vocabulary[question.id]]);
    assert.equal(result.earned_points, 100); assert.equal(result.points, 1100);
    question = result.question;
    await admin(); await db.query("update public.topic_game_sessions set deadline_at=clock_timestamp()-interval '1 second' where id=$1", [round.session_id]); await as(alice);
    result = await call('select public.answer_speed_question($1,$2,0) result', [round.session_id, question.index]);
    assert.equal(result.expired, true); assert.equal(result.answered_count, 7);
    result = await submit(round.session_id, { points: 999999, combo: 999, coins: 999 });
    assert.equal(result.points, 1100); assert.equal(result.coins_awarded, 7); assert.equal(result.coins_balance, 32); assert.equal(result.max_combo, 5);
    assert.equal(result.correct_count, 6); assert.equal(result.score_percentage, 86);
    await as(bob); await assert.rejects(submit(round.session_id, {}), /not found/);
    assert.equal((await db.query('select * from public.user_game_progress')).rows.length, 0);
    log('60-second server deadlines, fast/combo scoring, answer replay safety, expiry and bounded +5…15 rewards');

    await as(alice);
    for (const topic of publicTopics) {
      result = await call('select public.submit_topic_quiz($1,$2::jsonb) result', [topic.id, JSON.stringify(quizAnswers(topic.id))]);
      assert.equal(result.score_percentage, 100, topic.id + ' seed must be answerable');
      assert.equal(result.is_completed, true); assert.equal(result.coins_awarded, topic.reward_coins);
      assert.equal(result.current_streak, 1);
    }
    assert.equal(result.coins_balance, 1182);
    const board = (await db.query('select * from public.get_leaderboard(1)')).rows;
    assert.equal(board[0].level_badge, 'C1 Master'); assert.equal(board[0].coins, 1182); assert.equal(board[0].current_streak, 1);
    assert(!Object.hasOwn(board[0], 'email') && !Object.hasOwn(board[0], 'user_id'));
    await admin(); await db.exec(migration); await as(alice);
    assert.equal((await db.query('select * from public.user_topic_progress')).rows.length, 40);
    assert.equal((await db.query('select coins from public.profiles')).rows[0].coins, 1182);
    assert.equal((await submit(originalSession, matches)).coins_awarded, 0);
    log('all 200 seeded quiz answers, 40-step progression, cross-stage locks, C1 leaderboard and safe migration reapply');

    const baseDay = (await call('select public.update_daily_streak() result')).activity_date;
    await admin(); await db.query("update public.profiles set current_streak=3,last_active_date=$1::date-1 where id=$2", [baseDay, bob]); await as(bob);
    result = await call('select public.update_daily_streak() result'); assert.equal(result.current_streak, 3); assert.equal(result.active_today, false);
    result = await call('select public.submit_topic_quiz($1,$2::jsonb) result', [first.id, JSON.stringify(quizAnswers(first.id))]); assert.equal(result.current_streak, 4);
    assert.equal((await call('select public.update_daily_streak() result')).current_streak, 4);
    await admin(); await db.exec(`create or replace function public.learning_today() returns date language sql volatile set search_path='' as $$select '${baseDay}'::date+1$$;`); await as(bob);
    result = await call('select public.update_daily_streak() result'); assert.equal(result.current_streak, 4); assert.equal(result.active_today, false);
    round = await start('word_match'); result = await submit(round.session_id, matches); assert.equal(result.current_streak, 5); assert.equal(result.coins_awarded, 10);
    await admin(); await db.exec(`create or replace function public.learning_today() returns date language sql volatile set search_path='' as $$select '${baseDay}'::date+3$$;`); await as(bob);
    result = await call('select public.update_daily_streak() result'); assert.equal(result.current_streak, 0);
    assert.equal((await db.query('select current_streak from public.profiles')).rows[0].current_streak, 0, 'expired zero is persisted');
    result = await call('select public.submit_topic_quiz($1,$2::jsonb) result', [first.id, JSON.stringify(quizAnswers(first.id))]); assert.equal(result.current_streak, 1);
    await as(alice);
    result = await submit(originalSession, matches); assert.equal(result.current_streak, 0); assert.equal(result.active_today, false, 'old session retries do not create activity on a new day');
    round = await start('word_match'); result = await submit(round.session_id, matches); assert.equal(result.coins_awarded, 10); assert.equal(result.current_streak, 1);
    await admin(); await db.exec("create or replace function public.learning_today() returns date language sql volatile set search_path='' as $$select (clock_timestamp() at time zone 'UTC')::date$$;");
    log('streak increments once daily, remains unchanged on login, resets after a missed day and restarts at 1');

    await as(dave);
    result = await call('select public.update_daily_streak() result'); assert.equal(result.current_streak, 0);
    await db.query('select public.save_mock_section($1,$2,$3,$4,$5::jsonb,$6::uuid)', ['test1', 'listening', 3, 'Dave', JSON.stringify({ date: Date.now(), raw: 5, total: 40 }), dave]);
    result = await call('select public.update_daily_streak() result'); assert.equal(result.current_streak, 1);
    await as(eve);
    await db.query('select public.save_mock_section($1,$2,$3,$4,$5::jsonb,$6::uuid)', ['test1', 'reading', 7, 'Eve', JSON.stringify({ date: Date.now() - 86400000, raw: 30, total: 40 }), eve]);
    result = await call('select public.update_daily_streak() result'); assert.equal(result.current_streak, 0);
    await db.query('select public.save_mock_section($1,$2,$3,$4,$5::jsonb,$6::uuid)', ['test1', 'writing', null, 'Eve', JSON.stringify({ date: Date.now() }), eve]);
    result = await call('select public.update_daily_streak() result'); assert.equal(result.current_streak, 0);
    await db.exec("reset role; set role anon; set request.jwt.claim.sub='';");
    await assert.rejects(db.query('select public.update_daily_streak()'), /permission denied/);
    await assert.rejects(db.query('select public.start_topic_game($1,$2)', [first.id, 'word_match']), /permission denied/);
    log('fresh scored mock exercises count; historical sync, unscored work and anonymous RPCs cannot earn streaks');
  } finally { await db.close(); }
}

function fakeClock() {
  let time = 0, id = 0; const tasks = new Map();
  const add = (fn, ms, period = 0) => { const key = ++id; tasks.set(key, { fn, at: time + ms, period }); return key; };
  return { now: () => time, setTimeout: (fn, ms) => add(fn, ms), clearTimeout: key => tasks.delete(key), setInterval: (fn, ms) => add(fn, ms, ms), clearInterval: key => tasks.delete(key),
    advance(ms) {
      const end = time + ms;
      for (;;) {
        const next = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [key, task] = next; time = task.at;
        if (task.period) task.at += task.period; else tasks.delete(key);
        task.fn();
      }
      time = end;
    }, jump(ms) { time += ms; }, size: () => tasks.size };
}
async function controllerTests() {
  const clock = fakeClock(); let topic = publicTopics[0], account = null, completions = 0;
  let cloud = null;
  const create = () => Games.create({ ...clock, t: key => key, t2: (key, vars) => key + JSON.stringify(vars), getTopic: () => topic, getOwner: () => account, isSignedIn: () => !!account, canPlay: () => true, cloud, onComplete: () => completions++ });
  let game = create(); await game.start('word_match');
  assert.equal(game.snapshot().match.cards.length, 10);
  game.selectMatch('0-w'); game.selectMatch('1-m'); assert.equal(game.snapshot().match.feedback, 'wrong');
  clock.advance(420); assert.equal(game.snapshot().match.answers.length, 0);
  for (let i = 0; i < 5; i++) { game.selectMatch(i + '-w'); game.selectMatch(i + '-m'); clock.advance(450); }
  await flush(); assert.equal(game.snapshot().phase, 'result'); assert.equal(game.snapshot().result.coins_awarded, 0); assert.equal(completions, 0);
  assert(game.html(topic).includes('game_guest_result'));
  await game.start('sentence_scramble');
  for (const sentence of topic.game_data.sentence_scramble.sentences) {
    const indexes = keysFor(topic.id).gameKeys.sentence_scramble[sentence.id];
    game.addWord(indexes[0]); game.removeWord(0); assert.equal(game.snapshot().scramble.selected.length, 0);
    for (const index of indexes) game.addWord(index);
    game.checkSentence(); assert.equal(game.snapshot().scramble.solved, true); game.nextSentence();
  }
  await flush(); assert.equal(game.snapshot().phase, 'result'); assert.equal(game.snapshot().result.coins_awarded, 0);
  await game.start('speed_vocabulary');
  for (let i = 0; i < 5; i++) {
    const question = game.snapshot().speed.question;
    const expected = keysFor(topic.id).gameKeys.speed_vocabulary[question.id];
    clock.advance(250); await game.answerSpeed(expected); clock.advance(360);
  }
  assert.equal(game.snapshot().speed.combo, 5); assert.equal(game.snapshot().speed.points, 1000);
  const question = game.snapshot().speed.question;
  await game.answerSpeed((keysFor(topic.id).gameKeys.speed_vocabulary[question.id] + 1) % 3); clock.advance(360);
  assert.equal(game.snapshot().speed.combo, 0);
  clock.jump(60000); game.tick(); await flush();
  assert.equal(game.snapshot().phase, 'result'); assert.equal(game.snapshot().result.total_questions, 6); assert.equal(game.snapshot().result.coins_awarded, 0);
  assert.equal(clock.size(), 0);
  log('all three guest games are playable, score correctly, expire after background time and never credit real rewards');

  account = 'alice'; let resolveAnswer, resolveFinish; let submits = 0;
  cloud = {
    async startTopicGame() { return { session_id: 'test-session', payload: { ...topic.game_data.speed_vocabulary, question: { ...topic.game_data.speed_vocabulary.questions[0], index: 0 } }, remaining_ms: 60000 }; },
    answerSpeedQuestion() { return new Promise(resolve => { resolveAnswer = resolve; }); },
    submitTopicGame() { submits++; return new Promise(resolve => { resolveFinish = resolve; }); }
  };
  game = create(); await game.start('speed_vocabulary');
  const answer = game.answerSpeed(0);
  account = 'bob'; game.reset();
  resolveAnswer({ correct: true, points: 9999, combo: 20, correct_count: 20, answered_count: 20, remaining_ms: 40000 }); await answer;
  assert.equal(game.snapshot().phase, 'lobby'); assert.equal(submits, 0); assert.equal(completions, 0);
  account = 'alice';
  cloud.startTopicGame = async () => ({ session_id: 'test-session', payload: topic.game_data.word_match });
  await game.start('word_match');
  for (let i = 0; i < 5; i++) { game.selectMatch(i + '-w'); game.selectMatch(i + '-m'); clock.advance(450); }
  await flush(); assert.equal(submits, 1);
  await game.finish(); assert.equal(submits, 1, 'double finalization makes one request');
  game.reset(); resolveFinish({ is_completed: true, coins_awarded: 10, score_percentage: 100 }); await flush(); assert.equal(completions, 0);
  let attempt = 0;
  cloud.submitTopicGame = async () => { if (++attempt === 1) throw new Error('<img src=x onerror=alert(1)>'); return { is_completed: true, score_percentage: 100, correct_count: 5, total_questions: 5, coins_awarded: 10, active_today: true }; };
  await game.start('word_match');
  for (let i = 0; i < 5; i++) { game.selectMatch(i + '-w'); game.selectMatch(i + '-m'); clock.advance(450); }
  await flush(); assert.equal(game.snapshot().phase, 'error'); assert(game.html(topic).includes('&lt;img')); assert(!game.html(topic).includes('<img'));
  await game.finish(); assert.equal(game.snapshot().phase, 'result'); assert.equal(completions, 1); assert.equal(attempt, 2);
  game.reset(); assert.equal(clock.size(), 0);
  log('late game responses are scoped to the account/lesson, timers clean up, double submits are blocked and failed saves retry safely');
}

function uiTests() {
  const elements = new Map(), storage = new Map();
  const make = () => ({ innerHTML: '', textContent: '', dataset: {}, style: {}, value: '', disabled: false, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, setAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, focus() {} });
  const state = { status: 'disabled', user: null, profile: null };
  const cloud = { getState: () => state, ready: new Promise(() => {}), subscribe() {} };
  const context = vm.createContext({ console, Date, JSON, Map, Set, Number, String, Array, Math, Promise, URL,
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    location: { hash: '#/roadmap', search: '' },
    document: { querySelector(key) { if (!elements.has(key)) elements.set(key, make()); return elements.get(key); }, querySelectorAll() { return []; }, createElement: make, addEventListener() {}, documentElement: {}, body: { dataset: {}, style: {} }, getElementById() { return null; } },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
    window: { IELTS_CLOUD: cloud, addEventListener() {}, scrollY: 0, location: { hash: '#/roadmap', origin: 'https://preview.example' } }
  });
  for (const file of ['data.js', 'content2.js', 'content3.js', 'content4.js', 'i18n.js', 'services.js', 'lib/learningPath.js', 'lib/roadmapContent.js', 'miniGames.js', 'script.js']) vm.runInContext(read(file), context, { filename: file });
  const run = code => vm.runInContext(code, context);
  const page = run('roadmapPage()');
  assert(page.includes('Your English adventure') && page.includes('learning-preview-banner'));
  assert.equal((page.match(/<article class="test-card roadmap-topic-card/g) || []).length, 10);
  assert.equal((page.match(/class="roadmap-path-node"[^>]*disabled/g) || []).length, 9);
  run("openRoadmapTopic('a1-a2-present-simple','play')");
  const modal = run('roadmapTopicModalHtml()');
  assert(modal.includes('Word Match') && modal.includes('Speed Vocabulary') && modal.includes('Sentence Scramble'));
  assert(!modal.includes('data-roadmap-submit')); assert(modal.includes('lesson-quiz-gate'));
  run("closeRoadmapTopic(); openRoadmapTopic('a1-a2-present-continuous')"); assert.equal(run('roadmapState.topicId'), null);
  state.status = 'ready'; state.user = { id: 'learner', email: 'secret@example.com' }; state.profile = { id: 'learner', coins: 20, current_streak: 3, last_active_date: new Date().toISOString().slice(0, 10) };
  run("signIn({id:'learner',name:'Learner',coins:20,current_streak:3,last_active_date:new Date().toISOString().slice(0,10),auth:'supabase'}); roadmapState.topics=window.IELTS_ROADMAP_CONTENT; roadmapState.loadedUser='learner';");
  const signed = run('roadmapPage()'); assert(signed.includes('data-daily-streak') && signed.includes('data-coin-wallet')); assert(!signed.includes('learning-preview-banner'));
  run("roadmapState.progress['a1-a2-present-simple']={is_completed:true,score_percentage:80}; openRoadmapTopic('a1-a2-present-continuous','quiz')");
  assert(run('roadmapTopicModalHtml()').includes('data-roadmap-submit'));
  for (const lang of ['en', 'uz', 'ru']) {
    run(`store.lang='${lang}'; applyPrefs()`);
    const raw = run('roadmapPage()'); assert(!raw.includes('roadmap_path_title')); assert(!raw.includes('game_word_match_title'));
    const keys = Object.keys(context.window.IELTS_I18N.dict.en).filter(key => /^(game_|streak_)/.test(key));
    for (const key of keys) assert(context.window.IELTS_I18N.dict[lang][key], lang + ':' + key);
  }
  log('guest/signed-in roadmap, locked buttons, lesson tabs, persistent wallet/flame and complete EN/UZ/RU copy');
}

async function sdkTests() {
  const code = esbuild.buildSync({ entryPoints: [path.join(root, 'supabaseClient.js')], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
  const oldFetch = global.fetch, oldWindow = global.window;
  const id = '11111111-1111-4111-8111-111111111111', user = { id, email: 'learner@example.com', user_metadata: { name: 'Learner' } };
  const requests = []; let blocked, release, profileError = false, blockProfile = false, releaseProfile, profileStarted, profileCoins = 10;
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  global.window = { location: { origin: 'https://preview.example' } };
  global.fetch = async (url, options = {}) => {
    const u = String(url); const body = options.body ? JSON.parse(options.body) : null; requests.push({ url: u, body });
    if (u === '/api/config') return response({ configured: true, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_test' });
    if (u.includes('/auth/v1/token')) return response({ access_token: 'test.' + Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.test', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user });
    if (u.includes('/auth/v1/user')) return response(user);
    if (u.includes('/auth/v1/logout')) return response({});
    if (u.includes('/rest/v1/profiles')) {
      if (profileError) return response({ message: 'Temporary profile failure' }, 503);
      const data = [{ id, name: 'Learner', coins: profileCoins, current_streak: 1, last_active_date: new Date().toISOString().slice(0, 10) }];
      if (blockProfile) { blockProfile = false; return new Promise(resolve => { releaseProfile = () => resolve(response(data)); profileStarted(); }); }
      return response(data);
    }
    if (u.includes('/rpc/update_daily_streak')) return response({ current_streak: 1, last_active_date: new Date().toISOString().slice(0, 10), active_today: true });
    if (u.includes('/rpc/start_topic_game')) return response({ session_id: 'session', payload: publicTopics[0].game_data.word_match });
    if (u.includes('/rpc/answer_speed_question')) {
      if (blocked) return new Promise(resolve => { release = () => resolve(response({ points: 150, remaining_ms: 58000 })); });
      return response({ points: 150, remaining_ms: 58000 });
    }
    if (u.includes('/rpc/submit_topic_game')) return response({ coins_awarded: 10, coins_balance: 10, current_streak: 1 });
    if (u.includes('/rest/v1/topics')) return response([publicTopics[0]]);
    if (u.includes('/rest/v1/user_topic_progress')) return response([]);
    if (u.includes('/rest/v1/user_game_progress')) return response([{ topic_id: publicTopics[0].id, game_type: 'word_match', best_score: 100 }]);
    throw new Error('Unexpected HTTP request: ' + u);
  };
  let sdk;
  try {
    const mod = { exports: {} }; new Function('require', 'module', 'exports', code)(require, mod, mod.exports); sdk = mod.exports; await sdk.ready;
    await assert.rejects(sdk.startTopicGame(publicTopics[0].id, 'word_match'), /Sign in/);
    await sdk.authenticate({ mode: 'login', email: user.email, password: 'test-password' });
    assert.equal(sdk.getState().profile.current_streak, 1);
    const data = await sdk.loadRoadmap(); assert.equal(data.games.length, 1); assert(data.topics[0].game_data);
    await sdk.startTopicGame(publicTopics[0].id, 'word_match'); await sdk.answerSpeedQuestion('session', 0, 2); await sdk.submitTopicGame('session', [[0, 0]]); await sdk.refreshDailyStreak();
    const start = requests.find(request => request.url.includes('/rpc/start_topic_game'));
    assert.deepEqual(start.body, { p_topic_id: publicTopics[0].id, p_game_type: 'word_match' });
    const answer = requests.find(request => request.url.includes('/rpc/answer_speed_question'));
    assert.deepEqual(answer.body, { p_session_id: 'session', p_question_index: 0, p_choice: 2 });
    assert(requests.some(request => request.url.includes('/user_game_progress') && request.url.includes('user_id=eq.' + id)));
    assert(requests.some(request => request.url.includes('/topics') && request.url.includes('game_data')));
    await assert.rejects(sdk.answerSpeedQuestion('session', 0, 5), /Invalid/);
    profileError = true; await sdk.loadProfile(true);
    assert.equal(sdk.getState().profile.coins, 10, 'a transient refresh must retain the wallet');
    assert.equal(sdk.getState().profile.current_streak, 1);
    profileError = false; blockProfile = true;
    const profileRequest = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Profile fixture request did not start')), 5000);
      profileStarted = () => { clearTimeout(timeout); resolve(); };
    });
    const staleProfile = sdk.loadProfile(true); await profileRequest;
    assert.equal(typeof releaseProfile, 'function');
    profileCoins = 25; await sdk.loadProfile(true);
    assert.equal(sdk.getState().profile.coins, 25);
    releaseProfile(); await staleProfile;
    assert.equal(sdk.getState().profile.coins, 25, 'an older read must not erase a newly earned reward');
    log('profile refresh retains known rewards offline and ignores out-of-order wallet responses');
    blocked = true; const pending = sdk.answerSpeedQuestion('session', 1, 0); await flush();
    await sdk.logout(); release(); await assert.rejects(pending, /Account changed/);
    log('actual Supabase SDK loads own game progress, sends amount-free RPCs, refreshes streak/profile and rejects stale-account responses');
  } finally {
    if (sdk?.getState().user) await sdk.logout();
    global.fetch = oldFetch;
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
  }
}

(async () => {
  catalogueTests(); helperTests();
  await databaseTests(); await controllerTests(); uiTests(); await sdkTests();
  console.log('INTERACTIVE LEARNING TESTS OK ✓');
})().catch(error => { console.error(error); process.exitCode = 1; });
