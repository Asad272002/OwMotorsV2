import Link from "next/link";
import { Bike, AlertTriangle } from "lucide-react";
import { AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { listArchivedMotorcycleVariantsForStock, listMotorcycleVariantsForStock, listParts, listPartsForApprentice, listStockBrands } from "@/lib/erp/queries";
import { VariantAdminEditorTable, type BrandOptionClient, type VariantRowClient } from "./variant-table.client";

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
  type PartRow = {
    id: string;
    sku: string;
    name: string;
    description?: string | null;
    category?: string | null;
    unit?: string | null;
    location?: string | null;
    is_active?: boolean;
    current_stock?: number | null;
    reorder_level?: number | null;
    unit_cost?: number | null;
    in_stock?: boolean;
  };

  const [variants, archivedVariants, brands, partsRaw] = await Promise.all([
    listMotorcycleVariantsForStock() as unknown as Promise<VariantRow[]>,
    isApprentice ? Promise.resolve([] as VariantRow[]) : listArchivedMotorcycleVariantsForStock() as unknown as Promise<VariantRow[]>,
    isApprentice ? Promise.resolve([] as BrandOptionClient[]) : listStockBrands() as unknown as Promise<BrandOptionClient[]>,
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

      <AdminPanel
        title="Bikes by brand, CC & color"
        description={
          canEditPrices
            ? "Admin quick editor: update pricing here, or archive a bike variant when it should no longer appear in sales or stock workflows."
            : isApprentice
              ? "Apprentice view: only stock status shown. See Managers for exact quantities and pricing."
              : "Managers can read stock levels and archive inactive bike variants. Pricing changes require Admin / Developer access."
        }
      >
        <VariantAdminEditorTable variants={variants as unknown as VariantRowClient[]} isApprentice={isApprentice} canArchive={canArchiveBikes} brands={brands} />
      </AdminPanel>

      {!isApprentice ? (
        <AdminPanel
          title="Archived bikes"
          description="Hidden from stock availability and new-sale selection. Restore when this bike should be available again."
        >
          <VariantAdminEditorTable
            variants={archivedVariants as unknown as VariantRowClient[]}
            isApprentice={false}
            archived
            canArchive={canArchiveBikes}
            brands={brands}
          />
        </AdminPanel>
      ) : null}

      <AdminPanel title="Spare parts availability" description={isApprentice ? "Apprentice view: only in/out of stock shown, no costs or reorder points." : "All spare parts. Low stock highlighted."}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
            <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Part name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                {!isApprentice ? <th className="px-4 py-3 text-right">Qty</th> : null}
                {!isApprentice ? <th className="px-4 py-3 text-right">Reorder at</th> : null}
                {!isApprentice ? <th className="px-4 py-3 text-right">Unit cost</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {parts.length === 0 ? (
                <tr><td colSpan={isApprentice ? 4 : 7} className="px-4 py-8 text-center text-[#6B7280]">No spare parts registered. Managers can add parts under Stock Spare Parts.</td></tr>
              ) : parts.map(p => {
                const stock = p.current_stock ?? 0;
                const inStock = isApprentice ? p.in_stock : stock > 0;
                return (
                  <tr key={p.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{p.category ?? "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={inStock ? "in_stock" : "out_of_stock"} label={inStock ? "In stock" : "Out of stock"} />
                    </td>
                    {!isApprentice ? <td className={`px-4 py-3 text-right font-display text-lg font-bold ${stock <= (p.reorder_level ?? 0) ? "text-[#C62828]" : ""}`}>{stock}</td> : null}
                    {!isApprentice ? <td className="px-4 py-3 text-right">{p.reorder_level ?? "-"}</td> : null}
                    {!isApprentice ? <td className="px-4 py-3 text-right">PKR {(p.unit_cost ?? 0).toLocaleString("en-PK")}</td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}