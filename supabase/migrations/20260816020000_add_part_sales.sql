alter type public.activity_action add value if not exists 'part_sale_created';

create table if not exists public.part_sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  customer_name text,
  customer_phone text,
  customer_id uuid references public.customers(id) on delete set null,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  notes text,
  sold_by uuid references public.profiles(id) on delete set null,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.part_sales
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

create table if not exists public.part_sale_items (
  id uuid primary key default gen_random_uuid(),
  part_sale_id uuid not null references public.part_sales(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  sku_snapshot text not null,
  name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists part_sales_sold_at_idx on public.part_sales (sold_at desc);
create index if not exists part_sales_sold_by_idx on public.part_sales (sold_by);
create index if not exists part_sales_customer_idx on public.part_sales (customer_id);
create index if not exists part_sale_items_sale_idx on public.part_sale_items (part_sale_id);
create index if not exists part_sale_items_part_idx on public.part_sale_items (part_id);

alter table public.part_sales enable row level security;
alter table public.part_sale_items enable row level security;

drop policy if exists "Admins can read part sales" on public.part_sales;
create policy "Admins can read part sales"
  on public.part_sales for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active
        and p.role in ('developer', 'admin', 'manager')
    )
  );

drop policy if exists "Admins can insert part sales" on public.part_sales;
create policy "Admins can insert part sales"
  on public.part_sales for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active
        and p.role in ('developer', 'admin', 'manager')
    )
  );

drop policy if exists "Admins can read part sale items" on public.part_sale_items;
create policy "Admins can read part sale items"
  on public.part_sale_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active
        and p.role in ('developer', 'admin', 'manager')
    )
  );

drop policy if exists "Admins can insert part sale items" on public.part_sale_items;
create policy "Admins can insert part sale items"
  on public.part_sale_items for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active
        and p.role in ('developer', 'admin', 'manager')
    )
  );
