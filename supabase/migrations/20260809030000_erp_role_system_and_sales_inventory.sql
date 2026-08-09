-- OW Motors ERP: Role System, Sales, Inventory, Customers, Receipts, Activity Logs
-- Migration 1 of comprehensive backend implementation

-- =============================================
-- PART 1: EXTEND ROLE SYSTEM (developer/admin/manager/apprentice)
-- =============================================

-- Remove existing role constraint and extend to 4 roles
alter table public.profiles
  drop constraint if exists profiles_role_valid;

alter table public.profiles
  add constraint profiles_role_valid
  check (role in ('developer', 'admin', 'manager', 'apprentice'));

-- Update ProfileRole type will be handled in TS types; DB already stores text.

-- Drop old security definer helpers so we can redefine them for 4-role model
drop policy if exists profiles_own_read on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
drop policy if exists profiles_admin_insert on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists profiles_admin_delete on public.profiles;

-- Drop old content policies first (we'll recreate them with role-aware logic)
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'brands','categories','motorcycle_categories','motorcycles',
    'motorcycle_variants','motorcycle_images','motorcycle_specifications',
    'motorcycle_features','site_settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_staff_read', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_staff_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_staff_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_delete', table_name);
  end loop;
end;
$$;

drop function if exists private.is_staff() cascade;
drop function if exists private.is_admin() cascade;

-- =============================================
-- NEW SECURITY DEFINER HELPERS FOR 4 ROLES
-- =============================================

create or replace function private.is_developer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role = 'developer'
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role in ('developer', 'admin')
  );
$$;

create or replace function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role in ('developer', 'admin', 'manager')
  );
$$;

create or replace function private.is_apprentice()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role in ('developer', 'admin', 'manager', 'apprentice')
  );
$$;

-- Admin user management: admin+ only. Developer sees everything including SEO sections.
create or replace function private.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role in ('developer', 'admin')
  );
$$;

-- SEO/Content management: DEVELOPER ONLY (brands, categories, media, banners, homepage rows, storefront, blog)
create or replace function private.can_manage_seo_content()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role = 'developer'
  );
$$;

revoke all on function private.is_developer() from public, anon;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_manager() from public, anon;
revoke all on function private.is_apprentice() from public, anon;
revoke all on function private.can_manage_users() from public, anon;
revoke all on function private.can_manage_seo_content() from public, anon;

grant execute on function private.is_developer() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_manager() to authenticated;
grant execute on function private.is_apprentice() to authenticated;
grant execute on function private.can_manage_users() to authenticated;
grant execute on function private.can_manage_seo_content() to authenticated;

-- Keep existing helpers (for public queries and backward compat)
revoke all on function private.is_public_motorcycle(uuid) from public;
revoke all on function private.is_public_variant(uuid) from public;
grant execute on function private.is_public_motorcycle(uuid) to anon, authenticated;
grant execute on function private.is_public_variant(uuid) to anon, authenticated;

-- =============================================
-- PART 2: PROFILE TABLES - USER MANAGEMENT AUDIT
-- =============================================

-- Track created_by / revocations for admin user management
alter table public.profiles
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_password text null,   -- Admin-set initial password (visible to admin)
  add column if not exists revoked_at timestamptz null,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null;

-- Profiles policies:
-- 1. Everyone reads their own profile
create policy profiles_own_read
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

-- 2. Admin+/developer read ALL profiles (for user management)
create policy profiles_admin_read_all
on public.profiles
for select
to authenticated
using ((select private.can_manage_users()));

-- 3. Admin+/developer can create manager/apprentice profiles (cannot create developer)
create policy profiles_admin_insert_users
on public.profiles
for insert
to authenticated
with check (
  (select private.can_manage_users())
  and role in ('admin', 'manager', 'apprentice')
  -- Developers can only be created manually via Supabase dashboard (DB owner)
);

-- 4. Admin+/developer can update profiles (role, active, revoke)
create policy profiles_admin_update_users
on public.profiles
for update
to authenticated
using ((select private.can_manage_users()))
with check (
  (select private.can_manage_users())
  and role in ('admin', 'manager', 'apprentice')
);

-- 5. Admin+/developer can soft-deactivate (we use is_active + revoked; hard delete is service role)
create policy profiles_admin_deactivate
on public.profiles
for delete
to authenticated
using ((select private.is_developer()));

-- =============================================
-- PART 3: INVENTORY / STOCK MANAGEMENT TABLES
-- =============================================

