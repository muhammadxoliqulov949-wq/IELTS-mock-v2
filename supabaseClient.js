export { SKILLS, sectionKey, sectionPayload, fingerprint, rowsToAttempts } from './lib/mockResults.js';
import { createClient } from '@supabase/supabase-js';

let client = null;
let status = 'loading';
let currentUser = null;
let errorMessage = '';
let oauthError = '';
let authRevision = 0;
/* The signed-in user's public.profiles row. `role` decides what the UI shows;
   it never decides access on its own — every admin query is re-checked by
   row level security in Postgres. */
let profile = null;
let profileLoadedFor = null;
let profileTask = null;
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn(getState()));

export function getState() {
  return {
    status, user: currentUser, error: errorMessage, oauthError,
    profile, isAdmin: !!(profile && profile.role === 'admin')
  };
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export const ready = (async () => {
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || 'Supabase configuration could not be loaded.');
    if (!config.configured) { status = 'disabled'; return; }
    client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
    });
    // Do not await other Supabase calls inside an auth callback (SDK lock).
    client.auth.onAuthStateChange((_event, session) => {
      if (_event === 'INITIAL_SESSION') return; // restored identity is verified below
      authRevision++;
      const nextUser = session?.user || null;
      if (currentUser?.id !== nextUser?.id) { profile = null; profileLoadedFor = null; profileTask = null; }
      currentUser = nextUser;
      setTimeout(emit, 0);
    });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session) {
      const revision = authRevision;
      const verified = await client.auth.getUser();
      if (revision === authRevision) {
        if (verified.error && [401, 403].includes(verified.error.status)) {
          // A revoked/expired cached session must not permanently block login.
          await client.auth.signOut({ scope: 'local' });
          currentUser = null;
        } else if (verified.error) throw verified.error;
        else currentUser = verified.data.user;
      }
    }
    // getSession() above awaited _initialize(), so a Google/PKCE ?code= in the
    // URL has already been exchanged for a session by this point.
    oauthError = consumeOAuthReturnUrl();
    status = 'ready';
    if (currentUser) {
      const owner = currentUser.id, revision = authRevision;
      let loaded = null;
      try { loaded = await readProfile(client); } catch { /* Keep auth usable if profile setup is missing. */ }
      if (currentUser?.id === owner && authRevision === revision) { profile = loaded; profileLoadedFor = owner; }
      emit();
    }
  } catch (error) {
    status = 'error';
    errorMessage = error.message || 'Supabase initialization failed.';
  }
})();

async function requireClient() {
  await ready;
  if (status !== 'ready' || !client) throw new Error(errorMessage || 'Supabase is not configured.');
  return client;
}

/* Reads and removes the one-time OAuth parameters Supabase appends when it
 * sends the user back to this site:
 *   ?code=…  — exchanged by the SDK into a session (already consumed by now)
 *   ?error=… — Google or Supabase refused the sign-in (user pressed Cancel,
 *              provider disabled, expired email link) — returned to the app
 *               so it can explain what happened instead of failing silently.
 * Removing them keeps a refresh, a shared link or the back button from
 * replaying a one-time code or a stale error. */
function consumeOAuthReturnUrl() {
  try {
    if (typeof window === 'undefined' || !window.location) return '';
    const url = new URL(window.location.href);
    const oauthKeys = ['code', 'sb_flow_id', 'error', 'error_code', 'error_description'];
    if (!oauthKeys.some(key => url.searchParams.has(key))) return '';
    const error = url.searchParams.get('error_description') || url.searchParams.get('error') || '';
    for (const key of oauthKeys) url.searchParams.delete(key);
    if (window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState(window.history.state || {}, '', url.pathname + url.search + url.hash);
    }
    return error ? String(error) : '';
  } catch { return ''; } // best-effort: cleaning the URL must never block sign-in
}

