-- Run in Supabase SQL Editor once, or use `supabase db push`.
-- One row per user/test: the current app allows each of its four tests once.
create table if not exists public.mock_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  test_id text not null check (test_id in ('test1', 'test2', 'test3', 'test4')),
  scores jsonb not null default '{}'::jsonb check (jsonb_typeof(scores) = 'object'),
  listening numeric(2,1) check (listening between 0 and 9 and mod(listening, 0.5) = 0),
  reading numeric(2,1) check (reading between 0 and 9 and mod(reading, 0.5) = 0),
  writing numeric(2,1) check (writing between 0 and 9 and mod(writing, 0.5) = 0),
  speaking numeric(2,1) check (speaking between 0 and 9 and mod(speaking, 0.5) = 0),
  -- NULL means unfinished/ungraded, never band zero. IELTS rounds to half bands.
  overall_band numeric(2,1) generated always as (
    case when listening is not null and reading is not null
      and writing is not null and speaking is not null
    then round((listening + reading + writing + speaking) / 4 * 2) / 2
    else null end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, test_id)
);

alter table public.mock_results enable row level security;
revoke all on public.mock_results from anon;
revoke all on public.mock_results from authenticated;
grant select, insert, update on public.mock_results to authenticated;

create policy "Read own mock results" on public.mock_results
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own mock results" on public.mock_results
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own mock results" on public.mock_results
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Atomic section-level merge: a stale tab cannot erase another section.
-- SECURITY INVOKER preserves all RLS checks. No service-role key is needed.
create or replace function public.save_mock_section(
  p_test_id text, p_section text, p_band numeric, p_name text, p_details jsonb, p_owner uuid
) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then raise exception 'Authentication required or account changed'; end if;
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
end;
$$;
revoke all on function public.save_mock_section(text,text,numeric,text,jsonb,uuid) from public, anon;
grant execute on function public.save_mock_section(text,text,numeric,text,jsonb,uuid) to authenticated;
