import Link from "next/link";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { listStockMovements, listParts, listMotorcycleVariantsForSale } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { requestStockMovement } from "@/app/admin/erp-actions";
import { History, PackageOpen, Bike, ShieldCheck } from "lucide-react";

export const metadata = { title: "Stock Changes" };

function formatMovementType(t: string): { label: string; tone: string } {
  const type = String(t ?? "");
  const tone = type.endsWith("_add") ? "in_stock" : type.endsWith("_subtract") ? "out_of_stock" : "in_progress";
  const label = type
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { label: label || "Movement", tone };
}

function formatApprovalStatus(s: string): { label: string; tone: string } {
  switch (s) {
    case "pending_approval": return { label: "Pending approval", tone: "new" };
    case "approved": return { label: "Approved", tone: "completed" };
    case "rejected": return { label: "Rejected", tone: "out_of_stock" };
    default: return { label: String(s ?? "Unknown").replaceAll("_", " "), tone: "in_progress" };
  }
}

export default async function StockMovementsPage() {
  const actor = await getAuthenticatedProfile();
  const role = actor?.profile.role ?? "apprentice";
  const isAdminOrDev = role === "admin" || role === "developer";
  const [movements, parts, variants] = await Promise.all([
    listStockMovements(),
    listParts(),
    listMotorcycleVariantsForSale(),
  ]);
  const pending = movements.filter(m => m.approval_status === "pending_approval").length;
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Stock Management"
        title="Stock Additions / Subtractions"
        description="Request stock changes here. Each change goes to Admin for approval. After Admin approves, live inventory quantities update automatically. You cannot change actual stock directly."
        actions={<Link href="/admin/stock/approvals" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]">Admin approvals ({pending})</Link>}
      />
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#111111]"><History aria-hidden="true" className="h-5 w-5" style={{ color: "#FFFFFF" }} /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Total requests</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{movements.length}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${pending ? "bg-amber-50 text-[#D97706]" : "bg-green-50 text-[#15803D]"}`}><ShieldCheck aria-hidden="true" className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Awaiting admin approval</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{pending}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-green-50 text-[#15803D]"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Applied to inventory</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{movements.filter(m => m.approval_status === "approved" && m.applied).length}</p>
        </div>
      </section>

      <AdminPanel title="Request new stock change" description="Pick a target (bike variant OR spare part), specify addition or subtraction, and add a reason. Unit cost is set automatically from the Stock Availability page (Managers: leave blank).">
        <AdminForm action={requestStockMovement} submitLabel="Submit for Admin approval →" pendingLabel="Submitting request…" confirmMessage="Submit this stock change for Admin approval?" className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className={adminLabelClass}>Target type</label>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
              <label className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] p-3 cursor-pointer has-[:checked]:border-[#C62828] has-[:checked]:bg-[#FEF2F2]">
                <input type="radio" name="targetType" value="variant" defaultChecked className="accent-[#C62828]" />
                <span className="inline-flex items-center gap-1"><Bike aria-hidden="true" className="h-4 w-4" />Motorcycle variant</span>
              </label>
              <label className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] p-3 cursor-pointer has-[:checked]:border-[#C62828] has-[:checked]:bg-[#FEF2F2]">
                <input type="radio" name="targetType" value="part" className="accent-[#C62828]" />
                <span className="inline-flex items-center gap-1"><PackageOpen aria-hidden="true" className="h-4 w-4" />Spare part</span>
              </label>
            </div>
          </div>
          <div>
            <label className={adminLabelClass}>Movement type</label>
            <select name="movementType" defaultValue="addition" className={adminInputClass}>
              <option value="addition">Addition (+)</option>
              <option value="subtraction">Subtraction (−)</option>
            </select>
          </div>
          <div>
            <label className={adminLabelClass}>Quantity</label>
            <input name="quantity" type="number" min={1} required defaultValue={1} className={adminInputClass} />
          </div>
          <div>
            <label className={adminLabelClass}>Motorcycle variant</label>
            <select name="variantId" className={adminInputClass}>
              <option value="">-- None / select above --</option>
              {variants.map(v => {
                const brandName = v.motorcycle?.brand?.name ? `${v.motorcycle.brand.name} ` : "";
                const model = v.motorcycle?.name ?? "Motorcycle";
                const qty = Number(v.quantity ?? 0);
                return (
                  <option key={v.id} value={v.id}>
                    {brandName}{model} · {v.cc}cc · {v.color_name ?? "Color TBD"} · QTY {qty}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className={adminLabelClass}>Spare part</label>
            <select name="partId" className={adminInputClass}>
              <option value="">-- None / select above --</option>
              {parts.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} (QTY {Number(p.current_stock ?? 0)})</option>)}
            </select>
          </div>
          <div>
            <label className={adminLabelClass}>Unit cost, PKR{isAdminOrDev ? "" : " (auto-filled)"}</label>
            <input name="unitCost" type="number" min={0} step="0.01" placeholder={isAdminOrDev ? "e.g. 345000" : "Set on Stock Availability page"} disabled={!isAdminOrDev} className={adminInputClass + (!isAdminOrDev ? " bg-[#F7F7F8] text-[#6B7280]" : "")} />
            {!isAdminOrDev ? <p className="mt-1 text-[11px] text-[#6B7280]">Admin sets pricing on Stock Availability.</p> : null}
          </div>
          <div className="md:col-span-3">
            <label className={adminLabelClass}>Reason / attachment reference</label>
            <textarea name="reason" required className={adminInputClass + " min-h-[72px]"} placeholder="e.g. Invoice #1234 from supplier, PDI checklist #5, showroom count correction on 01 Aug…" />
            <p className="mt-1 text-xs text-[#6B7280]">Admin will read this before approving. Reference invoice numbers for stock inwards.</p>
          </div>
          <div className="md:col-span-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-[#B45309]">
            ⚠ Live inventory is not updated until Admin approves. The change is only a request.
          </div>
        </AdminForm>
      </AdminPanel>

      <AdminPanel title="History of all stock changes" description="Most recent first. Click approvals to decide pending changes.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Approval</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {movements.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#6B7280]">No stock change requests yet.</td></tr>
              ) : movements.map(m => {
                const { label: typeLabel, tone: typeToneBadge } = formatMovementType(String(m.movement_type));
                const { label: approvalLabel, tone: approvalToneBadge } = formatApprovalStatus(String(m.approval_status));
                const variantBrand = m.variant?.motorcycle?.brand?.name ? `${m.variant.motorcycle.brand.name} ` : "";
                const variantModel = m.variant?.motorcycle?.name ?? "";
                const targetLabel = m.variant
                  ? `${variantBrand}${variantModel} · ${m.variant.cc}cc · ${m.variant.color_name ?? "TBD"}`.trim()
                  : m.part
                  ? `${m.part.sku ? `${m.part.sku} — ` : ""}${m.part.name ?? "Spare part"}`
                  : "—";
                return (
                  <tr key={m.id} className="hover:bg-[#FAFAFA] align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">
                      {m.variant
                        ? <span className="inline-flex items-center gap-1"><Bike aria-hidden="true" className="h-3.5 w-3.5 text-[#C62828]" />{targetLabel}</span>
                        : m.part
                        ? <span className="inline-flex items-center gap-1"><PackageOpen aria-hidden="true" className="h-3.5 w-3.5 text-[#374151]" />{targetLabel}</span>
                        : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={typeToneBadge} label={typeLabel} /></td>
                    <td className="px-4 py-3 text-right font-display text-xl font-bold">{String(m.movement_type).endsWith("add") ? "+" : "−"}{m.quantity}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={approvalToneBadge} label={approvalLabel} />
                      {m.rejection_reason ? <p className="mt-1 text-[10px] text-[#C62828]">Reject reason: {m.rejection_reason}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-xs">{m.applied ? <span className="text-[#15803D]">✓ Applied</span> : m.approval_status === "approved" ? <span className="text-[#D97706]">Queued</span> : <span className="text-[#9CA3AF]">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-[#374151] max-w-md truncate">{m.reason}</td>
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
