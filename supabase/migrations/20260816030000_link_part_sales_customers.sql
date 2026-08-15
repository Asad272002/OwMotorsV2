alter table public.part_sales
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

create index if not exists part_sales_customer_idx on public.part_sales (customer_id);