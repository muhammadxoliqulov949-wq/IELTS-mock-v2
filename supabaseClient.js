export { SKILLS, sectionKey, sectionPayload, fingerprint, rowsToAttempts } from './lib/mockResults.js';
import { createClient } from '@supabase/supabase-js';

let client = null;
let status = 'loading';
let currentUser = null;
let errorMessage = '';
let authRevision = 0;
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn(getState()));

export function getState() { return { status, user: currentUser, error: errorMessage }; }
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
    status = 'ready';
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

export async function authenticate({ mode, email, password, name }) {
  const sb = await requireClient();
  const result = mode === 'signup'
    ? await sb.auth.signUp({ email, password, options: {
      data: { name }, emailRedirectTo: window.location.origin + '/'
    } })
    : await sb.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  if (result.data.session) currentUser = result.data.user;
  return result.data;
}

export async function googleSignIn() {
  const sb = await requireClient();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: window.location.origin + '/' }
  });
  if (error) throw error;
}

export async function logout() {
  const sb = await requireClient();
  const { error } = await sb.auth.signOut({ scope: 'local' });
  if (error) throw error;
  currentUser = null;
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
