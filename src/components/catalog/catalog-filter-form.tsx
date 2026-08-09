import type { CatalogFilterOptions } from "@/data/catalog";
import type { CatalogFilters } from "@/lib/catalog/filters";
import { PriceRangeFields } from "@/components/catalog/price-range-fields.client";

function FilterGroup({ title, name, options, selected, lockedValue }: Readonly<{ title: string; name: string; options: readonly Readonly<{ value: string; label: string }>[]; selected: readonly string[]; lockedValue?: string }>) {
  return <details className="group border-b border-border" open={selected.length > 0 || Boolean(lockedValue)}><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[10px] font-bold uppercase tracking-[0.22em] text-near-black transition-colors hover:text-brand focus-visible:!outline-none [&::-webkit-details-marker]:hidden">{title}<svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-cool-gray transition-transform group-open:rotate-180"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /></svg></summary><fieldset className="pb-4"><legend className="sr-only">{title}</legend>{options.length ? <div className="space-y-1">{options.map((option) => <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" name={name} value={option.value} defaultChecked={selected.includes(option.value) || lockedValue === option.value} className="h-5 w-5 shrink-0 accent-brand focus-visible:!outline-none" /><span>{option.label}</span></label>)}</div> : <p className="text-xs text-cool-gray">No options available.</p>}</fieldset></details>;
}

export type CatalogFilterVisibility = Readonly<{ brand: boolean; category: boolean; price: boolean; engineCapacity: boolean; transmission: boolean; fuel: boolean; availability: boolean; color: boolean }>;
const allFilters: CatalogFilterVisibility = { brand: true, category: true, price: true, engineCapacity: true, transmission: true, fuel: true, availability: true, color: false };

export function CatalogFilterForm({ filters, options, action, lockedBrand, lockedCategory, visibility = allFilters }: Readonly<{ filters: CatalogFilters; options: CatalogFilterOptions; action: string; lockedBrand?: string; lockedCategory?: string; visibility?: CatalogFilterVisibility }>) {
  return <form action={action} method="get">
    <p className="text-eyebrow mb-2">Filter Motorcycles</p>
    {visibility.brand ? <FilterGroup title="Brand" name="brand" options={options.brand} selected={filters.brand} lockedValue={lockedBrand} /> : null}
    {visibility.category ? <FilterGroup title="Category" name="category" options={options.category} selected={filters.category} lockedValue={lockedCategory} /> : null}
    {visibility.price ? <PriceRangeFields initialMin={filters.priceMin} initialMax={filters.priceMax} /> : null}
    {visibility.engineCapacity ? <FilterGroup title="Engine" name="engine" options={options.engine} selected={filters.engine} /> : null}
    {visibility.transmission ? <FilterGroup title="Transmission" name="transmission" options={options.transmission} selected={filters.transmission} /> : null}
    {visibility.fuel ? <FilterGroup title="Fuel Type" name="fuel" options={options.fuel} selected={filters.fuel} /> : null}
    {visibility.availability ? <FilterGroup title="Availability" name="availability" options={options.availability} selected={filters.availability} /> : null}
    {filters.sort !== "featured" ? <input type="hidden" name="sort" value={filters.sort} /> : null}
    <button type="submit" className="ow-button-primary mt-5 w-full">Apply Filters</button>
  </form>;
}
