"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StatusBadge, adminInputClass } from "@/components/admin/admin-ui";

export type PartAvailabilityRow = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit?: string | null;
  location?: string | null;
  is_active?: boolean;
  current_stock?: number | null;
  reorder_level?: number | null;
  unit_cost?: number | null;
  in_stock?: boolean;
};

export function PartsAvailabilityTable({ parts, isApprentice }: { parts: PartAvailabilityRow[]; isApprentice: boolean }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return parts;
    return parts.filter((part) => {
      const stock = part.current_stock ?? 0;
      const inStock = isApprentice ? part.in_stock : stock > 0;
      const haystack = `${part.sku} ${part.name} ${part.category ?? ""} ${part.description ?? ""} ${part.location ?? ""} ${inStock ? "in stock available" : "out of stock unavailable"}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [isApprentice, parts, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-xl">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${adminInputClass} pl-10`} placeholder="Search parts by SKU, name, category, or status" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
          <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Part name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              {!isApprentice ? <th className="px-4 py-3 text-right">Qty</th> : null}
              {!isApprentice ? <th className="px-4 py-3 text-right">Reorder at</th> : null}
              {!isApprentice ? <th className="px-4 py-3 text-right">Unit cost</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.length === 0 ? (
              <tr><td colSpan={isApprentice ? 4 : 7} className="px-4 py-8 text-center text-[#6B7280]">{query ? "No spare parts match that search." : "No spare parts registered. Managers can add parts under Stock Spare Parts."}</td></tr>
            ) : filtered.map((part) => {
              const stock = part.current_stock ?? 0;
              const inStock = isApprentice ? part.in_stock : stock > 0;
              return (
                <tr key={part.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3 font-mono text-xs">{part.sku}</td>
                  <td className="px-4 py-3 font-semibold">{part.name}</td>
                  <td className="px-4 py-3 text-xs text-[#6B7280]">{part.category ?? "-"}</td>
                  <td className="px-4 py-3"><StatusBadge value={inStock ? "in_stock" : "out_of_stock"} label={inStock ? "In stock" : "Out of stock"} /></td>
                  {!isApprentice ? <td className={`px-4 py-3 text-right font-display text-lg font-bold ${stock <= (part.reorder_level ?? 0) ? "text-[#C62828]" : ""}`}>{stock}</td> : null}
                  {!isApprentice ? <td className="px-4 py-3 text-right">{part.reorder_level ?? "-"}</td> : null}
                  {!isApprentice ? <td className="px-4 py-3 text-right">PKR {(part.unit_cost ?? 0).toLocaleString("en-PK")}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}