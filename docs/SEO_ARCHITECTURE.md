# SEO Architecture

## Principles

Every valuable entity gets one stable, server-rendered URL and one canonical identity. Important text, prices, availability, specifications, breadcrumbs, and links are in initial HTML. Filters enhance discovery but do not create an uncontrolled index surface. Structured data contains only verified, visible facts.

## Public route structure

```text
/
/brands
/motorcycles
/motorcycles/brand/[brand]
/motorcycles/category/[category]
/motorcycles/[brand]/[slug]
/about
/contact
```

Use lowercase kebab-case ASCII slugs. Administrative routes are authenticated and noindex. Do not expose internal IDs in canonical URLs. Routes not represented by a real page return a true 404 through `notFound()`/`not-found.tsx`, not a client-side state.

## Brand landing page strategy

Each `/motorcycles/brand/[brand]` page has unique verified brand introduction/history/positioning, logo/campaign media, available categories, crawlable published motorcycle cards, FAQs only when genuinely brand-specific, breadcrumbs, and links to relevant category pages. It is not merely `/motorcycles?brand=...`. Unknown/unpublished brands return 404. `/brands` provides a useful overview and links to every active brand landing page.

Avoid interchangeable boilerplate. Editorial title/H1 copy should reflect Pakistani market intent without keyword stuffing, for example “Taro Motorcycles in Pakistan,” only if business scope and wording are accurate.

## Category landing page strategy

Each `/motorcycles/category/[category]` page has a unique definition, buyer-oriented context, representative attributes/use cases, published products, brand cross-links, and breadcrumbs. Only create categories with durable search/user value and sufficient verified content. Empty/transient classifications should not be published as index pages. Category pages remain canonical even if users could reach an equivalent catalog query.

## Product URL strategy

Canonical pattern: `/motorcycles/[brand]/[slug]`, where `[slug]` is a stable motorcycle slug within the brand (for example `/motorcycles/taro/gp-v3`). Keep immutable database IDs separate from public URLs. The default canonical represents the motorcycle family; CC/color variant selection should not create independent indexable URLs unless a variant has truly distinct, durable demand/content and an approved strategy.

If query state such as `?cc=250&color=yellow` preselects a valid variant, canonical remains the clean product URL. Renames use a maintained permanent redirect from the old route. Unpublished products should not leak through sitemap, related links, metadata, or public queries.

## Query-filter strategy

Approved browsing filters can use normalized parameters on `/motorcycles`, such as `brand`, `category`, `cc`, `transmission`, `fuel`, `availability`, `color`, `sort`, and `page`. Validate and whitelist values server-side; sort keys and repeated values must have a deterministic serialization order. Do not encode filters only in client state.

- Brand-only/category-only intent should link to the corresponding permanent landing page, not a query URL.
- Multi-filter, sort, color, availability, and price combinations are useful to users but normally `noindex,follow` and canonical to `/motorcycles` (or, only when exactly equivalent and deliberate, the relevant brand/category landing page).
- Pagination requires a deliberate policy. Each page must be crawlable via real links and self-consistent; do not canonical every paginated result to page 1 if that hides unique products. Prefer a server-rendered sufficiently sized catalog or self-canonical paginated pages with clear linking.
- Invalid/empty parameters are removed by redirect to a normalized URL or safely ignored; never generate infinite parameter spaces.
- Faceted links that should not be indexed need both crawl-budget restraint in UI and metadata/canonical handling; robots.txt alone is not a canonicalization tool.

## Canonical strategy

Set an absolute production `metadataBase` and one self-referential canonical on every clean indexable page. Canonicals strip tracking parameters and normalize host, HTTPS, trailing-slash policy, case, and parameter order. Brand/category query equivalents canonical to their clean landing route; product variant selectors canonical to the product family. Redirect alternate hosts/protocols and retired slugs at the edge/application level. Never canonical a missing, unrelated, or unpublished page to the homepage.

The production domain is not yet provided; it is a Stage 0 blocker for final absolute URL verification, not for planning.

## Metadata strategy

- Root/static pages use route metadata; dynamic brand/category/product routes use server-side `generateMetadata` from the same published record as the page.
- Every indexable page receives a unique concise title, compelling unique meta description, canonical, Open Graph/Twitter title/description/image, and appropriate robots directive.
- The visible H1 aligns with search intent but need not duplicate the title verbatim. One primary H1 per route and logical H2/H3 hierarchy.
- Metadata fallbacks are deterministic, but editorial fields should be available for important landing pages. Enforce uniqueness/length review in admin or CI reports.
- Product metadata includes verified brand, model, differentiator/engine where useful, and Pakistan/PKR wording only when accurate. Do not put stale price/stock claims in descriptions without an update process.
- Default social imagery uses an owned OW Motors asset; brand/product pages prefer approved entity imagery at appropriate OG dimensions.
- Admin, preview, private, and error pages use `noindex`.