-- 3a. PARTS / SPARE PARTS INVENTORY
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category text not null default 'general',
  unit text not null default 'each',
  current_stock integer not null default 0,
  reorder_level integer not null default 0,
  unit_cost numeric(12,2) not null default 0,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint parts_sku_valid check (sku = upper(sku) and sku ~ '^[A-Z0-9][A-Z0-9_-]*$'),
  constraint parts_name_valid check (char_length(btrim(name)) between 2 and 200),
  constraint parts_stock_valid check (current_stock >= 0),
  constraint parts_reorder_valid check (reorder_level >= 0),
  constraint parts_cost_valid check (unit_cost >= 0)
);

-- 3b. STOCK MOVEMENTS (for both motorcycles variants and parts, with approvals)
create type public.stock_movement_type as enum (
  'motorcycle_add',
  'motorcycle_subtract',
  'part_add',
  'part_subtract',
  'sale_deduction',
  'adjustment'
);

create type public.stock_approval_status as enum (
  'pending_approval',
  'approved',
  'rejected'
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_type public.stock_movement_type not null,
  reference text,
  motorcycle_variant_id uuid references public.motorcycle_variants(id) on delete restrict,
  part_id uuid references public.parts(id) on delete restrict,
  quantity integer not null,
  unit_cost_at_time numeric(12,2),
  reason text not null,
  notes text,
  approval_status public.stock_approval_status not null default 'pending_approval',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  applied boolean not null default false,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_movements_quantity_valid check (quantity > 0),
  constraint stock_movements_target_valid check (
    (movement_type in ('motorcycle_add','motorcycle_subtract','sale_deduction') and motorcycle_variant_id is not null and part_id is null)
    or (movement_type in ('part_add','part_subtract') and part_id is not null and motorcycle_variant_id is null)
    or (movement_type = 'adjustment' and ((motorcycle_variant_id is not null) != (part_id is not null)))
  ),
  constraint stock_movements_reason_valid check (char_length(btrim(reason)) between 3 and 500)
);

create index if not exists stock_movements_status_idx on public.stock_movements(approval_status);
create index if not exists stock_movements_variant_idx on public.stock_movements(motorcycle_variant_id);
create index if not exists stock_movements_part_idx on public.stock_movements(part_id);

-- =============================================
-- PART 4: CUSTOMERS, SALES, PAYMENTS, RECEIPTS
-- =============================================

-- 4a. CUSTOMERS
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  cnic text not null unique,
  full_name text not null,
  phone_primary text not null,
  phone_secondary text,
  email text,
  address text,
  city text,
  chasis_numbers text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint customers_cnic_valid check (cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]{1}$' or cnic ~ '^[0-9]{13}$'),
  constraint customers_name_valid check (char_length(btrim(full_name)) between 2 and 120),
  constraint customers_phone_valid check (phone_primary ~ '^[+]?[0-9][0-9 ()-]{6,24}$'),
  constraint customers_phone_secondary_valid check (phone_secondary is null or phone_secondary ~ '^[+]?[0-9][0-9 ()-]{6,24}$'),
  constraint customers_email_valid check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
);

create index if not exists customers_cnic_idx on public.customers(cnic);
create index if not exists customers_chasis_idx on public.customers using gin(chasis_numbers);

-- 4b. BANKS FOR PAYMENT TRACKING
create table if not exists public.banks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  account_title text,
  account_number text,
  iban text,
  branch text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banks_name_valid check (char_length(btrim(name)) between 2 and 100)
);

-- Seed common Pakistani banks
insert into public.banks (name, account_title, account_number, iban, branch, sort_order) values
  ('Cash', 'Over-the-Counter Cash', '', '', 'Showroom', 0),
  ('Habib Bank Limited (HBL)', '', '', '', '', 1),
  ('MCB Bank', '', '', '', '', 2),
  ('Allied Bank Limited (ABL)', '', '', '', '', 3),
  ('National Bank of Pakistan (NBP)', '', '', '', '', 4),
  ('United Bank Limited (UBL)', '', '', '', '', 5),
  ('Meezan Bank', '', '', '', '', 6),
  ('Bank Alfalah', '', '', '', '', 7),
  ('Standard Chartered', '', '', '', '', 8),
  ('Faysal Bank', '', '', '', '', 9),
  ('Bank Al-Habib', '', '', '', '', 10),
  ('Soneri Bank', '', '', '', '', 11),
  ('JS Bank', '', '', '', '', 12),
  ('Easypaisa', '', '', '', 'Mobile Wallet', 20),
  ('JazzCash', '', '', '', 'Mobile Wallet', 21),
  ('Sadapay', '', '', '', 'Mobile Wallet', 22)
on conflict (name) do nothing;

