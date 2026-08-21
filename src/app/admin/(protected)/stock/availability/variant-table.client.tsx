"use client";

import React, { useMemo, useState } from "react";
import { Archive, ChevronDown, ChevronRight, Pencil, RotateCcw, Save, Search } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, adminLabelClass, StatusBadge } from "@/components/admin/admin-ui";
import { addBikeChasisUnits, archiveMotorcycleVariant, updateBikeChasisUnit, updateSimpleBikeStock } from "@/app/admin/erp-actions/stock";

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

type StockUnitClient = { id: string; motorcycle_variant_id: string; chasis_number: string; status: string };
type Group = { brand: string; variants: VariantRowClient[] };

function unitTone(status: string): string {
  if (status === "available") return "border-green-200 bg-green-50 text-[#15803D]";
  if (status === "reserved") return "border-amber-200 bg-amber-50 text-[#B45309]";
  if (status === "sold") return "border-gray-200 bg-gray-50 text-[#6B7280]";
  return "border-red-200 bg-red-50 text-[#C62828]";
}

function variantLabel(v: VariantRowClient): string {
  return `${v.motorcycle?.brand?.name ?? ""} ${v.motorcycle?.name ?? "bike"} ${v.cc}cc ${v.color_name ?? ""}`.replace(/\s+/g, " ").trim();
}

