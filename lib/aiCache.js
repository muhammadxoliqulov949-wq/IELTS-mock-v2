'use strict';
/* ===================================================================
 * 7-day TTL response cache for the Groq calls (public.ai_cache)
 * -------------------------------------------------------------------
 * Why: identical questions ("How do I start Writing Task 1?", the same
 * graded Task 2 answer, the same coach message) were hitting Groq every
 * single time — slow for the user and wasteful for the free API quota.
 * The migration supabase/migrations/202610060002_ai_cache.sql creates
 * the table; this module is the API-side helper the endpoints call
 * *instead of* calling Groq directly.
 *
 * Lifecycle of one cached answer:
 *   1. clean + sha256 the question            → prompt_hash
 *   2. SELECT it; if now() - created_at < 7 days → return the stored
 *      response_json and never call Groq
 *   3. otherwise call Groq, then upsert the row on prompt_hash so the
 *      old entry is refreshed (its created_at moves forward, which is
 *      exactly the 7-day TTL restarting)
 *
 * Design notes:
 *   • RLS on ai_cache grants nothing to anon/authenticated — only the
 *     serverless function, carrying SUPABASE_SERVICE_ROLE_KEY, reads and
 *     writes. That keeps the cache unpoisonable from a browser.
 *   • Everything is fail-open: no table, no key, or any REST error simply
 *     means "call Groq", never a user-visible failure.
 *   • A small in-memory TTL map mirrors the rows, so local `npm run
 *     preview` (which has no service-role key) still benefits.
 * =================================================================== */
const crypto = require('crypto');

const TABLE = 'ai_cache';
const TTL_DAYS = 7;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
const MEMORY_MAX = 200;

/* Same normalisation as lib/aiGuardrails.js so the same words always
   hash to the same row, whatever the punctuation or the capitalisation. */
function cleanPrompt(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[‘’“”`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** sha256 of the cleaned question — the unique cache key. */
function hashPrompt(text) {
  return crypto.createHash('sha256').update(cleanPrompt(text)).digest('hex');
}

/** now() - created_at < interval '7 days', in JS. */
function isFresh(createdAt, now) {
  const stamp = Date.parse(createdAt || '');
  return Number.isFinite(stamp) ? (now || Date.now()) - stamp < TTL_MS : false;
}

/** The interval literal the docs/SQL use, kept here so the two never drift. */
function ttlInterval() {
  return `interval '${TTL_DAYS} days'`;
}

/* ---------------------------------------------------------------- */
/* Supabase REST — the serverless functions have no supabase-js      */
/* ---------------------------------------------------------------- */
function supabaseConfig() {
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim();
  const key = serviceRole || anon;
  return url && key ? { url, key, serviceRole: !!serviceRole } : null;
}

function authHeaders(config) {
  return { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Cache-Control': 'no-store' };
}

/* ---------------------------------------------------------------- */
/* In-memory mirror (per server instance, same TTL)                  */
/* ---------------------------------------------------------------- */
const memory = new Map();

function memoryGet(hash) {
  const hit = memory.get(hash);
  if (!hit) return null;
  if (!isFresh(hit.created_at)) { memory.delete(hash); return null; }
  return hit;
}

function memorySet(hash, value) {
  memory.set(hash, { response_json: value, created_at: new Date().toISOString() });
  if (memory.size > MEMORY_MAX) {
    /* drop the oldest entry — the map keeps insertion order */
    memory.delete(memory.keys().next().value);
  }
}

/* ---------------------------------------------------------------- */
/* Read / write                                                      */
/* ---------------------------------------------------------------- */

/**
 * @param {string} hash prompt_hash
 * @returns {Promise<{response_json: any, created_at: string}|null>}
 *          the row only when it exists AND is younger than 7 days
 */
async function readCache(hash) {
  const local = memoryGet(hash);
  if (local) return local;

  const config = supabaseConfig();
  if (!config) return null;

  try {
    const url = `${config.url}/rest/v1/${TABLE}`
      + `?prompt_hash=eq.${encodeURIComponent(hash)}`
      + `&select=response_json,created_at&limit=1`;
    const res = await fetch(url, { headers: authHeaders(config) });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => null);
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!row || !isFresh(row.created_at)) return null;
    memorySet(hash, row.response_json);
    return row;
  } catch {
    return null; /* fail open — the caller falls back to Groq */
  }
}

/**
 * Upsert the answer. `resolution=merge-duplicates` refreshes the existing
 * row for this prompt_hash (new created_at = the TTL restarts) instead of
 * failing on the unique index.
 *
 * `value` may be any JSON the API returns — an object (grade, quiz) or a
 * plain string (the Coach reply). jsonb stores both, so the shape the
 * caller gets back is exactly the shape it cached.
 * @returns {Promise<boolean>} whether the row reached the database
 */
async function writeCache(hash, value) {
  if (value === null || value === undefined) return false;
  memorySet(hash, value);

  const config = supabaseConfig();
  if (!config) return false;

  try {
    const res = await fetch(`${config.url}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        ...authHeaders(config),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify([{
        prompt_hash: hash,
        response_json: value,
        created_at: new Date().toISOString()
      }])
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Drop rows past their TTL (housekeeping; safe to call from a cron). */
async function purgeExpired() {
  const config = supabaseConfig();
  if (!config) return 0;
  try {
    const cutoff = new Date(Date.now() - TTL_MS).toISOString();
    const res = await fetch(`${config.url}/rest/v1/${TABLE}?created_at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: authHeaders(config)
    });
    return res.ok ? 1 : 0;
  } catch {
    return 0;
  }
}

/**
 * The helper every AI endpoint calls instead of calling Groq directly.
 *
 * @param {string}   cacheKey the question (or a composed key)
 * @param {() => Promise<any>} produce  calls Groq and returns the parsed answer
 * @returns {Promise<{data: any, fromCache: boolean, hash: string}>}
 */
async function withCache(cacheKey, produce) {
  const hash = hashPrompt(cacheKey);
  const hit = await readCache(hash);
  if (hit) return { data: hit.response_json, fromCache: true, hash };
  const data = await produce();
  await writeCache(hash, data);
  return { data, fromCache: false, hash };
}

module.exports = {
  TABLE,
  TTL_DAYS,
  TTL_MS,
  ttlInterval,
  cleanPrompt,
  hashPrompt,
  isFresh,
  supabaseConfig,
  readCache,
  writeCache,
  purgeExpired,
  withCache,
  /* exposed for tests */
  _memory: memory
};