-- 4c. SALES (bike sale orders with approval workflow)
create type public.sale_status as enum (
  'pending_approval',
  'approved',
  'rejected',
  'completed'
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  motorcycle_variant_id uuid not null references public.motorcycle_variants(id) on delete restrict,
  motorcycle_name_snapshot text not null,
  brand_name_snapshot text not null,
  color_name_snapshot text not null,
  color_hex_snapshot text not null,
  cc_snapshot integer not null,
  chasis_number text not null,
  engine_number text,
  quantity_sold integer not null default 1,
  unit_price numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null,
  sale_status public.sale_status not null default 'pending_approval',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  completed_at timestamptz,
  stock_deducted boolean not null default false,
  receipt_generated boolean not null default false,
  receipt_generated_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_receipt_number_valid check (receipt_number ~ '^OWM-SALE-[0-9]{6,}$'),
  constraint sales_quantity_valid check (quantity_sold > 0),
  constraint sales_price_valid check (unit_price >= 0),
  constraint sales_discount_valid check (discount_amount >= 0 and discount_amount <= total_amount),
  constraint sales_total_valid check (total_amount >= 0),
  constraint sales_cc_valid check (cc_snapshot between 25 and 2500)
);

create index if not exists sales_status_idx on public.sales(sale_status);
create index if not exists sales_customer_idx on public.sales(customer_id);
create index if not exists sales_variant_idx on public.sales(motorcycle_variant_id);
create index if not exists sales_chasis_idx on public.sales(chasis_number);

-- 4d. PAYMENT SPLITS (multiple payment methods per sale)
create type public.payment_method as enum (
  'cash',
  'bank_transfer',
  'cheque',
  'demand_draft',
  'pay_order',
  'easypaisa',
  'jazzcash',
  'sadapay',
  'card',
  'other'
);

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  payment_method public.payment_method not null,
  bank_id uuid references public.banks(id) on delete set null,
  bank_name_snapshot text,
  transaction_reference text,
  instrument_number text,  -- cheque/DD/PO number
  amount numeric(12,2) not null,
  payment_date timestamptz not null default now(),
  depositor_name text,
  account_number_used text,
  notes text,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  constraint sale_payments_amount_valid check (amount > 0),
  constraint sale_payments_bank_valid check (
    (payment_method = 'cash') or
    (payment_method in ('easypaisa','jazzcash','sadapay','card','other')) or
    (payment_method in ('bank_transfer','cheque','demand_draft','pay_order') and bank_id is not null)
  )
);

create index if not exists sale_payments_sale_idx on public.sale_payments(sale_id);

-- 4e. RECEIPTS (standard format records, printable)
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null unique references public.sales(id) on delete restrict,
  receipt_number text not null unique,
  generated_by uuid not null references public.profiles(id) on delete restrict,
  generated_at timestamptz not null default now(),
  format_version text not null default 'v1-standard',
  qr_code_payload text,
  printed_count integer not null default 0,
  last_printed_at timestamptz,
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipts_number_valid check (receipt_number ~ '^OWM-RCPT-[0-9]{6,}$')
);

create index if not exists receipts_sale_idx on public.receipts(sale_id);

-- =============================================
-- PART 5: ACTIVITY LOGS (audit everything)
-- =============================================