function ChasisCorrectionForm({ unit }: { unit: StockUnitClient }) {
  const original = unit.chasis_number.trim().toUpperCase();
  const [value, setValue] = useState(original);
  const changed = value.trim().toUpperCase() !== original;

  return (
    <AdminForm
      action={updateBikeChasisUnit}
      hideAutoSubmit
      className={`flex gap-2 rounded-md border p-2 transition-all ${changed ? "border-amber-300 bg-amber-50 shadow-[0_0_0_3px_rgb(245_158_11/0.12)]" : "border-transparent"}`}
    >
      <input type="hidden" name="unitId" value={unit.id} />
      <input
        name="chasisNumber"
        required
        value={value}
        onChange={(event) => setValue(event.target.value.toUpperCase())}
        className={`${adminInputClass} font-mono text-xs uppercase ${changed ? "border-amber-300 bg-white" : ""}`}
      />
      <button
        type="submit"
        disabled={!changed}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors ${changed ? "border-[#C62828] bg-[#C62828] text-white hover:bg-[#A91F1F]" : "border-[#D1D5DB] bg-white text-[#9CA3AF]"}`}
      >
        <Save aria-hidden="true" className="h-3.5 w-3.5" />
        {changed ? "Save change" : "Saved"}
      </button>
    </AdminForm>
  );
}

export function VariantAdminEditorTable({
  variants,
  isApprentice,
  archived = false,
  canArchive = false,
  brands = [],
  stockUnits = [],
  saleHistoryChasisNumbers = [],
}: {
  variants: VariantRowClient[];
  isApprentice: boolean;
  archived?: boolean;
  canArchive?: boolean;
  brands?: BrandOptionClient[];
  stockUnits?: StockUnitClient[];
  saleHistoryChasisNumbers?: string[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chasisId, setChasisId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chasisDrafts, setChasisDrafts] = useState<Record<string, string[]>>({});

  const unitsByVariant = useMemo(() => {
    const map = new Map<string, StockUnitClient[]>();
    for (const unit of stockUnits) {
      const list = map.get(unit.motorcycle_variant_id) ?? [];
      list.push(unit);
      map.set(unit.motorcycle_variant_id, list);
    }
    return map;
  }, [stockUnits]);

  const saleHistoryChasisSet = useMemo(() => new Set(saleHistoryChasisNumbers.map((chasis) => String(chasis ?? "").trim().toUpperCase()).filter(Boolean)), [saleHistoryChasisNumbers]);
  const existingChasisNumbers = useMemo(() => new Set([...stockUnits.map((unit) => unit.chasis_number), ...saleHistoryChasisNumbers].map((chasis) => String(chasis ?? "").trim().toUpperCase()).filter(Boolean)), [saleHistoryChasisNumbers, stockUnits]);

  const filteredVariants = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return variants;
    const numeric = needle.replace(/[^0-9]/g, "");
    return variants.filter((v) => {
      const units = unitsByVariant.get(v.id) ?? [];
      const haystack = `${v.motorcycle?.brand?.name ?? ""} ${v.motorcycle?.name ?? ""} ${v.cc} ${v.color_name ?? ""} ${v.stock_status ?? ""} ${units.map((unit) => `${unit.chasis_number} ${unit.status}`).join(" ")}`.toLowerCase();
      return haystack.includes(needle) || (!!numeric && String(v.cc).includes(numeric));
    });
  }, [query, unitsByVariant, variants]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, VariantRowClient[]>();
    for (const variant of filteredVariants) {
      const brand = variant.motorcycle?.brand?.name?.trim() || "Unassigned brand";
      map.set(brand, [...(map.get(brand) ?? []), variant]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, rows]) => ({
        brand,
        variants: rows.sort((a, b) => `${a.motorcycle?.name ?? ""} ${a.cc} ${a.color_name ?? ""}`.localeCompare(`${b.motorcycle?.name ?? ""} ${b.cc} ${b.color_name ?? ""}`)),
      }));
  }, [filteredVariants]);

  function setDraftValue(variantId: string, index: number, value: string) {
    setChasisDrafts((current) => {
      const next = [...(current[variantId] ?? [])];
      next[index] = value.toUpperCase();
      return { ...current, [variantId]: next };
    });
  }

  function draftStatus(values: string[]) {
    const counts = new Map<string, number>();
    const filled = values.map((value) => value.trim().toUpperCase()).filter(Boolean);

    for (const value of filled) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return {
      filled,
      duplicates: new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([value]) => value)),
      existing: new Set(filled.filter((value) => existingChasisNumbers.has(value))),
    };
  }

  const hasActions = canArchive;
  const colSpan = (isApprentice ? 5 : 8) + (hasActions ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-xl">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${adminInputClass} pl-10`} placeholder="Search brand, model, color, CC, or chasis" />
        </div>
        {!isApprentice ? <p className="text-xs font-semibold text-[#6B7280]">Grouped by brand. Use Chasis for physical units, Edit bike for bike details.</p> : null}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#D1D5DB] p-8 text-center text-sm text-[#6B7280]">{query ? "No bike variants match that search." : "No bike variants here."}</div>
      ) : groups.map((group) => {
        const groupQty = group.variants.reduce((sum, variant) => sum + Number(variant.quantity ?? 0), 0);
        const availableUnits = group.variants.reduce((sum, variant) => sum + (unitsByVariant.get(variant.id) ?? []).filter((unit) => unit.status === "available" && !saleHistoryChasisSet.has(String(unit.chasis_number ?? "").trim().toUpperCase())).length, 0);
        return (
          <section key={group.brand} className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-[#111111]">{group.brand}</h3>
                <p className="text-xs text-[#6B7280]">{group.variants.length} variant(s) | QTY {groupQty}{!isApprentice ? ` | ${availableUnits} chasis available` : ""}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
                <thead className="bg-white text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">CC</th>
                    <th className="px-4 py-3">Color</th>
                    <th className="px-4 py-3">Status</th>
                    {!isApprentice ? <th className="px-4 py-3">Chasis in stock</th> : null}
                    {!isApprentice ? <th className="px-4 py-3 text-right">Recorded</th> : null}
                    {!isApprentice ? <th className="px-4 py-3 text-right">Qty</th> : null}
                    {!isApprentice ? <th className="px-4 py-3 text-right">Price</th> : null}
                    {hasActions ? <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {group.variants.flatMap((v) => {
                    const editing = editingId === v.id;
                    const chasisOpen = chasisId === v.id;
                    const units = unitsByVariant.get(v.id) ?? [];
                    const conflictUnits = units.filter((unit) => saleHistoryChasisSet.has(String(unit.chasis_number ?? "").trim().toUpperCase()));
                    const available = units.filter((unit) => unit.status === "available" && !saleHistoryChasisSet.has(String(unit.chasis_number ?? "").trim().toUpperCase()));
                    const reserved = units.filter((unit) => unit.status === "reserved" && !saleHistoryChasisSet.has(String(unit.chasis_number ?? "").trim().toUpperCase()));
                    const sold = units.filter((unit) => unit.status === "sold");
                    const liveRecorded = available.length + reserved.length;
                    const quantityValue = Number(v.quantity ?? 0);
                    const missing = Math.max(0, quantityValue - liveRecorded);
                    const inStock = quantityValue > 0 && v.stock_status !== "out_of_stock";
                    const priceValue = Number(v.price ?? 0);
                    const colorHex = v.color_hex || "#111111";
                    const brandId = v.motorcycle?.brand?.id ?? "";
                    const modelName = v.motorcycle?.name ?? "";
                    const colorName = v.color_name ?? "";
                    const label = variantLabel(v);
                    const drafts = chasisDrafts[v.id] ?? [];
                    const draftValues = Array.from({ length: missing }, (_, index) => drafts[index] ?? "");
                    const { filled: filledDrafts, duplicates: duplicateDrafts, existing: existingDrafts } = draftStatus(draftValues);
                    const draftHasIssue = filledDrafts.length === 0 || duplicateDrafts.size > 0 || existingDrafts.size > 0;
                    const rows: React.ReactElement[] = [];

                    rows.push(
                      <tr key={v.id} className={archived ? "bg-[#FAFAFA] opacity-90" : "hover:bg-[#FAFAFA]"}>
                        <td className="px-4 py-3 font-semibold text-[#111111]">{modelName || "-"}</td>
                        <td className="px-4 py-3">{v.cc}cc</td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2">{v.color_hex ? <span aria-hidden className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: v.color_hex }} /> : null}<span>{colorName || "Color TBD"}</span></div></td>
                        <td className="px-4 py-3"><StatusBadge value={archived ? "archived" : inStock ? "in_stock" : "out_of_stock"} label={archived ? "Archived" : inStock ? "In stock" : "Out of stock"} /></td>
                        {!isApprentice ? <td className="px-4 py-3"><button type="button" onClick={() => { setChasisId(chasisOpen ? null : v.id); setEditingId(null); }} className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-bold transition-colors ${available.length ? "border-green-200 bg-green-50 text-[#15803D] hover:bg-green-100" : "border-[#FECACA] bg-[#FEF2F2] text-[#C62828] hover:bg-red-100"}`}>{available.length ? `${available.length} ready` : "0 ready"}</button></td> : null}
                        {!isApprentice ? <td className="px-4 py-3 text-right"><span className={missing > 0 ? "font-bold text-[#C62828]" : "font-bold text-[#15803D]"}>{liveRecorded}/{quantityValue}</span></td> : null}
                        {!isApprentice ? <td className="px-4 py-3 text-right font-display text-lg font-bold">{quantityValue}</td> : null}
                        {!isApprentice ? <td className="px-4 py-3 text-right font-display font-bold text-[#C62828]">PKR {priceValue.toLocaleString("en-PK")}</td> : null}
                        {hasActions ? (
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button type="button" onClick={() => { setEditingId(editing ? null : v.id); setChasisId(null); }} className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors ${editing ? "border-[#C62828] bg-[#FEF2F2] text-[#C62828]" : "border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F7F7F8]"}`}>
                                <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                Edit bike
                              </button>
                              <button type="button" onClick={() => { setChasisId(chasisOpen ? null : v.id); setEditingId(null); }} className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors ${chasisOpen ? "border-[#C62828] bg-[#FEF2F2] text-[#C62828]" : "border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F7F7F8]"}`}>
                                {chasisOpen ? <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />}
                                Chasis
                              </button>
                              <AdminForm action={archiveMotorcycleVariant} hideAutoSubmit destructive={!archived} confirmMessage={`${archived ? "Restore" : "Archive"} ${label}?`} className="contents">
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
                              <div className="md:col-span-2"><label className={adminLabelClass}>Brand</label><select name="brandId" required defaultValue={brandId} className={adminInputClass}><option value="">Select brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></div>
                              <div className="md:col-span-2"><label className={adminLabelClass}>Model name</label><input name="modelName" required defaultValue={modelName} className={adminInputClass} /></div>
                              <div><label className={adminLabelClass}>CC</label><input name="cc" required type="number" min={25} max={2500} defaultValue={v.cc} className={adminInputClass} /></div>
                              <div><label className={adminLabelClass}>Color</label><input name="colorName" required defaultValue={colorName} className={adminInputClass} /></div>
                              <div><label className={adminLabelClass}>Swatch</label><input name="colorHex" required type="color" defaultValue={colorHex} className="mt-2 h-11 w-full rounded-md border border-[#D1D5DB] bg-white p-1" /></div>
                              <div><label className={adminLabelClass}>Price, PKR</label><input name="price" required type="number" min={0} step={1} defaultValue={priceValue} className={adminInputClass} /></div>
                              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-[#92400E] md:col-span-2"><span className="font-bold">Quantity locked:</span> use Stock Changes for additions/subtractions so approval and chasis records stay linked.</div>
                              <div className="flex items-end justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setEditingId(null)} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]">Close</button><button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold text-white hover:bg-[#A91F1F]"><Save aria-hidden="true" className="h-4 w-4" />Save bike details</button></div>
                            </AdminForm>
                          </td>
                        </tr>
                      );
                    }

                    if (chasisOpen && canArchive) {
                      rows.push(
                        <tr key={`${v.id}-chasis`} className="bg-[#FAFAFA]">
                          <td colSpan={colSpan} className="px-4 py-5">
                            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Physical chasis units</p><h4 className="mt-1 font-display text-xl font-bold text-[#111111]">{liveRecorded}/{quantityValue} recorded</h4></div>
                                {missing > 0 ? <StatusBadge value="out_of_stock" label={`${missing} missing`} /> : <StatusBadge value="in_stock" label="Synced" />}
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4"><div className="rounded-md bg-green-50 p-2 font-bold text-[#15803D]">{available.length}<span className="block font-normal">Available</span></div><div className="rounded-md bg-amber-50 p-2 font-bold text-[#B45309]">{reserved.length}<span className="block font-normal">Reserved</span></div><div className="rounded-md bg-gray-50 p-2 font-bold text-[#6B7280]">{sold.length}<span className="block font-normal">Sold history</span></div><div className="rounded-md bg-red-50 p-2 font-bold text-[#C62828]">{conflictUnits.length}<span className="block font-normal">Conflict</span></div></div>
                              <p className="mt-2 text-xs text-[#6B7280]">Available and reserved chasis are valid current stock records. Conflicts already exist in sale history and cannot be sold or reused.</p>
                              <div className="mt-4 max-h-40 overflow-y-auto rounded-md border border-[#E5E7EB] p-2">{units.length ? <div className="flex flex-wrap gap-2">{units.map((unit) => { const unitConflict = saleHistoryChasisSet.has(String(unit.chasis_number ?? "").trim().toUpperCase()); return <span key={unit.id} className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${unitTone(unitConflict ? "conflict" : unit.status)}`}>{unit.chasis_number} <span className="font-sans uppercase">{unitConflict ? "conflict" : unit.status}</span></span>; })}</div> : <p className="py-4 text-center text-sm text-[#C62828]">No chasis units recorded yet.</p>}</div>
                              {available.length > 0 ? (
                                <div className="mt-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">Correct available chasis</p>
                                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {available.map((unit) => (
                                      <ChasisCorrectionForm key={`${unit.id}-edit-chasis`} unit={unit} />
                                    ))}
                                  </div>
                                  <p className="mt-2 text-xs text-[#6B7280]">Only available, unsold chasis can be corrected. Sold or reserved chasis stay locked.</p>
                                </div>
                              ) : null}
                              {!archived && missing > 0 ? (
                                <AdminForm action={addBikeChasisUnits} hideAutoSubmit submitLabel="Add chasis units" pendingLabel="Adding..." confirmMessage={`Add chasis numbers to ${label}? Quantity will not change.`} className="mt-4 space-y-3">
                                  <input type="hidden" name="variantId" value={v.id} />
                                  <input type="hidden" name="chasisNumbers" value={draftValues.join("\n")} />
                                  <div>
                                    <label className={adminLabelClass}>Add missing chasis numbers</label>
                                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                      {draftValues.map((value, index) => (
                                        <label key={`${v.id}-chasis-input-${index}`} className="block">
                                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B7280]">Chasis {index + 1}</span>
                                          <input value={value} onChange={(event) => setDraftValue(v.id, index, event.target.value)} className={`${adminInputClass} font-mono text-sm uppercase ${value.trim() && (duplicateDrafts.has(value.trim().toUpperCase()) || existingDrafts.has(value.trim().toUpperCase())) ? " border-[#C62828] bg-[#FEF2F2]" : ""}`} placeholder={`CHASIS-${index + 1}`} />
                                          {value.trim() && duplicateDrafts.has(value.trim().toUpperCase()) ? <span className="mt-1 block text-[11px] font-semibold text-[#C62828]">Duplicate in this form</span> : null}
                                          {value.trim() && existingDrafts.has(value.trim().toUpperCase()) ? <span className="mt-1 block text-[11px] font-semibold text-[#C62828]">Already exists in records</span> : null}
                                        </label>
                                      ))}
                                    </div>
                                    <p className="mt-2 text-xs text-[#6B7280]">Fill only the chasis numbers you have ready. The system will add filled fields only and will not change quantity.</p>
                                  </div>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <button type="submit" disabled={draftHasIssue} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#A91F1F] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
                                      <Save aria-hidden="true" className="h-4 w-4" />
                                      Save chasis
                                    </button>
                                    {duplicateDrafts.size || existingDrafts.size ? <p className="text-xs font-semibold text-[#C62828]">Fix duplicate or existing chasis numbers before saving.</p> : <p className="text-xs text-[#6B7280]">Only filled fields will be saved.</p>}
                                  </div>
                                </AdminForm>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
