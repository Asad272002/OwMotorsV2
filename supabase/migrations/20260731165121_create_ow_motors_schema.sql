-- OW Motors core database schema.
-- This migration is additive and intentionally contains no destructive statements.

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_valid check (char_length(btrim(full_name)) between 2 and 120),
  constraint profiles_role_valid check (role in ('admin', 'editor'))
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_path text,
  short_description text not null,
  full_description text not null,
  hero_image_path text,
  seo_title text,
  seo_description text,
  is_active boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_name_valid check (char_length(btrim(name)) between 2 and 100),
  constraint brands_slug_valid check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint brands_short_description_valid check (char_length(btrim(short_description)) between 10 and 320),
  constraint brands_full_description_valid check (char_length(btrim(full_description)) >= 20),
  constraint brands_logo_path_valid check (logo_path is null or (btrim(logo_path) <> '' and logo_path !~ '(^/|[.][.])')),
  constraint brands_hero_image_path_valid check (hero_image_path is null or (btrim(hero_image_path) <> '' and hero_image_path !~ '(^/|[.][.])')),
  constraint brands_seo_title_valid check (seo_title is null or char_length(btrim(seo_title)) between 10 and 70),
  constraint brands_seo_description_valid check (seo_description is null or char_length(btrim(seo_description)) between 50 and 180),
  constraint brands_display_order_valid check (display_order >= 0)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  seo_title text,
  seo_description text,
  is_active boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_valid check (char_length(btrim(name)) between 2 and 100),
  constraint categories_slug_valid check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_description_valid check (char_length(btrim(description)) >= 20),
  constraint categories_seo_title_valid check (seo_title is null or char_length(btrim(seo_title)) between 10 and 70),
  constraint categories_seo_description_valid check (seo_description is null or char_length(btrim(seo_description)) between 50 and 180),
  constraint categories_display_order_valid check (display_order >= 0)
);

create table public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  name text not null,
  slug text not null,
  short_description text not null,
  full_description text not null,
  model_code text not null,
  publication_status text not null default 'draft',
  is_featured boolean not null default false,
  base_price numeric(12, 2) not null,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint motorcycles_brand_slug_unique unique (brand_id, slug),
  constraint motorcycles_brand_model_code_unique unique (brand_id, model_code),
  constraint motorcycles_name_valid check (char_length(btrim(name)) between 2 and 140),
  constraint motorcycles_slug_valid check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint motorcycles_short_description_valid check (char_length(btrim(short_description)) between 10 and 320),
  constraint motorcycles_full_description_valid check (char_length(btrim(full_description)) >= 20),
  constraint motorcycles_model_code_valid check (model_code ~ '^[A-Z0-9][A-Z0-9._/-]*$'),
  constraint motorcycles_publication_status_valid check (publication_status in ('draft', 'published', 'archived')),
  constraint motorcycles_base_price_valid check (base_price >= 0),
  constraint motorcycles_seo_title_valid check (seo_title is null or char_length(btrim(seo_title)) between 10 and 70),
  constraint motorcycles_seo_description_valid check (seo_description is null or char_length(btrim(seo_description)) between 50 and 180)
);

create table public.motorcycle_categories (
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (motorcycle_id, category_id)
);

create table public.motorcycle_variants (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  cc integer not null,
  color_name text not null,
  color_hex text not null,
  price numeric(12, 2) not null,
  sku text not null unique,
  stock_status text not null default 'out_of_stock',
  quantity integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint motorcycle_variants_id_motorcycle_unique unique (id, motorcycle_id),
  constraint motorcycle_variants_cc_valid check (cc between 25 and 2500),
  constraint motorcycle_variants_color_name_valid check (char_length(btrim(color_name)) between 2 and 80),
  constraint motorcycle_variants_color_hex_valid check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  constraint motorcycle_variants_price_valid check (price >= 0),
  constraint motorcycle_variants_sku_valid check (sku = upper(sku) and sku ~ '^[A-Z0-9][A-Z0-9_-]*$'),
  constraint motorcycle_variants_stock_status_valid check (stock_status in ('in_stock', 'out_of_stock', 'coming_soon', 'discontinued')),
  constraint motorcycle_variants_quantity_valid check (quantity >= 0),
  constraint motorcycle_variants_default_active check (not is_default or is_active),
  constraint motorcycle_variants_stock_quantity_consistent check (
    (stock_status = 'in_stock' and quantity > 0)
    or (stock_status in ('out_of_stock', 'coming_soon', 'discontinued') and quantity = 0)
  )
);

create table public.motorcycle_images (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  variant_id uuid,
  storage_path text not null,
  alt_text text not null,
  image_type text not null default 'gallery',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint motorcycle_images_variant_motorcycle_fkey foreign key (variant_id, motorcycle_id)
    references public.motorcycle_variants (id, motorcycle_id) on delete cascade,
  constraint motorcycle_images_storage_path_unique unique (storage_path),
  constraint motorcycle_images_storage_path_valid check (btrim(storage_path) <> '' and storage_path !~ '(^/|[.][.])'),
  constraint motorcycle_images_alt_text_valid check (char_length(btrim(alt_text)) between 3 and 240),
  constraint motorcycle_images_type_valid check (image_type in ('gallery', 'hero', 'thumbnail', 'color', 'overview', 'open_graph')),
  constraint motorcycle_images_sort_order_valid check (sort_order >= 0)
);

