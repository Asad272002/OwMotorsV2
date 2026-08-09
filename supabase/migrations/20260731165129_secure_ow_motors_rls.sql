-- OW Motors database privileges and Row Level Security.
-- Public access is deliberately limited to storefront reads and form submissions.

revoke all on table
  public.profiles,
  public.brands,
  public.categories,
  public.motorcycle_categories,
  public.motorcycles,
  public.motorcycle_variants,
  public.motorcycle_images,
  public.motorcycle_specifications,
  public.motorcycle_features,
  public.test_ride_requests,
  public.contact_inquiries,
  public.site_settings
from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to anon, authenticated;

-- These SECURITY DEFINER helpers are owned by the migration owner and keep
-- authorization checks independent from client-controlled Auth metadata.
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role in ('admin', 'editor')
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role = 'admin'
  );
$$;

create or replace function private.is_public_motorcycle(target_motorcycle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.motorcycles as motorcycle
    join public.brands as brand on brand.id = motorcycle.brand_id
    where motorcycle.id = target_motorcycle_id
      and motorcycle.publication_status = 'published'
      and brand.is_active
  );
$$;

create or replace function private.is_public_variant(target_variant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.motorcycle_variants as variant
    where variant.id = target_variant_id
      and variant.is_active
      and private.is_public_motorcycle(variant.motorcycle_id)
  );
$$;

revoke all on function private.is_staff() from public, anon;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_public_motorcycle(uuid) from public;
revoke all on function private.is_public_variant(uuid) from public;

grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_public_motorcycle(uuid) to anon, authenticated;
grant execute on function private.is_public_variant(uuid) to anon, authenticated;

-- Explicit grants are required in addition to RLS. They also make the intended
-- Data API surface stable if project-level automatic API exposure changes.
grant select on table
  public.brands,
  public.categories,
  public.motorcycle_categories,
  public.motorcycles,
  public.motorcycle_variants,
  public.motorcycle_images,
  public.motorcycle_specifications,
  public.motorcycle_features
to anon, authenticated;

grant insert (
  full_name,
  phone,
  email,
  subject,
  message
) on public.contact_inquiries to anon, authenticated;

grant insert (
  motorcycle_id,
  variant_id,
  full_name,
  phone,
  email,
  preferred_date,
  preferred_time,
  message
) on public.test_ride_requests to anon, authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.brands,
  public.categories,
  public.motorcycle_categories,
  public.motorcycles,
  public.motorcycle_variants,
  public.motorcycle_images,
  public.motorcycle_specifications,
  public.motorcycle_features,
  public.site_settings
to authenticated;

grant select, update, delete on table
  public.test_ride_requests,
  public.contact_inquiries
to authenticated;

grant all privileges on table
  public.profiles,
  public.brands,
  public.categories,
  public.motorcycle_categories,
  public.motorcycles,
  public.motorcycle_variants,
  public.motorcycle_images,
  public.motorcycle_specifications,
  public.motorcycle_features,
  public.test_ride_requests,
  public.contact_inquiries,
  public.site_settings
to service_role;

-- RLS is forced so privileged application connections cannot accidentally
-- bypass policies. Supabase's service role remains the explicit server-only
-- bypass for trusted operational work.
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.brands enable row level security;
alter table public.brands force row level security;
alter table public.categories enable row level security;
alter table public.categories force row level security;
alter table public.motorcycle_categories enable row level security;
alter table public.motorcycle_categories force row level security;
alter table public.motorcycles enable row level security;
alter table public.motorcycles force row level security;
alter table public.motorcycle_variants enable row level security;
alter table public.motorcycle_variants force row level security;
alter table public.motorcycle_images enable row level security;
alter table public.motorcycle_images force row level security;
alter table public.motorcycle_specifications enable row level security;
alter table public.motorcycle_specifications force row level security;
alter table public.motorcycle_features enable row level security;
alter table public.motorcycle_features force row level security;
alter table public.test_ride_requests enable row level security;
alter table public.test_ride_requests force row level security;
alter table public.contact_inquiries enable row level security;
alter table public.contact_inquiries force row level security;
alter table public.site_settings enable row level security;
alter table public.site_settings force row level security;

