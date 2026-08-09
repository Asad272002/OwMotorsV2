-- ====================================================================
--  OW MOTORS ERP — CORE POLICIES PATCH  (PASTE INTO SQL EDITOR)
-- ====================================================================
--  Problem:  "DROP FUNCTION private.is_staff() CASCADE" accidentally
--            destroyed 26+ content policies + also "DROP FUNCTION
--            private.is_admin() CASCADE" destroyed policies that
--            referenced the old is_admin() helper BEFORE we re-defined
--            it a few lines later.
--
--  Symptom:  Any login (manager/admin/apprentice/developer) returns:
--            "This account does not have active OW Motors dashboard
--             access." even though the public.profiles row EXISTS
--            with is_active=true and correct role. This is because
--            profiles self-read policy + related policies got dropped
--            by CASCADE chain → server select * from profiles where
--            id=auth.uid() returns NULL.
--
--  Fix:      Run this SQL ONCE in Supabase dashboard → SQL Editor.
--            Returns "Success" instantly. Then logins will work.
-- ====================================================================

-- First: make sure RLS is ENABLED + FORCED on every core table
alter table public.profiles           enable row level security;
alter table public.banks              enable row level security;
alter table public.parts              enable row level security;
alter table public.stock_movements    enable row level security;
alter table public.customers          enable row level security;
alter table public.sales              enable row level security;
alter table public.sale_payments      enable row level security;
alter table public.receipts           enable row level security;
alter table public.activity_logs      enable row level security;
alter table public.motorcycle_variants enable row level security;
alter table public.motorcycles        enable row level security;
alter table public.contact_inquiries  enable row level security;

alter table public.profiles           force row level security;
alter table public.banks              force row level security;
alter table public.parts              force row level security;
alter table public.stock_movements    force row level security;
alter table public.customers          force row level security;
alter table public.sales              force row level security;
alter table public.sale_payments      force row level security;
alter table public.receipts           force row level security;
alter table public.activity_logs      force row level security;
alter table public.motorcycle_variants force row level security;
alter table public.motorcycles        force row level security;
alter table public.contact_inquiries  force row level security;

-- ====================================================================
--  1. PROFILES (5 policies — read-own, admin all, insert/update/soft)
-- ====================================================================
drop policy if exists profiles_own_read                 on public.profiles;
drop policy if exists profiles_admin_read_all           on public.profiles;
drop policy if exists profiles_admin_insert_users       on public.profiles;
drop policy if exists profiles_admin_update_users       on public.profiles;
drop policy if exists profiles_admin_deactivate         on public.profiles;

create policy profiles_own_read
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_admin_read_all
on public.profiles
for select
to authenticated
using ((select private.can_manage_users()));

create policy profiles_admin_insert_users
on public.profiles
for insert
to authenticated
with check (
  (select private.can_manage_users())
  and role in ('admin', 'manager', 'apprentice')
);

create policy profiles_admin_update_users
on public.profiles
for update
to authenticated
using ((select private.can_manage_users()))
with check (
  (select private.can_manage_users())
  and role in ('admin', 'manager', 'apprentice')
);

create policy profiles_admin_deactivate
on public.profiles
for delete
to authenticated
using ((select private.is_developer()));

-- ====================================================================
--  2. BANKS (3 policies — everyone reads, developer writes)
-- ====================================================================
drop policy if exists banks_all_read            on public.banks;
drop policy if exists banks_developer_write     on public.banks;
drop policy if exists banks_developer_update    on public.banks;

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

-- ====================================================================
--  3. PARTS (4 policies — everyone reads, manager writes, developer deletes)
-- ====================================================================
drop policy if exists parts_authenticated_read   on public.parts;
drop policy if exists parts_manager_write        on public.parts;
drop policy if exists parts_manager_update       on public.parts;
drop policy if exists parts_developer_delete     on public.parts;