create type public.activity_action as enum (
  'user_created',
  'user_revoked',
  'user_role_changed',
  'sale_requested',
  'sale_approved',
  'sale_rejected',
  'sale_completed',
  'payment_recorded',
  'receipt_generated',
  'receipt_printed',
  'stock_requested',
  'stock_approved',
  'stock_rejected',
  'stock_applied',
  'part_created',
  'part_updated',
  'customer_created',
  'customer_updated',
  'seo_content_updated',
  'login_success',
  'login_failure',
  'password_set_by_admin'
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  action public.activity_action not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role_snapshot text,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_action_idx on public.activity_logs(action);
create index if not exists activity_logs_actor_idx on public.activity_logs(actor_id);
create index if not exists activity_logs_created_idx on public.activity_logs(created_at desc);

-- =============================================
-- PART 6: TRIGGERS (updated_at, activity logs, stock applier)
-- =============================================

-- Reusable trigger for updated_at already exists at private.set_updated_at()

-- Apply it to all new tables
drop trigger if exists set_updated_at on public.parts;
create trigger set_updated_at before update on public.parts
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on public.stock_movements;
create trigger set_updated_at before update on public.stock_movements
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on public.customers;
create trigger set_updated_at before update on public.customers
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on public.banks;
create trigger set_updated_at before update on public.banks
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on public.sales;
create trigger set_updated_at before update on public.sales
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on public.sale_payments;
create trigger set_updated_at before update on public.sale_payments
for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on public.receipts;
create trigger set_updated_at before update on public.receipts
for each row execute function private.set_updated_at();

-- 6b. Function: Log activity helper (security definer so anyone can log)
create or replace function public.log_activity(
  p_action public.activity_action,
  p_target_table text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is not null then
    select role into v_actor_role from public.profiles where id = v_actor_id;
  end if;

  insert into public.activity_logs (
    action, actor_id, actor_role_snapshot,
    target_table, target_id, metadata
  ) values (
    p_action, v_actor_id, v_actor_role,
    p_target_table, p_target_id, p_metadata
  );
end;
$$;

revoke all on function public.log_activity(public.activity_action, text, uuid, jsonb) from public, anon;
grant execute on function public.log_activity(public.activity_action, text, uuid, jsonb) to authenticated;

-- 6c. Stock Approval → Trigger: apply stock change when approved
create or replace function private.apply_stock_movement()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_quantity_delta integer;
begin
  if new.approval_status = 'approved' and old.approval_status != 'approved' and not new.applied then
    if new.movement_type in ('motorcycle_add','part_add') then
      v_quantity_delta := new.quantity;
    elsif new.movement_type in ('motorcycle_subtract','part_subtract','sale_deduction','adjustment') then
      v_quantity_delta := -new.quantity;
    else
      v_quantity_delta := 0;
    end if;

    if new.motorcycle_variant_id is not null then
      update public.motorcycle_variants
      set quantity = greatest(0, quantity + v_quantity_delta),
          stock_status = case
            when greatest(0, quantity + v_quantity_delta) > 0 then 'in_stock'::text
            else 'out_of_stock'::text
          end
      where id = new.motorcycle_variant_id;
    end if;

    if new.part_id is not null then
      update public.parts
      set current_stock = greatest(0, current_stock + v_quantity_delta)
      where id = new.part_id;
    end if;

    new.applied := true;
    new.applied_at := now();

    perform public.log_activity(
      'stock_applied'::public.activity_action,
      'stock_movements', new.id,
      jsonb_build_object(
        'movement_type', new.movement_type,
        'quantity', new.quantity,
        'motorcycle_variant_id', new.motorcycle_variant_id,
        'part_id', new.part_id
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.apply_stock_movement() from public, anon;

drop trigger if exists trg_apply_stock_movement on public.stock_movements;
create trigger trg_apply_stock_movement before update on public.stock_movements
for each row execute function private.apply_stock_movement();

-- 6d. Sale Approved → Deduct Stock, Allow Receipt
create or replace function private.apply_sale_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_movement_id uuid;
begin
  if new.sale_status = 'approved'
     and old.sale_status != 'approved'
     and not new.stock_deducted then

    insert into public.stock_movements (
      movement_type, motorcycle_variant_id, quantity, reason,
      approval_status, requested_by, approved_by, approved_at, applied
    ) values (
      'sale_deduction',
      new.motorcycle_variant_id,
      new.quantity_sold,
      'Sale auto-deduction for receipt ' || new.receipt_number,
      'approved',
      new.requested_by,
      new.approved_by,
      coalesce(new.approved_at, now()),
      false  -- Let trigger apply it
    ) returning id into v_movement_id;

    -- Force apply immediately
    update public.stock_movements
    set approval_status = 'approved'
    where id = v_movement_id;

    new.stock_deducted := true;

    perform public.log_activity(
      'sale_approved'::public.activity_action,
      'sales', new.id,
      jsonb_build_object(
        'receipt_number', new.receipt_number,
        'total_amount', new.total_amount,
        'customer_id', new.customer_id,
        'variant_id', new.motorcycle_variant_id
      )
    );
  end if;

  if new.sale_status = 'rejected' and old.sale_status != 'rejected' then
    perform public.log_activity(
      'sale_rejected'::public.activity_action,
      'sales', new.id,
      jsonb_build_object(
        'receipt_number', new.receipt_number,
        'rejection_reason', new.rejection_reason
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.apply_sale_approval() from public, anon;

drop trigger if exists trg_apply_sale_approval on public.sales;
create trigger trg_apply_sale_approval before update on public.sales
for each row execute function private.apply_sale_approval();

-- 6e. Receipt generation audit
create or replace function private.on_receipt_generated()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.sales
  set receipt_generated = true,
      receipt_generated_at = now()
  where id = new.sale_id
    and not receipt_generated;

  perform public.log_activity(
    'receipt_generated'::public.activity_action,
    'receipts', new.id,
    jsonb_build_object(
      'receipt_number', new.receipt_number,
      'sale_id', new.sale_id
    )
  );
  return new;
end;
$$;

revoke all on function private.on_receipt_generated() from public, anon;

drop trigger if exists trg_on_receipt_generated on public.receipts;
create trigger trg_on_receipt_generated after insert on public.receipts
for each row execute function private.on_receipt_generated();

-- 6f. Register customer chasis number after sale completes
create or replace function private.link_chasis_to_customer_on_complete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sale_status = 'completed' and old.sale_status != 'completed' then
    update public.customers
    set chasis_numbers = array_cat(chasis_numbers, array[new.chasis_number]::text[])
    where id = new.customer_id
      and not (chasis_numbers @> array[new.chasis_number]::text[]);

    perform public.log_activity(
      'sale_completed'::public.activity_action,
      'sales', new.id,
      jsonb_build_object(
        'receipt_number', new.receipt_number,
        'chasis_number', new.chasis_number
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function private.link_chasis_to_customer_on_complete() from public, anon;

drop trigger if exists trg_link_chasis_to_customer on public.sales;
create trigger trg_link_chasis_to_customer after update on public.sales
for each row execute function private.link_chasis_to_customer_on_complete();

-- =============================================
-- PART 7: GRANTS AND RLS ENABLEMENT
-- =============================================

-- Revoke default to explicit
revoke all on table
  public.parts,
  public.stock_movements,
  public.customers,
  public.banks,
  public.sales,
  public.sale_payments,
  public.receipts,
  public.activity_logs
from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

-- Read banks & parts catalog (manager+ for ops; apprentice for availability)
grant select on table public.banks to authenticated;
grant select on table public.parts to authenticated;
grant insert, update on table public.parts to authenticated;   -- RLS will restrict

grant select, insert, update on table
  public.stock_movements,
  public.customers,
  public.sales,
  public.sale_payments,
  public.receipts
to authenticated;

grant select on table public.activity_logs to authenticated;
grant insert on table public.activity_logs to authenticated;  -- via function normally

-- Force RLS on all new tables
alter table public.parts enable row level security;
alter table public.parts force row level security;
alter table public.stock_movements enable row level security;
alter table public.stock_movements force row level security;
alter table public.customers enable row level security;
alter table public.customers force row level security;
alter table public.banks enable row level security;
alter table public.banks force row level security;
alter table public.sales enable row level security;
alter table public.sales force row level security;
alter table public.sale_payments enable row level security;
alter table public.sale_payments force row level security;
alter table public.receipts enable row level security;
alter table public.receipts force row level security;
alter table public.activity_logs enable row level security;
alter table public.activity_logs force row level security;

-- =============================================
-- PART 8: RLS POLICIES FOR NEW ERP TABLES
-- =============================================

-- 8a. BANKS (read-only to all authenticated; write = developer)
create policy banks_all_read
on public.banks
for select
to authenticated
using (is_active or (select private.is_developer()));

create policy banks_developer_write
on public.banks
for insert
to authenticated
with check ((select private.is_developer()));

create policy banks_developer_update
on public.banks
for update
to authenticated
using ((select private.is_developer()))
with check ((select private.is_developer()));

-- 8b. PARTS INVENTORY
-- Apprentice: read (stock numbers hidden? No - spec says apprentice sees only available/not)
-- Manager: read all + add/subtract requests, create parts
-- Admin: approve stock changes, see all
-- Developer: full

-- Read policy: apprentice sees is_active only (no qty yet - we handle qty masking in SQL views)
create policy parts_authenticated_read
on public.parts
for select
to authenticated
using (is_active or (select private.is_manager()));

-- Manager+ insert/update parts
create policy parts_manager_write
on public.parts
for insert
to authenticated
with check ((select private.is_manager()));

create policy parts_manager_update
on public.parts
for update
to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy parts_developer_delete
on public.parts
for delete
to authenticated
using ((select private.is_developer()));

-- 8c. STOCK MOVEMENTS
-- Apprentice: NONE (cannot request stock changes)
-- Manager: read own + create requests (pending), update own pending only
-- Admin: read all + approve/reject
-- Developer: full
create policy stock_movements_read
on public.stock_movements
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_manager())
    and requested_by = (select auth.uid())
  )
);

create policy stock_movements_manager_create
on public.stock_movements
for insert
to authenticated
with check (
  (select private.is_manager())
  and approval_status = 'pending_approval'
  and requested_by = (select auth.uid())
);

create policy stock_movements_manager_cancel_pending
on public.stock_movements
for update
to authenticated
using (
  (select private.is_manager())
  and requested_by = (select auth.uid())
  and approval_status = 'pending_approval'
)
with check (
  (select private.is_manager())
  and requested_by = (select auth.uid())
  and approval_status = 'pending_approval'
);

create policy stock_movements_admin_approve
on public.stock_movements
for update
to authenticated
using (
  (select private.is_admin())
  and approval_status = 'pending_approval'
)
with check (
  (select private.is_admin())
  and approval_status in ('approved','rejected')
  and approved_by = case when approval_status = 'approved' then (select auth.uid()) else approved_by end
);

-- 8d. CUSTOMERS
-- Apprentice: read (by CNIC or chasis) - no writes
-- Manager: read + create + update
-- Admin/Developer: full
create policy customers_read
on public.customers
for select
to authenticated
using ((select private.is_apprentice()));

create policy customers_manager_create
on public.customers
for insert
to authenticated
with check ((select private.is_manager()));

create policy customers_manager_update
on public.customers
for update
to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy customers_developer_delete
on public.customers
for delete
to authenticated
using ((select private.is_developer()));

-- 8e. SALES
-- Apprentice: NO access (cannot see sales)
-- Manager: read own + create pending; update own pending only
-- Admin: read all + approve/reject; see all
-- Developer: full
create policy sales_read
on public.sales
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_manager())
    and requested_by = (select auth.uid())
  )
);

create policy sales_manager_create
on public.sales
for insert
to authenticated
with check (
  (select private.is_manager())
  and sale_status = 'pending_approval'
  and requested_by = (select auth.uid())
);

create policy sales_manager_update_pending
on public.sales
for update
to authenticated
using (
  (select private.is_manager())
  and requested_by = (select auth.uid())
  and sale_status = 'pending_approval'
)
with check (
  (select private.is_manager())
  and requested_by = (select auth.uid())
  and sale_status = 'pending_approval'
);

create policy sales_admin_approve_reject
on public.sales
for update
to authenticated
using (
  (select private.is_admin())
  and sale_status = 'pending_approval'
)
with check (
  (select private.is_admin())
  and sale_status in ('approved','rejected')
  and (
    (sale_status = 'approved' and approved_by = (select auth.uid()))
    or (sale_status = 'rejected' and rejected_by = (select auth.uid()))
  )
);

-- Admin/manager mark completed (after receipt/payment done)
create policy sales_manager_admin_mark_complete
on public.sales
for update
to authenticated
using (
  (select private.is_admin())
  and sale_status = 'approved'
)
with check (
  (select private.is_admin())
  and sale_status in ('approved','completed')
);

-- 8f. SALE PAYMENTS - Manager records during processing; admin sees all
create policy sale_payments_read
on public.sale_payments
for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.sales as s
    where s.id = sale_id
      and (
        (select private.is_manager())
        and s.requested_by = (select auth.uid())
      )
  )
);

