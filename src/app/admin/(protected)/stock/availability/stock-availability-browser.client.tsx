"use client";

import { useMemo, useState } from "react";
import { Bike, PackageSearch, Archive } from "lucide-react";
import { AdminPanel } from "@/components/admin/admin-ui";
import { PartsAvailabilityTable, type PartAvailabilityRow } from "./parts-availability-table.client";
import { VariantAdminEditorTable, type BrandOptionClient, type VariantRowClient } from "./variant-table.client";

type TabKey = "bikes" | "parts" | "archived";

export function StockAvailabilityBrowser({
  variants,
  archivedVariants,
  parts,
  isApprentice,
  canEditPrices,
  canArchiveBikes,
  brands,
  stockUnits,
  saleHistoryChasisNumbers = [],
}: {
  variants: VariantRowClient[];
  archivedVariants: VariantRowClient[];
  parts: PartAvailabilityRow[];
  isApprentice: boolean;
  canEditPrices: boolean;
  canArchiveBikes: boolean;
  brands: BrandOptionClient[];
  stockUnits: { id: string; motorcycle_variant_id: string; chasis_number: string; status: string }[];
  saleHistoryChasisNumbers?: string[];
}) {
  const [active, setActive] = useState<TabKey>("bikes");
  const inStockBikes = useMemo(() => variants.filter((variant) => (variant.quantity ?? 0) > 0 && variant.stock_status !== "out_of_stock").length, [variants]);
  const inStockParts = useMemo(() => parts.filter((part) => Boolean(part.in_stock) || (part.current_stock ?? 0) > 0).length, [parts]);
  const tabs: Array<{ key: TabKey; label: string; count: number; sub: string; icon: typeof Bike }> = [
    { key: "bikes", label: "Bikes", count: variants.length, sub: `${inStockBikes} available`, icon: Bike },
    { key: "parts", label: "Spare Parts", count: parts.length, sub: `${inStockParts} available`, icon: PackageSearch },
  ];
  if (!isApprentice) tabs.push({ key: "archived", label: "Archived", count: archivedVariants.length, sub: "Hidden stock rows", icon: Archive });

  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];
  const title = activeTab.key === "bikes" ? "Bikes by brand, CC & color" : activeTab.key === "parts" ? "Spare parts availability" : "Archived bikes";
  const description = activeTab.key === "bikes"
    ? canEditPrices
      ? "Search and update bike details without touching stock quantities."
      : isApprentice
        ? "Search bikes by brand, model, color, or CC. Exact quantities and pricing stay hidden."
        : "Search current bike stock rows by brand, model, color, or CC."
    : activeTab.key === "parts"
      ? isApprentice
        ? "Search parts by SKU, name, category, or availability."
        : "Search parts by SKU, name, category, or stock status."
      : "Restore archived bike variants when they should return to stock workflows.";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`group flex min-h-20 items-center justify-between rounded-lg border px-4 py-3 text-left shadow-sm transition-all ${selected ? "border-[#C62828] bg-[#FEF2F2] ring-3 ring-[#C62828]/10" : "border-[#E5E7EB] bg-white hover:border-[#C62828]/50 hover:bg-[#FAFAFA]"}`}
              aria-pressed={selected}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${selected ? "bg-[#C62828] text-white" : "bg-[#F7F7F8] text-[#374151] group-hover:text-[#C62828]"}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-xl font-bold leading-tight text-[#111111]">{tab.label}</span>
                  <span className="mt-1 block text-xs text-[#6B7280]">{tab.sub}</span>
                </span>
              </span>
              <span className={`ml-3 inline-flex min-w-9 justify-center rounded-full border px-2 py-1 text-xs font-bold ${selected ? "border-[#C62828] bg-white text-[#C62828]" : "border-[#E5E7EB] bg-[#F7F7F8] text-[#374151]"}`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <AdminPanel title={title} description={description}>
        {active === "bikes" ? (
          <VariantAdminEditorTable variants={variants} isApprentice={isApprentice} canArchive={canArchiveBikes} brands={brands} stockUnits={stockUnits} saleHistoryChasisNumbers={saleHistoryChasisNumbers} />
        ) : active === "parts" ? (
          <PartsAvailabilityTable parts={parts} isApprentice={isApprentice} />
        ) : (
          <VariantAdminEditorTable variants={archivedVariants} isApprentice={false} archived canArchive={canArchiveBikes} brands={brands} stockUnits={[]} saleHistoryChasisNumbers={saleHistoryChasisNumbers} />
        )}
      </AdminPanel>
    </div>
  );
}
