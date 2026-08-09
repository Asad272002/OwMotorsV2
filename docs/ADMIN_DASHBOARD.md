# OW Motors admin dashboard

The Stage 7 dashboard is fully server-authorized. Every protected route verifies the Supabase Auth user against an active `public.profiles` row, and every query or mutation uses the user's publishable-key session so database and Storage RLS remain authoritative.

## Routes

- `/admin/login`
- `/admin`
- `/admin/brands`
- `/admin/categories`
- `/admin/motorcycles`
- `/admin/motorcycles/new`
- `/admin/motorcycles/[id]`
- `/admin/inquiries`

Admin routes are force-dynamic, use `noindex`, and are excluded by `robots.txt`.

## Roles

### Editor

- Read all managed content and private submissions.
- Create and update brands, homepage banners, categories, motorcycles, variants, images, specifications, and features.
- Publish, unpublish, or archive motorcycles.
- Update contact-inquiry workflow statuses.
- Add motorcycle category assignments.

### Admin

- All editor capabilities.
- Delete brands, homepage banners, categories, motorcycles, variants, images, specifications, and features after explicit confirmation.
- Remove motorcycle category assignments.
- Manage profile records through secure database operations. A user-management UI is intentionally not exposed in Stage 7.

## Bootstrap the first dashboard user

Supabase Auth user creation is deliberately not available from the public site. If a new staff account is needed:

1. In **Supabase Dashboard > Authentication > Users**, create or invite the staff user.
2. Copy the user's UUID.
3. In the SQL Editor, create the corresponding profile using the UUID and the intended role:

```sql
insert into public.profiles (id, full_name, role, is_active)
values ('AUTH-USER-UUID', 'Full Name', 'admin', true);
```

Use `editor` instead of `admin` for non-destructive staff access. The foreign key prevents profiles that are not linked to a real Supabase Auth user.

Recommended Auth settings:

- Disable public user registration unless another approved flow needs it.
- Configure production Site URL and redirect URLs.
- Configure custom SMTP before relying on invitations or password recovery.
- Require strong passwords and enable MFA for administrators when operationally ready.
- Keep access-token lifetimes appropriate for an administrative application.

## Image storage

Migration `20260731195312_configure_motorcycle_storage.sql` creates the public `motorcycles` bucket with JPEG, PNG, WebP, and AVIF MIME restrictions. Migration `20260801014000_secure_public_submissions.sql` lowers its upload limit to 900 KB so admin multipart requests remain below Next.js's default 1 MB Server Action body limit. Object policies permit active staff reads/inserts/updates and reserve deletes for administrators. The application never uses the service-role key for uploads.

## Homepage banners

Migration `20260801010000_add_brand_campaign_images.sql` creates the ordered `brand_campaign_images` table and seeds the approved TARO and LIFAN campaign assets. In **Admin > Brands**, staff can upload banners, edit alt descriptions, show/hide them, and move them up or down. Administrators can replace artwork or permanently remove banner records and uploaded Storage objects after confirmation. Migration `20260801011000_add_brand_homepage_reordering.sql` adds brand-level move controls: moving a brand changes both its cinematic banner-section position and its matching product-row position. Homepage and Brands-page campaign imagery is server-rendered from these active records.

## Publishing safeguards

A motorcycle cannot be published from the dashboard until it has:

- at least one active variant;
- an active default variant; and
- at least one database-backed motorcycle image.

Public RLS still independently exposes only published motorcycles and active variants.

## Operational notes

- Slugs and CC/color variant combinations are validated by Zod and database constraints.
- All destructive UI actions require confirmation and an admin role.
- Storage and database operations are separate systems. If a database insert fails after an editor upload, an unused Storage object may require administrator cleanup.
- The inquiry page intentionally displays private customer information only inside protected routes.
- The dashboard currently shows the newest 200 inquiries. Add cursor pagination before that queue exceeds this operational size.
