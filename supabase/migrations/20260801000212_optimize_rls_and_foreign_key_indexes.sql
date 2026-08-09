-- Cover composite foreign keys and consolidate equivalent SELECT policies.
-- This preserves the Stage 5 authorization model while reducing per-query RLS work.

create index motorcycle_images_variant_motorcycle_idx
  on public.motorcycle_images (variant_id, motorcycle_id)
  where variant_id is not null;

create index motorcycle_specifications_variant_motorcycle_idx
  on public.motorcycle_specifications (variant_id, motorcycle_id)
  where variant_id is not null;

create index test_ride_requests_variant_motorcycle_idx
  on public.test_ride_requests (variant_id, motorcycle_id)
  where variant_id is not null;

-- Anonymous visitors use the public policy. Authenticated users use one policy
-- that combines storefront visibility with staff access to unpublished content.
alter policy brands_public_read
on public.brands
to anon;

alter policy brands_staff_read
on public.brands
using (is_active or (select private.is_staff()));

alter policy categories_public_read
on public.categories
to anon;

alter policy categories_staff_read
on public.categories
using (is_active or (select private.is_staff()));

alter policy motorcycles_public_read
on public.motorcycles
to anon;

alter policy motorcycles_staff_read
on public.motorcycles
using (private.is_public_motorcycle(id) or (select private.is_staff()));

alter policy motorcycle_variants_public_read
on public.motorcycle_variants
to anon;

alter policy motorcycle_variants_staff_read
on public.motorcycle_variants
using (
  (is_active and private.is_public_motorcycle(motorcycle_id))
  or (select private.is_staff())
);

alter policy motorcycle_categories_public_read
on public.motorcycle_categories
to anon;

alter policy motorcycle_categories_staff_read
on public.motorcycle_categories
using (
  (
    private.is_public_motorcycle(motorcycle_id)
    and exists (
      select 1
      from public.categories as category
      where category.id = category_id
        and category.is_active
    )
  )
  or (select private.is_staff())
);

alter policy motorcycle_images_public_read
on public.motorcycle_images
to anon;

alter policy motorcycle_images_staff_read
on public.motorcycle_images
using (
  (
    private.is_public_motorcycle(motorcycle_id)
    and (variant_id is null or private.is_public_variant(variant_id))
  )
  or (select private.is_staff())
);

alter policy motorcycle_specifications_public_read
on public.motorcycle_specifications
to anon;

alter policy motorcycle_specifications_staff_read
on public.motorcycle_specifications
using (
  (
    private.is_public_motorcycle(motorcycle_id)
    and (variant_id is null or private.is_public_variant(variant_id))
  )
  or (select private.is_staff())
);

alter policy motorcycle_features_public_read
on public.motorcycle_features
to anon;

alter policy motorcycle_features_staff_read
on public.motorcycle_features
using (private.is_public_motorcycle(motorcycle_id) or (select private.is_staff()));

-- Merge profile self-read and admin-read into one authenticated SELECT policy.
alter policy profiles_own_read
on public.profiles
using (
  id = (select auth.uid())
  or (select private.is_admin())
);

drop policy profiles_admin_read on public.profiles;
