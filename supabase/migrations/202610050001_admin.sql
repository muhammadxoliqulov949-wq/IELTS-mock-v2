-- =====================================================================
-- Admin panel: profiles, roles (RBAC), admin-safe RLS, custom mock tests
-- =====================================================================
-- Run this ONCE in the Supabase SQL Editor (or `supabase db push`),
-- AFTER 202610040001_mock_results.sql.
--
-- What it adds
--   • public.profiles            one row per auth user, with a role
--   • public.is_admin()          SECURITY DEFINER helper (recursion-safe)
--   • public.admin_set_role()    RPC — admins promote/demote other users
--   • public.admin_delete_user() RPC — admins remove a user and all their data
--   • public.mock_tests          admin-authored test content (JSONB)
--   • public.mock_test_meta      label/difficulty/publish state per test id
--   • RLS so admins can read everything, and nobody else can read anything
--     they do not own.
--
-- ⚠️  EDIT THIS LINE before running if you want a different first admin:
--     (see the “Bootstrap the first admin” section near the bottom)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text check (name is null or char_length(name) between 1 and 200),
  avatar_url  text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. is_admin() — the single source of truth for "is this an admin?"
--
-- SECURITY DEFINER is essential here, and it is also what makes this safe
-- from infinite recursion: the function runs as the table owner (postgres),
-- which bypasses RLS on public.profiles, so the query inside never
-- re-enters the policy that calls it.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Policies: see your own profile; admins see everyone.
drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Profiles: admins read all" on public.profiles;
create policy "Profiles: admins read all" on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists "Profiles: update own name and avatar" on public.profiles;
create policy "Profiles: update own name and avatar" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

-- ---------------------------------------------------------------------
-- 3. Keep profiles in sync with auth.users
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this migration existed.
insert into public.profiles (id, email, name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), '')
  ),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4. Admins may read (and clean up) every learner's results
-- ---------------------------------------------------------------------
drop policy if exists "Admins read all mock results" on public.mock_results;
create policy "Admins read all mock results" on public.mock_results
  for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins delete mock results" on public.mock_results;
create policy "Admins delete mock results" on public.mock_results
  for delete to authenticated
  using (public.is_admin());

-- Admin-authored tests use test5, test6 … so widen the original constraint.
alter table public.mock_results
  drop constraint if exists mock_results_test_id_check;
alter table public.mock_results
  add constraint mock_results_test_id_check
  check (test_id ~ '^test[1-9][0-9]?$');

-- ---------------------------------------------------------------------
-- 5. admin_set_role() — role changes go through an RPC, never a raw
--    UPDATE, so the "there must always be an admin" rule cannot be
--    bypassed by a buggy client.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admins int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'Invalid role';
  end if;
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'You cannot remove your own admin role';
  end if;

  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;

  -- Never let the last admin demote themselves out of the system.
  select count(*) into v_admins from public.profiles where role = 'admin';
  if v_admins = 0 then
    raise exception 'At least one admin must remain';
  end if;
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. admin_delete_user() — deleting an auth user is only possible from a
--    privileged context, so it lives here. Cascades remove the profile
--    and every mock result that belonged to them.
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admins int;
  v_is_admin boolean;
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete users';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'You cannot delete your own account';
  end if;

  select role = 'admin' into v_is_admin from public.profiles where id = p_user_id;
  if v_is_admin then
    select count(*) into v_admins from public.profiles where role = 'admin';
    if v_admins <= 1 then
      raise exception 'At least one admin must remain';
    end if;
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Admin-authored mock tests
--    One row per (test_id, skill). test_id follows the app's existing
--    test1/test2/… convention so the client router needs no special case.
-- ---------------------------------------------------------------------
create table if not exists public.mock_tests (
  id           uuid primary key default gen_random_uuid(),
  test_id      text not null check (test_id ~ '^test[1-9][0-9]?$'),
  skill        text not null check (skill in ('listening', 'reading', 'writing', 'speaking')),
  title        text not null check (char_length(title) between 1 and 200),
  payload      jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  is_published boolean not null default false,
  position     int not null default 100,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (test_id, skill)
);

create index if not exists mock_tests_test_id_idx on public.mock_tests (test_id);

create table if not exists public.mock_test_meta (
  test_id      text primary key check (test_id ~ '^test[1-9][0-9]?$'),
  label        text not null check (char_length(label) between 1 and 120),
  label_uz     text check (label_uz is null or char_length(label_uz) between 1 and 120),
  difficulty   text,
  is_published boolean not null default false,
  position     int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.mock_tests enable row level security;
alter table public.mock_test_meta enable row level security;
revoke all on public.mock_tests from anon, authenticated;
revoke all on public.mock_test_meta from anon, authenticated;
grant select on public.mock_tests to authenticated;
grant select on public.mock_test_meta to authenticated;

-- Learners only ever see published content; admins see drafts too.
drop policy if exists "Mock tests: read published or admins" on public.mock_tests;
create policy "Mock tests: read published or admins" on public.mock_tests
  for select to authenticated
  using (is_published or public.is_admin());

drop policy if exists "Mock tests: admins write" on public.mock_tests;
create policy "Mock tests: admins write" on public.mock_tests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Mock test meta: read published or admins" on public.mock_test_meta;
create policy "Mock test meta: read published or admins" on public.mock_test_meta
  for select to authenticated
  using (is_published or public.is_admin());

drop policy if exists "Mock test meta: admins write" on public.mock_test_meta;
create policy "Mock test meta: admins write" on public.mock_test_meta
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7b. admin_stats() — one round trip for the overview cards.
--     Aggregating in Postgres keeps the client from downloading every row
--     just to count them.
-- ---------------------------------------------------------------------
create or replace function public.admin_stats()
returns json
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can read platform statistics';
  end if;

  return json_build_object(
    'users',        (select count(*) from public.profiles),
    'admins',       (select count(*) from public.profiles where role = 'admin'),
    'newUsers7d',   (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'submissions',  (select count(*) from public.mock_results),
    'completed',    (select count(*) from public.mock_results where overall_band is not null),
    'avgBand',      (select round(avg(overall_band), 1) from public.mock_results where overall_band is not null),
    'tests',        (select count(distinct test_id) from public.mock_tests where is_published)
  );
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- ---------------------------------------------------------------------
-- 8. updated_at bookkeeping
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists mock_tests_touch on public.mock_tests;
create trigger mock_tests_touch before update on public.mock_tests
  for each row execute function public.touch_updated_at();

drop trigger if exists mock_test_meta_touch on public.mock_test_meta;
create trigger mock_test_meta_touch before update on public.mock_test_meta
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 9. Bootstrap the first admin
--    Change the address below if you want someone else to be the owner.
--    After this, promote/demote anyone from Admin panel → Users.
-- ---------------------------------------------------------------------
update public.profiles
   set role = 'admin', updated_at = now()
 where lower(email) = lower('muhammadxoliqulov949@gmail.com');

-- If that account has never signed in yet it will not be in profiles yet.
-- Re-run this block after their first sign-in, or promote them with:
--   select public.admin_set_role('<their-uuid>', 'admin');
-- (which requires you to already be an admin).

-- ---------------------------------------------------------------------
-- Sanity check: who are the admins now?
-- ---------------------------------------------------------------------
-- select id, email, role from public.profiles order by role, created_at;
