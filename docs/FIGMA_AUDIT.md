# Figma Reference Audit

## Scope and method

This is a read-only audit of the authored files in `../figma-vite-reference`; `node_modules` and `src/imports/pasted_text` were not treated as production source. The principal implementation is `src/app/App.tsx` (3,630 physical lines; PowerShell reports 3,428 content lines, 185,457 characters). No reference or production application code was changed during this audit.

## Executive findings

- The export is one client-rendered SPA. Five values of `AppPage` (`home`, `brands`, `motorcycles`, `product`, `not-found`) are switched through React state; no public content has a stable route.
- `App.tsx` combines data, design tokens, global CSS, navigation, four page views, forms, animations, and 30+ components/functions. It must be decomposed, not copied.
- The UI displays 20 catalog records, four brands, eight category labels, generated variants/specifications, and substantial marketing copy as hardcoded data. Much of it appears illustrative and needs business verification.
- Product/card photography largely depends on Unsplash URLs. Local assets include 29 images; 9 are not imported, and several PNG photographs are 2.2–2.8 MB.
- The entry graph directly uses only React hooks, local images, and `lucide-react`. The generated `components/ui` directory is not imported by `App.tsx`; its broad dependency set should not be inherited.
- Essential content is absent until JavaScript runs, and an artificial 2.2–2.7 second loading overlay delays presentation.

## Existing page states

| State | Rendered view | Notes |
|---|---|---|
| `home` | Homepage composition | Default; all brand banners/product rails plus marketing sections |
| `brands` | `BrandsPage` | Four alternating brand showcases |
| `motorcycles` | `CatalogPage` | Receives initial brand/category arrays from parent state |
| `product` | `ProductPage` | Receives an in-memory bike ID; missing ID renders an inline error |
| `not-found` | `NotFoundPage` | Declared and renderable, but normal navigation has no URL parser capable of reaching arbitrary bad paths |

`App` also holds `loading`, `visible`, `catalogBrands`, `catalogCategories`, and `selectedBikeId`. `navigate()` mutates these values, changes `page`, and calls `window.scrollTo`. Refresh, share, back/forward, direct entry, and crawler discovery do not preserve this state.

## Existing sections

### Shared shell

- Artificial full-screen loading animation
- Desktop navbar with Motorcycles and Brands mega menus
- Mobile dropdown navigation
- Footer with company, quick-link, brand, social, and contact areas

### Homepage

- Four `BrandBanner` marquees, one for each brand
- Four `BrandProductSection` auto-moving product rails
- Why Choose OW Motors feature cards
- About OW Motors split media/content section
- Test Ride call-to-action
- Contact details and contact form
- YouTube video section
- Footer

### Brands page

- Introductory hero/title
- Four alternating `BrandShowcaseSection` blocks with logo, description, campaign images, motorcycle cutouts, and Explore CTA
- Scroll-reveal behavior
- Test Ride CTA and footer

### Catalog page

- Catalog heading/subtitle derived from active filters
- Desktop filter sidebar and mobile filter drawer
- Price, brand, category, engine, transmission, fuel, and availability controls
- Active filter chips and clear-all
- Sort selector
- 12-item client-side pagination
- Catalog cards and empty state

### Product page

- Breadcrumb-like button trail
- Thumbnail/main image gallery, previous/next controls, and zoom modal
- Brand/model, price, availability, specifications
- CC and color selection with synthetic compatibility rules
- Call/WhatsApp CTAs and sticky purchase bar
- Feature grid, overview, technical accordions, colors, test-ride form, FAQs, and related motorcycles

## Existing reusable components

Reusable within `App.tsx`: `Nav`, `MegaMenu`, `BrandsMegaMenu`, `Footer`, `BrandBanner`, `ProductCard`, `BrandProductSection`, `WhyCard`, `TestRideCTA`, `CatalogCard`, `FilterSection`, `CheckOption`, `ActiveChips`, `PriceRangeSlider`, `FAQItem`, and `BrandShowcaseSection`.

The separate `src/app/components/ui` directory contains many generated shadcn/Radix wrappers plus `ImageWithFallback`, but none is imported into `App.tsx`. These are inventory, not evidence of production need.

## Navigation behavior

- Internal destinations use `href="#"`, buttons, `preventDefault()`, and callbacks rather than URLs.
- Desktop mega menus open on mouse enter and close on mouse leave with short timers. Category/brand selections mutate catalog state; bike selections search the hardcoded array.
- The mobile menu is a navbar-positioned animated panel. Motorcycle categories expand as nested stateful groups.
- Footer links similarly call `navigate`; About and Contact are homepage sections rather than routes.
- There is no router, history integration, deep linking, URL filter serialization, canonical handling, or active-path semantics.

## Carousels and moving media