## Structured-data strategy

Emit JSON-LD server-side as safely serialized data matching visible content:

- Sitewide: `Organization` or the most accurate dealership subtype with official name, canonical URL, approved logo, real address/phone/hours, and verified `sameAs`; do not invent data.
- Homepage: `WebSite` plus organization. Add `SearchAction` only after a real, indexable site-search endpoint exists.
- Breadcrumb routes: `BreadcrumbList` matching visible breadcrumb links.
- Product: `Product` with name, description, image, and `brand`. Add `Offer` only with accurate PKR price, URL, condition, and schema.org availability mapping. Model variants using offers linked by internal UUIDs without exposing inventory identifiers.
- Landing lists: `ItemList` may describe visible linked products, but is secondary to semantic HTML.
- FAQs: `FAQPage` only for visible, genuine first-party FAQs and only if current search-engine eligibility/policy is confirmed at implementation time.

Never generate ratings, reviews, discounts, inventory quantities, GTINs, or claims that are absent/unverified. Validate JSON-LD syntax and rich-result eligibility in CI/manual launch checks.

## Sitemap strategy

Implement `src/app/sitemap.ts` from active static routes plus published brand, category, and product records. Exclude queries, admin, previews, drafts, redirects, 404s, and noindex pages. Use absolute canonical URLs; `lastModified` comes from meaningful content updates, not request/build time. Add image entries only when supported by the installed Next.js API and beneficial. Split sitemap indexes only if scale requires it. Reference the sitemap from robots and submit it to search consoles after domain verification.

## Robots strategy

Implement environment-aware `src/app/robots.ts`:

- Production: allow public routes, disallow clearly private/admin paths as crawl guidance, and publish the sitemap URL.
- Preview/staging: sitewide `noindex` via response/meta controls and, where appropriate, robots disallow; require access control for sensitive environments.
- Admin/private content must be protected by authentication, not robots.txt.
- Do not block filter URLs in robots if crawlers need to see their `noindex`/canonical initially; decide based on crawl observations after launch.

## Internal-link strategy

- Header and footer use real `next/link` destinations for Home, Brands, Motorcycles, About, Contact, every active brand, and priority categories.
- Homepage brand sections and product cards link to canonical landing/product routes in server HTML even when enhanced by a carousel.
- Brand pages link to products/categories; category pages link to products/brands; product pages link back to brand/category and to genuinely related products.
- Use descriptive anchor text (“View Taro GP V3”) rather than repeated vague “View details” when practical and visually accessible.
- No `href="#"` pseudo-navigation. No orphan indexable route. Build a crawl test that starts at `/` and verifies discovery.

## Breadcrumb strategy

Visible server-rendered breadcrumbs use ordered links and an `aria-label`, with the current page as text/`aria-current="page"`. Mirror them exactly in `BreadcrumbList` JSON-LD.

Examples:

- `Home > Motorcycles`
- `Home > Motorcycles > Taro`
- `Home > Motorcycles > Sport Bikes`
- `Home > Motorcycles > Taro > GP V3`

Product breadcrumbs should link brand to `/motorcycles/brand/taro`; add a category level only when one canonical primary category is explicitly modeled.

## Image SEO strategy

- Replace Unsplash placeholders with owned/licensed, model-accurate media on controlled storage/CDN.
- Use `next/image` for content images with intrinsic width/height or stable aspect ratio, correct `sizes`, responsive AVIF/WebP delivery, and lazy loading below the fold. Preload/priority only the single likely LCP image.
- Production names are descriptive and stable (`taro-gp-v3-yellow-side.webp`), not camera/export names. Store width, height, MIME, focal point, caption, sort order, rights/source, and alt text with media records.
- Alt text describes the visible subject and useful distinguishing facts without stuffing: brand, model, color, and view when verified. Logos with adjacent visible brand text and decorative campaign duplicates get empty alt; linked standalone logos need an accessible name.
- Important product images are real `<img>` output, not CSS backgrounds. CSS backgrounds are reserved for decoration.
- Provide high-quality OG images and ensure their URLs are absolute and publicly fetchable.
- Keep image URLs stable/versioned, include relevant images in sitemaps if supported/valuable, and prevent indexing of unapproved/draft storage objects through publication design.

## Measurement and governance

Before launch, crawl the production candidate and assert status, indexability, canonical, title, description, H1, structured data, image alts, and internal links for every route. After launch, monitor search-console coverage, sitemap processing, duplicate canonical reports, crawl patterns for filters, Core Web Vitals, and broken links. Content edits that change slugs, publication, price, availability, or structured fields must trigger cache invalidation and sitemap/metadata consistency checks.
