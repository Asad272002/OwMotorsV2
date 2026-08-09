# Migration Plan

## Guiding constraints

SEO, factual accuracy, accessibility, and performance take precedence over reproducing SPA implementation details. Preserve the approved appearance, but do not copy `App.tsx`, its routing state, synthetic product facts, artificial loader, or dependency manifest. Server Components are the default; essential content and links must be present in initial HTML.

## Recommended stages

### Stage 0 — approval and content verification

1. Approve this audit, URL taxonomy, component boundaries, and asset decisions.
2. Confirm production domain, business name/address/phone/hours, social profiles, brands, categories, motorcycle names, slugs, prices, CC/color variants, stock terminology, specifications, warranty claims, and legal/privacy copy.
3. Obtain licensed originals for product/brand media and decide which reference images are authoritative.
4. Capture reference screenshots at 320, 375, 768, 1024, and 1440 px as visual acceptance baselines.

Exit criterion: a signed-off content workbook/data fixture and route/redirect register. This is the recommended first implementation stage.

### Stage 1 — production foundation and SEO shell

1. Inspect the installed Next.js documentation before implementation, as required by `AGENTS.md`.
2. Define design tokens, `next/font` Rajdhani/Inter, root metadata base, public site header/footer, skip link, focus/reduced-motion styles, and semantic container primitives.
3. Add real public route skeletons, `not-found.tsx`, `robots.ts`, and `sitemap.ts` with server-rendered placeholder-approved content.
4. Create typed domain models and a repository interface backed initially by validated fixtures.

Exit criterion: every public route returns meaningful HTML without client JavaScript and passes lint/build.

### Stage 2 — shared components and homepage

Build the header, accessible mobile/mega navigation islands, footer, linked motorcycle cards, brand banners/showcases, Why Choose, About, contact block, and video cards. Enhance carousels only after a static linked list works without JavaScript. Remove the artificial loader.

### Stage 3 — indexable landing pages and catalog

Build `/brands`, `/motorcycles`, brand landing pages, and category landing pages as Server Components. Add unique introductions, breadcrumbs, related links, and server-rendered initial results. The filter/sort UI is a Client Component that writes validated query parameters; the server remains the source of result HTML.

### Stage 4 — product detail

Build the server product page, metadata, Product/Offer and Breadcrumb JSON-LD from verified data, gallery and variant selector islands, specification/feature/FAQ content, availability, related products, and contact links. Invalid or unpublished products call `notFound()`.

### Stage 5 — Supabase read integration

Create schema/migrations, seed verified content, storage buckets/policies, generated database types, server-only data access, cache/revalidation policy, and fixture-vs-database contract tests. Swap repository implementation without changing route components.

### Stage 6 — forms and administration

Add server-validated contact submissions, rate limiting/spam protection, consent and safe errors. Then add admin authentication, RLS-backed CRUD for brands/categories/motorcycles/variants/media, publishing workflow, inquiry management, audit timestamps, and preview support.

### Stage 7 — hardening and launch

Run functional, accessibility, responsive visual, metadata/schema, crawl, performance, security/RLS, and form tests. Validate redirects/canonicals, production sitemap/robots, analytics consent, error monitoring, backups, and rollback. Launch behind a controlled deployment promotion.

## Proposed file structure

```text
src/
  app/
    (site)/
      layout.tsx
      page.tsx
      brands/page.tsx
      motorcycles/
        page.tsx
        brand/[brand]/page.tsx
        category/[category]/page.tsx
        [brand]/[slug]/page.tsx
      about/page.tsx
      contact/page.tsx
    admin/
      layout.tsx
      page.tsx
      brands/page.tsx
      categories/page.tsx
      motorcycles/page.tsx
      inquiries/page.tsx
    api/                         # only when a Route Handler is preferable
    layout.tsx
    not-found.tsx
    robots.ts
    sitemap.ts
    globals.css
  components/
    layout/                      # site-header, navigation, footer
    home/                        # homepage sections
    brands/
    catalog/
    motorcycles/
    forms/
    seo/                         # breadcrumb/json-ld emitters
    ui/                          # only proven, local primitives
  lib/
    data/                        # server-only repositories/queries
    supabase/                    # server, browser, admin clients
    validation/
    seo/
    constants/
    types/
  actions/
    inquiries.ts
public/
  images/                        # immutable site/chrome assets only
docs/
supabase/
  migrations/
  seed.sql
tests/
```

Do not create code from this tree until Stage 0 is approved. Exact conventions must be reconciled with the locally installed Next.js documentation.

## Route structure

| Route | Purpose | Indexing default |
|---|---|---|
| `/` | Dealership homepage | Index |
| `/brands` | All supported brands | Index |
| `/motorcycles` | Complete published catalog | Index |
| `/motorcycles/brand/[brand]` | Unique brand landing page | Index |
| `/motorcycles/category/[category]` | Unique category landing page | Index |
| `/motorcycles/[brand]/[slug]` | Canonical motorcycle detail | Index if published |
| `/about` | Company information | Index |
| `/contact` | Contact information/form | Index |
| `/admin/**` | Administration | Noindex, authenticated |

Use lowercase ASCII kebab-case slugs. Maintain immutable IDs separately. Retired or renamed entities require a redirect register: permanent redirect to a true replacement; otherwise a meaningful 404/410 policy.

## Server Component boundaries

