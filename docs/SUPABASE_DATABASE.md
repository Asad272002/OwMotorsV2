# OW Motors Supabase Database

## Scope and status

Stage 5 defines the production data model, validation rules, indexes, permissions, Row Level Security (RLS), reference seeds, and TypeScript database contract. It does **not** connect any page or component to Supabase, create a browser client, upload assets, or apply migrations to a remote project.

The migrations are additive and ordered as follows:

1. `20260731165121_create_ow_motors_schema.sql` — schemas, tables, constraints, indexes, and `updated_at` triggers.
2. `20260731165129_secure_ow_motors_rls.sql` — grants, authorization helpers, RLS enablement, and policies.
3. `20260731165138_seed_ow_motors_reference_data.sql` — the four approved brands and initial category taxonomy.
4. `20260801000212_optimize_rls_and_foreign_key_indexes.sql` — covering composite foreign-key indexes and consolidated authenticated SELECT policies identified by the Supabase database advisor.
5. `20260801010000_add_brand_campaign_images.sql` — ordered homepage campaign banners, public/staff RLS, atomic reordering, and approved existing banner seeds.
6. `20260801011000_add_brand_homepage_reordering.sql` — atomic staff-authorized ordering for paired homepage brand showcases and product rows.

7. `20260801013000_remove_model_code_and_sku.sql` — removes unapproved model-code and SKU fields from the catalog contract.
8. `20260801014000_secure_public_submissions.sql` — removes direct public inquiry inserts, limits staff workflow updates to `status`, adds database email-length constraints, and aligns Storage uploads to the 900 KB Server Action limit.
9. `20260802010000_remove_test_ride_requests.sql` — removes the retired test-ride request table because OW Motors does not offer test rides.

The generated-style TypeScript contract is at `src/lib/supabase/database.types.ts`. Regenerate it from the linked Supabase project after migrations are applied, then review the diff before using it in application code.

## Design principles

- All application records use UUID primary keys.
- Time-bearing audit fields use `timestamptz`.
- Prices use `numeric(12,2)` rather than floating-point values.
- User authorization comes from `public.profiles`, never `raw_user_meta_data` or another client-editable claim.
- Product variants are explicit, validated combinations of engine capacity and color.
- A variant-owned image or specification must belong to the same motorcycle as its parent row. Composite foreign keys enforce this invariant.
- Public catalog rows are visible only when their parent motorcycle is published and its brand is active.
- Contact submissions cross a validated server-only boundary. Anonymous and ordinary authenticated users cannot insert or read inquiries through the Data API.
- Editors may create and update content. Only admins may delete records or manage profile roles and active status.
- The service-role key is server-only and must never be included in browser code or a `NEXT_PUBLIC_*` variable.

## Entity relationships

```text
auth.users 1──1 profiles
brands 1──* motorcycles
brands 1──* brand_campaign_images
motorcycles *──* categories (through motorcycle_categories)
motorcycles 1──* motorcycle_variants
motorcycles 1──* motorcycle_images
motorcycle_variants 0──* motorcycle_images
motorcycles 1──* motorcycle_specifications
motorcycle_variants 0──* motorcycle_specifications
motorcycles 1──* motorcycle_features
```

## Table reference

### `profiles`

Application-side authorization records linked one-to-one to `auth.users` through `profiles.id`. It stores `full_name`, the constrained role (`admin` or `editor`), `is_active`, and audit timestamps. Deleting an Auth user cascades to the profile. No automatic signup trigger creates staff profiles because a default staff role would be a privilege-escalation risk.

### `brands`

Brand landing-page content: `name`, canonical `slug`, Storage-relative logo and hero paths, short and full descriptions, SEO title/description, active state, display order, and timestamps. Slugs are lowercase, hyphenated, and unique. Storage paths cannot be absolute or traverse parent directories.

### `brand_campaign_images`

Ordered campaign images used by the homepage and Brands page. Every record belongs to a brand and stores a local-or-Storage-relative path, required descriptive alt text, active state, sort order, and timestamps. Public reads require both an active banner and active parent brand. Staff may upload, edit, hide/show, and reorder; only admins may permanently delete.

### `categories`

Category landing-page content: `name`, canonical `slug`, description, SEO title/description, active state, display order, and timestamps. Slugs are validated and unique. Only categories with `is_active = true` are public.

### `motorcycles`

