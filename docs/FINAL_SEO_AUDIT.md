# OW Motors Final Production and Technical SEO Audit

Audit date: 2026-08-01
Application: `ow-motors-nextjs`
Framework: Next.js 16 App Router
Status: code is build-ready; production launch remains blocked by the manual items in this report.

## Executive summary

The public application uses real App Router routes, Server Components for primary content, server-rendered Supabase queries, `next/image`, `next/font`, route metadata, a generated sitemap, robots rules, and guarded administrative routes. The production build completes without warnings.

This audit fixed confirmed SEO, security, accessibility, and performance defects without changing the approved page layouts. The most important fixes were:

- unique Open Graph/Twitter metadata and canonicals for public routes;
- `noindex,follow` handling for faceted catalog URLs and self-canonical pagination;
- Organization, WebSite, Breadcrumb, Product, Offer, and valid visible FAQ structured data;
- active-entity and empty-landing protections in public queries and the sitemap;
- removal of anonymous Data API writes to inquiry tables through a coordinated migration and server-only submission client;
- safer error/404 indexation behavior;
- a smaller, streamed navigation data payload;
- keyboard, mobile disclosure, focus, contrast, and reduced-motion improvements.

The application must not be declared launched until a real production domain, verified business contact details, a rotated service-role secret, the final security migration, and production content/media have been configured and tested.

## Audit method

- Inspected every public route, metadata export, Server/Client boundary, Supabase query, schema component, internal link source, image use, form action, RLS migration, and deployment configuration.
- Ran ESLint, TypeScript checks, and an optimized Next.js production build.
- Inspected rendered HTML/accessibility output for static public pages, the 404, and safe data-error fallbacks.
- Checked generated `robots.txt`, `sitemap.xml`, response security headers, image output, headings, and JSON-LD placement.
- Tested representative desktop and mobile disclosures, reduced-motion logic, and modal keyboard behavior.

The local production process could not reach Supabase after the build because outbound network access was unavailable to that background process. Data-driven pages therefore exercised their safe noindex error state during the final rendered pass. Their normal states were audited through source, build/type validation, generated sitemap data, and earlier rendered checks. A deployed production smoke test remains mandatory.

## Public route audit

| Route | Rendering and primary content | Metadata/canonical | Robots policy | Structured data | Result |
| --- | --- | --- | --- | --- | --- |
| `/` | Static server-rendered homepage; client islands only for rows/navigation | Unique absolute title, description, canonical, OG/Twitter | Indexable | Organization + WebSite | Pass; official OG image still required |
| `/brands` | Server-rendered active brand content | Unique title, description, canonical, OG/Twitter | Indexable | Organization + WebSite | Pass |
| `/motorcycles` | Server-rendered initial catalog and filters; no `useEffect` data load | Clean canonical; page-only pagination self-canonical | Facets/sort/invalid/empty states are `noindex,follow` | BreadcrumbList + site graph | Pass; database-side pagination remains recommended |
| `/motorcycles/brand/[brand]` | Server-rendered active brand and published products; unknown brand calls `notFound()` | Database SEO metadata with deterministic fallback and canonical | Filtered, invalid, or empty landing is `noindex,follow` | BreadcrumbList + site graph | Pass; richer approved editorial copy is still needed |
| `/motorcycles/category/[category]` | Server-rendered active category and published products; unknown category calls `notFound()` | Database SEO metadata with deterministic fallback and canonical | Filtered, invalid, or empty landing is `noindex,follow` | BreadcrumbList + site graph | Pass; richer buyer-oriented copy is still needed |
| `/motorcycles/[brand]/[slug]` | Product identity and all substantive sections are present in initial HTML; configuration is a client island | Dynamic title, description, canonical, product image OG/Twitter | Published active products only; missing product calls `notFound()` | Product + Offer + BreadcrumbList + visible FAQPage | Pass; client variant payload can be narrowed later |
| `/about` | Static Server Component | Unique title, description, canonical, OG/Twitter | Indexable | Site graph | Technically pass; approved company content remains thin |
| `/contact` | Server-rendered page with Server Action form | Unique metadata; query variants canonicalize to clean route | Query variants are `noindex,follow` | Site graph | Pass; verified contact/privacy content required |
| Unknown route / missing entity | Real 404 UI; no nested main landmark | 404-specific title/description; no homepage canonical inheritance | Next injects `noindex` | None | Pass |
| `/robots.txt` | Generated metadata route | Production sitemap reference | Admin and API crawl guidance excluded; previews disallow all | N/A | Pass |
| `/sitemap.xml` | Generated from active/published database data | Absolute URLs from `NEXT_PUBLIC_SITE_URL` | No queries/admin/empty dynamic landings | Meaningful DB `updated_at` values | Pass; production domain required |

