-- Move a brand's paired homepage showcase and motorcycle row atomically.

create or replace function public.move_homepage_brand(
  target_brand_id uuid,
  move_direction text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_active boolean;
  current_order integer;
  adjacent_brand_id uuid;
  adjacent_order integer;
begin
  if not (select private.is_staff()) then
    raise insufficient_privilege using message = 'Staff access is required.';
  end if;

  if move_direction not in ('up', 'down') then
    raise exception using errcode = '22023', message = 'Direction must be up or down.';
  end if;

  select is_active
  into target_active
  from public.brands
  where id = target_brand_id;

  if target_active is null then
    raise exception using errcode = 'P0002', message = 'Brand not found.';
  end if;

  -- Active and inactive brands are normalized separately so an inactive row
  -- cannot consume a visible homepage position.
  with ordered as (
    select
      id,
      (row_number() over (order by display_order, name, id) - 1)::integer as normalized_order
    from public.brands
    where is_active = target_active
  )
  update public.brands as brand
  set display_order = ordered.normalized_order
  from ordered
  where brand.id = ordered.id
    and brand.display_order is distinct from ordered.normalized_order;

  select display_order
  into current_order
  from public.brands
  where id = target_brand_id
  for update;

  select id, display_order
  into adjacent_brand_id, adjacent_order
  from public.brands
  where is_active = target_active
    and display_order = current_order + case when move_direction = 'up' then -1 else 1 end
  for update;

  if adjacent_brand_id is null then
    return;
  end if;

  update public.brands
  set display_order = case
    when id = target_brand_id then adjacent_order
    when id = adjacent_brand_id then current_order
    else display_order
  end
  where id in (target_brand_id, adjacent_brand_id);
end;
$$;

revoke all on function public.move_homepage_brand(uuid, text) from public, anon;
grant execute on function public.move_homepage_brand(uuid, text) to authenticated;
