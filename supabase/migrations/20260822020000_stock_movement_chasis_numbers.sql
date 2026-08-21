alter table public.stock_movements
  add column if not exists requested_chasis_numbers text[] not null default '{}';

create index if not exists stock_movements_requested_chasis_numbers_idx
  on public.stock_movements using gin (requested_chasis_numbers);
