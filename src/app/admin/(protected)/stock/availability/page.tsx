import Link from "next/link";
import { Bike, AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { listArchivedMotorcycleVariantsForStock, listMotorcycleVariantsForStock, listMotorcycleStockUnitsForStock, listParts, listPartsForApprentice, listSaleHistoryChasisNumbers, listStockBrands } from "@/lib/erp/queries";
import type { BrandOptionClient, VariantRowClient } from "./variant-table.client";
import type { PartAvailabilityRow } from "./parts-availability-table.client";
import { StockAvailabilityBrowser } from "./stock-availability-browser.client";

export const metadata = { title: "Stock Availability" };

export default async function StockAvailabilityPage() {
  const actor = await getAuthenticatedProfile();
  const role = actor?.profile.role ?? "apprentice";
  const isApprentice = role === "apprentice";
  const canEditPrices = role === "admin" || role === "developer";
  const canRequestStock = role === "manager" || role === "admin" || role === "developer";
  const canManageCatalog = role === "developer" || role === "admin" || role === "manager";
  const canArchiveBikes = canManageCatalog && !isApprentice;

  type VariantRow = Awaited<ReturnType<typeof listMotorcycleVariantsForStock>>[number] & { quantity?: number | null };
  type PartRow = PartAvailabilityRow;

  const [variants, archivedVariants, brands, stockUnits, saleHistoryChasisNumbers, partsRaw] = await Promise.all([
    listMotorcycleVariantsForStock() as unknown as Promise<VariantRow[]>,
    isApprentice ? Promise.resolve([] as VariantRow[]) : listArchivedMotorcycleVariantsForStock() as unknown as Promise<VariantRow[]>,
    isApprentice ? Promise.resolve([] as BrandOptionClient[]) : listStockBrands() as unknown as Promise<BrandOptionClient[]>,
    isApprentice ? Promise.resolve([]) : listMotorcycleStockUnitsForStock(),
    isApprentice ? Promise.resolve([] as string[]) : listSaleHistoryChasisNumbers(),
    (isApprentice ? listPartsForApprentice() : listParts()) as Promise<PartRow[]>,
  ]);
  const parts: PartRow[] = partsRaw;

  const totalBikes = variants.reduce((t, v) => t + (v.quantity ?? 0), 0);
  const outModels = variants.filter(v => (v.quantity ?? 0) === 0 || v.stock_status === "out_of_stock").length;
  const lowModels = variants.filter(v => (v.quantity ?? 0) > 0 && (v.quantity ?? 0) <= 1).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Stock"
        title={isApprentice ? "Bike & Parts Availability" : "Stock Availability Dashboard"}
        description={isApprentice
          ? "Apprentice view: shows availability as IN STOCK / OUT OF STOCK only. Exact quantities, unit costs, and reorder levels are hidden from Apprentice role per showroom SOP."
          : "Exact stock quantities by variant and part. New draft bikes also appear here for stock setup before publishing."}
        actions={isApprentice ? undefined : (
          <>
            {canManageCatalog ? <Link href="/admin/stock/bikes/new" className="inline-flex min-h-11 items-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]">Add new bike</Link> : null}
            {canRequestStock ? <Link href="/admin/stock/movements" className="inline-flex min-h-11 items-center rounded-md bg-[#111111] px-4 text-sm font-semibold text-white hover:bg-[#C62828]">Add stock</Link> : null}
          </>
        )}
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: isApprentice ? "Bike variants" : "Total bikes in stock", value: isApprentice ? String(variants.length) : String(totalBikes), icon: Bike, tone: "text-[#15803D] bg-green-50" },
          { label: isApprentice ? "In stock" : "Active variants", value: String(variants.filter(v => v.stock_status !== "out_of_stock").length), icon: Bike, tone: "text-[#111111] bg-[#F7F7F8]" },
          { label: "Low stock", value: String(lowModels), icon: AlertTriangle, tone: lowModels ? "text-[#D97706] bg-amber-50" : "text-[#6B7280] bg-gray-100" },
          { label: "Unavailable", value: String(outModels), icon: Bike, tone: outModels ? "text-[#C62828] bg-[#FEF2F2]" : "text-[#6B7280] bg-gray-100" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${tone}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{value}</p>
          </div>
        ))}
      </section>

      <StockAvailabilityBrowser
        variants={variants as unknown as VariantRowClient[]}
        archivedVariants={archivedVariants as unknown as VariantRowClient[]}
        parts={parts}
        isApprentice={isApprentice}
        canEditPrices={canEditPrices}
        canArchiveBikes={canArchiveBikes}
        brands={brands}
        stockUnits={JSON.parse(JSON.stringify(stockUnits))}
        saleHistoryChasisNumbers={JSON.parse(JSON.stringify(saleHistoryChasisNumbers))}
      />
    </div>
  );
}
