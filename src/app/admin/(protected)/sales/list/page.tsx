import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { listPartSales, listSales } from "@/lib/erp/queries";
import { BadgeDollarSign, Bike, FileCheck, ArrowUpRight } from "lucide-react";
import { SalesRegisterClient } from "./sales-register.client";

export const metadata = { title: "All Sales" };

function pkr(n: number): string {
  return "PKR " + (n || 0).toLocaleString("en-PK");
}

export default async function SalesListPage() {
  const [sales, partSales] = await Promise.all([listSales(), listPartSales()]);
  const totals = {
    total: sales.length + partSales.length,
    pending: sales.filter(s => s.sale_status === "pending_approval").length + partSales.filter(s => (s.sale_status ?? "pending_approval") === "pending_approval").length,
    approved: sales.filter(s => s.sale_status === "approved" || s.sale_status === "completed").length + partSales.filter(s => (s.sale_status ?? "") === "approved" || (s.sale_status ?? "") === "completed").length,
    value: sales.filter(s => s.sale_status !== "rejected" && s.sale_status !== "cancelled").reduce((t, s) => t + (s.total_amount ?? 0), 0) + partSales.filter(s => (s.sale_status ?? "pending_approval") !== "rejected").reduce((t, s) => t + (s.total_amount ?? 0), 0),
  };
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales"
        title="All Sales Records"
        description="Search bike and spare-part sales from one register."
        actions={<Link href="/admin/sales/new" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-4 text-sm font-semibold text-white hover:bg-[#A91F1F]"><BadgeDollarSign aria-hidden="true" className="h-4 w-4" />Record bike sale</Link>}
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
      <SalesRegisterClient sales={JSON.parse(JSON.stringify(sales))} partSales={JSON.parse(JSON.stringify(partSales))} />
    </div>
  );
}