| Experience | Implementation | Risk/production treatment |
|---|---|---|
| Brand banners | Duplicated image strip with CSS `brandScroll` (30–44s), paused on hover | Decorative motion; retain static first image in HTML and respect reduced motion |
| Brand products | Duplicated track moved by continuous `requestAnimationFrame`; pauses on hover and resumes after 3s | Isolate as client enhancement; server-render real linked cards first |
| Mega menus | Three bikes per page with numbered pagination and fade animation | Client island; links must exist as anchors |
| Product gallery | Thumbnail selection, prev/next buttons, zoom overlay | Client island with server-rendered primary image |
| YouTube cards | Static thumbnails from `img.youtube.com`, linked to YouTube | External dependency/privacy/performance consideration |

The generated `ui/carousel.tsx`/Embla wrapper is not used by the live app.

## Animations and hover effects

Defined keyframes include `brandScroll`, `carouselScroll` (apparently superseded by RAF), `wheelSpin`, loader fade/pulse/progress, menu/mega-menu entrances/exits, shine pass, category fade, and filter drawer slides. `useScrollFade` uses `IntersectionObserver` for brand showcase reveals. Hover treatments include campaign-image zoom, product-card lift/shadow and image zoom, shine sweep, video zoom/play reveal, mega-menu image zoom/CTA reveal, button inversions, link color changes, and selector border changes.

Risks: no detected `prefers-reduced-motion` rule; endless motion and a wheel loader run by default; multiple hover-only affordances do not translate to keyboard/touch; several styles are mutated directly in mouse handlers.

## Responsive behavior and breakpoints

- Tailwind responsive utilities use the default-style `md:` and `lg:` prefixes, including desktop/mobile navigation and section padding.
- No explicit `@media` block exists in `App.tsx`; responsiveness is a mixture of Tailwind classes, `auto-fill/minmax`, flex wrapping, and fixed inline grids.
- Fixed two-column and four-column product-page grids, a 60/40 brand showcase grid, fixed gallery heights, and inline pixel dimensions are likely to overflow or become cramped on small screens.
- Desktop mega menus are hidden at smaller widths and replaced with a mobile panel, but catalog and product layouts require device testing at 320, 375, 768, 1024, and 1440 px.
- Production should make breakpoints explicit and consistent with the installed Tailwind version rather than assuming Figma-export defaults.

## Visual design system

### Fonts

- Display: Rajdhani, weights 400/500/600/700.
- Body: Inter, normal 300/400/500/600 and italic 400.
- Loaded through a Google Fonts CSS `@import`, which is render-blocking and must become `next/font`.

### Colors

Primary tokens declared in `App.tsx`: red `#C62828`, near-black `#111111`, cool gray `#6B7280`, soft gray `#F5F5F5`, border `#E5E7EB`, plus white. Additional one-off grays, translucent whites/blacks, WhatsApp green `#25D366`, and color-variant swatches are inline. `theme.css` also contains generated shadcn variables that are not the main app's actual token source.

### Spacing and sizing

There is no formal spacing scale. Tailwind utilities coexist with many inline values (4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 36, 40, and 60 px), section paddings, fixed carousel card width of 272 px plus 20 px gap, rounded cards (notably 22 px), and fixed media heights. Migration should normalize these into a documented token scale while matching the rendered reference.

### Breakpoints

Only named Tailwind `md` and `lg` usage is evident; no custom breakpoint configuration exists. Treat their exact values as unverified until the production Tailwind documentation/config is inspected during implementation.

## Hardcoded content and data quality

- Four brands and 20 products appear twice in overlapping `BRANDS` and `CATALOG_BIKES` structures.
- Product price, spec string, category, engine CC, transmission, fuel, and availability are hardcoded.
- Eight category labels include Electric Bikes, although the catalog has no electric record.
- Mega-menu data, why-us claims, about copy, contact details, opening hours, social links, YouTube IDs, FAQs, feature groups, and overview copy are hardcoded.
- `buildProductVariants`, `PCOLOR_DEFS`, `GALLERY_POOL`, overview maps, feature groups, and specifications synthesize product detail from sparse catalog records. These must not be presented as factual inventory without validation.
- The contact and test-ride forms have no submit handler, persistence, server validation, consent model, spam defense, or success/error flow.
- Duplicate motorcycle names exist across brands (for example Hawk 200); production identity must use the brand-scoped stable slug and immutable database UUID, not the name alone.

## External image URLs

- Most product cards, catalog records, Hi-Speed/Super Star banners, galleries, overview/related imagery use `images.unsplash.com` URLs with resize query parameters.
- YouTube thumbnails use `img.youtube.com`; video links use `youtu.be` and the section links to the OW Motor Sports channel.
- These are placeholders/external dependencies, not an approved product-media source. Obtain licensed, brand-accurate originals and migrate them to controlled storage. Do not make launch dependent on remote Unsplash URLs.

## Browser-only code

- `window.scrollTo` for pseudo-navigation.
- `window.scrollY` and scroll event listeners for the sticky product CTA.
- `requestAnimationFrame`/`cancelAnimationFrame` for continuous carousels.
- `IntersectionObserver` for reveal animations.
- Numerous timers for loading and menu/drawer transitions.
- React hooks throughout the entire application force client rendering.