## Confirmed issues fixed

### Metadata and indexation

- Added a shared metadata builder so each public route emits an accurate title, description, canonical, Open Graph title/description/URL, and Twitter card.
- Prevented database SEO titles already ending in `| OW Motors` from receiving the root title template twice.
- Implemented the approved catalog query policy:
  - clean indexable landing URLs;
  - page-only pagination uses a self-canonical `?page=N` URL;
  - facet, price, sort, unknown, and invalid combinations use `noindex,follow` and a clean canonical;
  - empty brand/category landings are noindex and excluded from the sitemap.
- Prevented contact query URLs from creating indexable duplicate pages.
- Removed the root canonical/social inheritance that made 404 pages appear canonical to the homepage.
- Added noindex metadata to recoverable site errors and the root global error.
- Replaced placeholder-oriented About copy with a minimal verified statement. Full editorial copy remains required.

### Structured data

- Added a sitewide `Organization` and `WebSite` graph using only verified facts.
- Deliberately did not emit `LocalBusiness` address, phone, opening hours, or `sameAs` values because they are not verified.
- Added `BreadcrumbList` JSON-LD to catalog, brand, category, and product breadcrumb routes.
- Kept Product and Offer data limited to visible product/variant facts, PKR prices, condition, URLs, and mapped availability.
- Added `FAQPage` only for FAQs that are generated from product data and visibly rendered on the same product page.
- No ratings, reviews, discounts, GTINs, inventory quantities, or fabricated claims are emitted.

### Sitemap, active content, and internal links

- Added database-derived `lastModified` values.
- Excluded empty brand/category landing pages and omitted the master catalog when it has no products.
- Added explicit active-brand and active-category filtering to public catalog/product query shaping in addition to RLS.
- Retained all published product URLs returned by the public query.
- Changed footer brand links to use active database brands so deactivation cannot leave hardcoded crawlable 404 links.
- Confirmed no `href="#"`, `javascript:` pseudo-links, raw React Router navigation, or raw `<img>` elements in public source.

### Images, fonts, and Core Web Vitals

- Confirmed all public content imagery uses `next/image` with stable intrinsic dimensions or reserved aspect-ratio containers.
- Confirmed database image alt text is required and fallbacks are descriptive; decorative/duplicated media uses empty alt text.
- Prioritized only the likely first homepage campaign image and the above-fold product image using Next 16 loading/fetch-priority props.
- Removed obsolete/deprecated priority use from public images.
- Confirmed Inter and Rajdhani load through `next/font` with swap behavior and CSS variables.
- Replaced the full 500-row nested catalog payload in the shared header with a bounded navigation query that excludes variants, specifications, and prices, and streamed it behind a stable navigation fallback.
- Removed the unreachable legacy mobile navigation implementation from the client bundle.
- Added meaningful sitemap timestamps rather than build/request timestamps.

### Accessibility, keyboard, motion, and mobile

- Removed nested `<main>` landmarks from loading, error, and 404 content.
- Added a root `global-error.tsx` with its own document shell and accessible recovery control.
- Added Escape handling, scroll locking, and focus return for the mobile navigation and catalog filter disclosure.
- Added ArrowDown keyboard access and focus movement for desktop mega menus while preserving crawlable top-level links.
- Added a complete focus loop, Escape handling, background scroll lock, and trigger focus restoration to product image zoom.
- Made price-control IDs unique when both responsive filter forms exist in the DOM.
- Associated server validation errors with fields using `aria-describedby` and focus the error summary after failed submissions.
- Raised failing footer contrast and made the cool-gray token pass on the approved soft-gray background.
- Increased critical navigation/filter hit areas and retained visible global focus styles.
- Made imperative carousel scrolling honor `prefers-reduced-motion`.
- Confirmed mobile color selection uses native radio inputs and is keyboard/touch operable.

