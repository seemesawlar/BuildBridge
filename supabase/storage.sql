-- =========================================================
-- Storage buckets
-- Run after schema.sql and policies.sql. Creates three buckets
-- with access rules matched to what each one holds:
--   - progress-photos : private, project members only
--   - portfolio        : public, contractor-owned (marketing material)
--   - licenses          : private, owner + admin only (verification docs)
-- =========================================================

insert into storage.buckets (id, name, public)
values
  ('progress-photos', 'progress-photos', false),
  ('portfolio', 'portfolio', true),
  ('licenses', 'licenses', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- progress-photos
-- Files are stored at: {project_id}/{filename}
-- Only members of that project can read or upload.
-- ---------------------------------------------------------
create policy "project members can read progress photos"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and is_project_member((storage.foldername(name))[1]::uuid)
  );

create policy "project members can upload progress photos"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and is_project_member((storage.foldername(name))[1]::uuid)
  );

-- ---------------------------------------------------------
-- portfolio
-- Files are stored at: {contractor_id}/{filename}
-- Publicly readable (used on contractor profiles); only the
-- owning contractor can upload or delete their own files.
-- ---------------------------------------------------------
create policy "anyone can view portfolio files"
  on storage.objects for select
  using (bucket_id = 'portfolio');

create policy "contractors can upload their own portfolio files"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contractors can delete their own portfolio files"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------
-- licenses
-- Files are stored at: {user_id}/{filename}
-- Private — only the owner can read or upload their own license.
-- (Platform admins would need a service-role or a separate admin
-- policy branch, added when the admin role is built out.)
-- ---------------------------------------------------------
create policy "owners can read their own license files"
  on storage.objects for select
  using (
    bucket_id = 'licenses'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admins can read any license file"
  on storage.objects for select
  using (bucket_id = 'licenses' and is_admin());

create policy "owners can upload their own license files"
  on storage.objects for insert
  with check (
    bucket_id = 'licenses'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
