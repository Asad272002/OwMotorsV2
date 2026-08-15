"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Printer, FileText, BadgeDollarSign } from "lucide-react";
import { StatusBadge, adminInputClass } from "@/components/admin/admin-ui";

type Row = {
  id: string;
  receipt_number: string;
  printed_count: number | null;
  generated_at: string | null;
  sale?: {
    receipt_number?: string | null;
    total_amount?: number | null;
    brand_name_snapshot?: string | null;
    motorcycle_name_snapshot?: string | null;
    cc_snapshot?: number | null;
    color_name_snapshot?: string | null;
    chasis_number?: string | null;
    customer?: { full_name?: string | null; cnic?: string | null } | null;
  } | null;
};

function pkr(n: number): string {
  return "PKR " + (n || 0).toLocaleString("en-PK");
}

export function ReceiptsRegisterClient(props: {
  rows: Row[];
}) {
  const { rows } = props;
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const rn = String(r.receipt_number ?? "").toLowerCase();
      const saleRn = String(r.sale?.receipt_number ?? "").toLowerCase();
      const chasis = String(r.sale?.chasis_number ?? "").toLowerCase();
      const custName = String(r.sale?.customer?.full_name ?? "").toLowerCase();
      const custCnic = String(r.sale?.customer?.cnic ?? "").replace(/[^0-9]/g, "");
      const bike = `${String(r.sale?.brand_name_snapshot ?? "")} ${String(r.sale?.motorcycle_name_snapshot ?? "")}`.toLowerCase();
      const needleNum = needle.replace(/[^0-9A-Za-z]/g, "");
      return (
        rn.includes(needle) ||
        rn.includes(needleNum) ||
        saleRn.includes(needle) ||
        saleRn.includes(needleNum) ||
        chasis.includes(needle) ||
        chasis.includes(needleNum) ||
        custName.includes(needle) ||
        custCnic.includes(needleNum) ||
        bike.includes(needle)
      );
    });
  }, [q, rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText aria-hidden className="h-4 w-4 text-[#C62828]" />
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#111111]">Receipts register</h2>
          </div>
          <p className="mt-1 text-xs text-[#6B7280]">
            Showing <span className="font-semibold text-[#111111]">{filtered.length}</span> of{" "}
            <span className="font-semibold text-[#111111]">{rows.length}</span> total receipts. Use search to filter by chasis number, receipt number, sale reference, or customer name/CNIC.
          </p>
        </div>
        <div className="w-full max-w-lg">
          <label className="sr-only" htmlFor="receipt-search">Search receipts</label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              id="receipt-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search receipt #, sale ref, chasis #, customer CNIC or name…"
              className={`${adminInputClass} pl-10 font-display text-[14px]`}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="max-h-[80vh] overflow-y-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280] backdrop-blur">
              <tr>
                <th className="px-4 py-3 text-left">Receipt #</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Bike</th>
                <th className="px-4 py-3 text-left">Chasis</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Prints</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F5] bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <BadgeDollarSign aria-hidden className="mx-auto mb-3 h-10 w-10 text-[#C62828]/50" />
                    <p className="text-sm font-semibold text-[#111111]">{q ? "No receipts match that search." : "No receipts yet."}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">{q ? "Try searching by chasis number (e.g. TEST-1122), sale ref, or customer CNIC (35202…)." : "Approve a sale to auto-generate its receipt."}</p>
                  </td>
                </tr>
              ) : filtered.map((r) => {
                const sale = r.sale ?? {};
                const total = Number(sale.total_amount ?? 0);
                const cust = sale.customer ?? null;
                const bikeText = [sale.brand_name_snapshot, sale.motorcycle_name_snapshot].filter(Boolean).join(" ");
                const bikeSub = [
                  sale.cc_snapshot ? `${sale.cc_snapshot}cc` : null,
                  sale.color_name_snapshot ?? null,
                ].filter(Boolean).join(" · ");
                return (
                  <tr key={r.id} className="transition-colors hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-sm font-bold text-[#C62828]">{r.receipt_number}</div>
                      {sale.receipt_number ? (
                        <div className="mt-0.5 text-[10px] text-[#6B7280]">Sale ref · <span className="font-mono">{sale.receipt_number}</span></div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm text-[#111111]">{r.generated_at ? new Date(r.generated_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
                      <div className="text-[11px] text-[#6B7280]">{r.generated_at ? new Date(r.generated_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-semibold text-[#111111]">{bikeText || "Motorcycle"}</div>
                      {bikeSub ? <div className="text-[11px] text-[#6B7280]">{bikeSub}</div> : null}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-[#111111]">{sale.chasis_number ? sale.chasis_number.toUpperCase() : "—"}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-semibold text-[#111111]">{cust?.full_name ?? "—"}</div>
                      {cust?.cnic ? <div className="text-[11px] font-mono text-[#6B7280]">{cust.cnic}</div> : null}
                    </td>
                    <td className="px-4 py-3 align-top text-right font-display text-[15px] font-bold text-[#111111]">{pkr(total)}</td>
                    <td className="px-4 py-3 align-top text-center">
                      <StatusBadge value={(r.printed_count ?? 0) > 0 ? "completed" : "needs_attention"} label={`${r.printed_count ?? 0}`} />
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <Link
                        href={`/admin/receipts/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#111111] bg-[#111111] px-3.5 text-xs font-semibold hover:bg-black"
                        style={{ color: "#FFFFFF" }}
                      >
                        <Printer aria-hidden className="h-3.5 w-3.5" style={{ color: "#FFFFFF" }} />
                        <span style={{ color: "#FFFFFF" }}>Print</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
