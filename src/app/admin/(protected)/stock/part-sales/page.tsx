import Link from "next/link";
import { PackageOpen, Plus, ReceiptText, ShoppingCart } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-form.client";
import { AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";
import { generatePartSaleReceipt } from "@/app/admin/erp-actions/stock";
import { listBanks, listCustomers, listPartSales, listParts } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { PartSaleForm } from "./part-sale-form.client";

export const metadata = { title: "Spare Part Sales" };

function pkr(value: number): string {
  return "PKR " + (Number(value) || 0).toLocaleString("en-PK");
}

function statusBadge(status: string) {
  if (status === "pending_approval") return { value: "new", label: "Pending approval" };
  if (status === "approved") return { value: "in_stock", label: "Approved" };
  if (status === "completed") return { value: "completed", label: "Receipt generated" };
  if (status === "rejected") return { value: "out_of_stock", label: "Rejected" };
  return { value: status, label: status.replaceAll("_", " ") };
}

function paymentLabel(method?: string | null) {
  return String(method ?? "cash").replaceAll("_", " ");
}

export default async function PartSalesPage() {
  const actor = await getAuthenticatedProfile();
  const role = actor?.profile.role ?? "apprentice";
  const allowed = ["developer", "admin", "manager"].includes(role);
  const [parts, sales, customers, banks] = allowed ? await Promise.all([listParts(), listPartSales(), listCustomers(), listBanks()]) : [[], [], [], []] as const;
  const sellableParts = parts.filter((part) => (part.current_stock ?? 0) > 0);
  const today = new Date().toDateString();
  const todaySales = sales.filter((sale) => new Date(sale.sold_at).toDateString() === today);

  if (!allowed) {
    return (
      <AdminPanel title="Spare part sales" description="Your role can check availability, but cannot create spare-part sales.">
        <Link href="/admin/stock/availability" className="inline-flex min-h-11 items-center rounded-md bg-[#111111] px-4 text-sm font-semibold text-white">Open stock availability</Link>
      </AdminPanel>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Stock Management"
        title="Sell Spare Parts"
        description="Create counter sales for spare parts. The request goes to Admin approval first; stock deducts only after approval, then receipt generation is unlocked."
        actions={(
          <>
            <Link href="/admin/stock/parts" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]"><PackageOpen aria-hidden="true" className="h-4 w-4" />Manage parts</Link>
            <Link href="/admin/stock/movements" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#C62828] px-4 text-sm font-semibold text-white hover:bg-[#A91F1F]"><Plus aria-hidden="true" className="h-4 w-4" />Add stock</Link>
          </>
        )}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-white"><ShoppingCart aria-hidden="true" className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Today requests</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{todaySales.length}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-green-50 text-[#15803D]"><ReceiptText aria-hidden="true" className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Today value</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{pkr(todaySales.reduce((sum, sale) => sum + (sale.total_amount ?? 0), 0))}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#FEF2F2] text-[#C62828]"><PackageOpen aria-hidden="true" className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Sellable SKUs</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#111111]">{sellableParts.length}</p>
        </div>
      </section>

      <AdminPanel title="New spare-part sale" description="Record customer, payment method, and cart items. Admin approval is required before stock changes.">
        {sellableParts.length === 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-[#92400E]">No spare parts are in stock. Add parts from Spare Parts, then request stock addition from Stock Changes.</div>
        ) : <PartSaleForm parts={parts} customers={customers} banks={banks} />}
      </AdminPanel>

      <AdminPanel title="Recent spare-part sales" description="Most recent first. Pending sales wait for Admin approval before stock deduction and receipt generation.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-[#F7F7F8] text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Sale</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {sales.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[#6B7280]">No spare-part sales yet.</td></tr>
              ) : sales.map((sale) => {
                const status = String(sale.sale_status ?? "pending_approval");
                const badge = statusBadge(status);
                return (
                  <tr key={sale.id} className="align-top hover:bg-[#FAFAFA]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#6B7280]">{new Date(sale.sold_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#111111]">{sale.sale_number}</td>
                    <td className="px-4 py-3 text-xs"><span className="font-semibold text-[#111111]">{sale.customer?.full_name ?? sale.customer_name ?? "Walk-in"}</span>{sale.customer_phone ? <p className="text-[#6B7280]">{sale.customer_phone}</p> : null}</td>
                    <td className="px-4 py-3">
                      <ul className="space-y-1 text-xs text-[#374151]">
                        {(sale.items ?? []).map((item) => <li key={item.id}><span className="font-mono font-semibold">{item.sku_snapshot}</span> - {item.name_snapshot} x {item.quantity}</li>)}
                      </ul>
                      {sale.notes ? <p className="mt-2 text-xs text-[#6B7280]">{sale.notes}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-[#6B7280]">
                      <p className="font-semibold text-[#111111]">{paymentLabel(sale.payment_method)}</p>
                      {sale.bank_name_snapshot ? <p>{sale.bank_name_snapshot}</p> : null}
                      {sale.transaction_reference ? <p className="font-mono">{sale.transaction_reference}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-right"><StatusBadge value="completed" label={pkr(sale.total_amount)} /></td>
                    <td className="px-4 py-3"><StatusBadge value={badge.value} label={badge.label} />{status === "rejected" && sale.rejection_reason ? <p className="mt-2 max-w-xs text-xs text-[#C62828]">{sale.rejection_reason}</p> : null}</td>
                    <td className="px-4 py-3 text-right">
                      {sale.receipt_generated ? (
                        <Link href={`/admin/stock/part-sales/${sale.id}`} className="inline-flex min-h-9 items-center rounded-md border border-[#D1D5DB] bg-white px-3 text-xs font-semibold text-[#374151] hover:bg-[#F7F7F8]">Print receipt</Link>
                      ) : status === "approved" ? (
                        <AdminForm action={generatePartSaleReceipt} className="contents" hideAutoSubmit={true} confirmMessage={`Generate receipt for ${sale.sale_number}?`} pendingLabel="Generating...">
                          <input type="hidden" name="id" value={sale.id} />
                          <button type="submit" className="inline-flex min-h-9 items-center rounded-md bg-[#C62828] px-3 text-xs font-semibold text-white hover:bg-[#A91F1F]">Issue receipt</button>
                        </AdminForm>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">After approval</span>
                      )}
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