/* One read of the current user's profile row. Takes the client explicitly so
   it can also run from inside `ready` — calling requireClient() there would
   await `ready` while `ready` is still running, i.e. deadlock. */
async function readProfile(sb) {
  const owner = currentUser?.id;
  if (!owner) return null;
  // Login can reset an expired streak, but cannot create activity or earn a
  // day. Missing RPC/columns are tolerated during a rolling DB deployment.
  const streak = await sb.rpc('update_daily_streak');
  if (streak.error && !['PGRST202', '42883'].includes(streak.error.code)) throw streak.error;
  let result = await sb.from('profiles')
    .select('id,email,name,avatar_url,role,coins,current_streak,last_active_date,created_at')
    .eq('id', owner).maybeSingle();
  if (result.error && /current_streak|last_active_date|coins/i.test(String(result.error.message || ''))) {
    result = await sb.from('profiles')
      .select('id,email,name,avatar_url,role,coins,created_at').eq('id', owner).maybeSingle();
    if (result.error && /coins/i.test(String(result.error.message || ''))) {
      result = await sb.from('profiles')
        .select('id,email,name,avatar_url,role,created_at').eq('id', owner).maybeSingle();
    }
  }
  if (result.error) throw result.error;
  if (currentUser?.id !== owner) throw new Error('Account changed.');
  return result.data ? { coins: 0, current_streak: 0, last_active_date: null, ...result.data } : null;
}

/* Read (and cache) the current user's profile row. A missing row means the
   admin migration has not been run yet — a normal state, not an error: the
   app keeps working with `profile: null`. */
export async function loadProfile(force) {
  if (!currentUser) { profile = null; profileLoadedFor = null; emit(); return null; }
  const owner = currentUser.id, revision = authRevision;
  if (!force && profileLoadedFor === owner) return profile;
  if (!force && profileTask?.owner === owner) return profileTask.promise;
  const task = { owner, promise: null };
  task.promise = (async () => {
    let loaded = null;
    try { loaded = await readProfile(await requireClient()); }
    catch {
      // Offline/transient reads must not erase a known wallet or streak.
      loaded = profile?.id === owner ? profile : null;
    }
    if (currentUser?.id !== owner || authRevision !== revision) return null;
    // A newer forced refresh may already contain a just-earned reward.
    if (profileTask !== task) return profile;
    profile = loaded; profileLoadedFor = owner;
    emit();
    return profile;
  })();
  profileTask = task;
  try { return await task.promise; }
  finally { if (profileTask === task) profileTask = null; }
}

export async function authenticate({ mode, email, password, name }) {
  const sb = await requireClient();
  const result = mode === 'signup'
    ? await sb.auth.signUp({ email, password, options: {
      data: { name }, emailRedirectTo: window.location.origin + '/'
    } })
    : await sb.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  if (result.data.session) currentUser = result.data.user;
  if (currentUser) await loadProfile();
  return result.data;
}

/* Google OAuth. The SDK builds the Supabase authorize URL (PKCE code
 * challenge included) and sends the browser to Google; Google comes back to
 * `redirectTo`, where the ?code= is exchanged for a session on that page load
 * (detectSessionInUrl). redirectTo must be listed in Supabase's redirect
 * allow-list — window.location.origin keeps it identical on every host. */