Each behavior must be isolated to a minimal Client Component; none should own essential page copy or links.

## Accessibility risks

- Anchor placeholders and buttons used as navigation undermine link semantics, open-in-new-tab behavior, and crawlability.
- Desktop menus depend heavily on hover; no robust keyboard focus/open/close model or menu ARIA relationship is evident.
- Icon-only controls need verified accessible names; carousel pagination and gallery controls need state announcements.
- The zoom overlay is a visual modal without demonstrated focus trap, focus return, Escape handling, or background inertness.
- Filter drawer and mobile menu need dialog semantics and focus management.
- FAQ/filter/technical accordions do not consistently expose `aria-expanded`/`aria-controls`.
- Several images use only a model name as alt text; decorative imagery is not consistently marked empty-alt.
- Color choices include swatches but must retain text and selected/disabled semantics.
- Placeholder links (`#`) and empty social destinations can create keyboard traps/no-op interactions.
- Inline light-gray text and small 0.6–0.72rem labels need contrast and legibility checks.
- No reduced-motion support was detected; touch target sizes and visible focus states are inconsistent.
- Forms need explicit field associations, required-state/error messaging, autocomplete, and privacy/consent text.

## SEO risks

- One SPA URL represents all content; brand, category, product, about, contact, test-ride, and 404 states are not independently crawlable.
- Essential content depends on hydration and state. There is no route metadata, canonical, Open Graph data, sitemap, robots file, JSON-LD, or real HTTP 404 behavior.
- Filter combinations cannot be shared and have no index-control/canonical policy.
- Repeated hardcoded product/brand data risks inconsistency and thin/duplicate landing pages.
- Buttons/`#` anchors prevent a crawlable internal-link graph and breadcrumbs are not real links.
- Placeholder imagery and weak alt descriptions impair image SEO and trust.
- Artificial loading and client-only rendering harm discovery and Core Web Vitals.
- Marketing claims, prices, availability, and generated specifications may be inaccurate; structured data must never amplify unverified facts.

## Performance risks

- A 185 KB monolithic source component hydrates the whole site and bundles data/UI for routes the visitor did not request.
- Artificial loading delays usable content by 2.2 seconds and overlay removal by 2.7 seconds.
- Continuous RAF animation, duplicated carousel DOM, infinite CSS animation, observers, scroll listeners, and many inline event handlers add main-thread work.
- Local media includes very large PNGs; the OW logo is 2.19 MB and five unused Taro PNG photographs are 2.22–2.78 MB each.
- External images lack Next.js optimization/intrinsic sizing guarantees and create third-party requests.
- Google Fonts CSS import delays font discovery and may cause shifts.
- Inline styles/global CSS inside the component prevent caching and maintainability; repeated media may be decoded multiple times.
- The dependency manifest is far larger than the reachable application graph.

## Dependencies: usage and migration decision

Directly evidenced in `App.tsx`: React hooks and `lucide-react`. Vite/Tailwind are build tooling for the reference only. `motion` is declared but animation is implemented with CSS/DOM APIs. No import from `components/ui` is reachable from `App.tsx`.

Treat the following declared runtime packages as unused by the current entry graph and do not migrate automatically: Emotion, MUI, Popper, every Radix package, canvas-confetti, class-variance-authority, clsx, cmdk, date-fns, Embla, input-otp, motion, next-themes, react-day-picker, react-dnd and backend, react-hook-form, react-popper, react-resizable-panels, react-responsive-masonry, react-router, react-slick, Recharts, Sonner, tailwind-merge, tw-animate-css, and Vaul. Some generated `components/ui` files reference these packages, but those files are themselves disconnected. Re-evaluate one dependency at a time only when a production component proves the need.

## Potential duplicate components/data

- Product data is duplicated between `BRANDS.products` and `CATALOG_BIKES`.
- `ProductCard` and `CatalogCard` are two motorcycle-card implementations with overlapping image/model/price/CTA patterns.
- `MegaMenu` and `BrandsMegaMenu` duplicate pagination, panel animation, bike tiles, and hover logic.
- Desktop and mobile navigation duplicate link/category rendering rather than sharing a navigation model.
- Product-page related-bike cards reproduce catalog-card markup instead of reusing it.
- Filter `FAQItem`/technical accordion/`FilterSection` repeat disclosure patterns.
- Brand banners and brand showcases have overlapping campaign/logo/CTA concepts.
- `carouselScroll` exists alongside the RAF product carousel and may be dead styling.
- Imported `tr3` actually points at `tr4-removebg-preview.png`, while `tr3-removebg-preview.png` is unused, creating a naming/identity hazard.

## Audit conclusion

Use the reference as a visual/interaction specification only. Rebuild route by route around a verified content model, server-rendered semantic content, controlled assets, and small accessible client enhancements.
