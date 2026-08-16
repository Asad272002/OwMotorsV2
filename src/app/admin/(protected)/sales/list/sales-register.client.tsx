"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bike, PackageOpen, Receipt, Search } from "lucide-react";
import { AdminPanel, StatusBadge, adminInputClass } from "@/components/admin/admin-ui";

type BikeSale = {
  id: string;
  receipt_number: string;
  sale_status: string;
  requested_at: string;
  total_amount: number | null;
  brand_name_snapshot?: string | null;
  motorcycle_name_snapshot?: string | null;
  cc_snapshot?: number | null;
  color_name_snapshot?: string | null;
  chasis_number?: string | null;
  quantity?: number | null;
  receipt_generated?: boolean | null;
  rejection_reason?: string | null;
  customer?: { full_name?: string | null; cnic?: string | null } | null;
  payments?: Array<{ amount?: number | null }> | null;
  sale_payments?: Array<{ amount?: number | null }> | null;
};

type PartSale = {
  id: string;
  sale_number: string;
  sale_status?: string | null;
  sold_at: string;
  total_amount: number;
  payment_method?: string | null;
  bank_name_snapshot?: string | null;
  receipt_generated?: boolean | null;
  rejection_reason?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer?: { full_name?: string | null; cnic?: string | null } | null;
  items?: Array<{ id?: string; sku_snapshot: string; name_snapshot?: string | null; quantity: number }> | null;
};

type RegisterRow = {
  id: string;
  type: "bike" | "part";
  number: string;
  date: string;
  title: string;
  subtitle: string;
  customer: string;
  customerMeta: string;
  amount: number;
  paid?: number;
  status: string;
  receiptHref?: string;
  receiptGenerated?: boolean | null;
  payment?: string;
  searchable: string;
};

function pkr(value: number): string {
  return "PKR " + (Number(value) || 0).toLocaleString("en-PK");
}

function statusMeta(status: string): { badge: string; label: string } {
  if (status === "pending_approval") return { badge: "new", label: "Pending approval" };
  if (status === "approved") return { badge: "in_stock", label: "Approved" };
  if (status === "completed") return { badge: "completed", label: "Completed" };
  if (status === "rejected") return { badge: "out_of_stock", label: "Rejected" };
  if (status === "cancelled") return { badge: "archived", label: "Cancelled" };
  return { badge: status, label: status.replaceAll("_", " ") };
}

