import Link from "next/link";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { listParts } from "@/lib/erp/queries";
import { createOrUpdatePart } from "@/app/admin/erp-actions";
import { PackageOpen, Plus, AlertTriangle, Package } from "lucide-react";

export const metadata = { title: "Spare Parts Inventory" };

export default async function PartsPage() {
  const parts = await listParts();
  const low = parts.filter(p => p.reorder_level != null && (p.current_stock ?? 0) <= p.reorder_level).length;
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Stock Management"
        title="Spare Parts Inventory"
        description="Manage showroom spare parts. Stock quantities are NOT changed directly here — use Stock Changes to request additions/subtractions, which must be approved by Admin before inventory is updated."
        actions={<Link href="/admin/stock/movements" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]">Request stock change</Link>}
      />
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-white"><Package aria-hidden="true" className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Total SKUs</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{parts.length}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-green-50 text-[#15803D]"><PackageOpen aria-hidden="true" className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Total units</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{parts.reduce((t, p) => t + (p.current_stock ?? 0), 0)}</p>
        </div>
        <div className={`rounded-lg border bg-white p-5 shadow-sm ${low ? "border-amber-200" : ""}`}>
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${low ? "bg-amber-50 text-[#B45309]" : "bg-gray-100 text-[#6B7280]"}`}><AlertTriangle aria-hidden="true" className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Low stock / reorder</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{low}</p>
        </div>
      </section>
      <AdminPanel title="All parts" description="Edit part details here. Stock qty updates require stock movement + admin approval.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Reorder</th>
                <th className="px-4 py-3 text-right">Unit cost</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {parts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#6B7280]">No parts yet. Add one below.</td></tr>
              ) : parts.map(p => (
                <tr key={p.id} className="hover:bg-[#FAFAFA] align-top">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.name}</p>
                    {p.description ? <p className="mt-0.5 text-xs text-[#6B7280] line-clamp-1">{p.description}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-xs">{p.category ?? "-"}</td>
                  <td className="px-4 py-3 text-right"><StatusBadge value={(p.current_stock ?? 0) <= (p.reorder_level ?? 0) && (p.current_stock ?? 0) !== 0 ? "needs_attention" : (p.current_stock ?? 0) === 0 ? "out_of_stock" : "in_stock"} label={String(p.current_stock ?? 0)} /></td>
                  <td className="px-4 py-3 text-right text-xs text-[#6B7280]">{p.reorder_level ?? "-"}</td>
                  <td className="px-4 py-3 text-right text-xs">PKR {(p.unit_cost ?? 0).toLocaleString("en-PK")}</td>
                  <td className="px-4 py-3 text-right">
                    <details className="group inline-block text-left">
                      <summary className="cursor-pointer rounded-md border border-[#D1D5DB] px-3 py-1.5 text-[11px] font-semibold hover:bg-[#F7F7F8]">Edit</summary>
                      <div className="mt-2 w-[22rem] rounded-md border border-[#E5E7EB] bg-[#F7F7F8] p-3 shadow-lg">
                        <AdminForm action={createOrUpdatePart} submitLabel="Save part" className="space-y-2 text-xs" showStatus={false}>
                          <input type="hidden" name="id" value={p.id} />
                          <div><label className={adminLabelClass}>SKU</label><input name="sku" defaultValue={p.sku} className={adminInputClass + " min-h-9 font-mono"} /></div>
                          <div><label className={adminLabelClass}>Name</label><input name="name" defaultValue={p.name} className={adminInputClass + " min-h-9"} /></div>
                          <div><label className={adminLabelClass}>Category</label><input name="category" defaultValue={p.category ?? ""} className={adminInputClass + " min-h-9"} placeholder="e.g. Engine, Electrical, Body" /></div>
                          <div><label className={adminLabelClass}>Description</label><input name="description" defaultValue={p.description ?? ""} className={adminInputClass + " min-h-9"} /></div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className={adminLabelClass}>Reorder level</label><input name="reorderLevel" type="number" min={0} defaultValue={p.reorder_level ?? ""} className={adminInputClass + " min-h-9"} /></div>
                            <div><label className={adminLabelClass}>Unit cost (PKR)</label><input name="unitCost" type="number" min={0} defaultValue={p.unit_cost ?? ""} className={adminInputClass + " min-h-9"} /></div>
                          </div>
                          <p className="text-[10px] text-[#6B7280]">Note: current_stock is NOT editable here; use Stock Changes + Admin approval.</p>
                        </AdminForm>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
      <section id="new-part">
        <AdminPanel
          title="Add a new part"
          description="Create the SKU first, then request stock additions via Stock Changes. Stock qty will start at 0."
          actions={<a href="#new-part" className="inline-flex items-center gap-2 rounded-md bg-[#C62828] px-3 py-1.5 text-[11px] font-semibold text-white"><Plus aria-hidden="true" className="h-3.5 w-3.5" />New part</a>}
        >
          <AdminForm action={createOrUpdatePart} submitLabel="Create part" className="grid grid-cols-1 gap-5 md:grid-cols-4">
            <div><label className={adminLabelClass}>SKU (unique, uppercase)</label><input name="sku" required pattern="^[A-Z0-9][A-Z0-9\-_]{2,}$" className={adminInputClass + " font-mono"} placeholder="e.g. OWM-ENG-FLT-001" /></div>
            <div><label className={adminLabelClass}>Part name</label><input name="name" required className={adminInputClass} placeholder="e.g. Oil filter 150cc" /></div>
            <div><label className={adminLabelClass}>Category</label><input name="category" className={adminInputClass} placeholder="Engine / Electrical / Body / Tyres / Other" /></div>
            <div><label className={adminLabelClass}>Unit cost, PKR</label><input name="unitCost" type="number" min={0} step="0.01" className={adminInputClass} placeholder="0" /></div>
            <div className="md:col-span-2"><label className={adminLabelClass}>Description</label><textarea name="description" className={adminInputClass + " min-h-[72px]"} placeholder="Fitment, brand, packaging etc." /></div>
            <div><label className={adminLabelClass}>Reorder level (low stock alert)</label><input name="reorderLevel" type="number" min={0} className={adminInputClass} placeholder="5" /></div>
            <div className="flex items-end"><span className="text-xs text-[#6B7280]">Stock quantity for new parts defaults to 0. Request addition in Stock Changes.</span></div>
          </AdminForm>
        </AdminPanel>
      </section>
    </div>
  );
}