The product-level record. It belongs to a brand and stores name, brand-scoped slug, descriptions, publication status, featured flag, base price, SEO fields, and timestamps. Publication statuses are `draft`, `published`, and `archived`. The base price supports catalog display before a specific variant is selected; product rendering should prefer the selected/default active variant price when available.

### `motorcycle_categories`

The many-to-many bridge between motorcycles and categories. Its composite primary key prevents duplicate assignments. Deleting a motorcycle removes its assignments; deleting a category is restricted while assignments exist.

### `motorcycle_variants`

Every valid CC/color combination is represented as one row with `cc`, `color_name`, `color_hex`, price, stock status, quantity, default flag, and active flag. The database UUID is the internal variant identifier, while CC/color combinations are unique case-insensitively within a motorcycle. Allowed stock statuses are `in_stock`, `out_of_stock`, `coming_soon`, and `discontinued`. An in-stock variant must have positive quantity; every other status requires zero quantity. A default variant must be active, and a partial unique index permits at most one active default variant per motorcycle.

### `motorcycle_images`

Image metadata for Supabase Storage. Each row has a motorcycle, optional variant, Storage-relative path, required SEO/accessibility alt text, image type, sort order, and primary flag. Types are `gallery`, `hero`, `thumbnail`, `color`, `overview`, and `open_graph`. Partial unique indexes permit one product-level primary image and one primary image per variant. The database stores paths only; bucket creation and asset upload belong to a later integration stage.

### `motorcycle_specifications`

Ordered product or variant-specific specification values. Each row stores a group, label, value, optional unit, and sort order. A composite foreign key rejects a variant from another motorcycle. Partial unique indexes prevent duplicate product-level or variant-level group/label pairs.

### `motorcycle_features`

Ordered feature cards grouped by theme, with title, description, optional slug-like icon identifier, and sort order. Motorcycle/group/title combinations are unique.

### `contact_inquiries`

General customer inquiries containing full name, optional phone, email, subject, message, workflow status, and timestamps. Statuses are `new`, `in_progress`, `resolved`, `closed`, and `spam`. The validated server-only action maps insert fields explicitly; public Data API roles cannot insert or read submissions.

### `site_settings`

Typed JSON settings keyed by a unique lowercase dotted/hyphenated identifier, plus an optional description and timestamps. It is deliberately not public-readable in Stage 5. Store public site configuration here only; secrets belong in server environment variables or a secrets manager.

## Constraints and indexes

- All foreign-key columns have supporting indexes; composite primary keys already index their leading columns.
- Composite variant/motorcycle foreign keys have matching two-column partial indexes.
- Public motorcycle and variant queries have partial indexes limited to published/active rows.
- A workflow index orders inquiries by status and newest creation time.
- Brand and category slugs are globally unique; motorcycle slugs are unique within a brand; CC/color combinations are unique within a motorcycle; image Storage paths are globally unique.
- CHECK constraints validate slugs, color HEX values, text lengths, non-negative prices/order values, status values, email shape, phone shape, and stock/quantity consistency.
- The `private.set_updated_at()` trigger updates audit timestamps on every mutable table except the pure many-to-many bridge.

## Roles and authorization helpers

`private.is_staff()` returns true only for an authenticated, active `admin` or `editor` profile. `private.is_admin()` requires an authenticated, active `admin` profile. Both are `SECURITY DEFINER`, use an empty `search_path`, schema-qualified identifiers, and explicit function grants. This avoids recursive profile RLS checks and avoids trusting user-editable Auth metadata.

`private.is_public_motorcycle(uuid)` verifies that a motorcycle is published and its brand is active. `private.is_public_variant(uuid)` additionally verifies that the variant is active. These helpers centralize parent visibility checks used by dependent catalog policies.

## RLS policy reference

RLS is enabled and forced on every public table. SQL object privileges are explicit; a role must pass both its grant and the matching RLS policy.

