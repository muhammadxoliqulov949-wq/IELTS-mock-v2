-- ============================================================
-- AI response cache with a 7-day TTL  (public.ai_cache)
--
-- Run this in the Supabase SQL Editor after
--   202610050001_admin.sql  and  202610060001_roadmap_gamification.sql.
-- It is independent of both — no foreign keys, no triggers.
--
-- The API helper (lib/aiCache.js) does the whole dance:
--   1. sha256 of the cleaned question            -> prompt_hash
--   2. select the row; if now() - created_at < interval '7 days'
--      the stored response_json is returned and Gemini is never called
--   3. otherwise Gemini answers and the row is UPSERTED, so the old
--      entry is refreshed and its 7-day window starts again
-- ============================================================

create table if not exists public.ai_cache (
  id            uuid primary key default gen_random_uuid(),
  prompt_hash   text not null,
  response_json jsonb not null,
  created_at    timestamptz not null default now()
);

-- One cached answer per question. The API relies on this unique index for
-- its "resolution=merge-duplicates" upsert.
create unique index if not exists ai_cache_prompt_hash_key
  on public.ai_cache (prompt_hash);

-- Keeps the TTL sweep cheap:
--   delete from public.ai_cache where now() - created_at >= interval '7 days';
create index if not exists ai_cache_created_at_idx
  on public.ai_cache (created_at);

-- ------------------------------------------------------------
-- Security: server-side only.
-- RLS is enabled and NO policy is granted on purpose, so anon and
-- authenticated browser clients can neither read nor write the cache.
-- Only the serverless API — which carries SUPABASE_SERVICE_ROLE_KEY —
-- touches this table, and a service-role connection bypasses RLS.
-- That is what stops anyone from poisoning the cache from a browser.
-- ------------------------------------------------------------
alter table public.ai_cache enable row level security;

revoke all on public.ai_cache from anon, authenticated;

comment on table  public.ai_cache            is '7-day TTL cache for Gemini responses; written and read by the serverless API only.';
comment on column public.ai_cache.prompt_hash is 'sha256 of the cleaned user question; unique, upserted by the API.';
comment on column public.ai_cache.response_json is 'The exact JSON payload the API would otherwise have asked Gemini for.';
comment on column public.ai_cache.created_at  is 'Write time. Rows older than 7 days are treated as expired and refreshed on the next request.';
