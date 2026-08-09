# Component Map

Server is the default. “Client” means a narrowly scoped enhancement, not that its parent page or essential content becomes client-rendered. Paths are proposed and must be checked against the locally installed Next.js conventions during implementation.

| Figma section/component | Proposed Next.js component | Boundary | Proposed file path |
|---|---|---|---|
| `App` global shell | `RootLayout` | Server | `src/app/layout.tsx` |
| Public page shell | `SiteLayout` | Server | `src/app/(site)/layout.tsx` |
| `LoadingScreen` | Remove; use immediate SSR and route loading only if proven | N/A | No production component |
| `Nav` outer header | `SiteHeader` | Server | `src/components/layout/site-header.tsx` |
| Desktop nav links | `PrimaryNavigation` | Server | `src/components/layout/primary-navigation.tsx` |
| Mobile menu state/panel | `MobileNavigation` | Client | `src/components/layout/mobile-navigation.client.tsx` |
| `MegaMenu` | `MotorcyclesMegaMenu` | Client (receives server data) | `src/components/layout/motorcycles-mega-menu.client.tsx` |
| `BrandsMegaMenu` | `BrandsMegaMenu` | Client (receives server data) | `src/components/layout/brands-mega-menu.client.tsx` |
| Shared mega-menu bike tile | `MegaMenuMotorcycleLink` | Server-compatible/presentational | `src/components/layout/mega-menu-motorcycle-link.tsx` |
| `Footer` | `SiteFooter` | Server | `src/components/layout/site-footer.tsx` |
| Homepage render branch | `HomePage` | Server | `src/app/(site)/page.tsx` |
| `BrandBanner` | `BrandCampaignBanner` | Server | `src/components/home/brand-campaign-banner.tsx` |
| Banner moving strip | `CampaignMarquee` | Client progressive enhancement | `src/components/home/campaign-marquee.client.tsx` |
| `BrandProductSection` | `FeaturedBrandMotorcycles` | Server | `src/components/home/featured-brand-motorcycles.tsx` |
| RAF product rail | `MotorcycleCarouselControls` | Client progressive enhancement | `src/components/motorcycles/motorcycle-carousel-controls.client.tsx` |
| `ProductCard` + `CatalogCard` + related card | `MotorcycleCard` | Server | `src/components/motorcycles/motorcycle-card.tsx` |
| `WhyChoose` | `WhyChooseOwMotors` | Server | `src/components/home/why-choose-ow-motors.tsx` |
| `WhyCard` | `ValuePropositionCard` | Server | `src/components/home/value-proposition-card.tsx` |
| `About` homepage section | `AboutPreview` | Server | `src/components/home/about-preview.tsx` |
| About full content | `AboutPage` | Server | `src/app/(site)/about/page.tsx` |
| `Contact` homepage section | `ContactPreview` | Server | `src/components/home/contact-preview.tsx` |
| Contact page | `ContactPage` | Server | `src/app/(site)/contact/page.tsx` |
| Contact form | `ContactForm` | Client form enhancement + Server Action | `src/components/forms/contact-form.client.tsx` |
| `YouTubeSection` | `VideoSection` | Server | `src/components/home/video-section.tsx` |
| `VideoCard` | `VideoCard` | Server | `src/components/home/video-card.tsx` |
| `BrandsPage` | `BrandsIndexPage` | Server | `src/app/(site)/brands/page.tsx` |
| `BrandShowcaseSection` | `BrandShowcase` | Server | `src/components/brands/brand-showcase.tsx` |
| `useScrollFade` | `ScrollReveal` (optional only) | Client | `src/components/ui/scroll-reveal.client.tsx` |
| Catalog render branch | `MotorcyclesPage` | Server | `src/app/(site)/motorcycles/page.tsx` |
| Brand-filter catalog state | `BrandLandingPage` | Server | `src/app/(site)/motorcycles/brand/[brand]/page.tsx` |
| Category-filter catalog state | `CategoryLandingPage` | Server | `src/app/(site)/motorcycles/category/[category]/page.tsx` |
| Catalog grid | `MotorcycleGrid` | Server | `src/components/catalog/motorcycle-grid.tsx` |
| Catalog header/title builder | `CatalogHeader` | Server | `src/components/catalog/catalog-header.tsx` |
| `FilterSidebar` | `CatalogFilters` | Client (URL-backed) | `src/components/catalog/catalog-filters.client.tsx` |
| Mobile filter drawer | `MobileFilterDialog` | Client | `src/components/catalog/mobile-filter-dialog.client.tsx` |
| `FilterSection` | `FilterGroup` | Client/native disclosure | `src/components/catalog/filter-group.client.tsx` |
| `CheckOption` | `FilterCheckbox` | Client | `src/components/catalog/filter-checkbox.client.tsx` |
| `PriceRangeSlider` | `PriceFilter` | Client | `src/components/catalog/price-filter.client.tsx` |
| `ActiveChips` | `ActiveFilterChips` | Client | `src/components/catalog/active-filter-chips.client.tsx` |
| Sort selector | `CatalogSort` | Client (URL-backed) | `src/components/catalog/catalog-sort.client.tsx` |
| Pagination buttons | `CatalogPagination` | Server links | `src/components/catalog/catalog-pagination.tsx` |
| Product render branch | `MotorcyclePage` | Server | `src/app/(site)/motorcycles/[brand]/[slug]/page.tsx` |
| Product heading/price/availability | `MotorcycleSummary` | Server | `src/components/motorcycles/motorcycle-summary.tsx` |
| Product thumbnails/main/zoom | `MotorcycleGallery` | Client with server primary image | `src/components/motorcycles/motorcycle-gallery.client.tsx` |
| CC/color selectors | `VariantSelector` | Client | `src/components/motorcycles/variant-selector.client.tsx` |
| Sticky product CTA | `StickyMotorcycleCta` | Client | `src/components/motorcycles/sticky-motorcycle-cta.client.tsx` |
| Feature groups | `MotorcycleFeatures` | Server | `src/components/motorcycles/motorcycle-features.tsx` |
| Overview | `MotorcycleOverview` | Server | `src/components/motorcycles/motorcycle-overview.tsx` |
| Technical accordions | `SpecificationGroups` | Server/native disclosure | `src/components/motorcycles/specification-groups.tsx` |
| Color gallery | `MotorcycleColors` | Server + optional client selector | `src/components/motorcycles/motorcycle-colors.tsx` |
| `FAQItem` | `FaqList`/native details | Server | `src/components/motorcycles/faq-list.tsx` |
| Related motorcycle markup | `RelatedMotorcycles` | Server | `src/components/motorcycles/related-motorcycles.tsx` |
| Breadcrumb button trail | `Breadcrumbs` | Server links | `src/components/seo/breadcrumbs.tsx` |
| Missing bike inline state + `NotFoundPage` | `NotFound` | Server | `src/app/not-found.tsx` |
| Product JSON-LD (missing today) | `ProductStructuredData` | Server | `src/components/seo/product-structured-data.tsx` |
| Breadcrumb JSON-LD (missing today) | `BreadcrumbStructuredData` | Server | `src/components/seo/breadcrumb-structured-data.tsx` |
| `BRANDS`/`CATALOG_BIKES` reads | Typed server repository | Server-only | `src/lib/data/motorcycles.ts` |
| `buildProductVariants` synthetic data | Verified variant records/mapper | Server-only | `src/lib/data/variants.ts` |
| Contact submission | Server Action | Server-only | `src/app/actions/public-submissions.ts` |

## Consolidation rules

- Use one canonical `MotorcycleCard` with controlled variants; do not preserve three overlapping card implementations.
- Drive desktop/mobile navigation from one typed navigation model while retaining separate accessible presentations.
- Use one disclosure primitive for filters/specifications/FAQs where behavior truly matches.
- Keep page composition route-local and reusable visual/content pieces in `components`; do not recreate a global mega-component.
- Client islands receive only the data they need and must not own headings, descriptions, prices, availability, breadcrumbs, or crawlable destination links.
