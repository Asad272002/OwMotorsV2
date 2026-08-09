# Supabase dashboard configuration

The storefront uses the public publishable key and Row Level Security for catalog reads. Public form inserts pass through the validated server-only submission client; browsers do not receive direct insert privileges on inquiry tables.

## Required before deployment

1. **Rotate the exposed service-role secret.** A real service-role credential was found in the local `.env.example` during this stage and was removed. Rotate the project service-role/legacy secret in Supabase immediately, update any legitimate secure consumers, and never place the replacement in a browser-visible or committed environment file.
2. In the deployment environment, set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Set the rotated `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret for validated contact-inquiry inserts; never give it a `NEXT_PUBLIC_` prefix.
3. Generate a long random `SUPABASE_REVALIDATION_SECRET` and add it only as a server-side deployment secret.
4. In **Authentication > URL Configuration**, set the production Site URL and add the exact production and local callback URLs to the redirect allow list before authentication UI is enabled.
5. Keep the `public` schema exposed through the Data API. The approved migration already grants the minimum table operations and enables/forces RLS.
6. In **Authentication > Sign In / Providers > Email**, enable leaked-password protection. The current Supabase security advisor reports that protection as disabled.

## Content revalidation webhook

Create a Database Webhook for insert, update, and delete events on each public content table: `brands`, `brand_campaign_images`, `categories`, `motorcycles`, `motorcycle_categories`, `motorcycle_variants`, `motorcycle_images`, `motorcycle_specifications`, and `motorcycle_features`.

- Method: `POST`
- URL: `https://YOUR_PRODUCTION_DOMAIN/api/revalidate/supabase`
- Header: `x-ow-revalidation-secret: YOUR_SUPABASE_REVALIDATION_SECRET`
- Content type: `application/json`

The endpoint validates both the secret and table name, then revalidates the public route tree and sitemap. Do not expose this secret through any `NEXT_PUBLIC_` variable.

## Motorcycle image storage

Database image paths are resolved against the `motorcycles` Storage bucket created by migration `20260731195312_configure_motorcycle_storage.sql`. Before replacing the existing local campaign fallbacks:

1. Confirm the bucket is public; the storefront resolves published database paths as public URLs.
2. Confirm the applied RLS policies allow active staff to upload/update files and reserve deletion for administrators.
3. Upload optimized WebP/AVIF/JPEG files no larger than 900 KB through the admin motorcycle editor and save bucket-relative paths in the database.

## Rate limiting

The migration `20260801014000_secure_public_submissions.sql` removes anonymous/authenticated inquiry-table inserts so callers cannot bypass the Server Actions through PostgREST. The action still includes only a small per-process limiter and honeypot; serverless instances do not share memory. Before production traffic, configure a distributed limiter at the CDN/edge or use a shared store. Apply a limit to contact submissions, retain generic public errors, and monitor unusual insert volume in Supabase.

## Verification checklist

- Confirm anonymous users can read only active/published storefront rows.
- Confirm anonymous and ordinary authenticated users cannot insert or select inquiries through PostgREST.
- Confirm an unpublished motorcycle returns 404 from its product route.
- Submit one contact inquiry from staging and verify it appears with `new` status.
- Trigger a content webhook and confirm a `200` response from the revalidation endpoint.
- Confirm the deployed browser bundle contains no service-role credential and the server-only form actions still succeed.

Supabase references: [Creating SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Server-side auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs), and [Database Webhooks](https://supabase.com/docs/guides/database/webhooks).
