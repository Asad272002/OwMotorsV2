# OW Motors Production Deployment Checklist

Do not mark a deployment complete until every blocking item is checked in the target production environment.

## 1. Release ownership and rollback

- [ ] Name the release owner, database owner, content approver, and rollback decision-maker.
- [ ] Record the current known-good Vercel deployment and database migration version.
- [ ] Confirm database backups/PITR and a tested recovery path.
- [ ] Define rollback triggers: elevated 5xx/error fallback rate, form failure, broken public data, RLS exposure, indexation error, or material CWV regression.
- [ ] Keep irreversible content deletion outside the deployment window.

## 2. Code and build gate

- [ ] Review the final diff; confirm no changes exist in `figma-vite-reference`.
- [ ] Confirm `.env.local` and all real secret files are untracked.
- [ ] Run `npm ci` in clean CI.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run an approved dependency advisory/license scan.
- [ ] Confirm the build contains no warnings, TypeScript errors, or secret values in client chunks.
- [ ] Confirm no package was added without an explicit production need.

## 3. Production environment variables

- [ ] `NEXT_PUBLIC_SITE_URL=https://<canonical-host>` — no localhost, preview URL, path, or trailing slash.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` points to the production project.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the production publishable key.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is rotated, server-only, and scoped to production.
- [ ] `SUPABASE_REVALIDATION_SECRET` is long, random, rotated, and server-only.
- [ ] Production, Preview, and Development scopes are deliberately separated in Vercel.
- [ ] Preview deployments do not use production Supabase credentials.

## 4. Supabase database and RLS gate

- [ ] Confirm the historic service-role key is revoked/rotated and review exposure-window logs.
- [ ] Apply all migrations in filename order, including `20260801014000_secure_public_submissions.sql`.
- [ ] Confirm migration status matches the repository.
- [ ] Run Supabase Security Advisor.
- [ ] Verify every application table has RLS enabled and forced.
- [ ] As anon, confirm only active brands/categories and published products/active variants are readable.
- [ ] As anon/authenticated non-staff, confirm inquiry INSERT and SELECT are denied.
- [ ] Submit both public forms through the application and confirm rows are created by the server-only path.
- [ ] As editor, confirm content create/update works and destructive admin-only actions fail.
- [ ] As admin, confirm approved destructive actions work only after confirmation.
- [ ] Confirm inquiry staff updates are restricted to `status`.
- [ ] Confirm active-brand/category filters prevent stale product/404 links.
- [ ] Confirm backups/PITR, PII retention, and deletion procedures.

## 5. Supabase Auth and Storage

- [ ] Disable public signup unless explicitly approved.
- [ ] Enable leaked-password protection.
- [ ] Enable CAPTCHA/bot controls for authentication.
- [ ] Require MFA/AAL2 for administrator accounts and strongly prefer it for editors.
- [ ] Configure suitable session lifetime/refresh behavior and production SMTP.
- [ ] Confirm active `profiles` rows and correct admin/editor roles for every staff user.
- [ ] Confirm the `motorcycles` bucket permits approved JPEG/PNG/WebP/AVIF uploads no larger than 900 KB.
- [ ] Confirm draft/public-media exposure policy is intentional.
- [ ] Test upload, replace, reorder, deactivate, and admin-only delete workflows.
- [ ] Add/verify image decoding, dimension limits, re-encoding, metadata stripping, and orphan cleanup process.

## 6. Content and legal approval

- [ ] Verify official company name, address, phone, email, opening hours, service area, coordinates, and social profiles.
- [ ] Replace verification-pending footer/home contact text with approved values from one source of truth.
- [ ] Publish approved About/company content.
- [ ] Publish Privacy Policy and Terms pages; make footer labels real links only after routes exist.
- [ ] Add form consent, retention, and privacy copy approved by the responsible owner.
- [ ] Verify every active brand/category has substantial unique content and at least one published product before indexation.
- [ ] Verify every product price, availability, variant, specification, feature, FAQ, warranty, and image claim.
- [ ] Confirm no fake ratings, reviews, discounts, finance claims, or placeholder NAP values.
- [ ] Verify every content image has a useful approved alt description or is intentionally decorative.
- [ ] Replace the oversized OW Motors logo with an approved optimized asset.
- [ ] Add an approved 1200×630 default social image and entity-specific OG images where appropriate.

## 7. Domain, redirects, and security headers

- [ ] Set the preferred apex/`www` host and redirect all alternatives with 308 responses.
- [ ] Redirect HTTP to HTTPS.
- [ ] Confirm trailing-slash and case policy is consistent.
- [ ] Import legacy URLs and add tested 308 redirects before changing published slugs.
- [ ] Confirm `X-Content-Type-Options: nosniff`.
- [ ] Confirm `X-Frame-Options: DENY` (or equivalent CSP `frame-ancestors`).
- [ ] Confirm `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] Confirm the restricted camera/geolocation/microphone Permissions Policy.
- [ ] Confirm no `X-Powered-By` header.
- [ ] Confirm HSTS at the production edge after HTTPS/subdomain policy review.
- [ ] Add and test CSP in a separate hardening release; do not deploy an untested blocking policy.

## 8. Public route smoke test