function buildRows(sales: readonly BikeSale[], partSales: readonly PartSale[]): RegisterRow[] {
  const bikeRows = sales.map((sale) => {
    const payments = sale.payments?.length ? sale.payments : sale.sale_payments ?? [];
    const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const title = `${sale.brand_name_snapshot ?? ""} ${sale.motorcycle_name_snapshot ?? ""}`.trim() || "Bike sale";
    const subtitle = [sale.cc_snapshot ? `${sale.cc_snapshot}cc` : null, sale.color_name_snapshot, sale.chasis_number ? `Chasis ${sale.chasis_number}` : null].filter(Boolean).join(" | ");
    const customer = sale.customer?.full_name ?? "Walk-in";
    const customerMeta = sale.customer?.cnic ?? "-";
    return {
      id: sale.id,
      type: "bike" as const,
      number: sale.receipt_number,
      date: sale.requested_at,
      title,
      subtitle,
      customer,
      customerMeta,
      amount: Number(sale.total_amount ?? 0),
      paid,
      status: sale.sale_status,
      receiptHref: sale.receipt_generated ? "/admin/receipts" : undefined,
      receiptGenerated: sale.receipt_generated,
      payment: `${pkr(paid)} paid`,
      searchable: [sale.receipt_number, title, subtitle, customer, customerMeta, sale.sale_status].join(" ").toLowerCase(),
    };
  });
  const partRows = partSales.map((sale) => {
    const items = (sale.items ?? []).map((item) => `${item.sku_snapshot} ${item.name_snapshot ?? ""} x ${item.quantity}`).join(" | ");
    const customer = sale.customer?.full_name ?? sale.customer_name ?? "Walk-in";
    const customerMeta = sale.customer?.cnic ?? sale.customer_phone ?? "-";
    const status = String(sale.sale_status ?? "pending_approval");
    return {
      id: sale.id,
      type: "part" as const,
      number: sale.sale_number,
      date: sale.sold_at,
      title: "Spare parts",
      subtitle: items || "Parts sale",
      customer,
      customerMeta,
      amount: Number(sale.total_amount ?? 0),
      status,
      receiptHref: sale.receipt_generated ? `/admin/stock/part-sales/${sale.id}` : undefined,
      receiptGenerated: sale.receipt_generated,
      payment: String(sale.payment_method ?? "cash").replaceAll("_", " "),
      searchable: [sale.sale_number, items, customer, customerMeta, status, sale.payment_method].join(" ").toLowerCase(),
    };
  });
  return [...bikeRows, ...partRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function SalesRegisterClient({ sales, partSales }: Readonly<{ sales: BikeSale[]; partSales: PartSale[] }>) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "bike" | "part">("all");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => buildRows(sales, partSales), [sales, partSales]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) =>
      (type === "all" || row.type === type) &&
      (status === "all" || row.status === status) &&
      (!q || row.searchable.includes(q))
    );
  }, [query, rows, status, type]);
  const statuses = Array.from(new Set(rows.map((row) => row.status))).sort();

  return (
    <AdminPanel title="Sales register" description="Search bike and spare-part sales together.">
      <div className="flex flex-col gap-3 border-b border-[#E5E7EB] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-2xl flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${adminInputClass} pl-10`} placeholder="Search sale #, customer, chasis, SKU, bike, phone, status" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "bike", "part"] as const).map((value) => <button key={value} type="button" onClick={() => setType(value)} className={`min-h-10 rounded-md border px-3 text-xs font-bold uppercase tracking-[0.12em] ${type === value ? "border-[#C62828] bg-[#FEF2F2] text-[#C62828]" : "border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F7F7F8]"}`}>{value === "all" ? "All" : value === "bike" ? "Bikes" : "Parts"}</button>)}
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-10 rounded-md border border-[#D1D5DB] bg-white px-3 text-xs font-semibold text-[#374151]">
            <option value="all">All status</option>
            {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {filtered.length === 0 ? <div className="rounded-md border border-dashed border-[#D1D5DB] p-8 text-center text-sm text-[#6B7280]">No sales match this search.</div> : filtered.map((row) => {
          const meta = statusMeta(row.status);
          const Icon = row.type === "bike" ? Bike : PackageOpen;
          return (
            <article key={`${row.type}-${row.id}`} className="grid grid-cols-1 gap-4 rounded-lg border border-[#E5E7EB] bg-white p-4 transition-colors hover:border-[#C62828]/30 hover:bg-[#FFFDFD] lg:grid-cols-[2.2fr_1.2fr_1fr_auto] lg:items-center">
              <div className="flex min-w-0 gap-3">
                <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${row.type === "bike" ? "bg-[#FEF2F2] text-[#C62828]" : "bg-green-50 text-[#15803D]"}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-[#6B7280]">{row.number}</p>
                  <h3 className="mt-1 truncate font-display text-xl font-bold text-[#111111]">{row.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">{row.subtitle}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Customer</p>
                <p className="mt-1 font-semibold text-[#111111]">{row.customer}</p>
                <p className="mt-0.5 font-mono text-xs text-[#6B7280]">{row.customerMeta}</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-[#C62828]">{pkr(row.amount)}</p>
                <p className="mt-1 text-xs capitalize text-[#6B7280]">{row.payment ?? "-"}</p>
                <p className="mt-1 text-[11px] text-[#9CA3AF]">{new Date(row.date).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <StatusBadge value={meta.badge} label={meta.label} />
                {row.receiptHref ? <Link href={row.receiptHref} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#D1D5DB] px-3 text-xs font-semibold text-[#374151] hover:bg-[#F7F7F8]"><Receipt aria-hidden="true" className="h-3.5 w-3.5" />Receipt</Link> : null}
              </div>
            </article>
          );
        })}
      </div>
    </AdminPanel>
  );
}
