import Link from "next/link";
import type { CatalogFilterOptions } from "@/data/catalog";
import { filtersToSearchParams, MAX_CATALOG_PRICE, MIN_CATALOG_PRICE, prettifyFilterValue, type CatalogFilters } from "@/lib/catalog/filters";

type Props = Readonly<{ filters: CatalogFilters; options: CatalogFilterOptions; pathname: string; lockedBrand?: string; lockedCategory?: string }>;

export function ActiveFilterChips({ filters, options, pathname, lockedBrand, lockedCategory }: Props) {
  const groups = (["brand", "category", "engine", "transmission", "fuel", "availability"] as const).flatMap((key) => filters[key]
    .filter((value) => !(key === "brand" && value === lockedBrand) && !(key === "category" && value === lockedCategory))
    .map((value) => ({ key, value })));
  const locked = [...(lockedBrand ? [{ key: "brand" as const, value: lockedBrand }] : []), ...(lockedCategory ? [{ key: "category" as const, value: lockedCategory }] : [])];
  const labels = new Map(Object.values(options).flat().map((option) => [option.value, option.label]));
  const labelFor = (value: string) => labels.get(value) ?? prettifyFilterValue(value);
  const hasPriceFilter = filters.priceMin !== MIN_CATALOG_PRICE || filters.priceMax !== MAX_CATALOG_PRICE;
  if (!groups.length && !locked.length && !hasPriceFilter) return null;

  return <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
    {locked.map((item) => {
      const next = {
        ...filters,
        [item.key]: filters[item.key].filter((value) => value !== item.value),
        page: 1,
      };
      const query = filtersToSearchParams(next).toString();
      return <Link key={`locked-${item.value}`} href={`/motorcycles${query ? `?${query}` : ""}`} className="inline-flex min-h-8 items-center gap-2 border border-border bg-white px-3 text-xs font-semibold text-near-black transition-colors hover:border-brand hover:text-brand">{labelFor(item.value)} <span aria-hidden="true">×</span><span className="sr-only">Remove route filter</span></Link>;
    })}
    {groups.map(({ key, value }) => {
      const next = { ...filters, [key]: filters[key].filter((item) => item !== value), page: 1 };
      const query = filtersToSearchParams(next).toString();
      return <Link key={`${key}-${value}`} href={`${pathname}${query ? `?${query}` : ""}`} className="inline-flex min-h-8 items-center gap-2 border border-border bg-white px-3 text-xs font-semibold hover:border-brand hover:text-brand">{labelFor(value)} <span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></Link>;
    })}
    {hasPriceFilter ? <Link href={`${pathname}?${filtersToSearchParams({ ...filters, priceMin: MIN_CATALOG_PRICE, priceMax: MAX_CATALOG_PRICE, page: 1 })}`} className="inline-flex min-h-8 items-center gap-2 border border-border bg-white px-3 text-xs font-semibold hover:border-brand hover:text-brand">PKR {filters.priceMin.toLocaleString()}–{filters.priceMax.toLocaleString()} <span aria-hidden="true">×</span><span className="sr-only">Remove price filter</span></Link> : null}
    <Link href="/motorcycles" className="inline-flex min-h-8 items-center px-2 text-xs font-semibold text-brand">Clear all</Link>
  </div>;
}
