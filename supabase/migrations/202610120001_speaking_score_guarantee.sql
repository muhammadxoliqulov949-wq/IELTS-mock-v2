-- Guarantee valid numeric IELTS score format for Speaking in mock_results and profiles tables.
-- Run in Supabase SQL Editor or supabase db push.

-- 1. Ensure public.profiles has the speaking column with valid IELTS numeric constraints
alter table public.profiles
  add column if not exists speaking numeric(2,1);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_speaking_score_check'
  ) then
    alter table public.profiles
      add constraint profiles_speaking_score_check
      check (speaking is null or (speaking between 0 and 9 and mod(speaking, 0.5) = 0));
  end if;
end;
$$;

-- 2. Update save_mock_section to keep mock_results and profiles synchronized with valid numeric speaking scores
create or replace function public.save_mock_section(
  p_test_id text, p_section text, p_band numeric, p_name text, p_details jsonb, p_owner uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then
    raise exception 'Authentication required or account changed';
  end if;
  if p_section is null or p_section not in ('listening','reading','writing','speaking') then
    raise exception 'Invalid section';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object'
     or octet_length(p_details::text) > 100000
     or jsonb_typeof(p_details->'date') is distinct from 'number' then
    raise exception 'Invalid score details';
  end if;
  if p_band is not null and (p_band < 0 or p_band > 9 or mod(p_band, 0.5) <> 0) then
    raise exception 'Invalid band';
  end if;

  insert into public.mock_results as r
    (user_id, name, test_id, scores, listening, reading, writing, speaking)
  values (
    auth.uid(), p_name, p_test_id,
    jsonb_build_object(p_section, p_details || jsonb_build_object('band', p_band)),
    case when p_section = 'listening' then p_band end,
    case when p_section = 'reading' then p_band end,
    case when p_section = 'writing' then p_band end,
    case when p_section = 'speaking' then p_band end
  ) on conflict (user_id, test_id) do update set
    name = excluded.name,
    scores = r.scores || excluded.scores,
    listening = case when p_section = 'listening' then p_band else r.listening end,
    reading = case when p_section = 'reading' then p_band else r.reading end,
    writing = case when p_section = 'writing' then p_band else r.writing end,
    speaking = case when p_section = 'speaking' then p_band else r.speaking end,
    updated_at = now()
  where coalesce((r.scores->p_section->>'date')::numeric, 0) <= (p_details->>'date')::numeric;

  -- Synchronize verified numeric speaking band to learner profile
  if p_section = 'speaking' and p_band is not null then
    update public.profiles
      set speaking = p_band, updated_at = now()
      where id = auth.uid();
  end if;
end;
$$;

revoke all on function public.save_mock_section(text,text,numeric,text,jsonb,uuid) from public, anon;
grant execute on function public.save_mock_section(text,text,numeric,text,jsonb,uuid) to authenticated;
