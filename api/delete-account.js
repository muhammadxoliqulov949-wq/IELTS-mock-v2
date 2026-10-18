'use strict';
/* Permanent account deletion (Vercel serverless function).
 *
 * POST /api/delete-account
 *   header: Authorization: Bearer <the signed-in user's access token>
 *   body:   { confirm: true } (optional; the UI only sends it after the
 *            learner has confirmed the dialog a second time)
 *
 * Responses:
 *   200 { ok: true, deleted: true, userId, cleared: [...] } — account is gone
 *   401 { error } — no token, or the token is expired/invalid/revoked
 *   405 { error } — anything but POST
 *   429 { error } — too many attempts from one IP
 *   503 { error } — SUPABASE_URL / SUPABASE_ANON_KEY / SERVICE_ROLE_KEY missing
 *   500 { error } — Supabase refused the deletion
 *
 * How it works
 *   1. The identity comes from the caller's own JWT: `auth.getUser(token)`
 *      asks Supabase Auth who the token belongs to. The request body can
 *      never name a user — a token can only delete its own owner.
 *   2. A second client built with SUPABASE_SERVICE_ROLE_KEY (admin, server
 *      side only — it never reaches the browser) sweeps every table that
 *      stores rows for that learner.
 *   3. `auth.admin.deleteUser()` removes the auth user itself. The FK
 *      cascades in the migrations finish off anything a table sweep missed.
 *
 * The service-role key lives only in the server environment; every failure
 * is answered with the same shape as the other API routes.
 */
const { createClient } = require('@supabase/supabase-js');

/* Every table that stores rows for one learner, children before parents.
 * `mock_results`, `profiles`, `user_topic_progress`, `coin_transactions`,
 * `learning_activity`, `user_game_progress` and `topic_game_sessions` all
 * carry a user_id column (profiles uses its primary key `id`).
 * Deleting the auth user already cascades to these rows, but listing them
 * keeps the endpoint explicit: nothing is left behind even if a future
 * migration forgets `on delete cascade`. */
const OWNED_TABLES = [
  ['mock_results', 'user_id'],
  ['topic_game_sessions', 'user_id'],
  ['user_game_progress', 'user_id'],
  ['learning_activity', 'user_id'],
  ['user_topic_progress', 'user_id'],
  ['coin_transactions', 'user_id'],
  ['profiles', 'id']
];

/* A table from a migration that has not been applied yet (42P01 = undefined
 * table, PGRST205 = unknown table in PostgREST's schema cache) must not stop
 * somebody from deleting their account. */
const MISSING_TABLE = /42P01|PGRST205|does not exist|schema cache/i;

/* ---------- per-IP rate limiter: 5/min — shared helper (lib/rateLimit.js) ---------- */
const rateLimit = require('../lib/rateLimit.js');
const limiter = rateLimit.createRateLimiter('delete-account', { windowMs: 60 * 1000, max: 5 });

function serverConfig() {
  return {
    url: String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''),
    anon: String(process.env.SUPABASE_ANON_KEY || '').trim(),
    serviceRole: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  };
}

/** `Authorization: Bearer <jwt>` → the raw JWT (or ''). */
function bearerToken(req) {
  const header = String((req.headers && req.headers.authorization) || '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : '';
}

/* A client per role: the learner's token is only ever used to *read* the
   identity, and the service-role client is only ever used server side.
   Sessions/refresh are off — a serverless call has no browser storage. */
function authOptions() {
  return { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    if (await limiter.check(req)) { res.status(429).json({ error: 'Too many attempts. Wait a minute and try again.' }); return; }

    const { url, anon, serviceRole } = serverConfig();
    if (!url || !anon) {
      res.status(503).json({ error: 'Supabase is not configured on the server. Account deletion is unavailable.' });
      return;
    }
    if (!serviceRole) {
      res.status(503).json({ error: 'Set SUPABASE_SERVICE_ROLE_KEY on the server to enable account deletion.' });
      return;
    }

    const token = bearerToken(req);
    if (!token) { res.status(401).json({ error: 'Sign in again before deleting your account.' }); return; }

    /* 1. Who is calling? Only the JWT decides — never the request body. */
    const userClient = createClient(url, anon, authOptions());
    const { data: identity, error: authError } = await userClient.auth.getUser(token);
    if (authError || !identity || !identity.user || !identity.user.id) {
      res.status(401).json({ error: 'Your session has expired. Sign in again to delete your account.' });
      return;
    }
    const userId = identity.user.id;

    /* 2. Sweep the learner's rows. */
    const admin = createClient(url, serviceRole, authOptions());
    const cleared = [];
    const warnings = [];
    for (const [table, column] of OWNED_TABLES) {
      try {
        const { error } = await admin.from(table).delete().eq(column, userId);
        if (error) {
          const missing = MISSING_TABLE.test(String(error.code || '') + ' ' + String(error.message || ''));
          if (!missing) warnings.push(`${table}: ${error.message || error.code || 'delete failed'}`);
        } else {
          cleared.push(table);
        }
      } catch (err) {
        warnings.push(`${table}: ${err.message || 'delete failed'}`);
      }
    }

    /* 3. Remove the auth user. Permanent (`shouldSoftDelete: false`), which is
          what "delete my account" means: email and password are gone too and
          the same address can sign up again as a fresh learner. */
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId, false);
    if (deleteError) {
      res.status(500).json({
        error: deleteError.message || 'Supabase could not delete this account. Try again shortly.',
        cleared,
        warnings
      });
      return;
    }

    res.json({ ok: true, deleted: true, userId, cleared, warnings });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Account deletion failed.' });
  }
};

/* exposed for tests */
module.exports.OWNED_TABLES = OWNED_TABLES;
module.exports._ipHits = limiter._ipHits;
