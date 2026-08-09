import { ArchiveRestore, Eye, Plus, Search, SlidersHorizontal, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { updateMotorcycleInventoryBulk } from "@/app/admin/inventory-workflow-actions";
import { AdminForm } from "@/components/admin/admin-form.client";
import { AdminEmptyState, AdminPageHeader, StatusBadge, adminInputClass } from "@/components/admin/admin-ui";
import { completionLabel, getMotorcycleCompletion, getMotorcycleStockStatus, type CompletionState } from "@/lib/admin/inventory-readiness";
import { getAdminBrands, getAdminMotorcycleInventory } from "@/lib/admin/queries";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";

type SearchParams = {
  q?: string | string[];
  brand?: string | string[];
  publication?: string | string[];
  stock?: string | string[];
  completion?: string | string[];
};

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

const savedViews = [
  ["All inventory", "/admin/inventory/motorcycles"],
  ["Published", "/admin/inventory/motorcycles?publication=published"],
  ["Drafts", "/admin/inventory/motorcycles?publication=draft"],
  ["Needs attention", "/admin/inventory/motorcycles?completion=needs_attention"],
  ["Archived", "/admin/inventory/motorcycles?publication=archived"],
  ["Unavailable", "/admin/inventory/motorcycles?stock=out_of_stock"],
] as const;

export default async function InventoryMotorcyclesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [query, motorcycles, brands] = await Promise.all([searchParams, getAdminMotorcycleInventory(), getAdminBrands()]);
  const filters = {
    q: value(query.q).trim().toLowerCase(),
    brand: value(query.brand),
    publication: value(query.publication),
    stock: value(query.stock),
    completion: value(query.completion),
  };
  const filtered = motorcycles.filter((motorcycle) => {
    const searchText = `${motorcycle.name} ${motorcycle.brand?.name ?? ""} ${motorcycle.slug}`.toLowerCase();
    return (!filters.q || searchText.includes(filters.q))
      && (!filters.brand || motorcycle.brand?.slug === filters.brand)
      && (!filters.publication || motorcycle.publication_status === filters.publication)
      && (!filters.stock || getMotorcycleStockStatus(motorcycle) === filters.stock)
      && (!filters.completion || getMotorcycleCompletion(motorcycle) === filters.completion);
  });
  const hasFilters = Object.values(filters).some(Boolean);

  return <>
    <AdminPageHeader eyebrow="Inventory" title="Motorcycles" description="Manage the dealership product records that power motorcycle listings and product pages across the website." actions={<div className="flex flex-wrap gap-2"><Link href="/admin/inventory/motorcycles/import" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#C62828] bg-white px-4 text-sm font-semibold !text-[#C62828] transition-colors hover:bg-[#FEF2F2]"><Upload aria-hidden="true" className="h-4 w-4" />Bulk import</Link><Link href="/admin/inventory/motorcycles/new" className="ow-button-primary"><Plus aria-hidden="true" className="h-4 w-4" />Add motorcycle</Link></div>} />

    <section aria-labelledby="saved-views-title" className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="saved-views-title" className="mr-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Saved views</h2>
        {savedViews.map(([label, href]) => <Link key={label} href={href} className="inline-flex min-h-10 items-center rounded-md border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#374151] transition-colors hover:border-[#C62828] hover:bg-[#FEF2F2] hover:text-[#C62828]">{label}</Link>)}
      </div>
    </section>

    <section className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]" aria-labelledby="inventory-filter-title">
      <div className="mb-3 flex items-center gap-2"><SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-[#C62828]" /><h2 id="inventory-filter-title" className="text-sm font-bold text-[#111111]">Find inventory</h2></div>
      <form action="/admin/inventory/motorcycles" method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,1fr))_auto]">
        <label className="relative"><span className="sr-only">Search motorcycles</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" /><input name="q" defaultValue={value(query.q)} className={`${adminInputClass} mt-0 pl-10`} placeholder="Search motorcycle or brand" /></label>
        <label><span className="sr-only">Brand</span><select name="brand" defaultValue={filters.brand} className={`${adminInputClass} mt-0`}><option value="">All brands</option>{brands.map((brand) => <option key={brand.id} value={brand.slug}>{brand.name}</option>)}</select></label>
        <label><span className="sr-only">Publication status</span><select name="publication" defaultValue={filters.publication} className={`${adminInputClass} mt-0`}><option value="">All publication states</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
        <label><span className="sr-only">Stock status</span><select name="stock" defaultValue={filters.stock} className={`${adminInputClass} mt-0`}><option value="">All stock states</option><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option><option value="coming_soon">Coming soon</option><option value="discontinued">Discontinued</option></select></label>
        <label><span className="sr-only">Completion status</span><select name="completion" defaultValue={filters.completion} className={`${adminInputClass} mt-0`}><option value="">All completion states</option><option value="complete">Complete</option><option value="needs_attention">Needs attention</option><option value="incomplete">Incomplete</option></select></label>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#111111] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#C62828]">Apply filters</button>
      </form>
      {hasFilters ? <div className="mt-3 border-t border-[#E5E7EB] pt-3"><Link href="/admin/inventory/motorcycles" className="inline-flex min-h-10 items-center text-xs font-semibold text-[#C62828] hover:underline">Clear all filters</Link></div> : null}
    </section>

    <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-[#111111]">{filtered.length} motorcycle{filtered.length === 1 ? "" : "s"}</p><p className="mt-1 text-xs text-[#6B7280]">Select records to archive, restore, or change featured visibility.</p></div></div>

    {filtered.length ? <AdminForm action={updateMotorcycleInventoryBulk} submitLabel="Apply bulk action" pendingLabel="Applying…" confirmMessage="Apply this change to every selected motorcycle?" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111111]"><ArchiveRestore aria-hidden="true" className="h-4 w-4 text-[#C62828]" />Bulk actions</div>
        <label className="flex items-center gap-3 text-xs font-semibold text-[#6B7280]"><span>Action</span><select name="bulkAction" className={`${adminInputClass} mt-0 min-w-48`} defaultValue="archive"><option value="archive">Archive selected</option><option value="restore">Restore as drafts</option><option value="feature">Mark featured</option><option value="unfeature">Remove featured</option></select></label>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <div className="hidden grid-cols-[44px_minmax(300px,2fr)_repeat(3,minmax(130px,1fr))_100px] gap-4 border-b border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280] lg:grid"><span className="sr-only">Select</span><span>Motorcycle</span><span>Publication</span><span>Stock</span><span>Completion</span><span className="text-right">Actions</span></div>
        <div className="divide-y divide-[#E5E7EB]">{filtered.map((motorcycle) => {
          const completion = getMotorcycleCompletion(motorcycle);
          const stock = getMotorcycleStockStatus(motorcycle);
          const thumbnail = motorcycle.images[0];
          const publicHref = motorcycle.brand ? `/motorcycles/${motorcycle.brand.slug}/${motorcycle.slug}` : null;
          return <article key={motorcycle.id} className="grid gap-4 px-4 py-4 transition-colors hover:bg-[#F9FAFB] lg:grid-cols-[44px_minmax(300px,2fr)_repeat(3,minmax(130px,1fr))_100px] lg:items-center">
            <label className="flex min-h-11 items-center gap-3 lg:justify-center"><input type="checkbox" name="motorcycleIds" value={motorcycle.id} className="h-5 w-5 rounded border-[#9CA3AF] accent-[#C62828]" /><span className="text-xs font-semibold text-[#6B7280] lg:sr-only">Select {motorcycle.name}</span></label>
            <div className="flex min-w-0 items-center gap-4"><div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F7F7F8]">{thumbnail ? <Image src={motorcycleStoragePublicUrl(thumbnail.storage_path)} alt={thumbnail.alt_text} fill sizes="96px" className="object-contain p-1" /> : <div className="flex h-full items-center justify-center text-[10px] font-semibold text-[#9CA3AF]">No image</div>}</div><div className="min-w-0"><p className="truncate font-display text-xl font-bold text-[#111111]">{motorcycle.name}</p><p className="mt-1 truncate text-xs text-[#6B7280]">{motorcycle.brand?.name ?? "Brand unavailable"} · PKR {Number(motorcycle.base_price).toLocaleString("en-PK")}</p>{motorcycle.is_featured ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#C62828]">Featured</p> : null}</div></div>
            <div><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] lg:hidden">Publication</span><StatusBadge value={motorcycle.publication_status} /></div>
            <div><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] lg:hidden">Stock</span><StatusBadge value={stock} /></div>
            <div><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] lg:hidden">Completion</span><StatusBadge value={completion} label={completionLabel(completion as CompletionState)} /></div>
            <div className="flex items-center gap-1 lg:justify-end"><Link href={`/admin/inventory/motorcycles/${motorcycle.id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-[#C62828] hover:underline">Edit</Link>{publicHref && motorcycle.publication_status === "published" ? <Link href={publicHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#C62828]" aria-label={`Preview ${motorcycle.name}`}><Eye aria-hidden="true" className="h-4 w-4" /></Link> : null}</div>
          </article>;
        })}</div>
      </div>
    </AdminForm> : <AdminEmptyState title="No motorcycles match this view" description={hasFilters ? "Clear or change the current filters to find inventory." : "Create the first motorcycle draft to begin managing product inventory."} action={hasFilters ? <Link href="/admin/inventory/motorcycles" className="ow-button-primary">Clear filters</Link> : <Link href="/admin/inventory/motorcycles/new" className="ow-button-primary">Add motorcycle</Link>} />}
  </>;
}
