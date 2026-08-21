"use client";

import { useMemo, useState } from "react";
import { adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";

export function ChasisFields({
  label = "Opening quantity",
  defaultQuantity = 1,
  existingChasisNumbers = [],
}: {
  label?: string;
  defaultQuantity?: number;
  existingChasisNumbers?: string[];
}) {
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [values, setValues] = useState<string[]>(() => Array.from({ length: defaultQuantity }, () => ""));
  const existingSet = useMemo(
    () => new Set(existingChasisNumbers.map((item) => String(item ?? "").trim().toUpperCase()).filter(Boolean)),
    [existingChasisNumbers],
  );
  const filled = values.map((value) => value.trim().toUpperCase()).filter(Boolean);
  const counts = filled.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>());

  function setQty(next: number) {
    const safe = Math.max(1, Math.min(100, Number.isFinite(next) ? Math.floor(next) : 1));
    setQuantity(safe);
    setValues((current) => Array.from({ length: safe }, (_, index) => current[index] ?? ""));
  }

  function setValue(index: number, value: string) {
    setValues((current) => {
      const next = [...current];
      next[index] = value.toUpperCase();
      return next;
    });
  }

  return (
    <>
      <div>
        <label className={adminLabelClass}>{label}</label>
        <input name="quantity" required type="number" min={1} max={100} step="1" value={quantity} onChange={(event) => setQty(Number(event.target.value))} className={adminInputClass} />
      </div>
      <input type="hidden" name="chasisNumbers" value={values.join("\n")} />
      <div className="md:col-span-2">
        <label className={adminLabelClass}>Chasis numbers</label>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {values.map((value, index) => {
            const normalized = value.trim().toUpperCase();
            const duplicate = normalized && (counts.get(normalized) ?? 0) > 1;
            const exists = normalized && existingSet.has(normalized);
            return (
              <label key={index} className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B7280]">Chasis {index + 1}</span>
                <input value={value} onChange={(event) => setValue(index, event.target.value)} required className={`${adminInputClass} font-mono uppercase ${duplicate || exists ? "border-[#C62828] bg-[#FEF2F2] ring-2 ring-[#C62828]/30" : ""}`} placeholder={`CHASIS-${index + 1}`} />
                {duplicate ? <span className="mt-1 block text-[11px] font-semibold text-[#C62828]">Duplicate in this form</span> : null}
                {exists ? <span className="mt-1 block text-[11px] font-semibold text-[#C62828]">Already exists in stock or sale history</span> : null}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[#6B7280]">One physical bike needs one unique chasis number. The server checks stock records and old sale history again before saving.</p>
      </div>
    </>
  );
}
