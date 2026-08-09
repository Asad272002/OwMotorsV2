import Link from "next/link";
import { filtersToSearchParams, type CatalogFilters } from "@/lib/catalog/filters";

export function CatalogPagination({ page, totalPages, filters, pathname }: Readonly<{ page: number; totalPages: number; filters: CatalogFilters; pathname: string }>) {
  if (totalPages <= 1) return null;
  const href = (target: number) => { const query = filtersToSearchParams(filters, { page: target }).toString(); return `${pathname}${query ? `?${query}` : ""}`; };
  return <nav aria-label="Catalog pagination" className="mt-12 flex flex-wrap items-center justify-center gap-1.5">{page > 1 ? <Link href={href(page - 1)} className="flex min-h-10 items-center border border-border px-4 text-sm font-semibold">← Previous</Link> : null}{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <Link key={number} href={href(number)} aria-current={number === page ? "page" : undefined} className={`flex h-10 w-10 items-center justify-center border text-sm font-semibold ${number === page ? "border-brand bg-brand text-white" : "border-border bg-white"}`}>{number}</Link>)}{page < totalPages ? <Link href={href(page + 1)} className="flex min-h-10 items-center border border-border px-4 text-sm font-semibold">Next →</Link> : null}</nav>;
}