create table public.motorcycle_specifications (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  variant_id uuid,
  group_name text not null,
  label text not null,
  value text not null,
  unit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint motorcycle_specifications_variant_motorcycle_fkey foreign key (variant_id, motorcycle_id)
    references public.motorcycle_variants (id, motorcycle_id) on delete cascade,
  constraint motorcycle_specifications_group_name_valid check (char_length(btrim(group_name)) between 2 and 100),
  constraint motorcycle_specifications_label_valid check (char_length(btrim(label)) between 1 and 120),
  constraint motorcycle_specifications_value_valid check (char_length(btrim(value)) between 1 and 500),
  constraint motorcycle_specifications_unit_valid check (unit is null or char_length(btrim(unit)) between 1 and 40),
  constraint motorcycle_specifications_sort_order_valid check (sort_order >= 0)
);

create table public.motorcycle_features (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  group_name text not null,
  title text not null,
  description text not null,
  icon_identifier text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint motorcycle_features_group_title_unique unique (motorcycle_id, group_name, title),
  constraint motorcycle_features_group_name_valid check (char_length(btrim(group_name)) between 2 and 100),
  constraint motorcycle_features_title_valid check (char_length(btrim(title)) between 2 and 140),
  constraint motorcycle_features_description_valid check (char_length(btrim(description)) between 10 and 1000),
  constraint motorcycle_features_icon_identifier_valid check (icon_identifier is null or icon_identifier ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint motorcycle_features_sort_order_valid check (sort_order >= 0)
);

create table public.test_ride_requests (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete restrict,
  variant_id uuid,
  full_name text not null,
  phone text not null,
  email text,
  preferred_date date,
  preferred_time time,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_ride_requests_variant_motorcycle_fkey foreign key (variant_id, motorcycle_id)
    references public.motorcycle_variants (id, motorcycle_id) on delete restrict,
  constraint test_ride_requests_full_name_valid check (char_length(btrim(full_name)) between 2 and 120),
  constraint test_ride_requests_phone_valid check (phone ~ '^[+]?[0-9][0-9 ()-]{6,24}$'),
  constraint test_ride_requests_email_valid check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint test_ride_requests_message_valid check (message is null or char_length(btrim(message)) between 1 and 2000),
  constraint test_ride_requests_status_valid check (status in ('new', 'contacted', 'scheduled', 'completed', 'cancelled', 'spam'))
);

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_inquiries_full_name_valid check (char_length(btrim(full_name)) between 2 and 120),
  constraint contact_inquiries_phone_valid check (phone is null or phone ~ '^[+]?[0-9][0-9 ()-]{6,24}$'),
  constraint contact_inquiries_email_valid check (email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint contact_inquiries_subject_valid check (char_length(btrim(subject)) between 2 and 180),
  constraint contact_inquiries_message_valid check (char_length(btrim(message)) between 10 and 4000),
  constraint contact_inquiries_status_valid check (status in ('new', 'in_progress', 'resolved', 'closed', 'spam'))
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_key_valid check (setting_key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint site_settings_description_valid check (description is null or char_length(btrim(description)) between 1 and 500)
);

-- Foreign-key and common public query indexes.
create index motorcycles_brand_id_idx on public.motorcycles (brand_id);
create index motorcycles_public_catalog_idx on public.motorcycles (brand_id, is_featured, updated_at desc)
  where publication_status = 'published';
create index motorcycle_categories_category_id_idx on public.motorcycle_categories (category_id);
create index motorcycle_variants_motorcycle_id_idx on public.motorcycle_variants (motorcycle_id);
create unique index motorcycle_variants_combination_unique_idx
  on public.motorcycle_variants (motorcycle_id, cc, lower(color_name));
create index motorcycle_variants_public_idx on public.motorcycle_variants (motorcycle_id, price)
  where is_active;
create unique index motorcycle_variants_one_active_default_idx on public.motorcycle_variants (motorcycle_id)
  where is_default and is_active;
create index motorcycle_images_motorcycle_id_idx on public.motorcycle_images (motorcycle_id, sort_order);
create index motorcycle_images_variant_id_idx on public.motorcycle_images (variant_id) where variant_id is not null;
create unique index motorcycle_images_one_product_primary_idx on public.motorcycle_images (motorcycle_id)
  where is_primary and variant_id is null;
create unique index motorcycle_images_one_variant_primary_idx on public.motorcycle_images (variant_id)
  where is_primary and variant_id is not null;
create index motorcycle_specifications_motorcycle_id_idx on public.motorcycle_specifications (motorcycle_id, sort_order);
create index motorcycle_specifications_variant_id_idx on public.motorcycle_specifications (variant_id) where variant_id is not null;
create unique index motorcycle_specifications_product_unique_idx
  on public.motorcycle_specifications (motorcycle_id, group_name, label) where variant_id is null;
create unique index motorcycle_specifications_variant_unique_idx
  on public.motorcycle_specifications (variant_id, group_name, label) where variant_id is not null;
create index motorcycle_features_motorcycle_id_idx on public.motorcycle_features (motorcycle_id, sort_order);
create index test_ride_requests_motorcycle_id_idx on public.test_ride_requests (motorcycle_id);
create index test_ride_requests_variant_id_idx on public.test_ride_requests (variant_id) where variant_id is not null;
create index test_ride_requests_workflow_idx on public.test_ride_requests (status, created_at desc);
create index contact_inquiries_workflow_idx on public.contact_inquiries (status, created_at desc);

-- Apply a single updated_at implementation to every mutable record type.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'brands', 'categories', 'motorcycles', 'motorcycle_variants',
    'motorcycle_images', 'motorcycle_specifications', 'motorcycle_features',
    'test_ride_requests', 'contact_inquiries', 'site_settings'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end;
$$;
