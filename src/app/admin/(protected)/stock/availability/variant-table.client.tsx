"use client";

import React, { useMemo, useState } from "react";
import { Archive, RotateCcw, Pencil, X, Save, Search } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, adminLabelClass, StatusBadge } from "@/components/admin/admin-ui";
import { archiveMotorcycleVariant, updateSimpleBikeStock } from "@/app/admin/erp-actions/stock";

export type BrandOptionClient = {
  id: string;
  name: string;
};

export type VariantRowClient = {
  id: string;
  motorcycle_id?: string | null;
  cc: number;
  color_name?: string | null;
  color_hex?: string | null;
  quantity?: number | null;
  price?: number | null;
  stock_status?: "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | "discontinued" | string | null;
  motorcycle?: { name?: string | null; brand?: { id?: string | null; name?: string | null } | null } | null;
};

export function VariantAdminEditorTable({
  variants,
  isApprentice,
  archived = false,
  canArchive = false,
  brands = [],
  stockUnits = [],
}: {
  variants: VariantRowClient[];
  isApprentice: boolean;
  archived?: boolean;
  canArchive?: boolean;
  brands?: BrandOptionClient[];
  stockUnits?: { id: string; motorcycle_variant_id: string; chasis_number: string; status: string }[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const chasisByVariant = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const unit of stockUnits) {
      const list = map.get(unit.motorcycle_variant_id) ?? [];
      list.push(unit.chasis_number);
      map.set(unit.motorcycle_variant_id, list);
    }
    return map;
  }, [stockUnits]);

  const filteredVariants = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return variants;
    const numeric = needle.replace(/[^0-9]/g, "");
    return variants.filter((v) => {
      const brand = v.motorcycle?.brand?.name ?? "";
      const model = v.motorcycle?.name ?? "";
      const color = v.color_name ?? "";
      const haystack = `${brand} ${model} ${v.cc} ${color} ${v.stock_status ?? ""} ${(chasisByVariant.get(v.id) ?? []).join(" ")}`.toLowerCase();
      return haystack.includes(needle) || (!!numeric && String(v.cc).includes(numeric));
    });
  }, [chasisByVariant, query, variants]);

  const hasActions = canArchive;
  const baseCols = 5;
  const chasisCols = isApprentice ? 0 : 1;
  const colsNoApprentice = 2;
  const colSpan = baseCols + chasisCols + (isApprentice ? 0 : colsNoApprentice) + (hasActions ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="relative max-w-xl">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${adminInputClass} pl-10`} placeholder="Search bikes by brand, model, color, or CC" />
      </div>
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
        <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
          <tr>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">CC</th>
            <th className="px-4 py-3">Color</th>
            <th className="px-4 py-3">Status</th>
            {!isApprentice ? <th className="px-4 py-3">Chasis numbers</th> : null}
            {!isApprentice ? <th className="px-4 py-3 text-right">Qty</th> : null}
            {!isApprentice ? <th className="px-4 py-3 text-right">Price</th> : null}
            {hasActions ? <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {filteredVariants.length === 0 ? (
            <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-[#6B7280]">{query ? "No bike variants match that search." : "No bike variants here."}</td></tr>
          ) : filteredVariants.flatMap((v) => {
            const inStock = (v.quantity ?? 0) > 0 && v.stock_status !== "out_of_stock";
            const editing = editingId === v.id;
            const priceValue = Number(v.price) || 0;
            const quantityValue = Number(v.quantity) || 0;
            const brandId = v.motorcycle?.brand?.id ?? "";
            const modelName = v.motorcycle?.name ?? "";
            const colorName = v.color_name ?? "";
            const colorHex = v.color_hex || "#111111";
            const label = `${v.motorcycle?.brand?.name ?? ""} ${modelName || "bike"} ${v.cc}cc ${colorName}`.replace(/\s+/g, " ").trim();
            const chasisNumbers = chasisByVariant.get(v.id) ?? [];
            const rows: React.ReactElement[] = [];

            rows.push(
              <tr key={v.id} className={archived ? "bg-[#FAFAFA] opacity-90" : "hover:bg-[#FAFAFA]"}>
                <td className="px-4 py-3 font-semibold">{v.motorcycle?.brand?.name ?? "-"}</td>
                <td className="px-4 py-3">{modelName || "-"}</td>
                <td className="px-4 py-3">{v.cc}cc</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {v.color_hex ? <span aria-hidden className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: v.color_hex }} /> : null}
                    <span>{colorName || "Color TBD"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={archived ? "archived" : inStock ? "in_stock" : "out_of_stock"} label={archived ? "Archived" : inStock ? "In stock" : "Out of stock"} />
                </td>
                {!isApprentice ? <td className="px-4 py-3"><div className="flex max-w-xs flex-wrap gap-1">{chasisNumbers.length ? chasisNumbers.slice(0, 6).map((chasis) => <span key={chasis} className="rounded border border-[#E5E7EB] bg-[#F7F7F8] px-2 py-1 font-mono text-[10px] text-[#374151]">{chasis}</span>) : <span className="text-xs text-[#C62828]">No chasis units</span>}{chasisNumbers.length > 6 ? <span className="rounded border border-[#E5E7EB] px-2 py-1 text-[10px] text-[#6B7280]">+{chasisNumbers.length - 6}</span> : null}</div></td> : null}
                {!isApprentice ? <td className="px-4 py-3 text-right font-display text-lg font-bold">{quantityValue}</td> : null}
                {!isApprentice ? <td className="px-4 py-3 text-right font-display font-bold text-[#C62828]">PKR {priceValue.toLocaleString("en-PK")}</td> : null}
                {hasActions ? (
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(editing ? null : v.id)}
                        aria-label={editing ? `Close details editor for ${label}` : `Edit details for ${label}`}
                        className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors ${editing ? "border-[#C62828] bg-white text-[#C62828] hover:bg-[#FEF2F2]" : "border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F7F7F8]"}`}
                      >
                        {editing ? <X aria-hidden="true" className="h-3.5 w-3.5" /> : <Pencil aria-hidden="true" className="h-3.5 w-3.5" />}
                        {editing ? "Close" : "Edit details"}
                      </button>
                      <AdminForm
                        action={archiveMotorcycleVariant}
                        hideAutoSubmit
                        destructive={!archived}
                        confirmMessage={`${archived ? "Restore" : "Archive"} ${label}?`}
                        className="contents"
                      >
                        <input type="hidden" name="variantId" value={v.id} />
                        <input type="hidden" name="mode" value={archived ? "restore" : "archive"} />
                        <button type="submit" className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors ${archived ? "border-[#15803D] bg-white text-[#15803D] hover:bg-green-50" : "border-[#FECACA] bg-white text-[#C62828] hover:bg-[#FEF2F2]"}`}>
                          {archived ? <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> : <Archive aria-hidden="true" className="h-3.5 w-3.5" />}
                          {archived ? "Restore" : "Archive"}
                        </button>
                      </AdminForm>
                    </div>
                  </td>
                ) : null}
              </tr>
            );

            if (editing && canArchive) {
              rows.push(
                <tr key={`${v.id}-edit`} className="bg-[#FAFAFA]">
                  <td colSpan={colSpan} className="px-4 py-5">
                    <AdminForm action={updateSimpleBikeStock} hideAutoSubmit className="grid grid-cols-1 gap-4 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm md:grid-cols-6">
                      <input type="hidden" name="variantId" value={v.id} />
                      <div className="md:col-span-2">
                        <label className={adminLabelClass}>Brand</label>
                        <select name="brandId" required defaultValue={brandId} className={adminInputClass}>
                          <option value="">Select brand</option>
                          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className={adminLabelClass}>Model name</label>
                        <input name="modelName" required defaultValue={modelName} className={adminInputClass} />
                      </div>
                      <div>
                        <label className={adminLabelClass}>CC</label>
                        <input name="cc" required type="number" min={25} max={2500} defaultValue={v.cc} className={adminInputClass} />
                      </div>
                      <div>
                        <label className={adminLabelClass}>Color</label>
                        <input name="colorName" required defaultValue={colorName} className={adminInputClass} />
                      </div>
                      <div>
                        <label className={adminLabelClass}>Swatch</label>
                        <input name="colorHex" required type="color" defaultValue={colorHex} className="mt-2 h-11 w-full rounded-md border border-[#D1D5DB] bg-white p-1" />
                      </div>
                      <div>
                        <label className={adminLabelClass}>Price, PKR</label>
                        <input name="price" required type="number" min={0} step={1} defaultValue={priceValue} className={adminInputClass} />
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-[#92400E] md:col-span-2">
                        <span className="font-bold">Quantity locked:</span> use Stock Changes for additions/subtractions so Admin approval and audit logs stay linked.
                      </div>
                      <div className="flex items-end justify-end gap-2 md:col-span-2">
                        <button type="button" onClick={() => setEditingId(null)} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]">Cancel</button>
                        <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold text-white hover:bg-[#A91F1F]">
                          <Save aria-hidden="true" className="h-4 w-4" />
                          Save details
                        </button>
                      </div>
                    </AdminForm>
                  </td>
                </tr>
              );
            }
            return rows;
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
