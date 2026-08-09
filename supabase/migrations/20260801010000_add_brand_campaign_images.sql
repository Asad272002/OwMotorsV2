-- Database-managed homepage campaign banners.
-- Existing local campaign assets are seeded so the approved homepage remains intact.

create table public.brand_campaign_images (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_campaign_images_storage_path_valid check (
    btrim(storage_path) <> ''
    and storage_path !~ '(^/|[.][.])'
  ),
  constraint brand_campaign_images_alt_text_valid check (
    char_length(btrim(alt_text)) between 3 and 240
  ),
  constraint brand_campaign_images_sort_order_valid check (sort_order >= 0)
);

create index brand_campaign_images_brand_active_order_idx
  on public.brand_campaign_images (brand_id, is_active, sort_order, id);

create trigger set_brand_campaign_images_updated_at
before update on public.brand_campaign_images
for each row execute function private.set_updated_at();

revoke all on table public.brand_campaign_images from anon, authenticated;
grant select on table public.brand_campaign_images to anon, authenticated;
grant insert, update, delete on table public.brand_campaign_images to authenticated;
grant all privileges on table public.brand_campaign_images to service_role;

alter table public.brand_campaign_images enable row level security;
alter table public.brand_campaign_images force row level security;

create policy brand_campaign_images_public_read
on public.brand_campaign_images
for select
to anon
using (
  is_active
  and exists (
    select 1
    from public.brands as brand
    where brand.id = brand_id
      and brand.is_active
  )
);

create policy brand_campaign_images_staff_read
on public.brand_campaign_images
for select
to authenticated
using (
  (
    is_active
    and exists (
      select 1
      from public.brands as brand
      where brand.id = brand_id
        and brand.is_active
    )
  )
  or (select private.is_staff())
);

create policy brand_campaign_images_staff_insert
on public.brand_campaign_images
for insert
to authenticated
with check ((select private.is_staff()));

create policy brand_campaign_images_staff_update
on public.brand_campaign_images
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy brand_campaign_images_admin_delete
on public.brand_campaign_images
for delete
to authenticated
using ((select private.is_admin()));

-- Normalize and move a banner within its brand in one database transaction.
create or replace function public.move_brand_campaign_image(
  target_banner_id uuid,
  move_direction text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_brand_id uuid;
  current_order integer;
  adjacent_banner_id uuid;
  adjacent_order integer;
begin
  if not (select private.is_staff()) then
    raise insufficient_privilege using message = 'Staff access is required.';
  end if;

  if move_direction not in ('up', 'down') then
    raise exception using errcode = '22023', message = 'Direction must be up or down.';
  end if;

  select brand_id
  into target_brand_id
  from public.brand_campaign_images
  where id = target_banner_id;

  if target_brand_id is null then
    raise exception using errcode = 'P0002', message = 'Banner not found.';
  end if;

  -- Remove gaps and duplicate positions before swapping adjacent records.
  with ordered as (
    select
      id,
      (row_number() over (order by sort_order, created_at, id) - 1)::integer as normalized_order
    from public.brand_campaign_images
    where brand_id = target_brand_id
  )
  update public.brand_campaign_images as banner
  set sort_order = ordered.normalized_order
  from ordered
  where banner.id = ordered.id
    and banner.sort_order is distinct from ordered.normalized_order;

  select sort_order
  into current_order
  from public.brand_campaign_images
  where id = target_banner_id
  for update;

  select id, sort_order
  into adjacent_banner_id, adjacent_order
  from public.brand_campaign_images
  where brand_id = target_brand_id
    and sort_order = current_order + case when move_direction = 'up' then -1 else 1 end
  for update;

  if adjacent_banner_id is null then
    return;
  end if;

  update public.brand_campaign_images
  set sort_order = case
    when id = target_banner_id then adjacent_order
    when id = adjacent_banner_id then current_order
    else sort_order
  end
  where id in (target_banner_id, adjacent_banner_id);
end;
$$;

revoke all on function public.move_brand_campaign_image(uuid, text) from public, anon;
grant execute on function public.move_brand_campaign_image(uuid, text) to authenticated;

insert into public.brand_campaign_images (
  brand_id,
  storage_path,
  alt_text,
  sort_order,
  is_active
)
select
  brand.id,
  seed.storage_path,
  seed.alt_text,
  seed.sort_order,
  true
from (
  values
    ('taro', 'images/home/taro-campaign-01.webp', 'TARO motorcycle campaign scene', 0),
    ('taro', 'images/home/taro-campaign-02.webp', 'TARO motorcycle on an open road', 1),
    ('taro', 'images/home/taro-campaign-03.webp', 'TARO motorcycle campaign landscape', 2),
    ('taro', 'images/home/taro-campaign-04.webp', 'TARO motorcycle riding scene', 3),
    ('lifan', 'images/home/lifan-campaign-01.webp', 'LIFAN motorcycle campaign scene', 0),
    ('lifan', 'images/home/lifan-campaign-02.webp', 'LIFAN motorcycle road campaign', 1),
    ('lifan', 'images/home/lifan-campaign-03.webp', 'LIFAN motorcycle outdoor campaign', 2),
    ('lifan', 'images/home/lifan-campaign-04.webp', 'LIFAN motorcycle riding scene', 3),
    ('lifan', 'images/home/lifan-campaign-05.webp', 'LIFAN motorcycle campaign landscape', 4)
) as seed(brand_slug, storage_path, alt_text, sort_order)
join public.brands as brand on brand.slug = seed.brand_slug
on conflict (storage_path) do nothing;
