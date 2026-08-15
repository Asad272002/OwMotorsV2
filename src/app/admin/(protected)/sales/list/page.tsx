import Link from "next/link";
import { AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";
import { listSales } from "@/lib/erp/queries";
import { BadgeDollarSign, Bike, FileCheck, UserCheck, ArrowUpRight, Receipt } from "lucide-react";

export const metadata = { title: "All Sales" };

function pkr(n: number): string {
  return "PKR " + (n || 0).toLocaleString("en-PK");
}

const statusMeta: Record<string, { badge: string; label: string }> = {
  pending_approval: { badge: "new", label: "Pending Admin Approval" },
  approved: { badge: "completed", label: "Approved (stock deducted)" },
  rejected: { badge: "out_of_stock", label: "Rejected" },
  completed: { badge: "in_stock", label: "Completed / Receipt OK" },
  cancelled: { badge: "archived", label: "Cancelled" },
};

export default async function SalesListPage() {
  const sales = await listSales();
  const totals = {
    total: sales.length,
    pending: sales.filter(s => s.sale_status === "pending_approval").length,
    approved: sales.filter(s => s.sale_status === "approved" || s.sale_status === "completed").length,
    value: sales.filter(s => s.sale_status !== "rejected" && s.sale_status !== "cancelled").reduce((t, s) => t + (s.total_amount ?? 0), 0),
  };
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales"
        title="All Sales Records"
        description="Complete register of every sale in the system, from pending approval to completed with receipt. Track status, payment split, and chasis number."
        actions={<Link href="/admin/sales/new" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-4 text-sm font-semibold text-white hover:bg-[#A91F1F]"><BadgeDollarSign aria-hidden="true" className="h-4 w-4" />Record new sale</Link>}
      />
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total sales", value: String(totals.total), icon: Bike, tone: "text-[#111111] bg-[#F7F7F8]" },
          { label: "Awaiting approval", value: String(totals.pending), icon: FileCheck, tone: totals.pending ? "text-[#D97706] bg-amber-50" : "text-[#15803D] bg-green-50" },
          { label: "Approved", value: String(totals.approved), icon: ArrowUpRight, tone: "text-[#15803D] bg-green-50" },
          { label: "Net booked value", value: pkr(totals.value), icon: BadgeDollarSign, tone: "text-[#C62828] bg-[#FEF2F2]" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${tone}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{value}</p>
          </div>
        ))}
      </section>
      <AdminPanel title="Sales register" description="Most recent first. Click a row to open its receipt (once approved).">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
            <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Receipt #</th>
                <th className="px-4 py-3">Bike</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Chasis #</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {sales.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[#6B7280]">No sales yet. Record your first sale using the button above.</td></tr>
              ) : sales.map(s => {
                const meta = statusMeta[s.sale_status] ?? statusMeta.pending_approval;
                const joined = ((s as unknown as { payments?: Array<{ amount?: number }> }).payments ?? []) as Array<{ amount?: number }>;
                const fallback = ((s as unknown as { sale_payments?: Array<{ amount?: number }> }).sale_payments ?? []) as Array<{ amount?: number }>;
                const rowsToSum = joined.length > 0 ? joined : fallback;
                const paid = rowsToSum.reduce((t: number, p: { amount?: number }) => t + (Number(p.amount) || 0), 0);
                const due = (s.total_amount ?? 0) - paid;
                return (
                  <tr key={s.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-xs font-bold text-[#111111]">{s.receipt_number}</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">{new Date(s.requested_at).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#111111]">{s.brand_name_snapshot} {s.motorcycle_name_snapshot}</p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">{s.cc_snapshot}cc · {s.color_name_snapshot} · × {s.quantity}</p>
                    </td>
                    <td className="px-4 py-3">
                      {s.customer ? (
                        <>
                          <p className="font-semibold text-[#111111]">{s.customer.full_name}</p>
                          <p className="mt-0.5 text-xs text-[#6B7280] font-mono">{s.customer.cnic}</p>
                        </>
                      ) : <span className="text-xs text-[#9CA3AF]">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.chasis_number}</td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-display text-lg font-bold text-[#C62828]">{pkr(s.total_amount ?? 0)}</p>
                      <p className="text-[11px] text-[#6B7280]">{pkr(paid)} paid · {pkr(due)} due</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge value={meta.badge} label={meta.label} />
                      {s.sale_status === "rejected" && s.rejection_reason ? (
                        <div className="mx-auto mt-2 max-w-sm rounded-md border border-[#FECACA] bg-[#FEF2F2] p-2 text-left text-[11px] leading-4 text-[#C62828]">
                        <p className="font-bold uppercase tracking-wider">Rejection reason:</p>
                        <p className="mt-0.5">{String(s.rejection_reason)}</p>
                        {s.rejected_at ? <p className="mt-1 text-[10px] text-[#991B1B] opacity-80">{s.rejected_by_profile ? ` — by ${(s.rejected_by_profile as { full_name?: string }).full_name ?? ""}` : ""}{s.rejected_at ? ` @ ${new Date(s.rejected_at).toLocaleString()}` : ""}</p> : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.receipt_generated ? (
                          <Link href={`/admin/receipts`} className="inline-flex h-9 items-center gap-1 rounded-md border border-[#E5E7EB] px-3 text-xs font-semibold text-[#374151] hover:bg-[#F7F7F8]"><Receipt aria-hidden="true" className="h-3.5 w-3.5" />Receipt</Link>
                        ) : null}
                      </div>
                    </td>
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