export async function googleSignIn() {
  const sb = await requireClient();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function logout() {
  const sb = await requireClient();
  const { error } = await sb.auth.signOut({ scope: 'local' });
  if (error) throw error;
  currentUser = null;
  profile = null;
  emit();
}

export async function saveMockSection(payload, owner) {
  const sb = await requireClient();
  const verified = await sb.auth.getUser();
  if (verified.error) throw verified.error;
  if (!verified.data.user || verified.data.user.id !== owner || currentUser?.id !== owner) {
    throw new Error('Account changed. Please sign in again.');
  }
  // Ownership comes from auth.uid() in SQL, never from a supplied email/user ID.
  const { error } = await sb.rpc('save_mock_section', { ...payload, p_owner: verified.data.user.id });
  if (error) throw error;
  if (currentUser?.id !== owner) throw new Error('Account changed. Please sign in again.');
  await loadProfile(true); // fresh scored mocks also complete the daily goal
}

export async function loadMockResults() {
  const sb = await requireClient();
  if (!currentUser) return [];
  const owner = currentUser.id;
  const { data, error } = await sb.from('mock_results')
    .select('id,user_id,name,test_id,scores,listening,reading,writing,speaking,overall_band,created_at,updated_at')
    .eq('user_id', owner).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ---------------- Roadmap + gamification ----------------
 * Topic answer keys never cross the wire: submitTopicQuiz sends only the
 * learner's five choices to a SECURITY DEFINER RPC, which grades and awards
 * coins atomically in PostgreSQL. */
export async function loadRoadmap() {
  const sb = await requireClient();
  if (!currentUser) throw new Error('Sign in to save roadmap progress.');
  const owner = currentUser.id;
  const [topics, progress, games] = await Promise.all([
    sb.from('topics')
      .select('id,stage,title,summary,ai_prompt,questions,reward_coins,order_index,game_data')
      .order('stage').order('order_index'),
    sb.from('user_topic_progress')
      .select('topic_id,score_percentage,is_completed,updated_at')
      .eq('user_id', owner),
    sb.from('user_game_progress')
      .select('topic_id,game_type,best_score,is_completed,attempt_count,last_played_at,last_reward_date')
      .eq('user_id', owner)
  ]);
  if (topics.error) throw topics.error;
  if (progress.error) throw progress.error;
  if (games.error) throw games.error;
  if (!currentUser || currentUser.id !== owner) throw new Error('Account changed. Please reload the roadmap.');
  return { topics: topics.data || [], progress: progress.data || [], games: games.data || [] };
}

export async function submitRoadmapQuiz(topicId, answers) {
  const sb = await requireClient();
  if (!currentUser) throw new Error('Sign in to save roadmap progress.');
  const owner = currentUser.id;
  const verified = await sb.auth.getUser();
  if (verified.error) throw verified.error;
  if (!verified.data.user || verified.data.user.id !== owner || currentUser?.id !== owner) {
    throw new Error('Account changed. Please sign in again.');
  }
  if (!Array.isArray(answers) || answers.length !== 5) throw new Error('Answer all five questions.');
  const { data, error } = await sb.rpc('submit_topic_quiz', {
    p_topic_id: String(topicId || ''),
    p_answers: answers.map(answer => String(answer ?? ''))
  });
  if (error) throw error;
  if (currentUser?.id !== owner) throw new Error('Account changed. Please sign in again.');
  await loadProfile(true);
  return data || {};
}

// The JWT owner is rechecked by every SECURITY DEFINER RPC. Pin the local
// identity/revision too, so a late game response never affects a new account.
async function learnerRPC(name, payload) {
  const sb = await requireClient();
  const owner = currentUser?.id, revision = authRevision;
  if (!owner) throw new Error('Sign in to save learning progress.');
  const { data, error } = await sb.rpc(name, payload);
  if (error) throw error;
  if (currentUser?.id !== owner || authRevision !== revision) throw new Error('Account changed. Please sign in again.');
  return data || {};
}
export async function startTopicGame(topicId, gameType) {
  if (!['word_match', 'speed_vocabulary', 'sentence_scramble'].includes(gameType)) throw new Error('Unsupported mini-game.');
  return learnerRPC('start_topic_game', { p_topic_id: String(topicId || ''), p_game_type: gameType });
}
export async function answerSpeedQuestion(sessionId, questionIndex, choice) {
  if (!Number.isInteger(questionIndex) || questionIndex < 0 || !Number.isInteger(choice) || choice < 0 || choice > 2) throw new Error('Invalid speed answer.');
  return learnerRPC('answer_speed_question', { p_session_id: sessionId, p_question_index: questionIndex, p_choice: choice });
}
export async function submitTopicGame(sessionId, answers) {
  const owner = currentUser?.id;
  const result = await learnerRPC('submit_topic_game', { p_session_id: sessionId, p_answers: answers });
  await loadProfile(true);
  if (currentUser?.id !== owner) throw new Error('Account changed. Please sign in again.');
  return result;
}
export async function refreshDailyStreak() {
  const result = await learnerRPC('update_daily_streak');
  if (profile && profile.id === currentUser?.id) {
    profile = { ...profile, current_streak: result.current_streak, last_active_date: result.last_active_date };
    emit();
  }
  return result;
}

/* Adaptive drill results are stored as owner-scoped learning_activity rows.
   The server derives the UTC day and verifies the skill, tier, score and time. */
export async function recordAdaptiveDrill({ reference, skill, tier, score, durationSeconds }) {
  const owner = currentUser?.id;
  if (!owner) throw new Error('Sign in to save adaptive drills.');
  if (!/^[A-Za-z0-9:_-]{8,80}$/.test(String(reference || ''))) throw new Error('Invalid drill reference.');
  if (!['listening', 'reading', 'writing', 'speaking'].includes(skill)) throw new Error('Invalid drill skill.');
  if (![1, 2, 3].includes(Number(tier))) throw new Error('Invalid adaptive tier.');
  if (!Number.isInteger(Number(score)) || Number(score) < 0 || Number(score) > 100) throw new Error('Invalid drill score.');
  if (!Number.isInteger(Number(durationSeconds)) || Number(durationSeconds) < 0 || Number(durationSeconds) > 3600) throw new Error('Invalid drill duration.');
  const result = await learnerRPC('record_adaptive_drill', {
    p_reference: String(reference),
    p_skill: skill,
    p_tier: Number(tier),
    p_score: Number(score),
    p_duration_seconds: Number(durationSeconds)
  });
  if (currentUser?.id !== owner) throw new Error('Account changed. Please sign in again.');
  await loadProfile(true);
  if (currentUser?.id !== owner) throw new Error('Account changed. Please sign in again.');
  return result;
}

export async function loadLearningActivity(days = 180) {
  const sb = await requireClient();
  if (!currentUser) return [];
  const owner = currentUser.id;
  const age = Math.max(7, Math.min(365, Number(days) || 180));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - age);
  const { data, error } = await sb.from('learning_activity')
    .select('activity_date,kind,reference,created_at,skill,score,duration_seconds,tier')
    .eq('user_id', owner)
    .gte('activity_date', since.toISOString().slice(0, 10))
    .order('activity_date', { ascending: false })
    .limit(500);
  if (error) throw error;
  if (currentUser?.id !== owner) throw new Error('Account changed. Please reload your activity.');
  return data || [];
}

/* Server derives the reward from the completed topic or saved mock result;
   the client deliberately has no p_amount parameter. */
export async function addUserCoins(source, reference) {
  const sb = await requireClient();
  if (!currentUser) throw new Error('Sign in to earn coins.');
  const owner = currentUser.id;
  const { data, error } = await sb.rpc('add_user_coins', {
    p_source: String(source || ''),
    p_reference: String(reference || '')
  });
  if (error) throw error;
  if (currentUser?.id !== owner) throw new Error('Account changed. Please sign in again.');
  return data || {};
}

export async function loadLeaderboard(limit = 100) {
  const sb = await requireClient();
  if (!currentUser) throw new Error('Sign in to view the leaderboard.');
  const owner = currentUser.id;
  const { data, error } = await sb.rpc('get_leaderboard', { p_limit: limit });
  if (error) throw error;
  if (!currentUser || currentUser.id !== owner) throw new Error('Account changed. Please reload the leaderboard.');
  return data || [];
}

/* ================= ADMIN =================
 * Every function here is callable by any signed-in user — that is the point.
 * Postgres row level security is what actually refuses a non-admin (each
 * admin policy routes through public.is_admin()), so a hand-crafted request
 * from the console gets the same answer as the UI.
 *
 * The client-side role check below exists only to fail fast with a clear
 * message; it is never the thing protecting the data.
 * ========================================= */
async function requireAdminClient() {
  const sb = await requireClient();
  if (!currentUser) throw new Error('Sign in first.');
  if (!profile || profile.role !== 'admin') throw new Error('Admin access required.');
  return sb;
}

/* The signed-in user's access token. The AI generator endpoint needs it to
   upload generated Listening audio into the public "ielts-media" bucket
   under the admin's own identity — the storage policies (only admins may
   write) then apply exactly as they do for a browser upload. */
export async function getAccessToken() {
  const sb = await requireClient();
  if (!currentUser) return '';
  try {
    const { data } = await sb.auth.getSession();
    return (data && data.session && data.session.access_token) || '';
  } catch { return ''; }
}

/* Overview cards — aggregated in Postgres by public.admin_stats(). */
export async function adminStats() {
  const sb = await requireAdminClient();
  const { data, error } = await sb.rpc('admin_stats');
  if (error) throw error;
  return data || {};
}

/* Users table. `search` matches email or name; newest first. */
export async function adminListProfiles({ search = '', limit = 200 } = {}) {
  const sb = await requireAdminClient();
  let query = sb.from('profiles')
    .select('id,email,name,avatar_url,role,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  const q = String(search || '').trim();
  if (q) query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/* Submissions table. Profiles are merged in on the client because
   mock_results.user_id points at auth.users, which the client cannot read. */
export async function adminListSubmissions({ search = '', limit = 300 } = {}) {
  const sb = await requireAdminClient();
  const [results, people] = await Promise.all([
    (async () => {
      let query = sb.from('mock_results')
        .select('id,user_id,name,test_id,listening,reading,writing,speaking,overall_band,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);
      const q = String(search || '').trim();
      if (q) query = query.or(`name.ilike.%${q}%,test_id.ilike.%${q}%`);
      return query;
    })(),
    sb.from('profiles').select('id,email,name,avatar_url').limit(500)
  ]);
  if (results.error) throw results.error;
  if (people.error) throw people.error;
  const byId = new Map((people.data || []).map(p => [p.id, p]));
  return (results.data || []).map(r => ({ ...r, profile: byId.get(r.user_id) || null }));
}

export async function adminDeleteSubmission(id) {
  const sb = await requireAdminClient();
  const { error } = await sb.from('mock_results').delete().eq('id', id);
  if (error) throw error;
}

export async function adminSetRole(userId, role) {
  const sb = await requireAdminClient();
  const { error } = await sb.rpc('admin_set_role', { p_user_id: userId, p_role: role });
  if (error) throw error;
  if (userId === currentUser.id) await loadProfile();
}

export async function adminDeleteUser(userId) {
  const sb = await requireAdminClient();
  const { error } = await sb.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw error;
}

/* ---------------- Test content CRUD ---------------- */
export async function adminListTests() {
  const sb = await requireAdminClient();
  const [rows, meta] = await Promise.all([
    sb.from('mock_tests')
      .select('id,test_id,skill,title,payload,is_published,position,created_by,created_at,updated_at')
      .order('test_id').order('skill'),
    sb.from('mock_test_meta').select('test_id,label,label_uz,difficulty,is_published,position').order('position')
  ]);
  if (rows.error) throw rows.error;
  if (meta.error) throw meta.error;
  return { rows: rows.data || [], meta: meta.data || [] };
}

export async function adminSaveTest(row) {
  const sb = await requireAdminClient();
  const payload = {
    test_id: row.test_id,
    skill: row.skill,
    title: row.title,
    payload: row.payload,
    is_published: !!row.is_published,
    position: Number(row.position) || 100,
    created_by: currentUser.id,
    updated_at: new Date().toISOString()
  };
  if (row.id) payload.id = row.id;
  const { data, error } = await sb.from('mock_tests')
    .upsert(payload, { onConflict: 'test_id,skill' }).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteTest(testId, skill) {
  const sb = await requireAdminClient();
  const { error } = await sb.from('mock_tests').delete().eq('test_id', testId).eq('skill', skill);
  if (error) throw error;
}

export async function adminSaveTestMeta(meta) {
  const sb = await requireAdminClient();
  const { data, error } = await sb.from('mock_test_meta')
    .upsert({
      test_id: meta.test_id,
      label: meta.label,
      label_uz: meta.label_uz || null,
      difficulty: meta.difficulty || null,
      is_published: !!meta.is_published,
      position: Number(meta.position) || 100,
      updated_at: new Date().toISOString()
    }, { onConflict: 'test_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteTestMeta(testId) {
  const sb = await requireAdminClient();
  // Remove the content blocks first so no orphan rows are left behind.
  const { error: contentError } = await sb.from('mock_tests').delete().eq('test_id', testId);
  if (contentError) throw contentError;
  const { error } = await sb.from('mock_test_meta').delete().eq('test_id', testId);
  if (error) throw error;
}

/* ---------------- Media uploads (Supabase Storage) ----------------
 * Listening MP3s, Writing Task 1 charts and map/plan images live in the
 * public "ielts-media" bucket. The browser uploads with the anon key and
 * the storage policies (202610050002_media_storage.sql) are the real gate:
 * only public.is_admin() may write, everybody may read.
 * ========================================= */
export const MEDIA_BUCKET = 'ielts-media';

function safeExt(file) {
  const fromName = String(file && file.name ? file.name.split('.').pop() : '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 5) return fromName;
  const mime = String((file && file.type) || '');
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'bin';
}

/* Upload one file and return { url, path }. `folder` groups files inside the
   bucket ('audio' for listening parts, 'images' for writing/maps); `label`
   keeps names human-readable (e.g. 'test5-listening-part1'). */
export async function adminUploadMedia(file, { folder = 'media', label = '' } = {}) {
  const sb = await requireAdminClient();
  if (!file) throw new Error('No file selected.');
  if (file.size > 50 * 1024 * 1024) throw new Error('The file is larger than the 50 MB limit.');
  const cleanLabel = String(label || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const cleanFolder = ['audio', 'images'].includes(folder) ? folder : 'media';
  const path = `${cleanFolder}/${cleanLabel ? cleanLabel + '-' : ''}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt(file)}`;
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined
  });
  if (error) throw error;
  const { data } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/* Delete a media object by its storage path or by its public URL, so
   replacing a file in the editor does not leave orphans behind. */
export async function adminRemoveMedia(pathOrUrl) {
  const sb = await requireAdminClient();
  let path = String(pathOrUrl || '');
  const marker = `/${MEDIA_BUCKET}/`;
  const at = path.indexOf(marker);
  if (at >= 0) path = path.slice(at + marker.length).split('?')[0];
  path = decodeURIComponent(path).replace(/^\/+/, '');
  if (!path) return;
  const { error } = await sb.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}

/* ---------------- Published content for learners ----------------
 * Not an admin call: any signed-in learner may read published tests.
 * Used at boot to register admin-authored tests into IELTS_CONTENT. */
export async function loadPublishedTests() {
  const sb = await requireClient();
  const { data, error } = await sb.from('mock_tests')
    .select('test_id,skill,title,payload,position')
    .eq('is_published', true)
    .order('test_id');
  if (error) throw error;
  const { data: metaRows, error: metaError } = await sb.from('mock_test_meta')
    .select('test_id,label,label_uz,difficulty,position')
    .eq('is_published', true)
    .order('position');
  if (metaError) throw metaError;
  return { rows: data || [], meta: metaRows || [] };
}
