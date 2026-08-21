"use client";

import { Plus, Search, Trash2, UserCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { sellSpareParts } from "@/app/admin/erp-actions/stock";
import { AdminForm } from "@/components/admin/admin-form.client";
import { StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import type { Bank, Customer, Part } from "@/lib/erp/types";

type CartRow = { id: string; partId: string; quantity: number; unitPrice: number };

const paymentOptions = [
  ["cash", "Cash"],
  ["bank_transfer", "Bank transfer"],
  ["cheque", "Cheque"],
  ["demand_draft", "Demand draft"],
  ["pay_order", "Pay order"],
  ["easypaisa", "Easypaisa"],
  ["jazzcash", "JazzCash"],
  ["sadapay", "SadaPay"],
  ["card", "Card"],
  ["other", "Other"],
] as const;

function pkr(value: number): string {
  return "PKR " + (Number(value) || 0).toLocaleString("en-PK");
}
function formatCnic(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function formatPakPhone(value: string): string {
  return value.replace(/[^0-9+]/g, "").slice(0, value.startsWith("+") ? 13 : 11);
}

function makeRow(parts: readonly Part[]): CartRow {
  const first = parts.find((part) => (part.current_stock ?? 0) > 0);
  return { id: crypto.randomUUID(), partId: first?.id ?? "", quantity: 1, unitPrice: Number(first?.unit_cost ?? 0) };
}

export function PartSaleForm({ parts, customers, banks }: Readonly<{ parts: readonly Part[]; customers: readonly Customer[]; banks: readonly Bank[] }>) {
  const sellableParts = useMemo(() => parts.filter((part) => (part.current_stock ?? 0) > 0), [parts]);
  const [rows, setRows] = useState<CartRow[]>(() => [makeRow(sellableParts)]);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(customers.length ? "existing" : "new");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [partSearch, setPartSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [newCustomer, setNewCustomer] = useState({ fullName: "", cnic: "", phonePrimary: "", phoneSecondary: "", city: "", address: "" });

    const categories = useMemo(() => Array.from(new Set(sellableParts.map((part) => String(part.category ?? "General").trim()).filter(Boolean))).sort(), [sellableParts]);
  const filteredSellableParts = useMemo(() => {
    const needle = partSearch.trim().toLowerCase();
    return sellableParts.filter((part) => {
      const categoryOk = categoryFilter === "all" || String(part.category ?? "").toLowerCase() === categoryFilter.toLowerCase();
      if (!categoryOk) return false;
      const fitment = `${part.compatible_motorcycle?.brand?.name ?? part.compatible_brand?.name ?? ""} ${part.compatible_motorcycle?.name ?? ""}`;
      const haystack = `${part.sku} ${part.name} ${part.category ?? ""} ${part.carton_number ?? ""} ${part.location ?? ""} ${part.compatible_cc ?? ""} ${fitment}`.toLowerCase();
      return !needle || haystack.includes(needle);
    });
  }, [categoryFilter, partSearch, sellableParts]);
  const byId = useMemo(() => new Map(sellableParts.map((part) => [part.id, part])), [sellableParts]);
  const filteredCustomers = useMemo(() => {
    const needle = customerSearch.trim().toLowerCase();
    if (!needle) return customers.slice(0, 80);
    const digits = needle.replace(/[^0-9]/g, "");
    return customers.filter((customer) =>
      customer.full_name.toLowerCase().includes(needle) ||
      customer.cnic.replace(/[^0-9]/g, "").includes(digits) ||
      (customer.phone_primary ?? "").replace(/[^0-9]/g, "").includes(digits)
    ).slice(0, 80);
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find((customer) => customer.id === customerId) ?? null;
  const itemsJson = JSON.stringify(rows.filter((row) => row.partId).map((row) => ({ partId: row.partId, quantity: row.quantity, unitPrice: row.unitPrice })));
  const total = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0), 0);
  const hasStockIssue = rows.some((row) => {
    const part = byId.get(row.partId);
    return !part || row.quantity > Number(part.current_stock ?? 0) || Number(part.current_stock ?? 0) <= 0;
  });
  const needsBank = ["bank_transfer", "cheque", "demand_draft", "pay_order"].includes(paymentMethod);

  function updateRow(rowId: string, patch: Partial<CartRow>) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  }

  function selectPart(rowId: string, partId: string) {
    const part = byId.get(partId);
    updateRow(rowId, { partId, quantity: 1, unitPrice: Number(part?.unit_cost ?? 0) });
  }

  return (
    <AdminForm action={sellSpareParts} submitLabel="Submit for approval" pendingLabel="Submitting..." confirmMessage="Submit this part sale for approval?" className="space-y-6">
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="customerMode" value={customerMode} />
      <input type="hidden" name="customerId" value={customerMode === "existing" ? customerId : ""} />

      <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C62828]">Customer</p>
            <h3 className="mt-1 font-display text-xl font-bold text-[#111111]">Link this sale to a customer record</h3>
          </div>
          <div className="inline-flex rounded-md border border-[#D1D5DB] bg-white p-1">
            <button type="button" onClick={() => setCustomerMode("existing")} className={`inline-flex min-h-9 items-center gap-2 rounded px-3 text-xs font-semibold ${customerMode === "existing" ? "bg-[#111111] text-white" : "text-[#374151] hover:bg-[#F7F7F8]"}`}><UserCheck aria-hidden className="h-3.5 w-3.5" />Existing</button>
            <button type="button" onClick={() => setCustomerMode("new")} className={`inline-flex min-h-9 items-center gap-2 rounded px-3 text-xs font-semibold ${customerMode === "new" ? "bg-[#111111] text-white" : "text-[#374151] hover:bg-[#F7F7F8]"}`}><UserPlus aria-hidden className="h-3.5 w-3.5" />New</button>
          </div>
        </div>

        {customerMode === "existing" ? (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div>
              <label className={adminLabelClass}>Search existing customer</label>
              <div className="relative mt-2">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} className={adminInputClass + " pl-10"} placeholder="Search name, CNIC, or phone" />
              </div>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={adminInputClass} required={customerMode === "existing"}>
                <option value="">Select customer</option>
                {filteredCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} - {customer.cnic} - {customer.phone_primary ?? "no phone"}</option>)}
              </select>
            </div>
            <div className="rounded-md border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">Selected customer</p>
              {selectedCustomer ? (
                <div className="mt-2 space-y-1 text-[#374151]"><p className="font-semibold text-[#111111]">{selectedCustomer.full_name}</p><p className="font-mono text-xs">{selectedCustomer.cnic}</p><p className="font-mono text-xs">{selectedCustomer.phone_primary ?? "-"}</p><p className="text-xs">{selectedCustomer.city ?? ""}</p></div>
              ) : <p className="mt-2 text-xs text-[#C62828]">Select a customer before checkout.</p>}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className={adminLabelClass}>Full name</label><input name="newCustomer_fullName" className={adminInputClass} required={customerMode === "new"} placeholder="Customer full name" value={newCustomer.fullName} onChange={(event) => setNewCustomer((current) => ({ ...current, fullName: event.target.value }))} /></div>
            <div><label className={adminLabelClass}>CNIC</label><input name="newCustomer_cnic" className={adminInputClass + " font-mono"} required={customerMode === "new"} inputMode="numeric" maxLength={15} pattern="^([0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9]{1})$" placeholder="35202-1234567-1" value={newCustomer.cnic} onChange={(event) => setNewCustomer((current) => ({ ...current, cnic: formatCnic(event.target.value) }))} /></div>
            <div><label className={adminLabelClass}>Phone primary</label><input name="newCustomer_phonePrimary" className={adminInputClass + " font-mono"} required={customerMode === "new"} inputMode="tel" maxLength={14} placeholder="03001234567" value={newCustomer.phonePrimary} onChange={(event) => setNewCustomer((current) => ({ ...current, phonePrimary: formatPakPhone(event.target.value) }))} /></div>
            <div><label className={adminLabelClass}>Phone secondary</label><input name="newCustomer_phoneSecondary" className={adminInputClass + " font-mono"} inputMode="tel" maxLength={14} value={newCustomer.phoneSecondary} onChange={(event) => setNewCustomer((current) => ({ ...current, phoneSecondary: formatPakPhone(event.target.value) }))} /></div>
            <div><label className={adminLabelClass}>City</label><input name="newCustomer_city" className={adminInputClass} value={newCustomer.city} onChange={(event) => setNewCustomer((current) => ({ ...current, city: event.target.value }))} /></div>
            <div><label className={adminLabelClass}>Address</label><input name="newCustomer_address" className={adminInputClass} value={newCustomer.address} onChange={(event) => setNewCustomer((current) => ({ ...current, address: event.target.value }))} /></div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C62828]">Payment</p>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_13rem]">
          <div>
            <label className={adminLabelClass}>Payment method</label>
            <select name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={adminInputClass}>
              {paymentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className={adminLabelClass}>Bank</label>
            <select name="bankId" className={adminInputClass} required={needsBank} disabled={!needsBank}>
              <option value="">{needsBank ? "Select bank" : "Not required"}</option>
              {banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
            </select>
          </div>
          <div>
            <label className={adminLabelClass}>Txn / reference</label>
            <input name="transactionReference" className={adminInputClass} placeholder="Receipt / cheque / transfer ref" />
          </div>
          <div className="rounded-md border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">Sale total</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#C62828]">{pkr(total)}</p>
          </div>
        </div>
      </section>

            <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input value={partSearch} onChange={(event) => setPartSearch(event.target.value)} className={adminInputClass + " pl-10"} placeholder="Search SKU, carton, category, bike, CC..." />
          </div>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={adminInputClass + " mt-0"}>
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
        <div className="grid grid-cols-[minmax(0,1.6fr)_7rem_9rem_9rem_3rem] gap-3 bg-[#F7F7F8] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]"><span>Spare part</span><span>Qty</span><span>Unit price</span><span className="text-right">Line total</span><span /></div>
        <div className="divide-y divide-[#E5E7EB]">
          {rows.map((row) => {
            const part = byId.get(row.partId);
            const available = Number(part?.current_stock ?? 0);
            const over = row.quantity > available || available <= 0;
            return (
              <div key={row.id} className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.6fr)_7rem_9rem_9rem_3rem] md:items-start">
                <div><select value={row.partId} onChange={(event) => selectPart(row.id, event.target.value)} className={adminInputClass + " mt-0"}><option value="">Select part</option>{filteredSellableParts.map((partOption) => <option key={partOption.id} value={partOption.id}>{partOption.sku} - {partOption.name} | Carton {partOption.carton_number ?? "-"} | {partOption.compatible_cc ? `${partOption.compatible_cc}cc` : "All CC"} ({partOption.current_stock ?? 0} in stock)</option>)}</select>{part ? <p className="mt-2 text-xs text-[#6B7280]">{part.category} | Carton {part.carton_number ?? "-"} | {part.compatible_cc ? `${part.compatible_cc}cc` : "All CC"} | {part.compatible_motorcycle?.name ?? part.compatible_brand?.name ?? "Universal"}</p> : null}{over ? <p className="mt-2 text-xs font-semibold text-[#C62828]">Only {available} unit(s) available.</p> : null}</div>
                <input type="number" min={1} max={Math.max(1, available)} value={row.quantity} onChange={(event) => updateRow(row.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} className={adminInputClass + " mt-0"} aria-label="Quantity" />
                <input type="number" min={0} step="0.01" value={row.unitPrice} onChange={(event) => updateRow(row.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })} className={adminInputClass + " mt-0"} aria-label="Unit price" />
                <div className="flex min-h-11 items-center justify-end rounded-md bg-[#F7F7F8] px-3 font-display text-xl font-bold text-[#111111]">{pkr(row.quantity * row.unitPrice)}</div>
                <button type="button" onClick={() => setRows((current) => current.length <= 1 ? current : current.filter((item) => item.id !== row.id))} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] text-[#6B7280] hover:border-[#C62828] hover:text-[#C62828]" aria-label="Remove row"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setRows((current) => [...current, makeRow(sellableParts)])} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]"><Plus aria-hidden="true" className="h-4 w-4" /> Add another part</button>
        <div className="flex items-center gap-3"><StatusBadge value={hasStockIssue ? "out_of_stock" : "new"} label={hasStockIssue ? "Fix stock first" : "Ready for approval"} /><p className="text-sm font-semibold text-[#111111]">{pkr(total)}</p></div>
      </div>

      <div><label className={adminLabelClass}>Sale notes</label><textarea name="notes" className={adminInputClass + " min-h-24 py-3"} placeholder="Optional note" /></div>
    </AdminForm>
  );
}

