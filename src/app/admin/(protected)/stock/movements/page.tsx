import Link from "next/link";
import { AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";
import { listStockMovements, listParts, listMotorcycleVariantsForStock } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { History, PackageOpen, Bike, ShieldCheck } from "lucide-react";
import { StockMovementRequestForm } from "./request-form.client";

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
    listMotorcycleVariantsForStock(),
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

      <AdminPanel title="Request new stock change" description="Choose one stock target, then record addition or subtraction. Bike stock and spare-part stock are separated so the wrong target cannot be submitted by accident.">
        <StockMovementRequestForm variants={variants} parts={parts} isAdminOrDev={isAdminOrDev} />
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
                  ? `${variantBrand}${variantModel} - ${m.variant.cc}cc - ${m.variant.color_name ?? "TBD"}`.trim()
                  : m.part
                    ? `${m.part.sku ? `${m.part.sku} - ` : ""}${m.part.name ?? "Spare part"}`
                    : "-";
                return (
                  <tr key={m.id} className="hover:bg-[#FAFAFA] align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">
                      {m.variant ? (
                        <span className="inline-flex items-center gap-1"><Bike aria-hidden="true" className="h-3.5 w-3.5 text-[#C62828]" />{targetLabel}</span>
                      ) : m.part ? (
                        <span className="inline-flex items-center gap-1"><PackageOpen aria-hidden="true" className="h-3.5 w-3.5 text-[#374151]" />{targetLabel}</span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={typeToneBadge} label={typeLabel} /></td>
                    <td className="px-4 py-3 text-right font-display text-xl font-bold">{String(m.movement_type).endsWith("add") ? "+" : "-"}{m.quantity}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={approvalToneBadge} label={approvalLabel} />
                      {m.rejection_reason ? <p className="mt-1 text-[10px] text-[#C62828]">Reject reason: {m.rejection_reason}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-xs">{m.applied ? <span className="text-[#15803D]">Applied</span> : m.approval_status === "approved" ? <span className="text-[#D97706]">Queued</span> : <span className="text-[#9CA3AF]">-</span>}</td>
                    <td className="max-w-md truncate px-4 py-3 text-xs text-[#374151]">{m.reason}</td>
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