### Security and production behavior

- Added baseline `nosniff`, frame-denial, strict referrer, and minimal permissions response headers; disabled `X-Powered-By`.
- Added an isolated `server-only` Supabase submission client. The service-role key is used only after Zod, honeypot, rate, motorcycle, and variant validation and only for explicit mapped inserts.
- Added migration `20260801014000_secure_public_submissions.sql` to:
  - revoke anonymous/authenticated inquiry inserts;
  - remove public insert policies;
  - restrict staff inquiry updates to `status`;
  - add email length constraints;
  - preserve explicit server-only service-role inserts;
  - align Storage upload size with the application.
- Aligned admin image uploads to 900 KB so multipart Server Actions remain under Next's default 1 MB request limit.
- Added `.env.example` back to source-control eligibility while all real `.env*` files remain ignored.
- Confirmed no server secret is referenced by Client Components or expected in `NEXT_PUBLIC_*` variables.

## Remaining risks and deferred improvements

### Launch blockers

1. `NEXT_PUBLIC_SITE_URL` is still localhost in the local environment. Production metadata, sitemap, JSON-LD, and robots output will be wrong until the canonical HTTPS domain is configured.
2. A historic service-role credential exposure is documented. Rotation/revocation and log review cannot be proven from the repository.
3. The new submission-hardening migration is not proven applied to the live database. Until it is applied, public Data API inserts may still be available.
4. The server-only `SUPABASE_SERVICE_ROLE_KEY` must be set to the rotated value or public form inserts will safely fail.
5. Official address, phone, email, hours, legal/privacy copy, and social profiles are unverified. Placeholder NAP values were removed.
6. Most production inventory and brand/category editorial content is not populated. Empty landings are protected from indexation, but launch content is still required.

### High-priority follow-up

- Replace the process-local submission limiter with a shared atomic limiter and CAPTCHA/bot verification. Confirm Vercel's trusted client-IP header behavior.
- Narrow editor Data API privileges further and move publishing/default-variant/category transactions into database RPCs/triggers so direct PostgREST calls cannot bypass workflow invariants.
- Enable MFA/AAL2 for administrators, leaked-password protection, CAPTCHA/login abuse controls, restricted signup, and deliberate session limits.
- Add magic-byte/decode/dimension validation and server-side image re-encoding. Current upload checks still rely on the declared MIME type and extension.
- Push catalog filtering, sorting, count, and range pagination into PostgreSQL. The public catalog still loads up to 500 nested items and filters/paginates in application memory.
- Add a durable old-slug/redirect table and permanent redirect workflow before allowing indexed slugs to change.
- Add a real production privacy policy, terms page, consent/retention statement, and PII deletion process.

### Performance/content follow-up

- Replace `public/images/ow-motors-logo.png` (about 2.2 MB) with an approved compact SVG or optimized transparent asset.
- Supply an owned 1200×630 default social image and approved brand/category OG images. Product routes already prefer product media.
- Reduce the product configurator Client Component boundary so static identity/default specifications do not serialize all variant image/specification data into one island.
- Move from generic loading skeletons to route-shaped skeletons if field data shows navigation CLS.
- Add a production performance budget and run Lighthouse/WebPageTest on the deployed origin. The build has no warning, but lab and field CWV cannot be certified locally.
- Add approved full About content and substantial unique brand/category guidance with relevant cross-links.

### Lower-priority items

- Add a CSP after testing Next.js scripts, Supabase connections, image delivery, Server Actions, and administration workflows. The current safe baseline headers intentionally avoid a brittle untested CSP.
- Confirm HSTS at the HTTPS edge before enabling a long duration/includeSubDomains policy.
- Add audit history/actor attribution, soft-delete/recovery where appropriate, and orphaned Storage cleanup.
- Run dependency advisory scanning in an approved networked CI environment; npm advisory data was unavailable during this audit.

## Manual content required

- Final canonical domain and preferred `www`/apex host.
- Official legal business name if different from “OW Motors”.
- Verified physical address, phone, email, opening hours, service area, coordinates, and approved social profile URLs.
- Approved About/company history, dealership credentials, warranty/service statements, and customer commitments.
- Privacy policy, terms, form consent/retention language, and responsible contact.
- Owned/licensed default OG image, optimized OW Motors logo, brand media, and model-accurate product photography.
- Unique SEO title/description review for every published brand, category, and product.
- Substantial brand/category copy and durable internal cross-links before those landings are activated.
- Accurate prices, availability, variants, specifications, features, FAQs, and alt descriptions.
- A legacy URL and redirect register for any pre-existing site or future slug changes.

