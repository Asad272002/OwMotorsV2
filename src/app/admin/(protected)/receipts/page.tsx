import Link from "next/link";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { listReceipts, listSales } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { generateReceipt, incrementReceiptPrint } from "@/app/admin/erp-actions";
import { FileCheck, Printer, BadgeDollarSign, ShieldCheck } from "lucide-react";

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
          ? "Generate numbered official receipts from approved sales. Managers may also generate after Admin approval. One-page format is printable directly as A4 from this browser (print as PDF to save). Google Docs template reference for branding: keep one standard master copy in company shared drive with logo."
          : "Printable showroom receipts. Apprentices may view and print approved receipts for handover to customer."}
        actions={<span className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280]"><ShieldCheck aria-hidden="true" className="h-4 w-4" />Format: OW Motors branded A4 one-pager</span>}
      />

      {canGenerate ? (
        <AdminPanel
          title="Generate receipt from approved sale"
          description={salesApprovedWithoutReceipt.length
            ? `${salesApprovedWithoutReceipt.length} sale(s) approved but not yet receipted.`
            : "All approved sales have receipts. If approved sales are missing, wait for Admin to approve first."}
        >
          {salesApprovedWithoutReceipt.length === 0 ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-[#15803D]">
              <strong>All caught up.</strong> Every approved sale has a corresponding generated receipt.
            </div>
          ) : (
            <div className="space-y-3">
              {salesApprovedWithoutReceipt.map(s => {
                type PaymentRow = { id: string; amount?: unknown; payment_method?: unknown; bank_name_snapshot?: string | null; bank?: { name?: string } | null };
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
                  <div key={s.id} className="grid grid-cols-1 items-center gap-4 rounded-md border border-[#E5E7EB] p-4 md:grid-cols-6">
                    <div className="md:col-span-3">
                      <p className="font-semibold">{s.motorcycle_name_snapshot} · {s.cc_snapshot}cc · {s.color_name_snapshot ?? "Color TBD"} × {qty}</p>
                      <p className="mt-0.5 text-xs text-[#6B7280]"><span className="font-mono">{s.receipt_number}</span> · Chasis: <span className="font-mono">{s.chasis_number}</span></p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">Customer: {cust?.full_name ?? "—"} · {cust?.cnic ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Total / Paid</p>
                      <p className="font-display font-bold">{pkr(Number(s.total_amount))}</p>
                      <p className={`text-xs ${paid > 0 ? "text-[#15803D]" : "text-[#B45309]"}`}>{pkr(paid)}</p>
                    </div>
                    <AdminForm
                      action={generateReceipt}
                      pendingLabel="Generating…"
                      className="md:col-span-2 contents"
                      hideAutoSubmit={true}
                      showStatus={false}
                      confirmMessage={`Generate official receipt for sale ${s.receipt_number}? A permanent receipt number will be issued, and the sale will be moved to Completed status.`}
                    >
                      <input type="hidden" name="saleId" value={s.id} />
                      <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold hover:bg-[#A91F1F] md:w-auto" style={{ color: "#FFFFFF" }}>
                        <FileCheck aria-hidden="true" className="h-4 w-4" style={{ color: "#FFFFFF" }} />
                        <span style={{ color: "#FFFFFF" }}>Generate receipt</span>
                      </button>
                    </AdminForm>
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>
      ) : null}

      <AdminPanel title="Receipts register" description={`${receipts.length} receipt(s) on file. Click Print to open printable one-page branded view.`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Receipt #</th>
                <th className="px-4 py-3">Sale Ref</th>
                <th className="px-4 py-3">Bike</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Generated</th>
                <th className="px-4 py-3 text-center">Prints</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {receipts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[#6B7280]">No receipts generated yet. Admin must first approve a sale, then generate the receipt here.</td></tr>
              ) : receipts.map(r => (
                <tr key={r.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <div className="font-mono text-sm font-bold text-[#C62828]">{r.receipt_number}</div>
                    <div className="mt-0.5 text-[10px] text-[#6B7280]">ID {r.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.sale?.receipt_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.sale?.brand_name_snapshot} {r.sale?.motorcycle_name_snapshot}</p>
                    <p className="text-xs text-[#6B7280]">{r.sale?.cc_snapshot}cc · {r.sale?.color_name_snapshot} · Chasis <span className="font-mono">{r.sale?.chasis_number}</span></p>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const sRow = r.sale as unknown as Record<string, unknown> | null | undefined;
                      const rawCust = sRow?.customer
                        ?? (Array.isArray(sRow?.customers) ? (sRow as unknown as { customers: unknown[] }).customers[0] : null)
                        ?? null;
                      const cust = rawCust as unknown as ({ full_name?: string; cnic?: string } | null);
                      return (
                        <>
                          <p className="font-semibold">{cust?.full_name ?? "—"}</p>
                          {cust?.cnic ? <p className="text-xs text-[#6B7280] font-mono">{cust.cnic}</p> : null}
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right font-display text-xl font-bold">{pkr(r.sale?.total_amount ?? 0)}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{r.generated_at ? new Date(r.generated_at).toLocaleString() : "—"}</div>
                    {r.generated_by_profile ? <div className="mt-0.5 text-[11px] text-[#6B7280]">by {r.generated_by_profile.role}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    <StatusBadge value={(r.printed_count ?? 0) > 0 ? "completed" : "needs_attention"} label={`${r.printed_count ?? 0} print${(r.printed_count ?? 0) === 1 ? "" : "s"}`} />
                  </td>
                  <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/receipts/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-1 rounded-md border border-black bg-black px-3 text-xs font-semibold hover:bg-[#111111]"
                        style={{ color: "#FFFFFF" }}
                      >
                        <Printer aria-hidden="true" className="h-3.5 w-3.5" style={{ color: "#FFFFFF" }} />
                        <span style={{ color: "#FFFFFF" }}>Open print view</span>
                      </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Receipts workflow"
        description="One-click standard printable receipts using the OW Motors branded website template. Manager submits sale → Admin approves (stock auto -1) → Generate receipt → Print or Save as PDF."
      >
        <ol className="grid grid-cols-1 gap-3 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-5 text-[13px] text-[#6B7280] md:grid-cols-2 lg:grid-cols-3">
          <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C62828] text-[10px] font-bold text-white">1</span><span>Manager submits sale (New Sale page, 3 steps). Status = <strong className="text-[#111111]">Pending Approval</strong>.</span></li>
          <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C62828] text-[10px] font-bold text-white">2</span><span>Admin reviews sale in Approvals. Click <strong className="text-[#111111]">Approve sale</strong> → stock auto -deducts via DB trigger, sale unlocks.</span></li>
          <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C62828] text-[10px] font-bold text-white">3</span><span>Click <strong className="text-[#111111]">Generate receipt</strong> on queue above → numbered <strong className="font-mono">OWM-RCPT-YYMMDD…</strong> stored in DB.</span></li>
          <li className="flex gap-2 md:col-span-2 lg:col-span-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C62828] text-[10px] font-bold text-white">4</span><span>Row appears in register. Click <strong className="text-[#111111]">Open print view</strong>. New tab opens A4 one-pager branded template. Press <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[11px]">Ctrl</kbd>+<kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[11px]">P</kbd> / <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[11px]">⌘</kbd>+<kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[11px]">P</kbd>. Choose <em>Save as PDF</em> or print to showroom printer. Print count auto-increments.</span></li>
        </ol>
      </AdminPanel>
    </div>
  );
}
