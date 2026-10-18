/* Product telemetry admin metrics (Task 03.5)
 *
 * Aggregate-only admin RPC over public.product_events (created in
 * 202610130001_product_events.sql). Same authorization shape as
 * public.admin_stats(): SECURITY DEFINER + public.is_admin() guard.
 *
 * Hard rules baked in:
 *   • returns AGGREGATE COUNTS ONLY — never user_id, email or meta
 *   • p_window is whitelisted ('7d' | '30d'); anything else is rejected
 *   • "today" follows the repo's UTC convention (same as daily streaks),
 *     so dates never depend on the server's session timezone
 *   • period comparisons are computed in Postgres in one scan:
 *     current window, the immediately-preceding equal window, and today
 */
create or replace function public.product_event_stats(p_window text default '7d')
returns json
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_days int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can read product event statistics';
  end if;

  if p_window = '7d' then v_days := 7;
  elsif p_window = '30d' then v_days := 30;
  else raise exception 'Invalid window: use 7d or 30d';
  end if;

  return (
    with bounds as (
      select now() - make_interval(days => v_days)              as window_start,
             now() - make_interval(days => 2 * v_days)          as prev_window_start,
             timezone('UTC', date_trunc('day', now() at time zone 'UTC')) as today_start
    ),
    counts as (
      select
        count(*) filter (where e.created_at >= b.window_start
                         and e.event = 'signup')          as signups,
        count(*) filter (where e.created_at >= b.window_start
                         and e.event = 'mock_started')     as starts,
        count(*) filter (where e.created_at >= b.window_start
                         and e.event = 'mock_completed')   as completions,
        count(*) filter (where e.created_at >= b.prev_window_start
                         and e.created_at <  b.window_start
                         and e.event = 'signup')          as prev_signups,
        count(*) filter (where e.created_at >= b.prev_window_start
                         and e.created_at <  b.window_start
                         and e.event = 'mock_started')     as prev_starts,
        count(*) filter (where e.created_at >= b.prev_window_start
                         and e.created_at <  b.window_start
                         and e.event = 'mock_completed')   as prev_completions,
        count(*) filter (where e.created_at >= b.today_start
                         and e.event = 'signup')          as today_signups,
        count(*) filter (where e.created_at >= b.today_start
                         and e.event = 'mock_started')     as today_starts,
        count(*) filter (where e.created_at >= b.today_start
                         and e.event = 'mock_completed')   as today_completions
      from public.product_events e, bounds b
    )
    select json_build_object(
      'window',          p_window,
      'signups',         coalesce(counts.signups, 0),
      'starts',          coalesce(counts.starts, 0),
      'completions',     coalesce(counts.completions, 0),
      'prevSignups',     coalesce(counts.prev_signups, 0),
      'prevStarts',      coalesce(counts.prev_starts, 0),
      'prevCompletions', coalesce(counts.prev_completions, 0),
      'todaySignups',    coalesce(counts.today_signups, 0),
      'todayStarts',     coalesce(counts.today_starts, 0),
      'todayCompletions', coalesce(counts.today_completions, 0)
    )
    from counts
  );
end;
$$;

revoke all on function public.product_event_stats(text) from public, anon;
grant execute on function public.product_event_stats(text) to authenticated;