create policy sale_payments_manager_record
on public.sale_payments
for insert
to authenticated
with check (
  (select private.is_manager())
  and exists (
    select 1 from public.sales as s
    where s.id = sale_id
      and s.requested_by = (select auth.uid())
      and s.sale_status in ('pending_approval','approved')
  )
);

create policy sale_payments_manager_update
on public.sale_payments
for update
to authenticated
using (
  (select private.is_manager())
  and recorded_by = (select auth.uid())
)
with check (
  (select private.is_manager())
  and recorded_by = (select auth.uid())
);

-- 8g. RECEIPTS - See linked sale policy
create policy receipts_read
on public.receipts
for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.sales as s
    where s.id = sale_id
      and (
        (select private.is_manager())
        and s.requested_by = (select auth.uid())
      )
  )
);

create policy receipts_create_when_sale_approved
on public.receipts
for insert
to authenticated
with check (
  (select private.is_admin())
  and exists (
    select 1 from public.sales as s
    where s.id = sale_id
      and s.sale_status = 'approved'
  )
);

-- 8h. ACTIVITY LOGS - Admin+ read, everyone can insert their own actions
create policy activity_logs_admin_read
on public.activity_logs
for select
to authenticated
using ((select private.is_admin()));

create policy activity_logs_insert_own
on public.activity_logs
for insert
to authenticated
with check (
  (actor_id = (select auth.uid())) or (actor_id is null)
);

