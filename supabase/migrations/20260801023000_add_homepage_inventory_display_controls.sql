-- Independent, inventory-backed controls for homepage brand showcases and rows.
-- Records are removed from presentation reversibly; brand inventory remains intact.

alter table public.brands
  add column mega_menu_logo_path text,
  add column show_mega_menu_logo boolean not null default true,
  add constraint brands_mega_menu_logo_path_valid check (
    mega_menu_logo_path is null
    or (
      btrim(mega_menu_logo_path) <> ''
      and mega_menu_logo_path !~ '(^/|[.][.])'
    )
  );

update public.brands
set mega_menu_logo_path = logo_path
where logo_path is not null;

create table public.homepage_brand_sections (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  section_type text not null,
  display_order integer not null default 0,
  display_status text not null default 'visible',
  overlay_logo_path text,
  show_overlay_logo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_brand_sections_brand_type_unique unique (brand_id, section_type),
  constraint homepage_brand_sections_type_valid check (
    section_type in ('brand_banner', 'motorcycle_row')
  ),
  constraint homepage_brand_sections_status_valid check (
    display_status in ('visible', 'hidden', 'removed')
  ),
  constraint homepage_brand_sections_order_valid check (display_order >= 0),
  constraint homepage_brand_sections_overlay_logo_path_valid check (
    overlay_logo_path is null
    or (
      btrim(overlay_logo_path) <> ''
      and overlay_logo_path !~ '(^/|[.][.])'
    )
  ),
  constraint homepage_brand_sections_overlay_logo_scope check (
    section_type = 'brand_banner'
    or (overlay_logo_path is null and show_overlay_logo = false)
  )
);

create index homepage_brand_sections_public_order_idx
  on public.homepage_brand_sections (section_type, display_status, display_order, id);

create index homepage_brand_sections_brand_id_idx
  on public.homepage_brand_sections (brand_id);

create trigger set_homepage_brand_sections_updated_at
before update on public.homepage_brand_sections
for each row execute function private.set_updated_at();

revoke all on table public.homepage_brand_sections from anon, authenticated;
grant select on table public.homepage_brand_sections to anon, authenticated;
grant insert, update, delete on table public.homepage_brand_sections to authenticated;
grant all privileges on table public.homepage_brand_sections to service_role;

alter table public.homepage_brand_sections enable row level security;
alter table public.homepage_brand_sections force row level security;

create policy homepage_brand_sections_public_read
on public.homepage_brand_sections
for select
to anon
using (
  display_status = 'visible'
  and exists (
    select 1
    from public.brands as brand
    where brand.id = brand_id
      and brand.is_active
  )
);

create policy homepage_brand_sections_staff_read
on public.homepage_brand_sections
for select
to authenticated
using (
  (
    display_status = 'visible'
    and exists (
      select 1
      from public.brands as brand
      where brand.id = brand_id
        and brand.is_active
    )
  )
  or (select private.is_staff())
);

create policy homepage_brand_sections_staff_insert
on public.homepage_brand_sections
for insert
to authenticated
with check ((select private.is_staff()));

create policy homepage_brand_sections_staff_update
on public.homepage_brand_sections
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy homepage_brand_sections_admin_delete
on public.homepage_brand_sections
for delete
to authenticated
using ((select private.is_admin()));

insert into public.homepage_brand_sections (
  brand_id,
  section_type,
  display_order,
  display_status,
  overlay_logo_path,
  show_overlay_logo
)
select
  brand.id,
  section.section_type,
  brand.display_order,
  'visible',
  case when section.section_type = 'brand_banner' then brand.logo_path else null end,
  section.section_type = 'brand_banner'
from public.brands as brand
cross join (values ('brand_banner'), ('motorcycle_row')) as section(section_type)
on conflict (brand_id, section_type) do nothing;

create or replace function private.create_homepage_brand_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.homepage_brand_sections (
    brand_id,
    section_type,
    display_order,
    display_status,
    overlay_logo_path,
    show_overlay_logo
  )
  values
    (new.id, 'brand_banner', new.display_order, 'visible', new.logo_path, true),
    (new.id, 'motorcycle_row', new.display_order, 'visible', null, false)
  on conflict (brand_id, section_type) do nothing;
  return new;
end;
$$;

revoke execute on function private.create_homepage_brand_sections() from public;

create trigger create_homepage_sections_after_brand_insert
after insert on public.brands
for each row execute function private.create_homepage_brand_sections();

create or replace function public.move_homepage_brand_section(
  target_section_id uuid,
  move_direction text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_type text;
  current_order integer;
  adjacent_section_id uuid;
  adjacent_order integer;
begin
  if not (select private.is_staff()) then
    raise insufficient_privilege using message = 'Staff access is required.';
  end if;

  if move_direction not in ('up', 'down') then
    raise exception using errcode = '22023', message = 'Direction must be up or down.';
  end if;

  select section_type
  into target_type
  from public.homepage_brand_sections
  where id = target_section_id;

  if target_type is null then
    raise exception using errcode = 'P0002', message = 'Homepage display item not found.';
  end if;

  with ordered as (
    select
      id,
      (row_number() over (order by display_order, created_at, id) - 1)::integer as normalized_order
    from public.homepage_brand_sections
    where section_type = target_type
  )
  update public.homepage_brand_sections as section
  set display_order = ordered.normalized_order
  from ordered
  where section.id = ordered.id
    and section.display_order is distinct from ordered.normalized_order;

  select display_order
  into current_order
  from public.homepage_brand_sections
  where id = target_section_id
  for update;

  select id, display_order
  into adjacent_section_id, adjacent_order
  from public.homepage_brand_sections
  where section_type = target_type
    and display_order = current_order + case when move_direction = 'up' then -1 else 1 end
  for update;

  if adjacent_section_id is null then
    return;
  end if;

  update public.homepage_brand_sections
  set display_order = case
    when id = target_section_id then adjacent_order
    when id = adjacent_section_id then current_order
    else display_order
  end
  where id in (target_section_id, adjacent_section_id);
end;
$$;

revoke all on function public.move_homepage_brand_section(uuid, text) from public, anon;
grant execute on function public.move_homepage_brand_section(uuid, text) to authenticated;
