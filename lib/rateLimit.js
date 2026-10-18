'use strict';
/* ===================================================================
 * Shared rate limiter for the five API endpoints.
 * -------------------------------------------------------------------
 * Two layers (Task 03.6), exactly one of which decides per request:
 *
 *   1. PERSISTENT (primary): an atomic Postgres counter reached via the
 *      service-role RPC public.rate_limit_hit() — one shared view for
 *      every Vercel instance. Semantics mirror the local limiter:
 *      sliding window, deny-not-recorded, per(endpoint×IP) buckets.
 *      State is SHA-256-hashed — no raw IP or user id ever hits storage.
 *   2. LOCAL (fallback): the original per-instance in-memory Map. It is
 *      still a REAL limiter — when storage is unreachable or the env is
 *      absent (local dev, tests), traffic is throttled per instance.
 *      This is a deliberate DEGRADE, never a silent fail-open: no
 *      request bypasses a limiter because of a storage failure.
 *
 * What is deliberately NOT here: service-role credentials are read
 * from the environment lazily at call time, never exported, never
 * logged, and never shipped to the client.
 * =================================================================== */
const crypto = require('crypto');

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || 'unknown';
}

/* ---------- persistent store (service-role RPC, lazy + optional) ---------- */
let _storeClient = null;      // cached supabase-js client OR false when unavailable
let _storePromise = null;
let _storeKey = '';           // env pair the cached client was built with
let _storeOverride = null;    // test seam: attachStore({ hit }) | null

function storeHit(bucket, ipHash, max, windowMs) {
  if (_storeOverride) return _storeOverride.hit(bucket, ipHash, max, windowMs);
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const envKey = url + '|' + (key ? key.slice(0, 12) : '');
  if (envKey !== _storeKey) { _storeKey = envKey; _storeClient = null; _storePromise = null; }
  if (_storeClient === false) return Promise.reject(new Error('persistent store unavailable'));
  if (!_storePromise) {
    _storePromise = (async () => {
      try {
        if (!url || !key) throw new Error('persistent store not configured');
        const { createClient } = require('@supabase/supabase-js');
        _storeClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        return _storeClient;
      } catch (err) {
        _storeClient = false;
        throw err;
      }
    })();
  }
  return _storePromise.then(async (sb) => {
    const { data, error } = await sb.rpc('rate_limit_hit', {
      p_bucket: bucket, p_id: ipHash, p_max: max, p_window_ms: windowMs
    });
    if (error) throw new Error(error.message || 'rate limit rpc failed');
    if (!data || typeof data.allowed !== 'boolean') throw new Error('rate limit rpc returned no verdict');
    return data.allowed;
  });
}

/* sha256 hex (64 chars) — what public.rate_limit_hit() validates. The
   bucket prefix isolates an IP's digests across endpoints. */
function idHash(bucket, ip) {
  return crypto.createHash('sha256').update(bucket + '|' + String(ip)).digest('hex');
}

/* Test-only seam to pin the persistent path without a database. Passing
   null restores the real lazy store on next call. */
function attachStore(override) {
  _storeOverride = override;
  if (override) { _storeClient = null; _storePromise = null; _storeKey = '?' + Math.random(); }
}

/**
 * Create an isolated sliding-window limiter.
 *
 * @param {string} name      endpoint identifier (kept for inspection/tests)
 * @param {{windowMs: number, max: number}} config
 * @returns {{name: string, windowMs: number, max: number,
 *            limited: (req: any) => boolean,
 *            check: (req: any) => Promise<boolean>,
 *            _ipHits: Map<string, number[]>}}
 *          `limited(req)` — the ORIGINAL sync per-instance decision.
 *          `check(req)`    — async; persistent first, local on any storage
 *                            failure (degrade, never fail-open).
 *          `_ipHits` exposes the internal map for tests (`clear()` between
 *          scenarios) — the local map also backs the degraded path.
 */
function createRateLimiter(name, { windowMs, max } = {}) {
  if (!name || typeof name !== 'string') throw new Error('rate limiter needs a name');
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error('rate limiter needs a positive windowMs');
  if (!Number.isFinite(max) || max <= 0) throw new Error('rate limiter needs a positive max');
  const ipHits = new Map();
  function limited(req) {
    const ip = clientIp(req);
    const now = Date.now();
    const hits = (ipHits.get(ip) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) { ipHits.set(ip, hits); return true; }
    hits.push(now);
    ipHits.set(ip, hits);
    return false;
  }
  async function check(req) {
    try {
      const allowed = await storeHit(name, idHash(name, clientIp(req)), max, windowMs);
      return !allowed;
    } catch {
      /* Storage down/missing → per-instance limiter keeps throttling. */
      return limited(req);
    }
  }
  return { name, windowMs, max, limited, check, _ipHits: ipHits };
}

module.exports = { clientIp, createRateLimiter, attachStore, idHash };
