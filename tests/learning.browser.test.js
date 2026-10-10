'use strict';
/* Optional real-browser integration suite. Run a preview server first:
 *   npx playwright install --with-deps chromium
 *   npm run preview
 *   npm run test:learning:browser
 * Uses the REAL Supabase SDK and REAL SQL/RLS via a PGlite-backed HTTP fixture,
 * never a live project. Guest rounds, desktop/mobile, keyboard and audio UI
 * are covered separately. Browser binaries and screenshots stay out of Git. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const { PGlite } = require('@electric-sql/pglite');
const records = require('../scripts/roadmap-seed').buildCatalogue();
const root = path.join(__dirname, '..');
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const screenshots = process.env.LEARNING_SCREENSHOT_DIR;
const log = message => console.log('✓ ' + message);
const overflow = async page => {
  const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert(size.width <= size.viewport + 1, JSON.stringify(size));
};
async function screenshot(page, name) {
  if (!screenshots) return;
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, name + '.png'), fullPage: true, animations: 'disabled' });
}
async function guestFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  // Deterministic offline-safe font fallback; no third-party font requests.
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await context.route('**/api/config', route => route.fulfill({ json: { configured: false } }));
  await context.addInitScript(() => { if (location.origin !== 'null') localStorage.setItem('ielts-v2-store', JSON.stringify({ mascotMuted: true, theme: 'dark', lang: 'en' })); });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/#/roadmap');
    await page.evaluate(() => {
      const key = 'ielts-v2-store', store = JSON.parse(localStorage.getItem(key) || '{}');
      store.lang = 'uz'; store.attempts = []; localStorage.setItem(key, JSON.stringify(store));
    });
    await page.reload();
    await expect(page.locator('.diagnostic-gate-banner')).toBeVisible();
    await expect(page.locator('.diagnostic-gate-copy p')).toContainText('Darajangizni aniqlash va shaxsiy mashqlar rejasini ochish uchun avval diagnostik test topshiring');
    await expect(page.locator('.roadmap-path-item')).toHaveCount(0);
    await page.evaluate(() => {
      const key = 'ielts-v2-store', store = JSON.parse(localStorage.getItem(key) || '{}');
      store.lang = 'en'; store.selectedTest = 'test1';
      store.attempts = [['listening', 6], ['reading', 5.5], ['writing', 6.5], ['speaking', 6]].map(([section, band], index) => ({ section, band, test: 'test1', date: Date.now() + index }));
      localStorage.setItem(key, JSON.stringify(store));
    });
    await page.reload();
    await expect(page.locator('.roadmap-path-item')).toHaveCount(10);
    await expect(page.locator('.daily-quest-card')).toHaveCount(4);
    await expect(page.locator('.roadmap-path-node:disabled')).toHaveCount(9);
    await overflow(page); await screenshot(page, 'roadmap-desktop');
    for (const stage of ['A2-B1', 'B1-B2', 'B2-C1']) {
      await page.locator(`[data-roadmap-stage="${stage}"]`).click();
      await expect(page.locator('.roadmap-path-item')).toHaveCount(10);
      await expect(page.locator('.roadmap-path-node:disabled')).toHaveCount(10);
    }
    await page.locator('[data-roadmap-stage="A1-A2"]').click();
    await page.locator('.roadmap-path-node:not(:disabled)').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('#lesson-tab-play').click();
    await expect(page.locator('.game-choice')).toHaveCount(3);
    await screenshot(page, 'playground-desktop');
    await page.locator('[data-game-start="word_match"]').click();
    await expect(page.locator('.match-card')).toHaveCount(10);
    await page.locator('[data-match-card="0-w"]').click(); await page.locator('[data-match-card="1-m"]').click();
    await expect(page.locator('.match-card.is-wrong')).toHaveCount(2);
    await expect(page.locator('.match-card.is-wrong')).toHaveCount(0);
    await screenshot(page, 'word-match-desktop');
    for (let i = 0; i < 5; i++) {
      await page.locator(`[data-match-card="${i}-w"]`).click(); await page.locator(`[data-match-card="${i}-m"]`).click();
      if (i < 4) await expect(page.locator('.match-card.is-matched')).toHaveCount((i + 1) * 2);
    }
    await expect(page.locator('.game-result')).toBeVisible();
    await expect(page.locator('.game-result-coins')).toHaveCount(0);
    await expect(page.locator('.game-result')).toContainText('local practice round');
    await page.locator('[data-game-back]').click();
    await page.locator('[data-game-start="sentence_scramble"]').click();
    for (let i = 0; i < 3; i++) {
      const order = records[0].gameKeys.sentence_scramble['s' + (i + 1)];
      if (i === 0) {
        await page.locator(`[data-scramble-word="${order[0]}"]`).click();
        await page.locator('[data-scramble-remove="0"]').click();
        await expect(page.locator('.sentence-answer .sentence-token')).toHaveCount(0);
      }
      for (const index of order) await page.locator(`[data-scramble-word="${index}"]`).click();
      await page.locator('[data-scramble-check]').click();
      await expect(page.locator('.sentence-answer')).toHaveClass(/is-correct/);
      if (i === 0) await screenshot(page, 'scramble-desktop');
      await page.locator('[data-scramble-next]').click();
    }
    await expect(page.locator('.game-result')).toContainText('100%');
    await page.locator('[data-game-back]').click();
    await page.clock.install();
    await page.locator('[data-game-start="speed_vocabulary"]').click();
    await expect(page.locator('[data-game-clock]')).toHaveText('60');
    await expect(page.locator('.speed-option')).toHaveCount(3);
    await page.locator('[data-speed-answer="0"]').focus();
    await page.evaluate(() => render());
    await expect(page.locator('[data-speed-answer="0"]')).toBeFocused();
    for (let i = 0; i < 5; i++) {
      const id = await page.evaluate(() => roadmapGames.snapshot().speed.question.id);
      const answer = records[0].gameKeys.speed_vocabulary[id];
      await page.keyboard.press(String(answer + 1));
      await page.clock.runFor(450);
    }
    await expect(page.locator('.speed-combo strong')).toContainText('×5');
    await screenshot(page, 'speed-desktop');
    await page.clock.fastForward(61000); // Also cover returning after a background time jump.
    await expect(page.locator('.game-result')).toBeVisible();
    await expect(page.locator('.game-result-coins')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.roadmap-path-node:disabled')).toHaveCount(9);
    // Header controls and the mobile settings page drive language/theme changes.
    await page.goto(base + '/#/settings');
    await page.locator('[data-set-lang="uz"]').click(); await page.locator('[data-set-theme="light"]').click();
    await page.goto(base + '/#/roadmap');
    await page.setViewportSize({ width: 390, height: 844 }); await overflow(page);
    await expect(page.locator('h1')).toContainText('Ingliz tili sarguzashtingiz');
    await screenshot(page, 'roadmap-mobile-uz-light');
    await page.locator('.roadmap-path-node:not(:disabled)').click(); await page.locator('#lesson-tab-play').click();
    await screenshot(page, 'playground-mobile-uz-light');
    await page.locator('[data-game-start="word_match"]').click(); await overflow(page);
    await screenshot(page, 'word-match-mobile-uz-light');
    await page.keyboard.press('Escape'); await page.setViewportSize({ width: 320, height: 740 }); await overflow(page);
    assert.deepEqual(errors, []);
    log('browser: all 40 map steps, three complete guest games, matching animation, keyboard speed combos, 60s expiry, Uzbek/light and 320px/390px layouts');
  } finally { await context.close(); }
}

