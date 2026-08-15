alter table public.part_sales
  add column if not exists sale_status text not null default 'pending_approval' check (sale_status in ('pending_approval', 'approved', 'rejected', 'completed')),
  add column if not exists payment_method public.payment_method not null default 'cash',
  add column if not exists bank_id uuid references public.banks(id) on delete set null,
  add column if not exists bank_name_snapshot text,
  add column if not exists transaction_reference text,
  add column if not exists paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists stock_deducted boolean not null default false,
  add column if not exists receipt_generated boolean not null default false,
  add column if not exists receipt_generated_at timestamptz;

create index if not exists part_sales_status_idx on public.part_sales (sale_status);
create index if not exists part_sales_bank_idx on public.part_sales (bank_id);

alter type public.activity_action add value if not exists 'part_sale_approved';
alter type public.activity_action add value if not exists 'part_sale_rejected';
alter type public.activity_action add value if not exists 'part_receipt_generated';