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
      currentUser = session?.user || null;
      if (!currentUser) profile = null;
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
      try { profile = await readProfile(client); } catch { profile = null; }
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
  const { data, error } = await sb.from('profiles')
    .select('id,email,name,avatar_url,role,created_at')
    .eq('id', currentUser.id).maybeSingle();
  if (error) throw error;
  return data || null;
}

/* Read (and cache) the current user's profile row. A missing row means the
   admin migration has not been run yet — a normal state, not an error: the
   app keeps working with `profile: null`. */
export async function loadProfile(force) {
  if (!currentUser) { profile = null; emit(); return null; }
  if (!force && profile && profile.id === currentUser.id) return profile;
  try {
    profile = await readProfile(await requireClient());
  } catch {
    profile = null; // profiles table not installed, or RLS refused — stay signed in
  }
  emit();
  return profile;
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