async function fixture() {
  const db = new PGlite(), id = '11111111-1111-4111-8111-111111111111';
  const user = { id, email: 'learner@example.com', user_metadata: { name: 'Learner One' }, email_confirmed_at: new Date().toISOString() };
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    create table public.profiles(id uuid primary key references auth.users(id),email text,name text,avatar_url text,role text default 'user',created_at timestamptz default now(),updated_at timestamptz default now());
    alter table public.profiles enable row level security; grant select on public.profiles to authenticated;
    grant update(name,avatar_url) on public.profiles to authenticated;
    create policy owner_profile on public.profiles for select to authenticated using(id=auth.uid());
    create table public.mock_results(id uuid primary key default gen_random_uuid(),user_id uuid,name text,test_id text,scores jsonb default '{}',listening numeric,reading numeric,writing numeric,speaking numeric,overall_band numeric,created_at timestamptz default now(),updated_at timestamptz default now(),unique(user_id,test_id));
    alter table public.mock_results enable row level security;
    insert into auth.users values('${id}'); insert into public.profiles(id,email,name) values('${id}','${user.email}','Learner One');
  `);
  for (const migration of ['202610060001_roadmap_gamification.sql', '202610060003_interactive_learning.sql', '202610100001_adaptive_drills.sql']) await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations', migration), 'utf8'));
  await db.exec(`update public.profiles set coins=1250,current_streak=3,last_active_date=(now() at time zone 'UTC')::date-1;
    set role authenticated; set request.jwt.claim.sub='${id}';`);
  const rpc = {
    update_daily_streak: [], start_topic_game: ['p_topic_id', 'p_game_type'],
    answer_speed_question: ['p_session_id', 'p_question_index', 'p_choice'],
    submit_topic_game: ['p_session_id', 'p_answers'], submit_topic_quiz: ['p_topic_id', 'p_answers'],
    record_adaptive_drill: ['p_reference', 'p_skill', 'p_tier', 'p_score', 'p_duration_seconds'],
    get_leaderboard: ['p_limit']
  };
  const requests = [], errors = [];
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'content-type': 'application/json' };
  async function route(request) {
    const url = new URL(request.request().url()), body = request.request().postDataJSON() || {};
    requests.push({ path: url.pathname, body });
    const send = (json, status = 200) => request.fulfill({ status, headers, json });
    if (request.request().method() === 'OPTIONS') return request.fulfill({ status: 204, headers });
    if (url.pathname.endsWith('/token')) return send({ access_token: 'test.' + Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.test', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user });
    if (url.pathname.endsWith('/user')) return send(user);
    if (url.pathname.endsWith('/logout')) return send({});
    const name = url.pathname.split('/').pop();
    try {
      if (url.pathname.includes('/rpc/')) {
        if (!Object.hasOwn(rpc, name)) throw new Error('Unsupported fixture RPC ' + name);
        const args = rpc[name].map(key => typeof body[key] === 'object' ? JSON.stringify(body[key]) : body[key]);
        const params = args.map((_, i) => '$' + (i + 1)).join(',');
        const rows = await db.query(name === 'get_leaderboard' ? `select * from public.${name}(${params})` : `select public.${name}(${params}) result`, args);
        return send(name === 'get_leaderboard' ? rows.rows : rows.rows[0].result);
      }
      if (['topics', 'user_topic_progress', 'user_game_progress', 'learning_activity', 'profiles', 'mock_results'].includes(name)) {
        const rows = await db.query(`select * from public.${name}${name === 'topics' ? ' order by stage,order_index' : ''}`);
        // PostgREST serializes SQL DATE as YYYY-MM-DD; PGlite returns a Date.
        return send(rows.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key.endsWith('_date') && value instanceof Date ? value.toISOString().slice(0, 10) : value]))));
      }
      if (name === 'mock_tests' || name === 'mock_test_meta') return send([]);
      throw new Error('Unsupported fixture table ' + name);
    } catch (error) { errors.push({ path: url.pathname, message: error.message }); return send({ code: 'P0001', message: error.message }, 400); }
  }
  return { db, route, requests, errors };
}
async function accountFlow(browser) {
  const api = await fixture();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await context.route('**/api/config', route => route.fulfill({ json: { configured: true, SUPABASE_URL: 'https://learning-fixture.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_fixture' } }));
  await context.route('https://learning-fixture.supabase.co/**', api.route);
  await context.addInitScript(() => {
    if (location.origin === 'null') return;
    localStorage.setItem('ielts-v2-store', JSON.stringify({ mascotMuted: true, theme: 'dark', lang: 'en' }));
    localStorage.setItem('ielts-v2-store:supabase:11111111-1111-4111-8111-111111111111', JSON.stringify({ mascotMuted: true, theme: 'dark', lang: 'en' }));
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/#/login');
    await page.locator('[name="email"]').fill('learner@example.com'); await page.locator('[name="password"]').fill('test-password');
    await expect(page.locator('#auth-form [type="submit"]')).toBeEnabled();
    await page.locator('#auth-form [type="submit"]').click();
    await expect(page.locator('[data-daily-streak] strong')).toHaveText('3'); // login does not count
    await page.goto(base + '/#/roadmap');
    await expect(page.locator('.diagnostic-gate-banner')).toBeVisible();
    await page.evaluate(() => {
      const key = 'ielts-v2-store:supabase:11111111-1111-4111-8111-111111111111';
      const store = JSON.parse(localStorage.getItem(key) || '{}');
      store.selectedTest = 'test1';
      store.attempts = [['listening', 6], ['reading', 5.5], ['writing', 6.5], ['speaking', 6]].map(([section, band], index) => ({ section, band, test: 'test1', date: Date.now() + index }));
      store.cloudSynced = Object.fromEntries(store.attempts.map(attempt => [window.IELTS_CLOUD.sectionKey(attempt), window.IELTS_CLOUD.fingerprint(attempt)]));
      localStorage.setItem(key, JSON.stringify(store));
    });
    await page.reload();
    await expect(page.locator('.roadmap-path-item')).toHaveCount(10);
    await expect(page.locator('.daily-quest-card')).toHaveCount(4);
    await page.locator('[data-start-drill="reading"]').click();
    await expect(page.locator('.reading-passage-card')).toBeVisible();
    await page.locator('[data-reading-token="key"]').click();
    await page.locator('[data-reading-token="distractor"]').click();
    await page.locator('[data-reading-submit]').click();
    await expect(page.locator('.drill-sync-state.is-synced')).toBeVisible();
    await expect(page.locator('.drill-result-score strong')).toContainText('100');
    await expect.poll(async () => page.evaluate(() => window.IELTS_CLOUD.getState().profile.current_streak)).toBe(4);
    await page.goto(base + '/#/roadmap');
    await expect(page.locator('.daily-quest-card.is-complete')).toHaveCount(1);
    await page.locator('.roadmap-path-node:not(:disabled)').click(); await page.locator('#lesson-tab-play').click();
    await page.locator('[data-game-start="word_match"]').click();
    await page.locator('[data-match-card="0-w"]').focus();
    await page.evaluate(() => window.IELTS_CLOUD.loadProfile(true));
    await expect(page.locator('[data-match-card="0-w"]')).toBeFocused();
    await expect(page.locator('[data-daily-streak] strong')).toHaveText('4');
    for (let i = 0; i < 5; i++) {
      await page.locator(`[data-match-card="${i}-w"]`).click(); await page.locator(`[data-match-card="${i}-m"]`).click();
      if (i < 4) await expect(page.locator('.match-card.is-matched')).toHaveCount((i + 1) * 2);
    }
    await expect(page.locator('.game-result-coins')).toContainText('+10');
    await expect(page.locator('[data-daily-streak] strong')).toHaveText('4');
    await expect(page.locator('[data-coin-wallet] strong')).toHaveText('1,260');
    await page.locator('[data-game-quiz]').click();
    const answers = records[0].quizKeys;
    for (let i = 0; i < answers.length; i++) {
      if (typeof answers[i] === 'number') await page.locator(`[data-roadmap-choice="${i}"][value="${answers[i]}"]`).check();
      else await page.locator(`[data-roadmap-answer="${i}"]`).fill(String(answers[i]));
    }
    await page.locator('[data-roadmap-submit]').click();
    await expect(page.locator('.roadmap-quiz-result')).toContainText('100%');
    await expect(page.locator('[data-coin-wallet] strong')).toHaveText('1,270');
    await expect(page.locator('[data-daily-streak] strong')).toHaveText('4');
    await expect(page.locator('.roadmap-path-node:disabled')).toHaveCount(8);
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await screenshot(page, 'roadmap-account-desktop');
    await page.goto(base + '/#/leaderboard');
    await expect(page.locator('.leaderboard-row.is-you')).toContainText('1,270');
    await expect(page.locator('.leaderboard-row.is-you .leaderboard-streak')).toContainText('4');
    await page.goto(base + '/#/roadmap');
    await page.setViewportSize({ width: 320, height: 740 }); await overflow(page);
    await expect(page.locator('[data-coin-wallet]')).toBeVisible(); await expect(page.locator('[data-daily-streak]')).toBeVisible();
    await screenshot(page, 'roadmap-account-mobile');
    await page.reload(); // actual SDK restores and verifies the cached session
    await expect(page.locator('[data-daily-streak] strong')).toHaveText('4');
    await expect(page.locator('.roadmap-path-node:disabled')).toHaveCount(8);
    assert.equal(api.requests.filter(request => request.path.endsWith('/submit_topic_game')).length, 1);
    assert.equal(api.requests.filter(request => request.path.endsWith('/submit_topic_quiz')).length, 1);
    assert.deepEqual(errors, []);
    log('browser + real SQL + real SDK: login, game +10, daily 3→4, quiz +10, next lesson unlock, leaderboard, mobile wallet and session reload');
  } catch (error) {
    console.error('SQL fixture errors:', api.errors);
    console.error('Learning state:', await page.evaluate(() => ({ profile: window.IELTS_CLOUD?.getState().profile, streak: currentStreak(), localProfile: store.user && { coins: store.user.coins, current_streak: store.user.current_streak, last_active_date: store.user.last_active_date } })).catch(() => null));
    throw error;
  } finally { try { await context.close(); } finally { await api.db.close(); } }
}

(async () => {
  const args = ['--no-sandbox', '--disable-dev-shm-usage', ...JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS || '[]')];
  // Fresh browser per flow also supports minimal single-process Chromium.
  const flows = process.argv.includes('--account') ? [accountFlow] : process.argv.includes('--guest') ? [guestFlow] : [guestFlow, accountFlow];
  for (const flow of flows) {
    const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}), args });
    try { await flow(browser); }
    finally { if (browser.isConnected()) await browser.close(); }
  }
  console.log('LEARNING BROWSER TESTS OK ✓');
})().catch(error => { console.error(error); process.exitCode = 1; });