Pages, layouts, headings, introductions, breadcrumbs, brand/product/category links, catalog result lists, prices, availability, descriptions, specifications, features, FAQ content, related items, contact/business details, and JSON-LD are Server Components. Data access is server-only. A page must remain useful and internally linked with JavaScript disabled.

## Client Component boundaries

Keep isolated islands for mobile navigation, accessible desktop mega-menu disclosure, enhanced carousel controls, catalog filter/sort controls, product gallery/zoom, valid CC/color selector, sticky CTA visibility, optional accordion behavior, and form pending/success interaction. Pass serializable server data; never fetch essential content in `useEffect`. Prefer native HTML (`details`, forms, links) when it meets the design.

## Data migration strategy

1. Extract reference data into a review sheet without asserting it is true.
2. Deduplicate brand/product structures and assign stable UUID, canonical slug, publication status, timestamps, and source/provenance fields.
3. Model brands, categories, motorcycles, motorcycle-category joins, variants, colors, images, feature groups/features, specification groups/specifications, FAQs, and inquiries.
4. Represent every valid CC/color combination as a variant with its own database UUID, price, availability, quantity/message, image ordering, and overrides. Do not derive combinations synthetically.
5. Validate slugs, money as integer minor/whole PKR units by an explicit convention, URLs, enums, and forms with Zod at boundaries.
6. Start with reviewed typed fixtures behind repository functions; seed the identical verified records into Supabase; contract-test both implementations.
7. Store editorial SEO fields where needed (meta title/description, intro, OG image) with deterministic fallbacks, length checks, and uniqueness review.

## Asset migration strategy

1. Quarantine `src/imports/pasted_text`; migrate none of it as runtime source.
2. Review every asset against `ASSET_INVENTORY.md`, ownership/licensing, correct brand/model, crop quality, and intended usage.
3. Rename deterministically (`brand-purpose-subject-view.ext`), eliminate duplicates/misnamed files, preserve master originals outside web delivery, and create responsive derivatives.
4. Use SVG for approved logos when genuine vector originals exist; otherwise tightly crop/compress transparent PNG/WebP. Convert photography to AVIF/WebP; use PNG only when transparency is required.
5. Put stable site chrome/brand assets in `public/images`; put CMS-managed product/variant media in public-read Supabase Storage with immutable versioned object keys and database alt/caption/dimension fields.
6. Render content media with `next/image`, explicit dimensions/aspect ratio and `sizes`; preload only the actual LCP image. Decorative images get empty alt and presentation semantics.
7. Replace all Unsplash placeholders before launch. Configure remote hosts only for approved storage/CDN origins.

## Supabase integration stages

1. Schema and constraints: uniqueness, foreign keys, publication status, ordering, timestamps, and soft-retirement strategy.
2. Storage design: buckets, object naming, MIME/size validation, signed admin upload, public delivery policy.
3. Security: separate browser/server clients, server-only service role, RLS enabled and tested; public read only for published records and controlled anonymous inserts for forms.
4. Read path: server queries, typed mapping, `cache`/revalidation/tag strategy, draft exclusion, deterministic 404s.
5. Write path: Zod-validated Server Actions/handlers, authenticated role checks, audit logging, atomic variant/media updates.
6. Admin UI: CRUD, preview, publish/unpublish, inquiry workflows, safe deletion/retirement.
7. Operations: migrations in version control, staging environment, backup/restore drill, monitoring, key rotation procedure.

## Testing stages

- Per stage: `npm run lint` and `npm run build`.
- Unit: slug/canonical builders, money/availability mapping, variant compatibility, validation, structured-data serialization.
- Component: keyboard navigation, disclosure/accordion semantics, filter URL updates, gallery, form states.
- Integration: repository queries, published/draft visibility, server actions, cache invalidation, Supabase RLS policies.
- End-to-end: every public route/direct entry, back/forward, 404, query filters, form submission, admin authorization.
- SEO: rendered HTML assertions, unique title/description/canonical/H1, crawlable links, status codes, JSON-LD validation, sitemap completeness, robots behavior, noindex on admin/filter policy.
- Accessibility: automated checks plus keyboard, screen-reader smoke tests, focus order/traps, contrast, zoom, reduced motion, and touch targets.
- Visual/responsive: screenshot comparison at agreed widths and real-device checks.
- Performance: Lighthouse/Web Vitals budgets, JS per route, image payload/LCP, font loading, layout shift, slow-network testing.
- Security/data: RLS negative tests, input abuse, rate limiting, upload validation, secret scanning, backup restore.

## Rollback strategy

- Preserve the current production project in version control; make each stage a reviewable, independently deployable change.
- Use preview/staging deployments and promote an immutable known-good build. Keep the prior deployment available for immediate traffic rollback.
- Put Supabase migrations through additive expand/migrate/contract phases. Do not combine destructive schema removal with the launch that stops using it.
- Back up the database and storage manifest before migrations/imports; test restore. Seed/import scripts must be idempotent and produce reconciliation reports.
- Gate database-backed reads and new interactive features behind server-side configuration so they can fall back to reviewed fixtures or be disabled without losing crawlable pages.
- Maintain redirect and canonical tests during rollback; never roll back to the Figma SPA as the public SEO implementation.
- Define rollback triggers (elevated 5xx, broken checkout/contact flows, crawl/indexation errors, RLS exposure, material Web Vital regression), owner, and verification checklist.
