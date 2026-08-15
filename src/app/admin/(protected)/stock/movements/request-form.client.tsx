"use client";

import { useMemo, useState } from "react";
import { Bike, PackageOpen, Search } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-form.client";
import { StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { requestStockMovement } from "@/app/admin/erp-actions/stock";
import type { Part } from "@/lib/erp/types";

type Variant = {
  id: string;
  motorcycle_id: string;
  cc: number;
  color_name: string | null;
  price: number;
  quantity: number;
  stock_status: string;
  motorcycle: { id: string; name: string | null; slug: string | null; brand: { id: string; name: string | null; slug: string | null } | null } | null;
};

type Props = {
  variants: readonly Variant[];
  parts: readonly Part[];
  isAdminOrDev: boolean;
};

function pkr(value: number | null | undefined): string {
  return `PKR ${Number(value ?? 0).toLocaleString("en-PK")}`;
}

function partCompatibilityLabel(part: Part): string {
  const motorcycle = part.compatible_motorcycle;
  const brand = part.compatible_brand ?? motorcycle?.brand ?? null;
  if (motorcycle) return `${brand?.name ? `${brand.name} ` : ""}${motorcycle.name ?? "Unknown model"}`;
  if (brand) return `${brand.name} all models`;
  return "Universal";
}

function variantBrandName(variant: Variant | null | undefined): string {
  return variant?.motorcycle?.brand?.name?.trim() || "Unknown brand";
}

function variantModelName(variant: Variant | null | undefined): string {
  return variant?.motorcycle?.name?.trim() || "Unknown model";
}

function variantLabel(variant: Variant | null | undefined): string {
  return `${variantBrandName(variant)} ${variantModelName(variant)}`.trim();
}

export function StockMovementRequestForm({ variants, parts, isAdminOrDev }: Props) {
  const [targetType, setTargetType] = useState<"variant" | "part">("variant");
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [bikeFilter, setBikeFilter] = useState("");
  const [partBikeFilter, setPartBikeFilter] = useState("");
  const [partId, setPartId] = useState("");
  const [partSearch, setPartSearch] = useState("");

  const selectedVariant = variants.find((variant) => variant.id === variantId) ?? null;
  const selectedPartBike = variants.find((variant) => variant.id === partBikeFilter) ?? null;
  const selectedPart = parts.find((part) => part.id === partId) ?? null;

  const modelOptions = useMemo(() => {
    const seen = new Set<string>();
    return variants.filter((variant) => {
      const key = variant.motorcycle_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [variants]);

  const filteredVariants = useMemo(() => {
    const q = bikeFilter.trim().toLowerCase();
    if (!q) return variants;
    return variants.filter((variant) => {
      const text = `${variantBrandName(variant)} ${variantModelName(variant)} ${variant.cc} ${variant.color_name ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [bikeFilter, variants]);

  const filteredParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    return parts.filter((part) => {
      const selectedBrandId = selectedPartBike?.motorcycle?.brand?.id ?? null;
      const selectedMotorcycleId = selectedPartBike?.motorcycle?.id ?? null;
      const brandMatch = selectedBrandId
        ? !part.compatible_brand_id || part.compatible_brand_id === selectedBrandId
        : true;
      const modelMatch = selectedMotorcycleId
        ? !part.compatible_motorcycle_id || part.compatible_motorcycle_id === selectedMotorcycleId
        : true;
      const text = `${part.sku} ${part.name} ${part.category ?? ""} ${partCompatibilityLabel(part)}`.toLowerCase();
      return brandMatch && modelMatch && (!q || text.includes(q));
    });
  }, [partSearch, parts, selectedPartBike]);

  function chooseTarget(nextTarget: "variant" | "part") {
    setTargetType(nextTarget);
    if (nextTarget === "variant") {
      setPartId("");
    } else {
      setVariantId("");
    }
  }

  return (
    <AdminForm action={requestStockMovement} submitLabel="Submit for Admin approval" pendingLabel="Submitting request..." confirmMessage="Submit this stock change for Admin approval?" className="space-y-5">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="variantId" value={targetType === "variant" ? variantId : ""} />
      <input type="hidden" name="partId" value={targetType === "part" ? partId : ""} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button type="button" onClick={() => chooseTarget("variant")} className={`flex min-h-16 items-center justify-between rounded-md border px-4 text-left transition-colors ${targetType === "variant" ? "border-[#C62828] bg-[#FEF2F2] ring-2 ring-[#C62828]/10" : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"}`}>
          <span className="inline-flex items-center gap-3">
            <Bike aria-hidden="true" className="h-5 w-5 text-[#C62828]" />
            <span>
              <span className="block text-sm font-bold text-[#111111]">Bike stock</span>
              <span className="block text-xs text-[#6B7280]">Add or subtract motorcycle variant inventory</span>
            </span>
          </span>
          {targetType === "variant" ? <StatusBadge value="new" label="Selected" /> : null}
        </button>
        <button type="button" onClick={() => chooseTarget("part")} className={`flex min-h-16 items-center justify-between rounded-md border px-4 text-left transition-colors ${targetType === "part" ? "border-[#C62828] bg-[#FEF2F2] ring-2 ring-[#C62828]/10" : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"}`}>
          <span className="inline-flex items-center gap-3">
            <PackageOpen aria-hidden="true" className="h-5 w-5 text-[#C62828]" />
            <span>
              <span className="block text-sm font-bold text-[#111111]">Spare part stock</span>
              <span className="block text-xs text-[#6B7280]">Add or subtract parts by SKU compatibility</span>
            </span>
          </span>
          {targetType === "part" ? <StatusBadge value="new" label="Selected" /> : null}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label className={adminLabelClass}>Movement type</label>
          <select name="movementType" defaultValue="addition" className={adminInputClass}>
            <option value="addition">Addition (+)</option>
            <option value="subtraction">Subtraction (-)</option>
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Quantity</label>
          <input name="quantity" type="number" min={1} required defaultValue={1} className={adminInputClass} />
        </div>
        <div>
          <label className={adminLabelClass}>Unit cost, PKR{isAdminOrDev ? "" : " (auto-filled)"}</label>
          <input name="unitCost" type="number" min={0} step="0.01" placeholder={isAdminOrDev ? "Optional override" : "Auto from selected item"} disabled={!isAdminOrDev} className={adminInputClass + (!isAdminOrDev ? " bg-[#F7F7F8] text-[#6B7280]" : "")} />
          {!isAdminOrDev ? <p className="mt-1 text-[11px] text-[#6B7280]">Managers can leave this blank. The server snapshots current cost.</p> : null}
        </div>
      </div>

      {targetType === "variant" ? (
        <section className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className={adminLabelClass}>Find motorcycle variant</label>
              <div className="relative mt-2">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input value={bikeFilter} onChange={(event) => setBikeFilter(event.target.value)} className={`${adminInputClass} bg-white pl-10`} placeholder="Search by brand, model, CC, or color..." />
              </div>
            </div>
            <div className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 lg:min-w-[320px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Selected bike</p>
              <p className="mt-1 text-sm font-bold text-[#111111]">{selectedVariant ? variantLabel(selectedVariant) : "No variant selected"}</p>
              <p className="text-xs text-[#6B7280]">{selectedVariant ? `${selectedVariant.cc}cc | ${selectedVariant.color_name ?? "Color TBD"} | Qty ${selectedVariant.quantity}` : "Choose a variant below"}</p>
            </div>
          </div>
          <div className="mt-3 grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto rounded-md border border-[#E5E7EB] bg-white p-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredVariants.map((variant) => {
              const selected = variant.id === variantId;
              return (
                <button key={variant.id} type="button" onClick={() => setVariantId(variant.id)} className={`rounded-md border p-3 text-left transition-colors ${selected ? "border-[#C62828] bg-[#FEF2F2] ring-2 ring-[#C62828]/10" : "border-[#E5E7EB] hover:bg-[#FAFAFA]"}`}>
                  <p className="text-sm font-bold text-[#111111]">{variantLabel(variant)}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">{variant.cc}cc | {variant.color_name ?? "Color TBD"} | Qty {variant.quantity}</p>
                  <p className="mt-1 font-display text-sm font-bold text-[#C62828]">{pkr(variant.price)}</p>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <label className={adminLabelClass}>Bike/model compatibility filter</label>
              <select value={partBikeFilter} onChange={(event) => { setPartBikeFilter(event.target.value); setPartId(""); }} className={`${adminInputClass} mt-2 bg-white`}>
                <option value="">All parts, including universal</option>
                {modelOptions.map((variant) => (
                  <option key={variant.motorcycle_id} value={variant.id}>{variantLabel(variant)}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#6B7280]">Selecting TARO, Lifan, Hi-Speed, etc. filters the SKU list to universal parts plus matching brand/model parts.</p>
            </div>
            <div>
              <label className={adminLabelClass}>Search spare part</label>
              <div className="relative mt-2">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input value={partSearch} onChange={(event) => setPartSearch(event.target.value)} className={`${adminInputClass} bg-white pl-10`} placeholder="Search SKU, name, category, compatibility..." />
              </div>
            </div>
          </div>
          <div className="mt-3 grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto rounded-md border border-[#E5E7EB] bg-white p-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredParts.length === 0 ? (
              <p className="col-span-full rounded-md border border-dashed border-[#D1D5DB] p-4 text-center text-sm text-[#6B7280]">No matching parts. Add the part first under Stock - Spare Parts.</p>
            ) : filteredParts.map((part) => {
              const selected = part.id === partId;
              return (
                <button key={part.id} type="button" onClick={() => setPartId(part.id)} className={`rounded-md border p-3 text-left transition-colors ${selected ? "border-[#C62828] bg-[#FEF2F2] ring-2 ring-[#C62828]/10" : "border-[#E5E7EB] hover:bg-[#FAFAFA]"}`}>
                  <p className="font-mono text-xs font-bold text-[#C62828]">{part.sku}</p>
                  <p className="mt-1 text-sm font-bold text-[#111111]">{part.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">{partCompatibilityLabel(part)} | Qty {Number(part.current_stock ?? 0)} | {pkr(part.unit_cost)}</p>
                </button>
              );
            })}
          </div>
          {selectedPart ? (
            <div className="mt-3 rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm">
              <span className="font-bold text-[#111111]">{selectedPart.sku}</span>
              <span className="text-[#6B7280]"> selected for {partCompatibilityLabel(selectedPart)}.</span>
            </div>
          ) : null}
        </section>
      )}

      <div>
        <label className={adminLabelClass}>Reason / attachment reference</label>
        <textarea name="reason" required className={adminInputClass + " min-h-[72px]"} placeholder="e.g. Invoice #1234 from supplier, PDI checklist #5, showroom count correction on 01 Aug..." />
        <p className="mt-1 text-xs text-[#6B7280]">Admin will read this before approving. Reference invoice numbers for stock inwards.</p>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-[#B45309]">
        Live inventory is not updated until Admin approves. The change is only a request.
      </div>
    </AdminForm>
  );
}