| Table | Public (`anon` and ordinary authenticated users) | Editor | Admin |
| --- | --- | --- | --- |
| `profiles` | Authenticated user can read only their own profile | Same | Read, create, update, deactivate, or delete profiles |
| `brands` | Read active rows | Read/create/update | Editor rights plus delete |
| `brand_campaign_images` | Read active rows under active brands | Read/create/update/reorder | Editor rights plus delete |
| `categories` | Read active rows | Read/create/update | Editor rights plus delete |
| `motorcycles` | Read published rows under active brands | Read/create/update | Editor rights plus delete |
| `motorcycle_categories` | Read assignments for public motorcycles and active categories | Read/create/update | Editor rights plus delete |
| `motorcycle_variants` | Read active variants of public motorcycles | Read/create/update | Editor rights plus delete |
| `motorcycle_images` | Read public product images and active-variant images | Read/create/update | Editor rights plus delete |
| `motorcycle_specifications` | Read public product specifications and active-variant specifications | Read/create/update | Editor rights plus delete |
| `motorcycle_features` | Read features of public motorcycles | Read/create/update | Editor rights plus delete |
| `contact_inquiries` | No direct Data API access | Read and update `status` | Editor rights plus delete |
| `site_settings` | No access | Read/create/update | Editor rights plus delete |

### Named public policies

- `brands_public_read`: requires an active brand.
- `brand_campaign_images_public_read`: requires an active banner under an active brand.
- `categories_public_read`: requires an active category.
- `motorcycles_public_read`: requires a published motorcycle under an active brand.
- `motorcycle_categories_public_read`: requires a public motorcycle and active category.
- `motorcycle_variants_public_read`: requires an active variant of a public motorcycle.
- `motorcycle_images_public_read`: requires a public motorcycle and, when present, a public variant.
- `motorcycle_specifications_public_read`: applies the same parent/variant visibility rule as images.
- `motorcycle_features_public_read`: requires a public motorcycle.
- Public inquiry insert policies are intentionally absent. The server-only submission client performs explicit, validated inserts using the service role.

### Named profile policies

- `profiles_own_read`: authenticated users can read their own profile.
- `profiles_admin_read`, `profiles_admin_insert`, `profiles_admin_update`, and `profiles_admin_delete`: active admins manage profiles and roles.

### Generated content policies

For each managed content table (`brands`, `categories`, `motorcycle_categories`, `motorcycles`, `motorcycle_variants`, `motorcycle_images`, `motorcycle_specifications`, `motorcycle_features`, and `site_settings`), the security migration creates:

- `<table>_staff_read`
- `<table>_staff_insert`
- `<table>_staff_update`
- `<table>_admin_delete`

The authenticated read policy combines public-row visibility for ordinary signed-in users with complete content visibility for active staff. Insert and update require an active editor or admin. The delete policy requires an active admin. Anonymous storefront reads remain isolated in each table's public-read policy.

### Submission workflow policies

- `contact_inquiries_staff_read` and `contact_inquiries_staff_update` let active staff process inquiries.
- `contact_inquiries_admin_delete` reserves permanent deletion for admins.

No public INSERT or SELECT policy exists for submissions, so anonymous and ordinary authenticated users cannot write or retrieve inquiries through PostgREST.

## Seed data

The seed migration upserts these approved brands by slug:

- TARO
- LIFAN
- HI-SPEED
- SUPER STAR

It also upserts the approved starter taxonomy: Naked Bikes, Sport Bikes, Dual Sport, Cruisers, Touring, Adventure, Scooters, and Electric Bikes. No motorcycle, variant, inventory, rating, review, or customer data is invented. Storage paths describe their intended future bucket layout; the files are not uploaded by this stage.

## Admin bootstrap

There is intentionally no public path that can create an admin. Bootstrap requires a trusted operator:

1. Create or invite the user through Supabase Auth administration.
2. In a trusted SQL/admin context, insert a `profiles` row whose `id` equals that Auth user's UUID and whose role is `admin`.
3. Confirm the profile is active before using authenticated content-management operations.

Only the Supabase dashboard, a controlled migration, or trusted server code using the service role should perform bootstrap/user management. The service-role key must remain server-only.

## Post-apply verification and next steps

The remote schema, RLS flags, migration history, seed counts, and generated TypeScript table coverage have been verified. Before connecting production forms or the future admin dashboard:

1. Test editor create/update and denied delete behavior with a dedicated non-production editor account.
2. Test admin profile management and delete behavior with a bootstrapped admin account.
3. Verify form submissions through the eventual server validation layer, including spam protection and rate limiting.
4. Verify published/draft, active/inactive brand, inactive variant, and mismatched variant/motorcycle cases after verified product data is loaded.
5. Create Storage buckets and their independent Storage RLS policies before uploading production assets.

The documented migrations were applied to the configured Supabase project on 2026-07-31 UTC. The application UI remains disconnected from Supabase.
