-- Adaptive Skill Drills activity, duration and profile telemetry.
-- Apply after 202610060003_interactive_learning.sql.
-- Every result is tied to auth.uid(); direct table writes remain unavailable.

alter table public.learning_activity
  drop constraint if exists learning_activity_kind_check;
alter table public.learning_activity
  add constraint learning_activity_kind_check
  check (kind in ('quiz','game','mock','drill'));

alter table public.learning_activity
  add column if not exists skill text,
  add column if not exists score integer,
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists tier smallint;

alter table public.learning_activity
  drop constraint if exists learning_activity_drill_fields;
alter table public.learning_activity
  add constraint learning_activity_drill_fields check (
    kind <> 'drill' or (
      skill in ('listening','reading','writing','speaking')
      and score between 0 and 100
      and duration_seconds between 0 and 3600
      and tier between 1 and 3
    )
  );

create index if not exists learning_activity_owner_skill_day
  on public.learning_activity(user_id,activity_date,skill)
  where kind='drill';

-- Store a completed adaptive round as one owner-scoped activity row. The
-- idempotency reference is client-generated, but identity, UTC date and
-- streak updates are always derived server-side. No coin reward is granted.
create or replace function public.record_adaptive_drill(
  p_reference text,
  p_skill text,
  p_tier integer,
  p_score integer,
  p_duration_seconds integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_today date;
  v_reference text;
  v_inserted integer := 0;
  v_streak jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_reference is null or p_reference !~ '^[A-Za-z0-9:_-]{8,80}$' then
    raise exception 'Invalid drill reference';
  end if;
  if p_skill is null or p_skill not in ('listening','reading','writing','speaking') then
    raise exception 'Invalid drill skill';
  end if;
  if p_tier is null or p_tier not between 1 and 3 then raise exception 'Invalid adaptive tier'; end if;
  if p_score is null or p_score not between 0 and 100 then raise exception 'Invalid drill score'; end if;
  if p_duration_seconds is null or p_duration_seconds not between 0 and 3600 then
    raise exception 'Invalid drill duration';
  end if;

  v_today := public.learning_today();
  v_reference := 'adaptive:' || p_reference;
  insert into public.learning_activity(
    user_id,activity_date,kind,reference,skill,score,duration_seconds,tier
  ) values (
    v_user,v_today,'drill',v_reference,p_skill,p_score,p_duration_seconds,p_tier
  ) on conflict (user_id,activity_date,kind,reference) do nothing;
  get diagnostics v_inserted = row_count;

  v_streak := public.update_daily_streak();
  return v_streak || jsonb_build_object(
    'recorded',v_inserted=1,
    'activity_date',v_today,
    'kind','drill',
    'reference',v_reference,
    'skill',p_skill,
    'tier',p_tier,
    'score',p_score,
    'duration_seconds',p_duration_seconds
  );
end;
$$;

revoke all on function public.record_adaptive_drill(text,text,integer,integer,integer) from public,anon;
grant execute on function public.record_adaptive_drill(text,text,integer,integer,integer) to authenticated;