-- =============================================
-- PART 9: SEO / CONTENT RESTRICTION FOR ADMIN ROLE
-- =============================================
-- Requirement: Admin should NOT see: brands, categories, media/images (content storage),
-- banners, homepage rows, storefront content, blog. These are DEVELOPER ONLY.
-- (Public storefront reads by anon still work via public policies)

-- 9a. Re-create SEO-content policies (developer = old "staff" role for content tables)
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'brands',
    'categories',
    'motorcycle_categories',
    'motorcycles',
    'motorcycle_variants',
    'motorcycle_images',
    'motorcycle_specifications',
    'motorcycle_features',
    'site_settings',
    'brand_campaign_images',
    'homepage_brand_sections'
  ]
  loop
    -- Read: manager/apprentice see only public storefront scope via public policies.
    -- Developer-only read the backend content view (everything incl drafts/inactive).
    -- Admin: intentionally NOT given content access (except public-facing published).
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.can_manage_seo_content()))',
      table_name || '_developer_read',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.can_manage_seo_content()))',
      table_name || '_developer_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.can_manage_seo_content())) with check ((select private.can_manage_seo_content()))',
      table_name || '_developer_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.can_manage_seo_content()))',
      table_name || '_developer_delete',
      table_name
    );
  end loop;
end;
$$;

