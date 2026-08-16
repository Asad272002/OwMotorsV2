# OW Motors ERP and Website

OW Motors is a Next.js App Router project for a multi-brand motorcycle dealership in Pakistan. It includes a public SEO-focused motorcycle website and a protected admin ERP for catalog, stock, sales, receipts, users, inquiries, media, and activity logs.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL, Auth, Storage, and RLS
- Server Actions for admin workflows
- Zod validation
- Lucide React icons

## Main Areas

- Public website: homepage, brands, categories, motorcycle catalog, motorcycle detail pages, blog, about, contact.
- Admin catalog: brands, categories, motorcycles, variants, media, homepage/storefront content.
- Admin ERP: customers, bike sales, part sales, approvals, receipts, stock availability, stock movements, spare parts, users/access, settings, activity logs.
- Audit trail: activity logs record who performed each important ERP action, the target record, and useful context such as bike, chasis, customer, payment, approval, stock, and receipt details.

## ERP Workflow Highlights

- Sell Bike uses a guided checked workflow: bike/customer, payment, then approval submission.
- Bike sales require live chasis uniqueness checks before Step 1 can complete.
- Bike sales cannot proceed if selected stock is zero or requested quantity is above available stock.
- Sale creation creates a pending record only after customer, chasis, stock, and payment checks pass.
- Admin approval performs the final stock deduction and unlocks receipt generation.
- Sell Spare Parts supports cart-style part selection, existing/new customer linking, payment method/bank reference, approval, stock deduction, and receipt generation.
- All Sales shows bike and spare-part sales in one searchable register with type and status filters.
- Customers can be searched by CNIC, phone, chasis, sale number, bike sale history, or spare-part SKU/name.
- Stock Availability separates bike and spare-part availability into searchable modern tabs.

## Project Structure

```text
src/app/(site)                         Public website routes
src/app/admin/(protected)              Authenticated admin routes
src/app/admin/erp-actions              Split ERP server actions
src/components/admin                   Shared admin shell, forms, and UI
src/lib/admin                          Admin action helpers and runtime utilities
src/lib/erp                            ERP data queries and types
src/lib/supabase                       Supabase clients, auth, storage, generated DB types
supabase/migrations                    Database schema, RLS, and feature migrations
public                                 Static assets
```

## Environment Variables

Create `.env.local` with the Supabase project values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in client components, browser code, logs, or committed files. It is used only by server-side admin workflows that need privileged writes.

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/admin
```

## Database Migrations

Supabase migrations live in `supabase/migrations`. Apply them in timestamp order for a fresh project.

Recent ERP migrations that must exist in the database:

```text
20260809030000_erp_role_system_and_sales_inventory.sql
20260816010000_add_part_compatibility.sql
20260816020000_add_part_sales.sql
20260816030000_link_part_sales_customers.sql
20260816040000_part_sales_approval_payments.sql
```

The generated TypeScript database types live in:

```text
src/lib/supabase/database.types.ts
```

Keep RLS enabled. Public visitors should only read published/active content and submit safe public forms. Admin writes must go through authenticated server actions or protected route handlers.

## Admin Role Notes

- Developer accounts are protected from admin-level modification.
- Admins/managers can manage sales, stock, customers, and approvals according to role permissions.
- Apprentices can search allowed stock/customer records without receiving privileged write access.

## Quality Checks

Run these after meaningful changes:

```bash
npm run lint
npm run build
```

The build performs the production compile and TypeScript checks.

## Important Conventions

- Prefer Server Components for public SEO content.
- Keep `"use client"` boundaries small and only around interactive UI.
- Use Zod validation on server actions.
- Use `next/link` for internal navigation.
- Use `next/image` for meaningful website images.
- Do not copy the Figma/Vite reference as one large component.
- Keep admin workflows auditable and avoid logging successful activity before the operation has actually succeeded.
