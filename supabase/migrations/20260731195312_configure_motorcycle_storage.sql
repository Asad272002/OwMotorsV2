-- Public product imagery is uploaded by authenticated staff through Storage
-- RLS. Application actions still use the publishable key and staff session.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'motorcycles',
  'motorcycles',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists motorcycles_storage_staff_read on storage.objects;
create policy motorcycles_storage_staff_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'motorcycles'
  and (select private.is_staff())
);

drop policy if exists motorcycles_storage_staff_insert on storage.objects;
create policy motorcycles_storage_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'motorcycles'
  and (select private.is_staff())
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
);

drop policy if exists motorcycles_storage_staff_update on storage.objects;
create policy motorcycles_storage_staff_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'motorcycles'
  and (select private.is_staff())
)
with check (
  bucket_id = 'motorcycles'
  and (select private.is_staff())
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
);

drop policy if exists motorcycles_storage_admin_delete on storage.objects;
create policy motorcycles_storage_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'motorcycles'
  and (select private.is_admin())
);
