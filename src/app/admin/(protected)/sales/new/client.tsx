"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bike, Building2, CreditCard, FileText, Landmark, PencilLine, Plus, Trash2, Wallet, ChevronDown, ChevronUp, Search
} from "lucide-react";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { initiateSale, recordSalePayment } from "@/app/admin/erp-actions";
import { useActionState, useEffect } from "react";
import { INITIAL_ADMIN_ACTION_STATE, type AdminActionState } from "@/lib/admin/action-state";

type Variant = {
  id: string;
  cc: number;
  color_name: string | null;
  color_hex: string | null;
  quantity: number | null;
  stock_status: string;
  price: number | null;
  motorcycle: { id: string; name: string; slug: string; brand: { id: string; name: string; slug: string } | null } | null;
};

type Bank = { id: string; name: string; code: string | null };
type Customer = { id: string; full_name: string; cnic: string; phone_primary: string | null };

type LucideIconType = React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
const paymentMethods: { value: "cash" | "bank_transfer" | "cheque" | "demand_draft" | "pay_order" | "card" | "other"; label: string; bank_required: boolean; icon: LucideIconType }[] = [
  { value: "cash", label: "Cash", bank_required: false, icon: Wallet },
  { value: "bank_transfer", label: "Bank Transfer / Online", bank_required: true, icon: Landmark },
  { value: "cheque", label: "Cheque", bank_required: true, icon: FileText },
  { value: "demand_draft", label: "Demand Draft (DD)", bank_required: true, icon: FileText },
  { value: "pay_order", label: "Pay Order (PO)", bank_required: true, icon: FileText },
  { value: "card", label: "Card POS", bank_required: true, icon: CreditCard },
  { value: "other", label: "Other", bank_required: false, icon: PencilLine },
];

type PaymentRow = { id: string; payment_method: string; bank_id: string; amount: string; instrument_number: string; transaction_ref: string };

function pkr(n: number | string): string {
  const num = typeof n === "string" ? Number(n.replace(/[^0-9]/g, "")) || 0 : n;
  return "PKR " + num.toLocaleString("en-PK");
}

function generateInternalTxnRef(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const ts = String(now.getFullYear() - 2000).padStart(2, "0")
    + pad(now.getMonth() + 1)
    + pad(now.getDate())
    + pad(now.getHours())
    + pad(now.getMinutes())
    + pad(now.getSeconds())
    + pad(now.getMilliseconds(), 3);
  const rnd = String(Math.floor(Math.random() * 900) + 100);
  return "OWM-TXN-" + ts + "-" + rnd;
}

