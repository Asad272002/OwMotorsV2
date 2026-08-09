create or replace function public.import_motorcycle_inventory(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
begin
  if not (select private.is_staff()) then
    raise exception 'Active staff access is required.' using errcode = '42501';
  end if;

  for item in select value from jsonb_array_elements(coalesce(payload->'motorcycles', '[]'::jsonb)) loop
    insert into public.motorcycles (id, brand_id, name, slug, short_description, full_description, publication_status, is_featured, base_price, seo_title, seo_description)
    values ((item->>'id')::uuid, (item->>'brand_id')::uuid, item->>'name', item->>'slug', item->>'short_description', item->>'full_description', 'draft', (item->>'is_featured')::boolean, (item->>'base_price')::numeric, nullif(item->>'seo_title', ''), nullif(item->>'seo_description', ''));
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload->'category_links', '[]'::jsonb)) loop
    insert into public.motorcycle_categories (motorcycle_id, category_id)
    values ((item->>'motorcycle_id')::uuid, (item->>'category_id')::uuid);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload->'variants', '[]'::jsonb)) loop
    insert into public.motorcycle_variants (id, motorcycle_id, cc, color_name, color_hex, price, stock_status, quantity, is_default, is_active)
    values ((item->>'id')::uuid, (item->>'motorcycle_id')::uuid, (item->>'cc')::integer, item->>'color_name', item->>'color_hex', (item->>'price')::numeric, item->>'stock_status', (item->>'quantity')::integer, (item->>'is_default')::boolean, (item->>'is_active')::boolean);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload->'specifications', '[]'::jsonb)) loop
    insert into public.motorcycle_specifications (motorcycle_id, variant_id, group_name, label, value, unit, sort_order)
    values ((item->>'motorcycle_id')::uuid, nullif(item->>'variant_id', '')::uuid, item->>'group_name', item->>'label', item->>'value', nullif(item->>'unit', ''), (item->>'sort_order')::integer);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload->'features', '[]'::jsonb)) loop
    insert into public.motorcycle_features (motorcycle_id, group_name, title, description, icon_identifier, sort_order)
    values ((item->>'motorcycle_id')::uuid, item->>'group_name', item->>'title', item->>'description', nullif(item->>'icon_identifier', ''), (item->>'sort_order')::integer);
  end loop;

  return jsonb_build_object(
    'motorcycles_created', jsonb_array_length(coalesce(payload->'motorcycles', '[]'::jsonb)),
    'variants_created', jsonb_array_length(coalesce(payload->'variants', '[]'::jsonb)),
    'specifications_created', jsonb_array_length(coalesce(payload->'specifications', '[]'::jsonb)),
    'features_created', jsonb_array_length(coalesce(payload->'features', '[]'::jsonb))
  );
end;
$$;

revoke all on function public.import_motorcycle_inventory(jsonb) from public, anon;
grant execute on function public.import_motorcycle_inventory(jsonb) to authenticated;
