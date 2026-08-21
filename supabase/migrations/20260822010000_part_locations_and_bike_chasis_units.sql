alter table public.parts
  add column if not exists carton_number text,
  add column if not exists compatible_cc integer check (compatible_cc is null or compatible_cc > 0);

create index if not exists parts_carton_number_idx
  on public.parts (carton_number)
  where carton_number is not null;

create index if not exists parts_compatible_cc_idx
  on public.parts (compatible_cc)
  where compatible_cc is not null;

create table if not exists public.motorcycle_stock_units (
  id uuid primary key default gen_random_uuid(),
  motorcycle_variant_id uuid not null references public.motorcycle_variants(id) on delete cascade,
  chasis_number text not null,
  status text not null default 'available'
    check (status in ('available', 'reserved', 'sold', 'archived')),
  sale_id uuid references public.sales(id) on delete set null,
  added_by uuid references public.profiles(id) on delete set null,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists motorcycle_stock_units_chasis_unique_idx
  on public.motorcycle_stock_units (upper(chasis_number));

create index if not exists motorcycle_stock_units_variant_status_idx
  on public.motorcycle_stock_units (motorcycle_variant_id, status);

create index if not exists motorcycle_stock_units_sale_idx
  on public.motorcycle_stock_units (sale_id)
  where sale_id is not null;

alter table public.sales
  add column if not exists motorcycle_stock_unit_id uuid references public.motorcycle_stock_units(id) on delete set null;

create unique index if not exists sales_motorcycle_stock_unit_unique_idx
  on public.sales (motorcycle_stock_unit_id)
  where motorcycle_stock_unit_id is not null;

alter table public.motorcycle_stock_units enable row level security;

drop policy if exists "ERP users can read motorcycle stock units" on public.motorcycle_stock_units;
create policy "ERP users can read motorcycle stock units"
  on public.motorcycle_stock_units for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active
        and p.role in ('developer', 'admin', 'manager', 'apprentice')
    )
  );

drop policy if exists "Managers can manage motorcycle stock units" on public.motorcycle_stock_units;
create policy "Managers can manage motorcycle stock units"
  on public.motorcycle_stock_units for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active
        and p.role in ('developer', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active
        and p.role in ('developer', 'admin', 'manager')
    )
  );
