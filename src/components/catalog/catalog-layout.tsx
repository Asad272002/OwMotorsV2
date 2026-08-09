import Link from "next/link";
import { AutoSubmitForm } from "@/components/catalog/auto-submit-form.client";
import { ActiveFilterChips } from "@/components/catalog/active-filter-chips";
import { CatalogCard, type CatalogCardPresentation } from "@/components/catalog/catalog-card";
import { CatalogFilterForm, type CatalogFilterVisibility } from "@/components/catalog/catalog-filter-form";
import { CatalogFilterDisclosure } from "@/components/catalog/catalog-filter-disclosure.client";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo/breadcrumbs";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { Container } from "@/components/ui/container";
import type { CatalogFilters } from "@/lib/catalog/filters";
import type { CatalogPageData } from "@/lib/supabase/public-queries";

type Props = Readonly<{ title: string; description: string; pathname: string; filters: CatalogFilters; catalog: CatalogPageData; breadcrumbs: readonly BreadcrumbItem[]; lockedBrand?: string; lockedCategory?: string; filterVisibility?: CatalogFilterVisibility; cardPresentation?: CatalogCardPresentation; desktopColumns?: number }>;

function SortForm({ filters, pathname }: Readonly<{ filters: CatalogFilters; pathname: string }>) {
  return <AutoSubmitForm action={pathname} className="flex w-full items-center gap-2 sm:w-auto" fallbackLabel="Apply sort" fallbackClassName="min-h-11 border border-near-black px-3 text-xs font-semibold">
    <label htmlFor="catalog-sort" className="shrink-0 text-xs text-cool-gray">Sort by</label>
    {(["brand", "category", "engine", "transmission", "fuel", "availability"] as const).flatMap((key) => filters[key].map((value) => <input key={`${key}-${value}`} type="hidden" name={key} value={value} />))}
    <input type="hidden" name="priceMin" value={filters.priceMin} /><input type="hidden" name="priceMax" value={filters.priceMax} />
    <select id="catalog-sort" name="sort" defaultValue={filters.sort} className="min-h-11 min-w-0 flex-1 border border-border bg-white px-3 text-base sm:flex-none sm:text-sm">
      <option value="featured">Featured</option><option value="price-asc">Price: Low to high</option><option value="price-desc">Price: High to low</option><option value="name-az">Name: A–Z</option><option value="name-za">Name: Z–A</option>
    </select>
  </AutoSubmitForm>;
}

export function CatalogLayout({ title, description, pathname, filters, catalog, breadcrumbs, lockedBrand, lockedCategory, filterVisibility, cardPresentation, desktopColumns = 3 }: Props) {
  const filterAction = lockedBrand || lockedCategory ? "/motorcycles" : pathname;
  const filterForm = <CatalogFilterForm filters={filters} options={catalog.options} action={filterAction} lockedBrand={lockedBrand} lockedCategory={lockedCategory} visibility={filterVisibility} />;
  return <>
    <BreadcrumbStructuredData items={breadcrumbs} currentPath={pathname} />
    <header className="border-b border-border bg-soft-gray py-10 sm:py-12"><Container className="max-w-5xl"><Breadcrumbs items={breadcrumbs} /><p className="text-eyebrow mb-3 mt-5">OW Motors</p><h1 className="font-display text-[clamp(2.75rem,6vw,4rem)] font-bold leading-[0.95] tracking-[-0.025em] text-near-black">{title}</h1><p className="mt-4 max-w-2xl text-base leading-6 text-cool-gray">{description}</p></Container></header>
    <Container className="max-w-5xl py-8 sm:py-10">
      <CatalogFilterDisclosure>{filterForm}</CatalogFilterDisclosure>
      <div className="flex items-start gap-6"><aside className="sticky top-20 hidden w-52 shrink-0 lg:block">{filterForm}</aside>
        <section className="min-w-0 flex-1" aria-labelledby="catalog-results-heading">
          <ActiveFilterChips filters={filters} options={catalog.options} pathname={pathname} lockedBrand={lockedBrand} lockedCategory={lockedCategory} />
          <div className="mb-5 flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center"><h2 id="catalog-results-heading" className="text-sm font-semibold">{catalog.total} {catalog.total === 1 ? "Motorcycle" : "Motorcycles"}</h2><SortForm filters={filters} pathname={pathname} /></div>
          {catalog.motorcycles.length ? <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${desktopColumns === 2 ? "lg:grid-cols-2" : desktopColumns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>{catalog.motorcycles.map((motorcycle) => <CatalogCard key={motorcycle.id} motorcycle={motorcycle} presentation={cardPresentation} />)}</div> : <div className="border border-border bg-soft-gray px-6 py-14 text-center"><h2 className="text-heading-sm">No motorcycles found</h2><p className="mt-2 text-sm text-cool-gray">No published motorcycles match this page and its active filters.</p><Link href="/motorcycles" className="ow-button-primary mt-5 inline-flex">Clear all filters</Link></div>}
          <CatalogPagination pathname={pathname} filters={filters} page={catalog.page} totalPages={catalog.totalPages} />
        </section>
      </div>
    </Container>
  </>;
}
