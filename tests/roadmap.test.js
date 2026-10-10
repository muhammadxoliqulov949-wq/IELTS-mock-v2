'use strict';
/* Roadmap + wallet regression tests: migrations, private grading, idempotent
 * rewards, per-user RLS and the sanitized public leaderboard RPC. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { PGlite } = require('@electric-sql/pglite');
const root = path.join(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202610060001_roadmap_gamification.sql'), 'utf8');
const client = fs.readFileSync(path.join(root, 'supabaseClient.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

function check(condition, message) {
  assert.ok(condition, message);
  console.log('✓ ' + message);
}

function testRenderedPages() {
  const elements = new Map();
  const makeElement = () => ({
    innerHTML: '', textContent: '', dataset: {}, style: {}, value: '', disabled: false,
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    setAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }
  });
  const storage = new Map();
  const owner = { id: 'learner-1', email: 'private@example.com', user_metadata: { name: 'Learner' } };
  const profile = { id: owner.id, name: 'Learner One', avatar_url: null, coins: 15, role: 'user' };
  const cloud = {
    getState: () => ({ status: 'ready', user: owner, profile, isAdmin: false }),
    ready: new Promise(() => {}), subscribe() { return () => () => {}; }
  };
  const document = {
    querySelector(selector) { if (!elements.has(selector)) elements.set(selector, makeElement()); return elements.get(selector); },
    querySelectorAll() { return []; }, createElement: makeElement,
    addEventListener() {}, documentElement: {}, body: { dataset: {} }, getElementById() { return null; }
  };
  const context = vm.createContext({
    console, Date, JSON, Map, Set, Number, String, Array, Math, Promise, URL,
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    location: { hash: '#/roadmap', search: '' }, document,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }, removeItem(key) { storage.delete(key); }
    },
    window: { IELTS_CLOUD: cloud, addEventListener() {}, scrollY: 0, location: { hash: '#/roadmap', origin: 'https://preview.example' } }
  });
  for (const file of ['data.js', 'content2.js', 'content3.js', 'content4.js', 'i18n.js', 'services.js', 'lib/adaptiveDrills.js', 'script.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  vm.runInContext("signIn({id:'learner-1',email:'private@example.com',name:'Learner One',coins:15,auth:'supabase'}); roadmapState.topics=[{id:'a1-a2-present-simple',stage:'A1-A2',title:'Present simple',summary:'Rule\\nExample',ai_prompt:'Practise present simple with me.',questions:Array.from({length:5},(_,i)=>({type:i===1?'input':'multiple-choice',prompt:'Question '+(i+1),placeholder:'Answer',options:['A','B']})),reward_coins:10,order_index:1}]; roadmapState.progress={}; roadmapState.loadedUser='learner-1'; store.attempts=['listening','reading','writing','speaking'].map((section,index)=>({section,test:'test1',band:[6,5.5,6.5,6][index],date:Date.now()+index}));", context);
  const roadmap = vm.runInContext('roadmapPage()', context);
  assert(roadmap.includes('#/roadmap') && roadmap.includes('data-roadmap-open="a1-a2-present-simple"'));
  assert(roadmap.includes('🪙 +10') && roadmap.includes('roadmap-overview'));
  vm.runInContext("roadmapState.topicId='a1-a2-present-simple';", context);
  const modal = vm.runInContext('roadmapTopicModalHtml()', context);
  assert(modal.includes('Practise with ChatGPT or Claude'));
  assert(modal.includes('data-roadmap-copy="a1-a2-present-simple"'));
  assert.equal((modal.match(/class="roadmap-question-num"/g) || []).length, 5, 'topic modal renders exactly five questions');
  assert(modal.includes('data-roadmap-submit'));
  cloud.loadLeaderboard = async () => [];
  vm.runInContext("leaderboardState.rows=[{rank_position:1,display_name:'Learner One',avatar_url:null,coins:15,level_badge:'A1 Starter',is_you:true}]; leaderboardState.loadedUser='learner-1';", context);
  const board = vm.runInContext('leaderboardPage()', context);
  assert(board.includes('🥇') && board.includes('leaderboard-row is-you podium-1'));
  const leaderboardTable = (board.match(/<table class="leaderboard-table">[\s\S]*?<\/table>/) || [''])[0];
  assert(leaderboardTable.includes('A1 · Starter') && !leaderboardTable.includes('private@example.com'));
  check(true, 'roadmap cards/modal and medal/highlighted leaderboard render with a signed-in learner');
}

async function testMigrationAndSecurity() {
  const db = new PGlite();
  const alice = '11111111-1111-4111-8111-111111111111';
  const bob = '22222222-2222-4222-8222-222222222222';
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      create table public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        email text, name text, avatar_url text,
        role text not null default 'user', updated_at timestamptz not null default now()
      );
      alter table public.profiles enable row level security;
      revoke all on public.profiles from anon, authenticated;
      grant select on public.profiles to authenticated;
      create policy "Test profile owner read" on public.profiles
        for select to authenticated using (id = (select auth.uid()));
      create table public.mock_results (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null,
        name text not null,
        test_id text not null,
        scores jsonb not null default '{}'::jsonb,
        listening numeric,
        reading numeric,
        writing numeric,
        speaking numeric,
        updated_at timestamptz not null default now(),
        unique(user_id, test_id)
      );
      alter table public.mock_results enable row level security;
      revoke all on public.mock_results from anon, authenticated;
      grant select on public.mock_results to authenticated;
      create policy "Test mock result owner read" on public.mock_results
        for select to authenticated using (user_id = (select auth.uid()));
      insert into auth.users values ('${alice}'), ('${bob}');
      insert into public.profiles(id,email,name,avatar_url) values
        ('${alice}','alice-private@example.com','Alice Learner','https://example.com/alice.png'),
        ('${bob}','bob-private@example.com','Bob Learner',null);
    `);
    await db.exec(sql);

    const topics = (await db.query(`select id,stage,reward_coins,questions from public.topics order by stage,order_index`)).rows;
    assert.equal(topics.length, 12, 'four levels should have three seeded topics each');
    assert.deepEqual([...new Set(topics.map(topic => topic.stage))].sort(), ['A1-A2', 'A2-B1', 'B1-B2', 'B2-C1']);
    assert(topics.every(topic => topic.questions.length === 5), 'every topic must have exactly five questions');
    assert.equal(topics.filter(topic => topic.stage === 'A1-A2').every(topic => topic.reward_coins === 10), true);
    assert.equal(topics.filter(topic => topic.stage === 'A2-B1').every(topic => topic.reward_coins === 20), true);
    assert.equal(topics.filter(topic => topic.stage === 'B1-B2').every(topic => topic.reward_coins === 35), true);
    assert.equal(topics.filter(topic => topic.stage === 'B2-C1').every(topic => topic.reward_coins === 50), true);
    check(topics.length === 12 && topics.every(topic => topic.questions.length === 5), 'seed migration provides 12 real topics and five questions each');

    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${alice}';`);
    assert.equal((await db.query('select id from public.topics')).rows.length, 12);
    await assert.rejects(db.query('select * from public.topic_answer_keys'), /permission denied/);
    await assert.rejects(db.query(`update public.profiles set coins=999 where id='${alice}'`), /permission denied/);
    await assert.rejects(db.query(`insert into public.user_topic_progress(user_id,topic_id) values ('${alice}','a1-a2-present-simple')`), /permission denied/);
    await assert.rejects(db.query(`insert into public.mock_results(user_id,name,test_id) values ('${alice}','Alice','test1')`), /permission denied/);
    await assert.rejects(db.query(`update public.mock_results set listening=9 where user_id='${alice}'`), /permission denied/);
    check(true, 'RLS exposes topic questions, hides answer keys, and blocks direct coin/progress/mock-result writes');

    const firstAnswers = ['1', 'do', '2', 'are', '0'];
    let result = (await db.query(
      'select public.submit_topic_quiz($1,$2::jsonb) as result',
      ['a1-a2-present-simple', JSON.stringify(firstAnswers)]
    )).rows[0].result;
    assert.equal(result.score_percentage, 100);
    assert.equal(result.best_score_percentage, 100);
    assert.equal(result.is_completed, true);
    assert.equal(result.coins_awarded, 10);
    assert.equal(result.coins_balance, 10);
    check(true, 'server grades a completed topic and awards its configured 10 coins');

    result = (await db.query(
      'select public.submit_topic_quiz($1,$2::jsonb) as result',
      ['a1-a2-present-simple', JSON.stringify(firstAnswers)]
    )).rows[0].result;
    assert.equal(result.coins_awarded, 0, 'same topic must not pay twice');
    assert.equal(result.coins_balance, 10);

    const weakAnswers = ['2', 'am writing', '1', 'runs', '0'];
    result = (await db.query(
      'select public.submit_topic_quiz($1,$2::jsonb) as result',
      ['a1-a2-present-continuous', JSON.stringify(weakAnswers)]
    )).rows[0].result;
    assert.equal(result.score_percentage, 60);
    assert.equal(result.is_completed, false);
    assert.equal(result.coins_awarded, 0);
    const strongerAnswers = ['2', 'am writing', '1', 'running', '1'];
    result = (await db.query(
      'select public.submit_topic_quiz($1,$2::jsonb) as result',
      ['a1-a2-present-continuous', JSON.stringify(strongerAnswers)]
    )).rows[0].result;
    assert.equal(result.score_percentage, 100);
    assert.equal(result.is_completed, true);
    assert.equal(result.coins_awarded, 10);
    assert.equal(result.coins_balance, 20);
    await assert.rejects(db.query(
      'select public.submit_topic_quiz($1,$2::jsonb)', ['a1-a2-present-simple', JSON.stringify(['1'])]
    ), /exactly five answers/);
    check(true, '80% threshold, best-score tracking, retry flow and duplicate reward protection work');

    await db.exec(`set request.jwt.claim.sub = '${bob}';`);
    assert.equal((await db.query('select * from public.user_topic_progress')).rows.length, 0);
    assert.equal(Number((await db.query('select coins from public.profiles where id=$1', [bob])).rows[0].coins), 0);
    await assert.rejects(db.query(
      "select public.add_user_coins('roadmap','a1-a2-present-simple')"
    ), /Complete the topic quiz/);
    check(true, 'progress and wallet stay private, and another learner cannot claim Alice’s reward');

    await db.exec('reset role;');
    await db.query(`insert into public.mock_results(user_id,name,test_id,scores,listening,reading) values
      ($1,'Alice Learner','test5','{"reading":{"date":2000,"band":8.5}}'::jsonb,null,8.5),
      ($1,'Alice Learner','test2','{"listening":{"date":3000,"band":5.0}}'::jsonb,5.0,null)`, [alice]);
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${alice}';`);
    await db.query('select public.save_mock_section($1,$2,$3,$4,$5::jsonb,$6::uuid)', [
      'test1','listening',6.5,'Alice Learner',JSON.stringify({ date: 1000, raw: 30, total: 40 }),alice
    ]);
    result = (await db.query("select public.add_user_coins('mock','test1:listening') as result")).rows[0].result;
    assert.equal(result.awarded_coins, 30);
    assert.equal(result.coins_balance, 50);
    result = (await db.query("select public.add_user_coins('mock','test1:listening') as result")).rows[0].result;
    assert.equal(result.awarded_coins, 0);
    assert.equal(result.already_awarded, true);
    result = (await db.query("select public.add_user_coins('mock','test5:reading') as result")).rows[0].result;
    assert.equal(result.awarded_coins, 100);
    assert.equal(result.coins_balance, 150);
    result = (await db.query("select public.add_user_coins('mock','test2:listening') as result")).rows[0].result;
    assert.equal(result.awarded_coins, 0, 'bands below 5.5 have no coin reward');
    await assert.rejects(db.query("select public.add_user_coins('mock','test1:writing')"), /Invalid mock reward reference/);
    await assert.rejects(db.query("select public.add_user_coins('other','test1:listening')"), /Unsupported coin reward source/);
    check(true, 'mock rewards use saved Listening/Reading bands, apply the requested tiers, and are idempotent');

    const aliceBoard = (await db.query('select * from public.get_leaderboard(1)')).rows;
    assert.equal(aliceBoard.length, 1);
    assert.equal(aliceBoard[0].display_name, 'Alice Learner');
    assert.equal(Number(aliceBoard[0].coins), 150);
    assert.equal(aliceBoard[0].is_you, true);
    assert.equal(aliceBoard[0].level_badge, 'A1 Starter');
    assert(!Object.hasOwn(aliceBoard[0], 'email'), 'leaderboard must not expose email');
    assert(!Object.hasOwn(aliceBoard[0], 'user_id'), 'leaderboard should not expose account UUIDs');
    await db.exec(`set request.jwt.claim.sub = '${bob}';`);
    const bobBoard = (await db.query('select * from public.get_leaderboard(1)')).rows;
    assert.equal(bobBoard.length, 2, 'current learner is included even outside the requested top one');
    assert.equal(bobBoard.find(row => row.is_you).display_name, 'Bob Learner');
    check(true, 'leaderboard ranks by coins, includes the current learner, and omits private email');
  } finally {
    await db.close();
  }
}

function testFrontendWiring() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const nav = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  check(/export async function loadRoadmap\(/.test(client), 'Supabase client loads topics and own progress');
  check(/export async function submitRoadmapQuiz\(/.test(client), 'Supabase client submits answers for server grading');
  check(/export async function addUserCoins\(/.test(client), 'Supabase client exposes the amount-free coin RPC');
  check(/export async function loadLeaderboard\(/.test(client), 'Supabase client calls the sanitized leaderboard RPC');
  check(nav.includes("r === '/roadmap'") && nav.includes("r === '/leaderboard'"), 'hash router includes both new pages');
  check(nav.includes('data-roadmap-copy') && nav.includes('data-roadmap-submit'), 'topic modal has copy-prompt and quiz interactions');
  check(nav.includes("addUserCoins('mock'"), 'mock Listening and Reading results flow through the reward RPC');
  check(html.includes('script.js?v=12') && html.includes('styles.css?v=11') && html.includes('learning.css?v=3') && fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes('bandly-v17'), 'updated app and responsive stylesheet cache versions are wired');
  check(/function public\.add_user_coins\(p_source text, p_reference text\)/.test(sql) && !/p_amount/.test(sql), 'coin RPC accepts no client-supplied reward amount');
}

(async () => {
  testFrontendWiring();
  testRenderedPages();
  await testMigrationAndSecurity();
  console.log('ROADMAP + GAMIFICATION TESTS OK ✓');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