-- Public storefront policies.
create policy brands_public_read
on public.brands
for select
to anon, authenticated
using (is_active);

create policy categories_public_read
on public.categories
for select
to anon, authenticated
using (is_active);

create policy motorcycles_public_read
on public.motorcycles
for select
to anon, authenticated
using (private.is_public_motorcycle(id));

create policy motorcycle_variants_public_read
on public.motorcycle_variants
for select
to anon, authenticated
using (is_active and private.is_public_motorcycle(motorcycle_id));

create policy motorcycle_categories_public_read
on public.motorcycle_categories
for select
to anon, authenticated
using (
  private.is_public_motorcycle(motorcycle_id)
  and exists (
    select 1
    from public.categories as category
    where category.id = category_id
      and category.is_active
  )
);

create policy motorcycle_images_public_read
on public.motorcycle_images
for select
to anon, authenticated
using (
  private.is_public_motorcycle(motorcycle_id)
  and (variant_id is null or private.is_public_variant(variant_id))
);

create policy motorcycle_specifications_public_read
on public.motorcycle_specifications
for select
to anon, authenticated
using (
  private.is_public_motorcycle(motorcycle_id)
  and (variant_id is null or private.is_public_variant(variant_id))
);

create policy motorcycle_features_public_read
on public.motorcycle_features
for select
to anon, authenticated
using (private.is_public_motorcycle(motorcycle_id));

-- Anonymous and signed-in visitors can submit forms, but cannot read them.
-- Column grants prevent clients from supplying IDs, timestamps, or statuses.
create policy contact_inquiries_public_insert
on public.contact_inquiries
for insert
to anon, authenticated
with check (status = 'new');

create policy test_ride_requests_public_insert
on public.test_ride_requests
for insert
to anon, authenticated
with check (
  status = 'new'
  and private.is_public_motorcycle(motorcycle_id)
  and (variant_id is null or private.is_public_variant(variant_id))
);

-- A profile can be viewed by its owner. Only an active admin can create,
-- change, deactivate, or remove profile/role records.
create policy profiles_own_read
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_admin_read
on public.profiles
for select
to authenticated
using ((select private.is_admin()));

create policy profiles_admin_insert
on public.profiles
for insert
to authenticated
with check ((select private.is_admin()));

create policy profiles_admin_update
on public.profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy profiles_admin_delete
on public.profiles
for delete
to authenticated
using ((select private.is_admin()));

-- Editors and admins can create and update managed content. Deletes are
-- intentionally reserved for admins. Policies are generated consistently for
-- each managed content table.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'brands',
    'categories',
    'motorcycle_categories',
    'motorcycles',
    'motorcycle_variants',
    'motorcycle_images',
    'motorcycle_specifications',
    'motorcycle_features',
    'site_settings'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_staff()))',
      table_name || '_staff_read',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_staff()))',
      table_name || '_staff_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))',
      table_name || '_staff_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))',
      table_name || '_admin_delete',
      table_name
    );
  end loop;
end;
$$;

-- Staff can process submissions; only admins can permanently remove them.
create policy contact_inquiries_staff_read
on public.contact_inquiries
for select
to authenticated
using ((select private.is_staff()));

create policy contact_inquiries_staff_update
on public.contact_inquiries
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy contact_inquiries_admin_delete
on public.contact_inquiries
for delete
to authenticated
using ((select private.is_admin()));

create policy test_ride_requests_staff_read
on public.test_ride_requests
for select
to authenticated
using ((select private.is_staff()));

create policy test_ride_requests_staff_update
on public.test_ride_requests
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy test_ride_requests_admin_delete
on public.test_ride_requests
for delete
to authenticated
using ((select private.is_admin()));
