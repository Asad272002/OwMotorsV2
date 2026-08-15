import Link from "next/link";
import { AdminPageHeader, StatusBadge } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { listReceipts, listSales } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { generateReceipt } from "@/app/admin/erp-actions";
import { ReceiptsRegisterClient } from "./register.client";
import { FileCheck, Printer, BadgeDollarSign, AlertTriangle } from "lucide-react";

export const metadata = { title: "Receipts" };

function pkr(n: number): string {
  return "PKR " + (n || 0).toLocaleString("en-PK");
}

export default async function ReceiptsPage() {
  const actor = await getAuthenticatedProfile();
  const role = actor?.profile.role ?? "apprentice";
  const canGenerate = role === "developer" || role === "admin" || role === "manager";
  const [receipts, sales] = await Promise.all([listReceipts(), listSales()]);

  const salesApprovedWithoutReceipt = sales.filter(s =>
    (s.sale_status === "approved" || s.sale_status === "completed") && !s.receipt_generated
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales & Receipts"
        title="Receipts Register"
        description={canGenerate
          ? "Approved sales auto-generate receipts here. Use the search bar to find by chasis, receipt #, or customer."
          : "Printable showroom receipts. Search by chasis, receipt number, or customer."}
        actions={
          <div className="flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280]">
            <BadgeDollarSign aria-hidden className="h-4 w-4" />
            <span>{receipts.length.toLocaleString("en-PK")} receipt{receipts.length === 1 ? "" : "s"} filed</span>
          </div>
        }
      />

      {canGenerate ? (
        <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#111111]">Awaiting receipt generation</h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                {salesApprovedWithoutReceipt.length
                  ? `${salesApprovedWithoutReceipt.length} approved sale(s) still need a numbered receipt issued.`
                  : "Every approved sale has a receipt — no backlog."}
              </p>
            </div>
            {salesApprovedWithoutReceipt.length > 0 ? (
              <div className="inline-flex items-center gap-1.5 rounded-md border border-[#B45309]/30 bg-[#FFFBEB] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#B45309]">
                <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
                <span>Backlog · {salesApprovedWithoutReceipt.length}</span>
              </div>
            ) : null}
          </div>

          {salesApprovedWithoutReceipt.length === 0 ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-[#15803D]">
              <strong>All caught up.</strong> Every approved sale has a corresponding generated receipt.
            </div>
          ) : (
            <div className="max-h-[40vh] divide-y divide-[#F1F3F5] overflow-y-auto rounded-md border border-[#E5E7EB]">
              {salesApprovedWithoutReceipt.map((s) => {
                type PaymentRow = { id: string; amount?: unknown };
                type SaleJoin = { payments?: unknown; sale_payments?: unknown };
                const payKey = s as unknown as SaleJoin;
                const paymentsList: PaymentRow[] = (
                  Array.isArray(payKey.payments)
                    ? payKey.payments
                    : Array.isArray(payKey.sale_payments)
                      ? payKey.sale_payments
                      : []
                ) as PaymentRow[];
                const paid = paymentsList.reduce((t: number, p) => t + (Number(p.amount) ?? 0), 0);
                const qty = Number((s as unknown as { quantity_sold?: number; quantity?: number }).quantity_sold ?? (s as unknown as { quantity_sold?: number; quantity?: number }).quantity ?? 1);
                const cust = (s as unknown as { customer?: { full_name?: string; cnic?: string } | null; customers?: unknown[] | null }).customer
                  ?? (Array.isArray((s as unknown as { customers?: unknown[] }).customers) ? ((s as unknown as { customers: unknown[] }).customers[0] as { full_name?: string; cnic?: string }) : null)
                  ?? null;
                return (
                  <div key={s.id} className="grid grid-cols-1 items-center gap-4 px-4 py-3 md:grid-cols-12">
                    <div className="md:col-span-5">
                      <p className="font-semibold">{s.motorcycle_name_snapshot} · {s.cc_snapshot}cc · {s.color_name_snapshot ?? "Color TBD"} × {qty}</p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">
                        <span className="font-mono">{s.receipt_number}</span> · Chasis: <span className="font-mono uppercase">{s.chasis_number}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">Customer: {cust?.full_name ?? "—"} · {cust?.cnic ?? "—"}</p>
                    </div>
                    <div className="md:col-span-2 text-left md:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Total</p>
                      <p className="font-display text-[15px] font-bold text-[#111111]">{pkr(Number(s.total_amount))}</p>
                      <p className={`text-xs ${paid > 0 ? "text-[#15803D]" : "text-[#B45309]"}`}>{pkr(paid)} paid</p>
                    </div>
                    <div className="md:col-span-2 flex items-center justify-start md:justify-center">
                      <StatusBadge value="completed" label={paid >= Number(s.total_amount ?? 0) ? "Fully paid" : "Partial"} />
                    </div>
                    <AdminForm
                      action={generateReceipt}
                      pendingLabel="Issuing…"
                      className="md:col-span-3 contents"
                      hideAutoSubmit={true}
                      showStatus={false}
                      confirmMessage={`Issue official receipt for sale ${s.receipt_number} (chasis ${s.chasis_number})?`}
                    >
                      <input type="hidden" name="saleId" value={s.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-4 text-sm font-semibold hover:bg-[#A91F1F] md:w-auto"
                        style={{ color: "#FFFFFF" }}
                      >
                        <FileCheck aria-hidden className="h-4 w-4" style={{ color: "#FFFFFF" }} />
                        <span style={{ color: "#FFFFFF" }}>Issue receipt</span>
                      </button>
                    </AdminForm>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <ReceiptsRegisterClient
        rows={receipts.map((r) => ({
          id: String(r.id),
          receipt_number: String(r.receipt_number ?? ""),
          printed_count: Number(r.printed_count ?? 0),
          generated_at: r.generated_at ?? null,
          sale: {
            receipt_number: r.sale?.receipt_number ?? null,
            total_amount: Number(r.sale?.total_amount ?? 0),
            brand_name_snapshot: r.sale?.brand_name_snapshot ?? null,
            motorcycle_name_snapshot: r.sale?.motorcycle_name_snapshot ?? null,
            cc_snapshot: r.sale?.cc_snapshot ?? null,
            color_name_snapshot: r.sale?.color_name_snapshot ?? null,
            chasis_number: r.sale?.chasis_number ?? null,
            customer: r.sale?.customer
              ? { full_name: r.sale.customer.full_name ?? null, cnic: r.sale.customer.cnic ?? null }
              : null,
          },
        }))}
      />

      <div className="hidden">
        <Link href="/admin/receipts/0" className="sr-only">receipt root hidden</Link>
        <Printer aria-hidden className="sr-only" />
      </div>
    </div>
  );
}