## Manual Google Search Console steps

1. Deploy the final HTTPS canonical host and configure all alternate hosts/protocols to 308 redirect to it.
2. Verify a Domain property through DNS. Keep verification under an organization-controlled account.
3. Open the deployed `robots.txt` and `sitemap.xml`; confirm every URL uses the production host and returns 200.
4. Submit `/sitemap.xml` in Search Console.
5. Use URL Inspection on the homepage, `/brands`, `/motorcycles`, one populated brand page, one populated category page, and one product page. Compare tested and indexed canonicals.
6. Confirm a facet URL reports `noindex,follow` and the clean canonical; confirm valid page-only pagination self-canonicalizes.
7. Validate Product/Offer and Breadcrumb JSON-LD in Rich Results Test or Schema Markup Validator. Validate FAQ syntax without assuming a FAQ rich result will be granted.
8. Request indexing only after final content and structured data are verified.
9. Monitor Page Indexing for duplicate canonical, soft-404, blocked, and crawled-not-indexed patterns. Empty landings must not enter the sitemap.
10. Monitor Core Web Vitals and mobile usability after enough field data is available.
11. If slugs or legacy URLs change, deploy/test permanent redirects before requesting recrawl.

## Manual Supabase steps

1. Rotate/revoke the historically exposed service-role credential and review Auth, database, API, Storage, and function logs covering the exposure window.
2. Apply `supabase/migrations/20260801014000_secure_public_submissions.sql` in the intended environment before deploying the new form code.
3. Set the rotated service-role key only in the server environment; never use a `NEXT_PUBLIC_` prefix.
4. Verify live grants/RLS as anon, ordinary authenticated, editor, admin, and service role. Confirm anon/auth cannot insert or select inquiries.
5. Run Supabase Security Advisor and inspect live `pg_policies`/RLS-force state for drift.
6. Disable unapproved public signup; enable leaked-password protection, CAPTCHA, MFA/AAL2, suitable session limits, and production SMTP.
7. Confirm Storage bucket MIME/900 KB limits and staff/admin policies. Add content decoding/re-encoding and orphan cleanup.
8. Configure the database webhook with the exact production revalidation URL and a rotated `SUPABASE_REVALIDATION_SECRET`.
9. Configure backups/PITR as required and define PII retention/deletion procedures.
10. Publish complete production brands/categories/motorcycles/variants/images and rerun sitemap/route tests.

## Manual Vercel steps

1. Configure production-only values for `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_REVALIDATION_SECRET`.
2. Use a separate non-production Supabase project and scoped secrets for preview/development. Do not point previews at production data.
3. Confirm preview deployments remain protected and noindex; consider an additional access layer for `/admin`.
4. Configure the canonical domain, HTTPS, and permanent redirects for alternate host/protocol/trailing-slash policy.
5. Verify deployed response headers and edge HSTS behavior.
6. Add shared submission/login rate limiting, bot controls, and alerts for auth failures, submission spikes, RLS denials, and Storage errors.
7. Verify the revalidation webhook can refresh homepage, catalog, product, metadata, and sitemap output after a publish change.
8. Run the full route/form/admin smoke checklist in `DEPLOYMENT_CHECKLIST.md` on the production candidate.
9. Scan the deployed client chunks for secrets and run dependency vulnerability checks in CI.
10. Keep the previous known-good deployment available for immediate rollback.

## Verification results

- `npm run lint`: passed.
- `tsc --noEmit --incremental false`: passed during the audit.
- `npm run build`: passed on Next.js 16.2.12 with no build warnings.
- Generated route manifest includes every required public route, robots, sitemap, API revalidation route, protected admin routes, and proxy middleware.
- Static rendered pages had one H1, no missing image alt attributes, no raw unoptimized images, correct canonical/OG output, and no horizontal overflow in tested mobile states.
- Security headers were present on the local production response.
- Unknown route returned HTTP 404 and Next `noindex` behavior.
