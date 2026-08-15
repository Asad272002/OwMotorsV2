alter table public.parts
  add column if not exists compatible_brand_id uuid references public.brands(id) on delete set null,
  add column if not exists compatible_motorcycle_id uuid references public.motorcycles(id) on delete set null;

create index if not exists parts_compatible_brand_idx
  on public.parts (compatible_brand_id)
  where compatible_brand_id is not null;

create index if not exists parts_compatible_motorcycle_idx
  on public.parts (compatible_motorcycle_id)
  where compatible_motorcycle_id is not null;
