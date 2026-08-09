import type { CatalogMotorcycle } from "@/data/catalog";

export const MIN_CATALOG_PRICE = 150_000;
export const MAX_CATALOG_PRICE = 5_000_000;

export type RawSearchParams = Record<string, string | string[] | undefined>;
export type CatalogFilters = Readonly<{
  brand: string[];
  category: string[];
  engine: string[];
  transmission: string[];
  fuel: string[];
  availability: string[];
  priceMin: number;
  priceMax: number;
  sort: "featured" | "name-az" | "name-za" | "price-asc" | "price-desc";
  page: number;
}>;

const SAFE_FILTER_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getArray(value: string | string[] | undefined) {
  return value ? (Array.isArray(value) ? value : [value]) : [];
}

function safeValues(value: string | string[] | undefined) {
  return [...new Set(getArray(value)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length <= 80 && SAFE_FILTER_VALUE.test(item)))]
    .slice(0, 12);
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCatalogFilters(params: RawSearchParams): CatalogFilters {
  const sort = params.sort === "name-az"
    || params.sort === "name-za"
    || params.sort === "price-asc"
    || params.sort === "price-desc"
    ? params.sort
    : "featured";
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);
  const requestedMin = Math.min(
    MAX_CATALOG_PRICE,
    Math.max(MIN_CATALOG_PRICE, Number(firstValue(params.priceMin)) || MIN_CATALOG_PRICE),
  );
  const requestedMax = Math.min(
    MAX_CATALOG_PRICE,
    Math.max(MIN_CATALOG_PRICE, Number(firstValue(params.priceMax)) || MAX_CATALOG_PRICE),
  );

  return {
    brand: safeValues(params.brand),
    category: safeValues(params.category),
    engine: safeValues(params.engine),
    transmission: safeValues(params.transmission),
    fuel: safeValues(params.fuel),
    availability: safeValues(params.availability),
    priceMin: Math.min(requestedMin, requestedMax),
    priceMax: Math.max(requestedMin, requestedMax),
    sort,
    page,
  };
}

export function filterCatalog(
  items: readonly CatalogMotorcycle[],
  filters: CatalogFilters,
  lockedBrand?: string,
  lockedCategory?: string,
) {
  const filtered = items.filter((item) => {
    if (lockedBrand && item.brand !== lockedBrand) return false;
    if (lockedCategory && !item.categories.includes(lockedCategory)) return false;
    return (!filters.brand.length || filters.brand.includes(item.brand))
      && (!filters.category.length || filters.category.some((category) => item.categories.includes(category)))
      && (!filters.engine.length || filters.engine.includes(item.engine.toLowerCase()))
      && (!filters.transmission.length || filters.transmission.includes(item.transmission))
      && (!filters.fuel.length || filters.fuel.includes(item.fuel))
      && (!filters.availability.length || filters.availability.includes(item.availability))
      && item.price >= filters.priceMin
      && item.price <= filters.priceMax;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "name-az") return a.name.localeCompare(b.name);
    if (filters.sort === "name-za") return b.name.localeCompare(a.name);
    if (filters.sort === "price-asc") return a.price - b.price;
    if (filters.sort === "price-desc") return b.price - a.price;
    return a.featuredOrder - b.featuredOrder || a.name.localeCompare(b.name);
  });
}

export function filtersToSearchParams(filters: CatalogFilters, overrides: Partial<CatalogFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  for (const key of ["brand", "category", "engine", "transmission", "fuel", "availability"] as const) {
    for (const value of next[key]) params.append(key, value);
  }
  if (next.sort !== "featured") params.set("sort", next.sort);
  if (next.priceMin !== MIN_CATALOG_PRICE) params.set("priceMin", String(next.priceMin));
  if (next.priceMax !== MAX_CATALOG_PRICE) params.set("priceMax", String(next.priceMax));
  if (next.page > 1) params.set("page", String(next.page));
  return params;
}

export function prettifyFilterValue(value: string) {
  return value.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join(" ");
}