create policy parts_authenticated_read
on public.parts
for select
to authenticated
using (is_active or (select private.is_manager()));

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

-- ====================================================================
--  4. STOCK MOVEMENTS — manager creates pending; admin approves
-- ====================================================================
drop policy if exists stock_movements_read                   on public.stock_movements;
drop policy if exists stock_movements_manager_create         on public.stock_movements;
drop policy if exists stock_movements_manager_cancel_pending on public.stock_movements;
drop policy if exists stock_movements_admin_approve          on public.stock_movements;

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

-- ====================================================================
--  5. CUSTOMERS — apprentice read-only; manager create/update; developer delete
-- ====================================================================
drop policy if exists customers_read               on public.customers;
drop policy if exists customers_manager_create     on public.customers;
drop policy if exists customers_manager_update     on public.customers;
drop policy if exists customers_developer_delete   on public.customers;

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

-- ====================================================================
--  6. SALES — manager creates pending; admin approves/rejects/completes
--              (also manager/admin can mark "completed")
-- ====================================================================
drop policy if exists sales_read                      on public.sales;
drop policy if exists sales_manager_create            on public.sales;
drop policy if exists sales_manager_update_pending    on public.sales;
drop policy if exists sales_admin_approve_reject      on public.sales;
drop policy if exists sales_manager_admin_mark_complete on public.sales;

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

-- FIXED from original migration: ALLOWS MANAGER + ADMIN to mark completed
create policy sales_manager_admin_mark_complete
on public.sales
for update
to authenticated
using (
  (
    (select private.is_admin())
    or (
      (select private.is_manager())
      and requested_by = (select auth.uid())
    )
  )
  and sale_status = 'approved'
)
with check (
  (
    (select private.is_admin())
    or (
      (select private.is_manager())
      and requested_by = (select auth.uid())
    )
  )
  and sale_status in ('approved','completed')
);

-- ====================================================================
--  7. SALE PAYMENTS — manager records; admin sees all
-- ====================================================================
drop policy if exists sale_payments_read             on public.sale_payments;
drop policy if exists sale_payments_manager_record   on public.sale_payments;
drop policy if exists sale_payments_manager_update   on public.sale_payments;

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

-- ====================================================================
--  8. RECEIPTS — admin creates on approved sales; admin/owning manager sees
-- ====================================================================
drop policy if exists receipts_read                     on public.receipts;
drop policy if exists receipts_create_when_sale_approved on public.receipts;

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

-- ====================================================================
--  9. ACTIVITY LOGS — admin+ read; any authenticated user inserts own
-- ====================================================================
drop policy if exists activity_logs_admin_read   on public.activity_logs;
drop policy if exists activity_logs_insert_own   on public.activity_logs;

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

-- ====================================================================
--  10. MOTORCYCLES + VARIANTS — backend stock read for manager/apprentice
--      (Published motorcycles + variant availability)
-- ====================================================================
drop policy if exists motorcycle_variants_staff_stock_read  on public.motorcycle_variants;
drop policy if exists motorcycles_staff_stock_read          on public.motorcycles;

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

-- ====================================================================
--  11. CONTACT INQUIRIES — admin+manager read; admin updates
-- ====================================================================
drop policy if exists contact_inquiries_admin_manager_read  on public.contact_inquiries;
drop policy if exists contact_inquiries_admin_update        on public.contact_inquiries;

create policy contact_inquiries_admin_manager_read
on public.contact_inquiries
for select
to authenticated
using ((select private.is_admin()));

create policy contact_inquiries_admin_update
on public.contact_inquiries
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- ====================================================================
--  FINISHED — All core ERP policies now restored.
--
--  Next: Go to Auth → Logout all sessions, then re-login with:
--    manager@owmotors.pk   / Manager@2026!
--    admin@owmotors.pk     / Admin@2026!
--    developer@owmotors.pk / Developer@2026!
--    apprentice@owmotors.pk / Apprentice@2026!
-- ====================================================================
