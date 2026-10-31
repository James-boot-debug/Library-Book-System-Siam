-- Book preview ("Look inside"): run ONCE in Supabase > SQL Editor.
-- 1) A column for the preview PDF link
alter table public.books add column if not exists preview_url text;

-- 2) A public storage bucket for the PDFs (PDF only, max 50 MB each)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-previews', 'book-previews', true, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = true, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

-- 3) Only admins can upload, replace or delete previews. Visitors read them through the public link.
drop policy if exists "admin reads book previews" on storage.objects;
create policy "admin reads book previews" on storage.objects
for select to authenticated using (bucket_id = 'book-previews' and public.is_admin());

drop policy if exists "admin uploads book previews" on storage.objects;
create policy "admin uploads book previews" on storage.objects
for insert to authenticated with check (bucket_id = 'book-previews' and public.is_admin());

drop policy if exists "admin updates book previews" on storage.objects;
create policy "admin updates book previews" on storage.objects
for update to authenticated using (bucket_id = 'book-previews' and public.is_admin())
with check (bucket_id = 'book-previews' and public.is_admin());

drop policy if exists "admin deletes book previews" on storage.objects;
create policy "admin deletes book previews" on storage.objects
for delete to authenticated using (bucket_id = 'book-previews' and public.is_admin());
