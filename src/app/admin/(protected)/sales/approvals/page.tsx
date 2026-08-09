import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-ui";
import { listPendingSales } from "@/lib/erp/queries";
import { SaleApprovalsClient } from "./client";
import { CircleCheck, ShieldCheck } from "lucide-react";

export const metadata = { title: "Sale Approvals" };

function pkr(n: number | unknown): string {
  return "PKR " + (Number(n) || 0).toLocaleString("en-PK");
}

export default async function SaleApprovalsPage() {
  const pending = await listPendingSales();

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
      quantity_label: "× " + String(qtySold),
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
        description={pending.length
          ? `${pending.length} sales waiting for your approval. Approve to unlock receipt generation AND subtract 1 from current stock. Reject with a reason so the manager can correct.`
          : "No sales pending approval. When a manager creates a sale, it appears here for your review before inventory is affected."}
        actions={<span className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-[#B45309]"><ShieldCheck aria-hidden="true" className="h-4 w-4" />Approval = stock -1 + receipt unlocked</span>}
      />
      {pending.length === 0 ? (
        <AdminPanel title="Queue is empty">
          <div className="flex flex-col items-center gap-2 rounded-md border border-green-200 bg-green-50 px-6 py-12 text-center text-[#15803D]">
            <CircleCheck aria-hidden="true" className="h-10 w-10" />
            <p className="font-display text-xl font-bold">All caught up</p>
            <p className="text-sm opacity-80">No sales waiting.</p>
          </div>
        </AdminPanel>
      ) : (
        <SaleApprovalsClient pendingSales={shapedForClient} />
      )}
    </div>
  );
}
