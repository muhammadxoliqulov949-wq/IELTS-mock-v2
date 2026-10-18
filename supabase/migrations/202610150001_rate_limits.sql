/* Persistent API rate limiting (Task 03.6)
 *
 * Server-only storage for the five API endpoint limiters
 * (/api/grade, /api/coach, /api/quiz, /api/generate-mock, /api/delete-account).
 * The in-process lib/rateLimit.js remains as the local fallback; this table
 * gives every Vercel instance ONE shared, durable view of the counters.
 *
 * Security model — intentionally the strictest in the repo:
 *   • NO direct access for anyone: RLS is on and not a single GRANT exists
 *     on the table. Only the SECURITY DEFINER RPC below (running as the
 *     owner) may read or mutate counters.
 *   • The RPC is executable ONLY by the Supabase-managed `service_role`,
 *     i.e. our Vercel functions via SUPABASE_SERVICE_ROLE_KEY. Browsers
 *     (anon) and signed-in learners (authenticated) cannot call it at all.
 *   • The identifier is a sha256 hex digest — a raw IP or user id is
 *     rejected by validation, so nothing PII-like lands in the table.
 *   • All inputs are validated; nothing is ever interpolated into SQL.
 *
 * Atomicity: each call runs inside ONE function call (= one transaction).
 * The pruning UPDATE takes the row lock BEFORE appending the hit, so two
 * parallel callers on the same key serialize on the row and cannot both
 * slip under the limit. The sliding-window + deny-not-recorded semantics
 * match lib/rateLimit.js exactly.
 */
create table if not exists public.rate_limit_hits (
  bucket text          not null,
  id     text          not null,
  hits   timestamptz[] not null default '{}'::timestamptz[],
  primary key (bucket, id)
);

alter table public.rate_limit_hits enable row level security;

revoke all on public.rate_limit_hits from public, anon, authenticated, service_role;
/* …and no GRANT is ever given: only the definer RPC touches this table. */

create or replace function public.rate_limit_hit(
  p_bucket    text,
  p_id        text,
  p_max       integer,
  p_window_ms bigint
)
returns json
language plpgsql
security definer
volatile
set search_path = ''
as $fn$
declare
  v_now     timestamptz := now();
  v_window  interval    := (p_window_ms || ' milliseconds')::interval;
  v_allowed boolean;
  v_used    integer;
begin
  /* fixed-shape inputs only — bucket is our endpoint name; id is a sha256
     hex digest, so client-supplied raw IPs/IDs cannot reach storage */
  if p_bucket !~ '^[a-z0-9-]{1,40}$' then raise exception 'Invalid bucket name'; end if;
  if p_id !~ '^[0-9a-f]{64}$' then raise exception 'Invalid identifier'; end if;
  if p_max < 1 or p_max > 100000 or p_window_ms < 1000 or p_window_ms > 86400000 then
    raise exception 'Invalid limiter parameters';
  end if;

  /* The row must exist before the locked update; insert-if-missing takes
     no write race because of the ON CONFLICT clause, and both statements
     live in this call's single transaction. */
  insert into public.rate_limit_hits as t (bucket, id, hits)
  values (p_bucket, p_id, '{}'::timestamptz[])
  on conflict (bucket, id) do nothing;

  /* Prune, then append iff there is room — ONE statement. The FOR UPDATE
     CTE takes the row lock first, so parallel callers on the same key
     serialize there; the verdict and the write are atomic together.
     A DENIED hit leaves the array untouched (it never extends the window). */
  with locked as (
    select bucket, id, hits
      from public.rate_limit_hits
     where bucket = p_bucket and id = p_id
     for update
  ),
  sumry as (
    select l.bucket, l.id,
           coalesce(array_agg(h) filter (where h > v_now - v_window), '{}'::timestamptz[]) as arr,
           count(h) filter (where h > v_now - v_window) as len
      from locked l
      left join lateral (select unnest(l.hits) as h) u on true
     group by l.bucket, l.id
  )
  update public.rate_limit_hits as t
     set hits = sumry.arr || case when sumry.len < p_max then array[v_now] else '{}'::timestamptz[] end
    from sumry
   where t.bucket = sumry.bucket and t.id = sumry.id
  returning (sumry.len < p_max),
            (sumry.len + case when sumry.len < p_max then 1 else 0 end)
      into v_allowed, v_used;

  return json_build_object('allowed', v_allowed, 'used', v_used);
end;
$fn$;

revoke all on function public.rate_limit_hit(text, text, integer, bigint) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, integer, bigint) to service_role;
