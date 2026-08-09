begin;

-- SVG is supported only for dealership/brand logo workflows. Product photos,
-- campaign banners, and other inventory imagery remain raster-only.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml'
]
where id = 'motorcycles';

drop policy if exists motorcycles_storage_staff_insert on storage.objects;
create policy motorcycles_storage_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'motorcycles'
  and (select private.is_staff())
  and (
    lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
    or (
      lower(storage.extension(name)) = 'svg'
      and (
        name like 'brand-assets/%-logo.svg'
        or name like 'homepage-overlay-logos/%.svg'
        or name like 'mega-menu-logos/%.svg'
      )
    )
  )
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
  and (
    lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
    or (
      lower(storage.extension(name)) = 'svg'
      and (
        name like 'brand-assets/%-logo.svg'
        or name like 'homepage-overlay-logos/%.svg'
        or name like 'mega-menu-logos/%.svg'
      )
    )
  )
);

commit;
