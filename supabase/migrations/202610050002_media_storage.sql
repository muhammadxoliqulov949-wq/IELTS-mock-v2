-- =====================================================================
-- Media storage: MP3 audio (Listening) + images (Writing Task 1, maps)
-- =====================================================================
-- Run this ONCE in the Supabase SQL Editor (or `supabase db push`),
-- AFTER 202610050001_admin.sql (it relies on public.is_admin()).
--
-- What it adds
--   • storage bucket "ielts-media"  public read, 50 MB per file,
--     audio + image mime types only
--   • RLS-style storage policies:
--       - everyone (even signed-out learners) can READ a media object,
--         because a published test must play its audio for any learner
--       - only admins (public.is_admin()) can INSERT / UPDATE / DELETE
--
-- The admin panel uploads straight from the browser with the anon key;
-- the policies below are the real gate — a hand-crafted request from the
-- console gets the same answer as the UI.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The bucket
--    • public = true  → objects are served from
--      https://<project>.supabase.co/storage/v1/object/public/ielts-media/<path>
--      so an <audio> tag can play them with no signed URL juggling.
--    • file_size_limit = 50 MB — an IELTS part recording is usually < 10 MB.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ielts-media',
  'ielts-media',
  true,
  52428800,
  array[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg',
    'audio/x-m4a', 'audio/mp4', 'audio/webm',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif'
  ]
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 2. Policies
--    storage.objects has RLS enabled by default; these four policies are
--    the whole access model for the bucket.
-- ---------------------------------------------------------------------

-- Anyone may read media (published tests must play for every learner).
drop policy if exists "ielts-media: public read" on storage.objects;
create policy "ielts-media: public read" on storage.objects
  for select
  using (bucket_id = 'ielts-media');

-- Only admins may upload.
drop policy if exists "ielts-media: admins upload" on storage.objects;
create policy "ielts-media: admins upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ielts-media' and public.is_admin());

-- Only admins may replace (re-upload over the same path).
drop policy if exists "ielts-media: admins update" on storage.objects;
create policy "ielts-media: admins update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ielts-media' and public.is_admin())
  with check (bucket_id = 'ielts-media' and public.is_admin());

-- Only admins may delete.
drop policy if exists "ielts-media: admins delete" on storage.objects;
create policy "ielts-media: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ielts-media' and public.is_admin());

-- ---------------------------------------------------------------------
-- Sanity checks
-- ---------------------------------------------------------------------
-- select id, public, file_size_limit from storage.buckets where id = 'ielts-media';
-- select polname, polcmd from pg_policy where polrelid = 'storage.objects'::regclass;
