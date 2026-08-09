"use client";

import React, { useState } from "react";
import { Pencil, X, Save } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, StatusBadge } from "@/components/admin/admin-ui";
import { updateVariantDetails } from "@/app/admin/erp-actions";

export type VariantRowClient = {
  id: string;
  cc: number;
  color_name?: string | null;
  color_hex?: string | null;
  quantity?: number | null;
  price?: number | null;
  stock_status?: "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | "discontinued" | string | null;
  motorcycle?: { name?: string | null; brand?: { name?: string | null } | null } | null;
};

export function VariantAdminEditorTable({
  variants,
  canEditPrices,
  isApprentice,
}: {
  variants: VariantRowClient[];
  canEditPrices: boolean;
  isApprentice: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState<Record<string, string>>({});

  const baseCols = 5;
  const colsNoApprentice = 2;
  const colsAdminActions = canEditPrices ? 1 : 0;
  const colSpan = baseCols + (isApprentice ? 0 : colsNoApprentice) + colsAdminActions;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
        <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
          <tr>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">CC</th>
            <th className="px-4 py-3">Color</th>
            <th className="px-4 py-3">Status</th>
            {!isApprentice ? <th className="px-4 py-3 text-right">Qty</th> : null}
            {!isApprentice ? <th className="px-4 py-3 text-right">Price</th> : null}
            {canEditPrices ? <th className="px-4 py-3 text-right whitespace-nowrap">Price edit</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {variants.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-[#6B7280]">
                No variants added to inventory yet.
              </td>
            </tr>
          ) : (
            variants.flatMap((v) => {
              const inStock = (v.quantity ?? 0) > 0 && v.stock_status !== "out_of_stock";
              const editing = editingId === v.id;
              const priceValue = Number(v.price) || 0;
              const rows: React.ReactElement[] = [];

              rows.push(
                <tr key={v.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3 font-semibold">{v.motorcycle?.brand?.name ?? "-"}</td>
                  <td className="px-4 py-3">{v.motorcycle?.name ?? "-"}</td>
                  <td className="px-4 py-3">{v.cc}cc</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {v.color_hex ? (
                        <span
                          aria-hidden
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: v.color_hex }}
                        />
                      ) : null}
                      <span>{v.color_name ?? "Color TBD"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      value={inStock ? "in_stock" : "out_of_stock"}
                      label={inStock ? "In stock" : "Out of stock"}
                    />
                  </td>
                  {!isApprentice ? (
                    <td className="px-4 py-3 text-right font-display text-lg font-bold">
                      {v.quantity ?? 0}
                    </td>
                  ) : null}
                  {!isApprentice ? (
                    <td className="px-4 py-3 text-right font-display font-bold text-[#C62828]">
                      PKR {priceValue.toLocaleString("en-PK")}
                    </td>
                  ) : null}
                  {canEditPrices ? (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(editing ? null : v.id);
                          setDraftPrice((d) => ({ ...d, [v.id]: String(priceValue) }));
                        }}
                        aria-label={editing ? `Cancel price edit ${v.motorcycle?.name ?? v.id}` : `Edit price ${v.motorcycle?.name ?? v.id}`}
                        className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors ${
                          editing
                            ? "border-[#C62828] bg-white text-[#C62828] hover:bg-[#FEF2F2]"
                            : "border-[#111111] bg-[#111111] hover:bg-black"
                        }`}
                        style={editing ? undefined : { color: "#FFFFFF" }}
                      >
                        {editing ? (
                          <>
                            <X aria-hidden="true" className="h-3.5 w-3.5" />
                            Cancel
                          </>
                        ) : (
                          <>
                            <Pencil aria-hidden="true" className="h-3.5 w-3.5" style={{ color: "#FFFFFF" }} />
                            <span style={{ color: "#FFFFFF" }}>Edit price</span>
                          </>
                        )}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );

              if (editing && canEditPrices) {
                rows.push(
                  <tr key={`${v.id}-edit`} className="bg-[#FAFAFA]">
                    <td colSpan={colSpan} className="px-4 py-5">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[240px]">
                          <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280] mb-1.5">
                            New sale price, PKR
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={draftPrice[v.id] ?? String(priceValue)}
                            onChange={(e) =>
                              setDraftPrice((d) => ({ ...d, [v.id]: e.target.value }))
                            }
                            className={adminInputClass}
                            autoFocus
                          />
                          <p className="mt-1 text-[11px] text-[#6B7280]">
                            Current: PKR {priceValue.toLocaleString("en-PK")} — saving instantly updates catalog &amp; New Sale screens.
                          </p>
                        </div>
                        <AdminForm
                          action={updateVariantDetails}
                          hideAutoSubmit
                          confirmMessage={`Update ${v.motorcycle?.name ?? "variant"} price from PKR ${priceValue.toLocaleString("en-PK")} to PKR ${Number(draftPrice[v.id] ?? priceValue).toLocaleString("en-PK")}?`}
                          className="contents flex-none"
                        >
                          <input type="hidden" name="variantId" value={v.id} />
                          <input
                            type="hidden"
                            name="price"
                            value={draftPrice[v.id] ?? String(priceValue)}
                          />
                          <button
                            type="submit"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#15803D] bg-[#15803D] px-5 text-sm font-semibold hover:bg-[#166534] whitespace-nowrap"
                            style={{ color: "#FFFFFF" }}
                          >
                            <Save aria-hidden="true" className="h-4 w-4" style={{ color: "#FFFFFF" }} />
                            <span style={{ color: "#FFFFFF" }}>Save new price</span>
                          </button>
                        </AdminForm>
                      </div>
                    </td>
                  </tr>
                );
              }
              return rows;
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