-- Manager/Admin see motorcycle stock via variants, but NOT via content tables direct.
-- We give them a stock-visibility policy on motorcycle_variants (for quantity + status only).
create policy motorcycle_variants_staff_stock_read
on public.motorcycle_variants
for select
to authenticated
using ((select private.is_apprentice()));

create policy motorcycles_staff_stock_read
on public.motorcycles
for select
to authenticated
using ((select private.is_apprentice()));

-- (Public policies for anon/frontend already exist and handle published-only.)

-- Also need contact_inquiries visible to manager/admin (apprentice no)
drop policy if exists contact_inquiries_staff_read on public.contact_inquiries;
create policy contact_inquiries_admin_manager_read
on public.contact_inquiries
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists contact_inquiries_staff_update on public.contact_inquiries;
create policy contact_inquiries_admin_update
on public.contact_inquiries
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- =============================================
-- PART 9B: RESTORE CASCADE-DROPPED POLICIES
--  (These were automatically dropped by "drop function ... cascade"
--   on line 44 since they referenced the old private.is_staff().
--   Re-create them with the new role-aware helper functions below.)
--
--  CRITICAL ROLE PARTITIONING RULE:
--   → SEO / STOREFRONT CONTENT → DEVELOPER ONLY (Admin never sees these)
--   → LEADS / AUDIT           → Developer + Admin
--   → PUBLIC IMAGES            → Public read + Developer read/write
-- =============================================

-- ---- SEO / STOREFRONT: DEVELOPER ONLY (Admin hidden per ERP spec) ----

-- brand_campaign_images
drop policy if exists brand_campaign_images_staff_read on public.brand_campaign_images;
drop policy if exists brand_campaign_images_staff_insert on public.brand_campaign_images;
drop policy if exists brand_campaign_images_staff_update on public.brand_campaign_images;
create policy brand_campaign_images_dev_read
on public.brand_campaign_images for select to authenticated
using ((select private.can_manage_seo_content()));
create policy brand_campaign_images_dev_insert
on public.brand_campaign_images for insert to authenticated
with check ((select private.can_manage_seo_content()));
create policy brand_campaign_images_dev_update
on public.brand_campaign_images for update to authenticated
using ((select private.can_manage_seo_content()))
with check ((select private.can_manage_seo_content()));

-- homepage_brand_sections
drop policy if exists homepage_brand_sections_staff_read on public.homepage_brand_sections;
drop policy if exists homepage_brand_sections_staff_insert on public.homepage_brand_sections;
drop policy if exists homepage_brand_sections_staff_update on public.homepage_brand_sections;
create policy homepage_brand_sections_dev_read
on public.homepage_brand_sections for select to authenticated
using ((select private.can_manage_seo_content()));
create policy homepage_brand_sections_dev_insert
on public.homepage_brand_sections for insert to authenticated
with check ((select private.can_manage_seo_content()));
create policy homepage_brand_sections_dev_update
on public.homepage_brand_sections for update to authenticated
using ((select private.can_manage_seo_content()))
with check ((select private.can_manage_seo_content()));

-- content_pages
drop policy if exists content_pages_staff_update on public.content_pages;
create policy content_pages_dev_update
on public.content_pages for update to authenticated
using ((select private.can_manage_seo_content()))
with check ((select private.can_manage_seo_content()));