- [ ] `/` — 200, one H1, complete brand/home content, correct canonical/OG/site schema.
- [ ] `/brands` — 200, active brands only, crawlable links, correct canonical/OG.
- [ ] `/motorcycles` — 200, server-rendered cards, accessible filters/sort/pagination.
- [ ] `/motorcycles/brand/<populated-brand>` — 200, unique copy, cards, breadcrumbs/schema.
- [ ] `/motorcycles/category/<populated-category>` — 200, unique copy, cards, breadcrumbs/schema.
- [ ] `/motorcycles/<brand>/<slug>` — 200, metadata, product/offer/breadcrumb/FAQ schema, valid variant interactions.
- [ ] `/about` — 200 and approved content.
- [ ] `/contact` — 200 and successful/failed form behavior without duplicate submission.
- [ ] Unknown brand/category/product — true 404 and `noindex`.
- [ ] Unknown root path — true 404, no homepage canonical.
- [ ] `/robots.txt` — production rules and production sitemap URL.
- [ ] `/sitemap.xml` — production host, only active/populated entities, valid last-modified values.
- [ ] `/admin` signed out — redirects to login; signed in — server-authorized dashboard.

## 9. SEO and filter URL checks

- [ ] Every indexable route has a unique title, description, self-canonical, OG/Twitter title/description/URL, and one H1.
- [ ] Product social metadata uses a publicly fetchable approved image.
- [ ] A clean catalog URL is indexable.
- [ ] `?page=2` is server-rendered and self-canonical when page 2 exists.
- [ ] Facet/sort/price URLs are usable, `noindex,follow`, and canonical to the appropriate clean route.
- [ ] Invalid/empty parameters do not create an infinite index surface.
- [ ] Empty brand/category landings are noindex and absent from the sitemap.
- [ ] Product variant/preselection URLs canonicalize to the product family.
- [ ] Visible breadcrumbs match Breadcrumb JSON-LD.
- [ ] Validate Organization/WebSite, Product/Offer, Breadcrumb, and visible FAQ JSON-LD.
- [ ] Confirm internal crawl starts at `/` and discovers every sitemap URL without broken links.

## 10. Accessibility and responsive checks

- [ ] Keyboard: skip link, header, mega menus, filter controls, product selectors, accordions, forms, footer.
- [ ] Escape closes mobile navigation, catalog sheet/drawer, and product image zoom and restores focus.
- [ ] Zoom dialog keeps focus inside while open.
- [ ] Visible focus is never clipped or hidden behind sticky/fixed UI.
- [ ] Android and iOS: hamburger, nested links, color/CC selection, gallery, sort, filters, and forms.
- [ ] 320, 375, 768, 1024, 1280, and wide desktop layouts have no unintended horizontal overflow.
- [ ] Text zoom to 200% remains usable.
- [ ] Reduced-motion mode stops animation and uses non-smooth carousel movement.
- [ ] Screen-reader landmarks and heading order are logical; no nested/duplicate main landmark.
- [ ] Validation errors are announced and associated with the failing field.
- [ ] Contrast and touch targets pass WCAG AA review.

## 11. Performance and reliability checks

- [ ] Run Lighthouse and WebPageTest against production, not localhost.
- [ ] Test cold and warm TTFB for homepage, catalog, brand, category, and product.
- [ ] Confirm LCP uses only the intended eager/high-priority image.
- [ ] Confirm no image/font/layout CLS regression.
- [ ] Confirm Supabase outage renders the safe noindex error state without leaking details.
- [ ] Confirm the shared navigation query remains bounded as inventory grows.
- [ ] Create a tracked task to move catalog filtering/count/range pagination into PostgreSQL before approaching the 500-row cap.
- [ ] Add shared atomic rate limiting and bot protection; test burst and distributed behavior.
- [ ] Configure redacted logs and alerts for 5xx, auth failures, form abuse, RLS denials, webhook failures, and Storage errors.

## 12. Cache and revalidation

- [ ] Configure the Supabase database webhook for every public content table.
- [ ] Confirm the webhook secret header matches the Vercel environment.
- [ ] Publish/update/unpublish a test product and confirm homepage, catalog, product, metadata, related links, and sitemap refresh.
- [ ] Confirm deactivating a brand/category removes its public links and sitemap entry without leaving product 404 links.
- [ ] Confirm failed/unauthorized webhook calls return 401/400 and do not revalidate.

## 13. Search Console launch

- [ ] Verify the Domain property through DNS.
- [ ] Submit the production sitemap.
- [ ] Inspect representative homepage, list, brand, category, and product URLs.
- [ ] Compare Google-selected canonical to the declared canonical.
- [ ] Request indexing after content/legal approval.
- [ ] Monitor Page Indexing, Enhancements, Manual Actions, Security Issues, and Core Web Vitals.
- [ ] Review faceted crawl behavior after launch before changing robots rules.

## 14. Go/no-go

- [ ] All launch blockers in `FINAL_SEO_AUDIT.md` are resolved.
- [ ] Lint/build/CI/security checks pass on the release commit.
- [ ] Database migration and environment variable changes are confirmed in production.
- [ ] Content, legal, SEO, security, and business owners approve.
- [ ] Production smoke tests pass and monitoring is active.
- [ ] Rollback owner confirms the known-good deployment and recovery procedure.
