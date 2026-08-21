import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass } from "@/components/admin/admin-ui";
import { listPendingPartSales, listPendingSales, listSales } from "@/lib/erp/queries";
import { SaleApprovalsClient } from "./client";
import { ReceiptFollowUpList, type ReceiptFollowUpSale } from "./receipt-follow-up.client";
import { AdminForm } from "@/components/admin/admin-form.client";
import { decidePartSale } from "@/app/admin/erp-actions/stock";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { CircleCheck, ShieldCheck } from "lucide-react";

export const metadata = { title: "Sale Approvals" };

function pkr(n: number | unknown): string {
  return "PKR " + (Number(n) || 0).toLocaleString("en-PK");
}

export default async function SaleApprovalsPage() {
  const [actor, pending, pendingPartSales, allSales] = await Promise.all([
    getAuthenticatedProfile(),
    listPendingSales(),
    listPendingPartSales(),
    listSales(),
  ]);
  const canIssueReceipts = actor?.profile.role === "admin" || actor?.profile.role === "developer";
  const receiptFollowUps: readonly ReceiptFollowUpSale[] = canIssueReceipts
    ? allSales
        .filter((sale) => sale.sale_status === "approved" && !sale.receipt_generated)
        .slice(0, 5)
        .map((sale) => {
          const customer = (sale as unknown as { customer?: { full_name?: string | null; cnic?: string | null } | null }).customer ?? null;
          return {
            id: sale.id,
            receipt_number: sale.receipt_number,
            approved_at: sale.approved_at ?? null,
            motorcycle_label: [
              sale.brand_name_snapshot,
              sale.motorcycle_name_snapshot,
              sale.cc_snapshot ? `${sale.cc_snapshot}cc` : null,
              sale.color_name_snapshot,
            ].filter(Boolean).join(" "),
            chasis_number: sale.chasis_number ?? null,
            customer_label: customer?.full_name ?? customer?.cnic ?? "Walk-in customer",
            total_amount: Number(sale.total_amount ?? 0),
          };
        })
    : [];

  const shapedForClient = pending.map((s) => {
    type PaymentRow = { id: string; amount?: unknown; payment_method?: unknown; bank_name_snapshot?: string | null; bank?: { name?: string } | null };
    const payKey = s as unknown as { payments?: unknown; sale_payments?: unknown };
    const paymentsList: PaymentRow[] = (
      Array.isArray(payKey.payments)
        ? payKey.payments
        : Array.isArray(payKey.sale_payments)
          ? payKey.sale_payments
          : []
    ) as PaymentRow[];
    const paid = paymentsList.reduce((t: number, p) => t + (Number(p.amount) ?? 0), 0);
    const total = Number(s.total_amount ?? 0);
    const remaining = Math.max(0, total - paid);
    const qtySold = Number((s as unknown as { quantity_sold?: number }).quantity_sold ?? (s as unknown as { quantity?: number }).quantity ?? 1);
    const cust = (s as unknown as { customer?: { full_name?: string | null; cnic?: string | null; phone_primary?: string | null; phone1?: string | null; city?: string | null } | null }).customer ?? null;
    return {
      id: s.id,
      receipt_number: s.receipt_number,
      requested_at: s.requested_at,
      brand_name_snapshot: s.brand_name_snapshot,
      motorcycle_name_snapshot: s.motorcycle_name_snapshot,
      cc_snapshot: s.cc_snapshot,
      color_name_snapshot: s.color_name_snapshot,
      chasis_number: s.chasis_number,
      quantity_label: "x " + String(qtySold),
      customer_full_name: cust?.full_name ?? null,
      customer_cnic: cust?.cnic ?? null,
      customer_phone: cust?.phone_primary ?? cust?.phone1 ?? null,
      customer_city: cust?.city ?? null,
      notes: s.notes ?? null,
      total_amount: total,
      paid_amount: paid,
      due_amount: remaining,
      payments: paymentsList.map((p) => {
        const method = String(p.payment_method ?? "cash").replaceAll("_", " ");
        const bankName = p.bank_name_snapshot ?? p.bank?.name ?? null;
        return {
          id: p.id,
          payment_method_label: method + (bankName ? ` (${bankName})` : ""),
          amount_pkr: pkr(p.amount),
        };
      }),
    } as const;
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Approvals"
        title="Sale Approvals"
        description={(pending.length + pendingPartSales.length)
          ? `${pending.length + pendingPartSales.length} sales waiting for your approval. Approve to unlock receipt generation AND subtract 1 from current stock. Reject with a reason so the manager can correct.`
          : "No sales pending approval."}
        actions={<span className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-[#B45309]"><ShieldCheck aria-hidden="true" className="h-4 w-4" />Approval = stock -1 + receipt unlocked</span>}
      />

      {pendingPartSales.length > 0 ? (
        <AdminPanel title="Spare-part sale approvals" description="Approve or reject spare-part sale requests.">
          <div className="space-y-4">
            {pendingPartSales.map((sale) => (
              <div key={sale.id} className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl font-bold text-[#111111]">{sale.sale_number}</h3><StatusBadge value="new" label="Pending approval" /></div>
                    <p className="mt-1 text-sm text-[#6B7280]">Customer: <span className="font-semibold text-[#111111]">{sale.customer?.full_name ?? sale.customer_name ?? "-"}</span> · Payment: <span className="capitalize">{String(sale.payment_method ?? "cash").replaceAll("_", " ")}</span>{sale.bank_name_snapshot ? ` (${sale.bank_name_snapshot})` : ""}</p>
                    <ul className="mt-3 space-y-1 text-sm text-[#374151]">
                      {(sale.items ?? []).map((item) => <li key={item.id}><span className="font-mono font-semibold">{item.sku_snapshot}</span> - {item.name_snapshot} x {item.quantity}</li>)}
                    </ul>
                  </div>
                  <div className="text-left lg:text-right"><p className="font-display text-2xl font-black text-[#C62828]">{pkr(sale.total_amount)}</p><p className="text-xs text-[#6B7280]">{new Date(sale.sold_at).toLocaleString()}</p></div>
                </div>
                <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[#E5E7EB] pt-4 sm:flex-row sm:justify-end">
                  <AdminForm action={decidePartSale} className="contents" hideAutoSubmit={true} destructive={true} submitLabel="Reject part sale" pendingLabel="Rejecting...">
                    <input type="hidden" name="id" value={sale.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <label className="sr-only" htmlFor={`part-reject-${sale.id}`}>Rejection reason</label>
                    <input id={`part-reject-${sale.id}`} name="rejectionReason" className={adminInputClass + " sm:w-80"} placeholder="Reason if rejecting" />
                    <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#C62828] bg-white px-4 text-sm font-semibold text-[#C62828] hover:bg-[#FEF2F2]">Reject</button>
                  </AdminForm>
                  <AdminForm action={decidePartSale} className="contents" hideAutoSubmit={true} confirmMessage={`Approve part sale ${sale.sale_number}? Stock will be deducted.`} pendingLabel="Approving...">
                    <input type="hidden" name="id" value={sale.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold text-white hover:bg-[#A91F1F]">Approve part sale</button>
                  </AdminForm>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      ) : null}
      {receiptFollowUps.length > 0 ? (
        <AdminPanel title="Receipt follow-up" description="Approved bike sales waiting for official receipt generation.">
          <ReceiptFollowUpList sales={receiptFollowUps} />
        </AdminPanel>
      ) : null}

      {pending.length === 0 && pendingPartSales.length === 0 && receiptFollowUps.length === 0 ? (
        <AdminPanel title="Queue is empty">
          <div className="flex flex-col items-center gap-2 rounded-md border border-green-200 bg-green-50 px-6 py-12 text-center text-[#15803D]">
            <CircleCheck aria-hidden="true" className="h-10 w-10" />
            <p className="font-display text-xl font-bold">All caught up</p>
            <p className="text-sm opacity-80">No sales waiting.</p>
          </div>
        </AdminPanel>
      ) : pending.length > 0 ? (
        <SaleApprovalsClient pendingSales={shapedForClient} />
      ) : null}
    </div>
  );
}