-- content_sections
drop policy if exists content_sections_staff_read on public.content_sections;
drop policy if exists content_sections_staff_insert on public.content_sections;
drop policy if exists content_sections_staff_update on public.content_sections;
create policy content_sections_dev_read
on public.content_sections for select to authenticated
using ((select private.can_manage_seo_content()));
create policy content_sections_dev_insert
on public.content_sections for insert to authenticated
with check ((select private.can_manage_seo_content()));
create policy content_sections_dev_update
on public.content_sections for update to authenticated
using ((select private.can_manage_seo_content()))
with check ((select private.can_manage_seo_content()));

-- content_audit_events (DEVELOPER + ADMIN — Admin needs audit visibility)
drop policy if exists content_audit_staff_read on public.content_audit_events;
drop policy if exists content_audit_staff_insert on public.content_audit_events;
create policy content_audit_admin_read
on public.content_audit_events for select to authenticated
using ((select private.is_admin()));
create policy content_audit_admin_insert
on public.content_audit_events for insert to authenticated
with check ((select private.is_admin()));

-- blog_categories
drop policy if exists blog_categories_staff_read on public.blog_categories;
drop policy if exists blog_categories_staff_insert on public.blog_categories;
drop policy if exists blog_categories_staff_update on public.blog_categories;
create policy blog_categories_dev_read
on public.blog_categories for select to authenticated
using ((select private.can_manage_seo_content()));
create policy blog_categories_dev_insert
on public.blog_categories for insert to authenticated
with check ((select private.can_manage_seo_content()));
create policy blog_categories_dev_update
on public.blog_categories for update to authenticated
using ((select private.can_manage_seo_content()))
with check ((select private.can_manage_seo_content()));

-- blog_posts
drop policy if exists blog_posts_staff_read on public.blog_posts;
drop policy if exists blog_posts_staff_insert on public.blog_posts;
drop policy if exists blog_posts_staff_update on public.blog_posts;
create policy blog_posts_dev_read
on public.blog_posts for select to authenticated
using ((select private.can_manage_seo_content()));
create policy blog_posts_dev_insert
on public.blog_posts for insert to authenticated
with check ((select private.can_manage_seo_content()));
create policy blog_posts_dev_update
on public.blog_posts for update to authenticated
using ((select private.can_manage_seo_content()))
with check ((select private.can_manage_seo_content()));

-- newsletter_subscriptions (Developer + Admin — Admin sees lead list)
drop policy if exists newsletter_subscriptions_staff_read on public.newsletter_subscriptions;
drop policy if exists newsletter_subscriptions_staff_update on public.newsletter_subscriptions;
create policy newsletter_subscriptions_admin_read
on public.newsletter_subscriptions for select to authenticated
using ((select private.is_admin()));
create policy newsletter_subscriptions_admin_update
on public.newsletter_subscriptions for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- ---- STORAGE.OBJECTS (motorcycles bucket media — DEVELOPER ONLY write, public read) ----
drop policy if exists motorcycles_storage_staff_read on storage.objects;
drop policy if exists motorcycles_storage_staff_insert on storage.objects;
drop policy if exists motorcycles_storage_staff_update on storage.objects;
create policy motorcycles_storage_public_read
on storage.objects for select
to public
using (bucket_id = 'motorcycles');
create policy motorcycles_storage_dev_write
on storage.objects for insert to authenticated
with check (bucket_id = 'motorcycles' and (select private.can_manage_seo_content()));
create policy motorcycles_storage_dev_update
on storage.objects for update to authenticated
using (bucket_id = 'motorcycles' and (select private.can_manage_seo_content()))
with check (bucket_id = 'motorcycles' and (select private.can_manage_seo_content()));
create policy motorcycles_storage_dev_delete
on storage.objects for delete to authenticated
using (bucket_id = 'motorcycles' and (select private.can_manage_seo_content()));

-- =============================================
-- PART 10: SEQUENCES / RECEIPT NUMBER HELPERS
-- =============================================

create or replace function public.generate_receipt_number(p_prefix text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seq bigint;
  v_date text;
begin
  v_date := to_char(now(), 'YYMMDD');
  v_seq := (
    select coalesce(max(substring(receipt_number from '[0-9]{6,}$')::bigint), 0) + 1
    from (
      select receipt_number from public.sales where receipt_number like p_prefix || '%'
      union all
      select receipt_number from public.receipts where receipt_number like replace(p_prefix, 'SALE', 'RCPT') || '%'
    ) as x
    where receipt_number ~ p_prefix || v_date || '[0-9]+$'
  );
  return p_prefix || v_date || lpad(v_seq::text, 4, '0');
end;
$$;

revoke all on function public.generate_receipt_number(text) from public, anon;
grant execute on function public.generate_receipt_number(text) to authenticated;