export default function NewSalePageClient(props: {
  variants: Variant[]; banks: Bank[]; customers: Customer[]; myProfileId: string | null;
}) {
  const { variants, banks, customers } = props;

  const [bikeFilter, setBikeFilter] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [existingCustomerId, setExistingCustomerId] = useState<string>("");
  const [createNewCustomer, setCreateNewCustomer] = useState(false);

  const [variantId, setVariantId] = useState<string>("");
  const [chasisNumber, setChasisNumber] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [saleNotes, setSaleNotes] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    fullName: "",
    cnic: "",
    phonePrimary: "",
    phoneSecondary: "",
    city: "",
    address: "",
  });

  const [payments, setPayments] = useState<PaymentRow[]>(() => {
    const defaultFirstId = crypto.randomUUID();
    const firstRow: PaymentRow = { id: defaultFirstId, payment_method: "cash", bank_id: "", amount: "", instrument_number: "", transaction_ref: generateInternalTxnRef() };
    return [firstRow];
  });

  const filteredVariants = useMemo(() => {
    const q = bikeFilter.trim().toLowerCase();
    let vs = variants;
    if (q) vs = vs.filter(v => {
      const text = `${v.motorcycle?.brand?.name} ${v.motorcycle?.name} ${v.cc} ${v.color_name}`.toLowerCase();
      return text.includes(q);
    });
    return vs;
  }, [bikeFilter, variants]);

  const chosen = useMemo(() => variants.find(v => v.id === variantId) ?? null, [variantId, variants]);
  const totalAmount = (chosen?.price ?? 0) * quantity;
  const paidAmount = payments.reduce((t, p) => t + (Number(p.amount.replace(/[^0-9]/g, "")) || 0), 0);
  const dueAmount = totalAmount - paidAmount;

  const matchedCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter(c => `${c.full_name} ${c.cnic} ${c.phone_primary ?? ""}`.toLowerCase().includes(q)).slice(0, 20);
  }, [customerSearch, customers]);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === existingCustomerId) ?? null, [existingCustomerId, customers]);

  function addPayment() {
    const newId = crypto.randomUUID();
    const newRow: PaymentRow = { id: newId, payment_method: "bank_transfer", bank_id: "", amount: "", instrument_number: "", transaction_ref: "" };
    const mInfo = paymentMethods.find(m => m.value === newRow.payment_method as typeof paymentMethods[number]["value"]);
    if (mInfo && !mInfo.bank_required) newRow.transaction_ref = generateInternalTxnRef();
    setPayments(prev => [...prev, newRow]);
  }
  function removePayment(id: string) {
    setPayments(prev => prev.filter(p => p.id !== id));
  }
  function updatePayment(id: string, patch: Partial<PaymentRow>) {
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next: PaymentRow = { ...p, ...patch };
      if (typeof patch.payment_method === "string") {
        const mInfo = paymentMethods.find(m => m.value === next.payment_method as typeof paymentMethods[number]["value"]);
        if (mInfo && !mInfo.bank_required && !next.transaction_ref.trim()) {
          next.transaction_ref = generateInternalTxnRef();
        }
      }
      return next;
    }));
  }

  const canSubmit = !!chosen && !!chasisNumber && (selectedCustomer || createNewCustomer) && payments.every(p => {
    const needBank = paymentMethods.find(m => m.value === p.payment_method as typeof paymentMethods[number]["value"])?.bank_required;
    const amt = Number(p.amount.replace(/[^0-9]/g, "")) || 0;
    return amt > 0 && (!needBank || !!p.bank_id);
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales Workflow"
        title="Record New Bike Sale"
        description="Step 1: Pick the bike + customer + chasis. Step 2: Add all payments (cash, banks, multiple splits allowed). Step 3: Submit for Admin approval. Stock is NOT deducted and receipt is NOT generated until Admin approves."
        actions={<Link href="/admin/sales/list" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]">View all sales</Link>}
      />

      <AdminPanel title="Step 1 — Bike & Customer" description="Choose the variant being sold. If colors or variants are missing, they need to be added first by a Developer under Inventory & SEO." actions={chosen ? <StatusBadge value={(chosen.quantity ?? 0) > 0 ? "in_stock" : "out_of_stock"} label={(chosen.quantity ?? 0) > 0 ? `In stock (${chosen.quantity})` : "Out of stock"} /> : undefined}>
        <div className="space-y-6">
          <div>
            <label className={adminLabelClass}>Search bike</label>
            <div className="relative mt-2">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input value={bikeFilter ?? ""} onChange={e => setBikeFilter(e.target.value)} className={`${adminInputClass} pl-10`} placeholder="Search by brand, model, color, or CC…" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredVariants.length === 0 ? (
                <p className="col-span-full rounded-md border border-dashed border-[#D1D5DB] p-4 text-center text-sm text-[#6B7280]">No variants match. Add variants to motorcycle inventory first.</p>
              ) : filteredVariants.map(v => {
                const selected = v.id === variantId;
                const available = (v.quantity ?? 0) > 0;
                return (
                  <button key={v.id} type="button" onClick={() => { setVariantId(v.id); setQuantity(1); }} className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${selected ? "border-[#C62828] bg-[#FEF2F2]" : "border-[#E5E7EB] bg-white hover:border-[#C62828]/50"} ${!available ? "opacity-60" : ""}`}>
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${selected ? "bg-white text-[#C62828]" : "bg-[#F7F7F8] text-[#374151]"}`}>
                      <Bike aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#111111]">{v.motorcycle?.brand?.name} {v.motorcycle?.name}</p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">{v.cc}cc · {v.color_name ?? "Color not set"}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-[#C62828]">{pkr(v.price ?? 0)}</span>
                        {available ? <span className="text-[10px] font-bold uppercase tracking-wider text-[#15803D]">× {v.quantity} available</span> : <span className="text-[10px] font-bold uppercase tracking-wider text-[#C62828]">Sold out</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className={adminLabelClass}>Chasis number (required)</label>
              <input value={chasisNumber ?? ""} onChange={e => setChasisNumber(e.target.value.toUpperCase())} required className={adminInputClass} placeholder="e.g. MP125GP-2025-894321" />
              <p className="mt-1 text-xs text-[#6B7280]">Bike&apos;s official chassis number (printed on frame). Written onto the receipt.</p>
            </div>
            <div>
              <label className={adminLabelClass}>Quantity</label>
              <input type="number" min={1} max={chosen?.quantity ?? 99} value={Number.isFinite(quantity) ? quantity : 1} onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))} className={adminInputClass} />
            </div>
            <div>
              <label className={adminLabelClass}>Sale total (auto)</label>
              <div className={`${adminInputClass} flex items-center justify-between font-display text-xl font-bold text-[#C62828]`}>{pkr(totalAmount)}<span className="text-xs font-normal text-[#6B7280]">{chosen ? `${chosen.price?.toLocaleString("en-PK")} × ${quantity}` : "Pick a bike"}</span></div>
            </div>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Customer</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#111111]">Select or register buyer</p>
              </div>
              <div className="flex rounded-md border border-[#E5E7EB] p-0.5 text-xs font-semibold">
                <button type="button" onClick={() => setCreateNewCustomer(false)} className={`rounded-md px-3 py-1.5 transition-colors ${!createNewCustomer ? "bg-[#111111] text-white" : "text-[#6B7280]"}`}>Existing customer</button>
                <button type="button" onClick={() => setCreateNewCustomer(true)} className={`rounded-md px-3 py-1.5 transition-colors ${createNewCustomer ? "bg-[#111111] text-white" : "text-[#6B7280]"}`}>New customer</button>
              </div>
            </div>

            {!createNewCustomer ? (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={adminLabelClass}>Search existing</label>
                  <input value={customerSearch ?? ""} onChange={e => setCustomerSearch(e.target.value)} className={adminInputClass} placeholder="By CNIC, phone, or name…" />
                  <div className="mt-2 max-h-60 overflow-auto rounded-md border border-[#E5E7EB]">
                    {matchedCustomers.length === 0 ? (
                      <p className="p-3 text-xs text-[#6B7280]">No match — switch to New Customer to register them.</p>
                    ) : matchedCustomers.map(c => (
                      <button key={c.id} type="button" onClick={() => { setExistingCustomerId(c.id); }} className={`flex w-full items-start gap-3 border-b border-[#F3F4F6] px-3 py-2 text-left transition-colors ${existingCustomerId === c.id ? "bg-[#FEF2F2]" : "hover:bg-[#FAFAFA]"}`}>
                        <div>
                          <p className="text-sm font-semibold">{c.full_name}</p>
                          <p className="text-xs text-[#6B7280]">CNIC: <span className="font-mono">{c.cnic}</span> · {c.phone_primary ?? "No phone"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={adminLabelClass}>Selected</label>
                  <div className={`${adminInputClass} !min-h-[108px]`}>
                    {selectedCustomer ? (
                      <div className="pt-1 text-sm">
                        <p className="font-semibold text-[#111111]">{selectedCustomer.full_name}</p>
                        <p className="mt-1 text-[#6B7280]">CNIC: <span className="font-mono">{selectedCustomer.cnic}</span></p>
                        <p className="mt-0.5 text-[#6B7280]">{selectedCustomer.phone_primary ?? "No phone on file"}</p>
                        <input type="hidden" name="existingCustomerId" form="main-sale-form" value={selectedCustomer.id} />
                      </div>
                    ) : <p className="pt-2 text-xs text-[#6B7280]">Click a customer from the left, or switch to New Customer.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <label className={adminLabelClass}>Full name (required)</label>
                  <input name="customer.fullName" form="main-sale-form" required className={adminInputClass} placeholder="e.g. Muhammad Ahmed" value={newCustomer.fullName} onChange={e => setNewCustomer(prev => ({ ...prev, fullName: e.target.value }))} />
                </div>
                <div>
                  <label className={adminLabelClass}>CNIC (13 digits or 5-7-1)</label>
                  <input name="customer.cnic" form="main-sale-form" required pattern="^([0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9]{1})$" className={adminInputClass} placeholder="3520212345671 or 35202-1234567-1" value={newCustomer.cnic} onChange={e => setNewCustomer(prev => ({ ...prev, cnic: e.target.value }))} />
                </div>
                <div>
                  <label className={adminLabelClass}>Primary phone</label>
                  <input name="customer.phonePrimary" form="main-sale-form" pattern="^\+?[0-9 -]{10,20}$" className={adminInputClass} placeholder="+92 300 1234567" value={newCustomer.phonePrimary} onChange={e => setNewCustomer(prev => ({ ...prev, phonePrimary: e.target.value }))} />
                </div>
                <div>
                  <label className={adminLabelClass}>Secondary phone</label>
                  <input name="customer.phoneSecondary" form="main-sale-form" className={adminInputClass} placeholder="Optional" value={newCustomer.phoneSecondary} onChange={e => setNewCustomer(prev => ({ ...prev, phoneSecondary: e.target.value }))} />
                </div>
                <div>
                  <label className={adminLabelClass}>City / Town</label>
                  <input name="customer.city" form="main-sale-form" className={adminInputClass} placeholder="e.g. Lahore" value={newCustomer.city} onChange={e => setNewCustomer(prev => ({ ...prev, city: e.target.value }))} />
                </div>
                <div>
                  <label className={adminLabelClass}>CNIC address</label>
                  <input name="customer.address" form="main-sale-form" className={adminInputClass} placeholder="As per CNIC" value={newCustomer.address} onChange={e => setNewCustomer(prev => ({ ...prev, address: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={adminLabelClass}>Optional sales notes</label>
            <textarea value={saleNotes ?? ""} onChange={e => setSaleNotes(e.target.value)} name="notes" form="main-sale-form" className={adminInputClass + " min-h-[84px]"} placeholder="Anything the admin or another manager should know about this sale." />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Step 2 — Payments"
        description="Record EVERY payment method used. Multiple payments and multiple banks are allowed. The receipt will itemise them exactly as entered."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className={`rounded-md px-3 py-1.5 ${paidAmount > 0 ? "border border-green-200 bg-green-50 text-[#15803D]" : "border border-[#E5E7EB] bg-white text-[#6B7280]"}`}>Paid: {pkr(paidAmount)}</span>
            <span className={`rounded-md px-3 py-1.5 ${dueAmount > 0 ? "border border-amber-200 bg-amber-50 text-[#B45309]" : "border border-green-200 bg-green-50 text-[#15803D]"}`}>Due: {pkr(Math.max(0, dueAmount))}</span>
            <span className="rounded-md border border-[#C62828] bg-[#FEF2F2] px-3 py-1.5 text-[#C62828]">Total: {pkr(totalAmount)}</span>
          </div>
        }
      >
        <div className="space-y-3">
          {payments.map((p, i) => {
            const pm = paymentMethods.find(m => m.value === p.payment_method as typeof paymentMethods[number]["value"]);
            return (
              <div key={p.id} className="grid grid-cols-1 gap-4 rounded-md border border-[#E5E7EB] p-4 md:grid-cols-[160px_220px_1fr_220px_220px_auto] md:items-end">
                <div>
                  <label className={adminLabelClass}>Method</label>
                  <select value={p.payment_method ?? "cash"} onChange={e => { updatePayment(p.id, { payment_method: e.target.value, bank_id: "" }); }} className={adminInputClass} form="main-sale-form">
                    {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${adminLabelClass} inline-flex items-center gap-1`}><Building2 aria-hidden="true" className="h-3.5 w-3.5 text-[#6B7280]" />{pm?.bank_required ? "Bank (required)" : "Bank (optional)"}</label>
                  <select value={p.bank_id ?? ""} onChange={e => updatePayment(p.id, { bank_id: e.target.value })} className={adminInputClass} form="main-sale-form">
                    <option value="">-- Select --</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={adminLabelClass}>Amount (PKR)</label>
                  <input type="text" inputMode="numeric" value={p.amount ?? ""} onChange={e => { const v = e.target.value.replace(/[^0-9,]/g, ""); updatePayment(p.id, { amount: v }); }} placeholder="0" className={adminInputClass + " font-display text-lg font-bold text-[#C62828]"} form="main-sale-form" />
                </div>
                <div>
                  <label className={adminLabelClass}>Instrument # (Cheque / DD / PO #)</label>
                  <input value={p.instrument_number ?? ""} onChange={e => updatePayment(p.id, { instrument_number: e.target.value })} placeholder="Optional" className={adminInputClass} form="main-sale-form" />
                </div>
                <div>
                  <label className={adminLabelClass}>Txn / Receipt reference</label>
                  <input value={p.transaction_ref ?? ""} onChange={e => updatePayment(p.id, { transaction_ref: e.target.value })} placeholder="e.g. 123456789012" className={adminInputClass} form="main-sale-form" />
                </div>
                <div className="flex justify-end">
                  {payments.length > 1 ? (
                    <button type="button" onClick={() => removePayment(p.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#FECACA] bg-white text-[#C62828] hover:bg-[#FEF2F2]" aria-label={`Remove payment ${i + 1}`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                  ) : <span className="inline-flex h-11 w-11 items-center justify-center text-[#D1D5DB]">1</span>}
                </div>
              </div>
            );
          })}
          <button type="button" onClick={addPayment} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-dashed border-[#C62828]/50 px-4 text-sm font-semibold text-[#C62828] hover:bg-[#FEF2F2]">
            <Plus aria-hidden="true" className="h-4 w-4" />Add another payment split (e.g. second bank, partial cash)
          </button>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Step 3 — Submit for Admin approval"
        description="Once submitted, Admin must approve before: 1) stock is deducted, 2) bike status becomes SOLD, 3) receipt generation is unlocked."
      >
        <AdminForm
          action={initiateSale}
          submitLabel={canSubmit ? "Submit sale for Admin approval →" : "Please fill required fields"}
          pendingLabel="Submitting sale…"
          confirmMessage={chosen ? `Submit sale for ${chosen.motorcycle?.brand?.name} ${chosen.motorcycle?.name} (${chosen.cc}cc ${chosen.color_name ?? "no color"}) for approval?` : "Continue"}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          {/* ===== Discriminator: existing customer vs new customer ===== */}
          <input type="hidden" name="useExistingCustomer" value={createNewCustomer ? "false" : "true"} />
          {!createNewCustomer && selectedCustomer ? (
            <input type="hidden" name="customerId" value={selectedCustomer.id} />
          ) : null}
          {createNewCustomer ? (
            <>
              <input type="hidden" name="newCustomer_fullName" value={newCustomer.fullName ?? ""} />
              <input type="hidden" name="newCustomer_cnic" value={newCustomer.cnic ?? ""} />
              <input type="hidden" name="newCustomer_phonePrimary" value={newCustomer.phonePrimary ?? ""} />
              <input type="hidden" name="newCustomer_phoneSecondary" value={newCustomer.phoneSecondary ?? ""} />
              <input type="hidden" name="newCustomer_city" value={newCustomer.city ?? ""} />
              <input type="hidden" name="newCustomer_address" value={newCustomer.address ?? ""} />
            </>
          ) : null}

          {/* ===== Variant / Chasis / Qty / Price ===== */}
          <input type="hidden" name="motorcycleVariantId" value={variantId ?? ""} />
          <input type="hidden" name="chasisNumber" value={chasisNumber ?? ""} />
          <input type="hidden" name="engineNumber" value="" />
          <input type="hidden" name="quantitySold" value={String(Number.isFinite(quantity) ? quantity : 1)} />
          <input type="hidden" name="notes" value={saleNotes ?? ""} />
          <input type="hidden" name="unitPrice" value={String(chosen?.price ?? 0)} />
          <input type="hidden" name="discountAmount" value="0" />

          {/* ===== Payment splits (single-submit, no separate Record click required) ===== */}
          <input type="hidden" name="paymentsJson" value={JSON.stringify(payments.map(p => {
            const mInfo = paymentMethods.find(m => m.value === p.payment_method as typeof paymentMethods[number]["value"]);
            const finalTxnRef = p.transaction_ref && p.transaction_ref.trim() ? p.transaction_ref.trim() : (mInfo && !mInfo.bank_required ? generateInternalTxnRef() : "");
            return {
              id: p.id,
              paymentMethod: p.payment_method,
              bankId: p.bank_id || "",
              instrumentNumber: p.instrument_number || "",
              transactionReference: finalTxnRef,
              amount: Number(p.amount.replace(/[^0-9]/g, "")) || 0,
              paymentDate: new Date().toISOString(),
            };
          }))} />

          <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-[#B45309]">
            <p><strong>⚠ No stock deduction yet.</strong> Stock subtraction and receipt generation happen <strong>only after Admin approves</strong>. Until then, this is just a pending record.</p>
          </div>
          <div className="md:col-span-2 flex items-center justify-between gap-4">
            <span className="text-xs text-[#6B7280]">{payments.filter(p => Number(p.amount.replace(/[^0-9]/g, "")) > 0).length} payment(s) recorded.</span>
          </div>
        </AdminForm>
      </AdminPanel>
    </div>
  );
}
