/* Product telemetry — write-only product events (Task 03.2)
 *
 * Exactly three events are tracked for AUTHENTICATED learners:
 *   'signup' | 'mock_started' | 'mock_completed'
 *
 * Security shape (mirror of the existing RLS style):
 *   • RLS enabled; an authenticated learner may insert rows only for their
 *     own auth.uid() — a forged user_id in the payload is rejected.
 *   • No policy grants anon anything → guests/anonymous callers get
 *     permission denied for both INSERT and SELECT.
 *   • Ordinary learners cannot SELECT anything (no select policy for them).
 *   • Only admins (public.is_admin(), SECURITY DEFINER since
 *     202610050001_admin.sql) may read rows.
 *   • No update/delete policies on purpose: events are immutable.
 */
create table if not exists public.product_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event      text not null check (event in ('signup', 'mock_started', 'mock_completed')),
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_created_at_idx
  on public.product_events (created_at desc);

alter table public.product_events enable row level security;

/* Explicit surface, same style as public.profiles: guests get nothing at the
 * privilege level; authenticated learners may insert (RLS pins user_id) and
 * may SELECT only through the admin policy below — ordinary users see zero
 * rows even though the grant exists. */
revoke all on public.product_events from anon;
revoke all on public.product_events from authenticated;
grant insert on public.product_events to authenticated;
grant select on public.product_events to authenticated;

/* Learners record events for themselves only. */
create policy "Product events: insert own"
  on public.product_events
  for insert to authenticated
  with check (user_id = auth.uid());

/* Reading is an admin-only privilege for later dashboards (not Task 03.2). */
create policy "Product events: admins read all"
  on public.product_events
  for select to authenticated
  using (public.is_admin());
