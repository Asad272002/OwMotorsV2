begin;

alter table public.motorcycles
  drop constraint if exists motorcycles_brand_model_code_unique,
  drop constraint if exists motorcycles_model_code_valid,
  drop column if exists model_code;

alter table public.motorcycle_variants
  drop constraint if exists motorcycle_variants_sku_key,
  drop constraint if exists motorcycle_variants_sku_valid,
  drop column if exists sku;

commit;
