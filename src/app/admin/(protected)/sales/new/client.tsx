"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Bike, Building2, CheckCircle2, Circle, CircleDot, CreditCard, FileText, Landmark, LockKeyhole, PencilLine, Plus, Search, Trash2, Wallet
} from "lucide-react";
import { AdminPageHeader, StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { checkChasisAvailability, initiateSale } from "@/app/admin/erp-actions/sales";

const ERROR_INPUT_RING = "ring-2 ring-[#C62828]/70 border-[#C62828] focus:ring-[#C62828]";
function joinMessages(msgs: readonly (string | null | undefined)[] | null | undefined): string {
  if (!msgs) return "";
  return msgs.filter((m) => typeof m === "string" && m.trim().length > 0).join(". ") + (msgs.some((m) => m) ? "." : "");
}

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
type StepStatus = "complete" | "active" | "pending";
type ChasisCheck = { status: "idle" | "checking" | "available" | "duplicate" | "error"; message: string; value: string };

function pkr(n: number | string): string {
  const num = typeof n === "string" ? Number(n.replace(/[^0-9]/g, "")) || 0 : n;
  return "PKR " + num.toLocaleString("en-PK");
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

function StepPanel({
  step,
  title,
  description,
  status,
  actions,
  open = true,
  summary,
  footer,
  delay = 0,
  children,
}: Readonly<{
  step: number;
  title: string;
  description: string;
  status: StepStatus;
  actions?: React.ReactNode;
  open?: boolean;
  summary?: React.ReactNode;
  footer?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}>) {
  const Icon = status === "complete" ? CheckCircle2 : status === "active" ? CircleDot : Circle;
  const tone = status === "complete"
    ? "border-green-200 bg-green-50 text-[#15803D]"
    : status === "active"
      ? "border-[#C62828]/30 bg-[#FEF2F2] text-[#C62828]"
      : "border-[#E5E7EB] bg-white text-[#6B7280]";

  return (
    <section className={`new-sale-step overflow-hidden rounded-lg border bg-white shadow-[0_12px_28px_rgb(17_17_17/0.06)] transition-all duration-300 ${status === "active" && open ? "border-[#C62828]/35 ring-4 ring-[#C62828]/5" : "border-[#E5E7EB]"}`} style={{ animationDelay: `${delay}ms` }}>
      <header className="flex flex-col justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${tone}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Step {step}</p>
            <h2 className="mt-0.5 font-display text-2xl font-bold leading-tight text-[#111111]">{title}</h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[#6B7280]">{description}</p>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {!open && summary ? <div className="border-b border-[#F3F4F6] bg-[#FAFAFA] px-5 py-4 sm:px-6">{summary}</div> : null}
      {open ? (
        <div className="animate-[saleStepIn_260ms_ease-out] p-5 sm:p-6">
          {children}
          {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#F3F4F6] pt-5">{footer}</div> : null}
        </div>
      ) : null}
    </section>
  );
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
  const [chasisCheck, setChasisCheck] = useState<ChasisCheck>({ status: "idle", message: "Enter chasis number.", value: "" });
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
  const paymentMismatch = totalAmount > 0 && paidAmount > 0 && dueAmount !== 0;
  const paymentState =
    totalAmount <= 0
      ? "Pick a bike"
      : dueAmount > 0
        ? `${pkr(dueAmount)} short`
        : dueAmount < 0
          ? `${pkr(Math.abs(dueAmount))} extra`
          : "Fully paid";

  const matchedCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter(c => `${c.full_name} ${c.cnic} ${c.phone_primary ?? ""}`.toLowerCase().includes(q)).slice(0, 20);
  }, [customerSearch, customers]);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === existingCustomerId) ?? null, [existingCustomerId, customers]);
  const chasisReady = chasisNumber.trim().length >= 3 && chasisCheck.value === chasisNumber.trim().toUpperCase() && chasisCheck.status === "available";
  const hasNewCustomerIdentity = newCustomer.fullName.trim().length >= 2 && newCustomer.cnic.replace(/\D/g, "").length === 13;
  const customerStepComplete = createNewCustomer ? hasNewCustomerIdentity : Boolean(selectedCustomer);
  const bikeStepComplete = Boolean(chosen && chasisReady && quantity > 0 && (chosen.quantity ?? 0) >= quantity);
  const saleInfoStepComplete = bikeStepComplete && customerStepComplete;
  const paymentRowsComplete = payments.every(p => {
    const needBank = paymentMethods.find(m => m.value === p.payment_method as typeof paymentMethods[number]["value"])?.bank_required;
    const amt = Number(p.amount.replace(/[^0-9]/g, "")) || 0;
    return amt > 0 && (!needBank || !!p.bank_id);
  });
  const paymentStepComplete = paymentRowsComplete && totalAmount > 0 && paidAmount === totalAmount && payments.some(p => (Number(p.amount.replace(/[^0-9]/g, "")) || 0) > 0);
  const firstIncompleteStep = !saleInfoStepComplete ? 0 : !paymentStepComplete ? 1 : 2;
  const [activeStep, setActiveStep] = useState(0);
  const visibleStep = Math.min(activeStep, firstIncompleteStep);
  const stepStates: [StepStatus, StepStatus, StepStatus] = [0, 1, 2].map((idx) => {
    const complete = idx === 0 ? saleInfoStepComplete : idx === 1 ? paymentStepComplete : false;
    if (complete && idx < firstIncompleteStep) return "complete";
    if (idx === visibleStep) return "active";
    return "pending";
  }) as [StepStatus, StepStatus, StepStatus];
  useEffect(() => {
    const value = chasisNumber.trim().toUpperCase();
    if (value.length < 3) return;
    const timer = window.setTimeout(() => {
      void checkChasisAvailability(value).then((result) => {
        setChasisCheck({ status: result.status, message: result.message, value });
      }).catch(() => {
        setChasisCheck({ status: "error", message: "Could not check chasis right now.", value });
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [chasisNumber]);


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
  function chooseVariant(nextVariantId: string) {
    if (nextVariantId === variantId) return;
    setVariantId(nextVariantId);
    setQuantity(1);
    setChasisNumber("");
    setChasisCheck({ status: "idle", message: "Enter chasis number.", value: "" });
    setFormErrors((prev) => ({
      ...prev,
      chasisNumber: ["Enter the chasis number for the newly selected bike."],
      paymentsJson: paidAmount > 0 ? ["Review payment amount against the new bike total."] : [],
    }));
  }

  const [formErrors, setFormErrors] = useState<Record<string, readonly (string | null)[]>>({});
  useEffect(() => {
    function onErrors(ev: Event) {
      const custom = ev as unknown as CustomEvent<{ errors: Record<string, readonly (string | null)[]>; action: string }>;
      setFormErrors(custom.detail.errors ?? {});
    }
    window.addEventListener("admin-form:errors", onErrors as EventListener);
    return () => { window.removeEventListener("admin-form:errors", onErrors as EventListener); };
  }, []);

  const paymentsValid = paymentRowsComplete;
  const canSubmit = saleInfoStepComplete && paymentsValid && paidAmount === totalAmount && totalAmount > 0;
  function errText(...paths: string[]): string {
    for (const p of paths) {
      const arr = formErrors[p];
      if (arr && arr.length > 0) return joinMessages(arr);
    }
    return "";
  }
  function hasErr(...paths: string[]): boolean {
    return paths.some((p) => {
      const arr = formErrors[p];
      return !!arr && arr.length > 0;
    });
  }

  function goToStep(index: number) {
    if (index > firstIncompleteStep) return;
    setActiveStep(index);
  }

  const flowSteps = [
    { label: "Bike & buyer", detail: chosen ? `${chosen.motorcycle?.brand?.name ?? ""} ${chosen.motorcycle?.name ?? ""}`.trim() : "Choose bike and buyer" },
    { label: "Payment", detail: totalAmount > 0 ? `${pkr(paidAmount)} of ${pkr(totalAmount)}` : "Waiting for sale total" },
    { label: "Approval", detail: canSubmit ? "Ready to submit" : "Final check" },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales Workflow"
        title="Record New Bike Sale"
        description="A guided bike-sale flow: bike, buyer, payment, approval."
        actions={<Link href="/admin/sales/list" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]">View all sales</Link>}
      />

      <div className="new-sale-step rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-[0_8px_20px_rgb(17_17_17/0.05)]">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {flowSteps.map((item, idx) => {
            const status = stepStates[idx];
            const active = visibleStep === idx;
            const complete = status === "complete";
            const locked = idx > firstIncompleteStep;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => goToStep(idx)}
                disabled={locked}
                className={`group relative flex min-h-[88px] items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-300 disabled:cursor-not-allowed ${complete ? "border-green-200 bg-green-50" : active ? "border-[#C62828]/35 bg-[#FEF2F2] shadow-[0_10px_24px_rgb(198_40_40/0.10)]" : locked ? "border-[#E5E7EB] bg-[#FAFAFA] opacity-70" : "border-[#E5E7EB] bg-white hover:border-[#C62828]/30 hover:bg-[#FFF7F7]"}`}
              >
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black transition-transform duration-300 ${complete ? "bg-[#15803D] text-white" : active ? "bg-[#C62828] text-white group-hover:scale-105" : "bg-white text-[#6B7280] ring-1 ring-[#E5E7EB]"}`}>
                  {complete ? <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> : locked ? <LockKeyhole aria-hidden="true" className="h-4 w-4" /> : idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[#111111]">{item.label}</span>
                  <span className="mt-1 block truncate text-xs text-[#6B7280]">{item.detail}</span>
                </span>
                {active ? <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#C62828]" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Bike</p>
          <p className="mt-2 truncate text-sm font-semibold text-[#111111]">{chosen ? `${chosen.motorcycle?.brand?.name ?? ""} ${chosen.motorcycle?.name ?? ""}`.trim() : "Not selected"}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{chosen ? `${chosen.cc}cc | ${chosen.color_name ?? "Color not set"}` : "Choose a stock item below"}</p>
        </div>
        <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Stock</p>
          <p className={`mt-2 text-sm font-semibold ${(chosen?.quantity ?? 0) > 0 ? "text-[#15803D]" : "text-[#C62828]"}`}>{chosen ? `${chosen.quantity ?? 0} available` : "Waiting"}</p>
          <p className="mt-1 text-xs text-[#6B7280]">Deducts after approval</p>
        </div>
        <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Payment</p>
          <p className={`mt-2 text-sm font-semibold ${dueAmount === 0 && totalAmount > 0 ? "text-[#15803D]" : dueAmount > 0 ? "text-[#C62828]" : "text-[#111111]"}`}>{paymentState}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{paidAmount > 0 ? `${pkr(paidAmount)} recorded` : "No payment yet"}</p>
        </div>
      </div>

      <StepPanel
        step={1}
        title="Bike & Customer"
        description="Select the stock item, chasis number, and buyer."
        status={stepStates[0]}
        open={visibleStep === 0}
        delay={80}
        actions={chosen ? <StatusBadge value={(chosen.quantity ?? 0) > 0 ? "in_stock" : "out_of_stock"} label={(chosen.quantity ?? 0) > 0 ? `In stock (${chosen.quantity})` : "Out of stock"} /> : undefined}
        summary={
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <p><span className="font-bold text-[#111111]">Bike:</span> {chosen ? `${chosen.motorcycle?.brand?.name ?? ""} ${chosen.motorcycle?.name ?? ""} ${chosen.cc}cc ${chosen.color_name ?? ""}`.trim() : "Not selected"}</p>
            <p><span className="font-bold text-[#111111]">Chasis:</span> {chasisNumber || "Not entered"}</p>
            <p><span className="font-bold text-[#111111]">Buyer:</span> {selectedCustomer?.full_name ?? (createNewCustomer ? newCustomer.fullName || "New customer" : "Not selected")}</p>
          </div>
        }
        footer={
          <button type="button" disabled={!saleInfoStepComplete} onClick={() => setActiveStep(1)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#A91F1F] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
            Continue to payment <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        }
      >
        <div className="space-y-6">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className={adminLabelClass}>Search bike</label>
                <div className="relative mt-2">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input value={bikeFilter ?? ""} onChange={e => setBikeFilter(e.target.value)} className={`${adminInputClass} bg-white pl-10`} placeholder="Search bike model, brand, color, or CC" />
                </div>
              </div>
              <div className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 lg:min-w-[320px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Selected bike</p>
                {chosen ? (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#111111]">{chosen.motorcycle?.brand?.name} {chosen.motorcycle?.name}</p>
                      <p className="text-xs text-[#6B7280]">{chosen.cc}cc | {chosen.color_name ?? "Color not set"} | {chosen.quantity ?? 0} available</p>
                    </div>
                    <span className="shrink-0 font-display text-base font-bold text-[#C62828]">{pkr(chosen.price ?? 0)}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-[#6B7280]">No bike selected yet.</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[#6B7280]">
              <span>{filteredVariants.length} matching variant(s)</span>
              <span>List stays scrollable as stock grows</span>
            </div>
            <div className="mt-2 grid max-h-[340px] grid-cols-1 gap-2 overflow-y-auto rounded-md border border-[#E5E7EB] bg-white p-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredVariants.length === 0 ? (
                <p className="col-span-full rounded-md border border-dashed border-[#D1D5DB] p-4 text-center text-sm text-[#6B7280]">No variants match. Add variants to motorcycle inventory first.</p>
              ) : filteredVariants.map(v => {
                const selected = v.id === variantId;
                const available = (v.quantity ?? 0) > 0;
                return (
                  <button key={v.id} type="button" disabled={!available} onClick={() => chooseVariant(v.id)} className={`flex min-h-[76px] items-start gap-3 rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed ${selected ? "border-[#C62828] bg-[#FEF2F2] ring-2 ring-[#C62828]/15" : available ? "border-[#E5E7EB] bg-white hover:border-[#C62828]/50 hover:bg-[#FFF7F7]" : "border-[#E5E7EB] bg-[#FAFAFA]"} ${!available ? "opacity-60" : ""}`}>
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${selected ? "bg-white text-[#C62828]" : "bg-[#F7F7F8] text-[#374151]"}`}>
                      <Bike aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#111111]">{v.motorcycle?.brand?.name} {v.motorcycle?.name}</p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">{v.cc}cc | {v.color_name ?? "Color not set"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-[#C62828]">{pkr(v.price ?? 0)}</span>
                        {available ? <span className="text-[10px] font-bold uppercase tracking-wider text-[#15803D]">{v.quantity} available</span> : <span className="text-[10px] font-bold uppercase tracking-wider text-[#C62828]">Sold out</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label htmlFor="newSale-chasisNumber" className={adminLabelClass}>Chasis number <span className="text-[#C62828]">*</span></label>
              <input id="newSale-chasisNumber" data-error-path="chasisNumber" name="chasisNumber" value={chasisNumber ?? ""} onChange={e => { const next = e.target.value.toUpperCase(); const trimmed = next.trim(); setChasisNumber(next); setChasisCheck(trimmed.length < 3 ? { status: "idle", message: "Enter chasis number.", value: trimmed } : { status: "checking", message: "Checking chasis...", value: trimmed }); setFormErrors((prev) => prev.chasisNumber ? { ...prev, chasisNumber: [] } : prev); }} required className={`${adminInputClass} ${hasErr("chasisNumber", "chasis_number", "motorcycleVariantId.chasisNumber") || chasisCheck.status === "duplicate" ? ERROR_INPUT_RING : chasisCheck.status === "available" ? "border-green-300 ring-2 ring-green-500/20" : ""}`} placeholder="e.g. MP125GP-2025-894321" />
              {hasErr("chasisNumber", "chasis_number") ? <div className="mt-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#C62828]">{errText("chasisNumber", "chasis_number")}</div> : (
                <div className={`mt-2 rounded-md border px-3 py-2 text-xs font-semibold ${chasisCheck.status === "available" ? "border-green-200 bg-green-50 text-[#15803D]" : chasisCheck.status === "duplicate" ? "border-[#FECACA] bg-[#FEF2F2] text-[#C62828]" : chasisCheck.status === "checking" ? "border-amber-200 bg-amber-50 text-[#B45309]" : "border-[#E5E7EB] bg-[#FAFAFA] text-[#6B7280]"}`}>{chasisCheck.message}</div>
              )}
            </div>
            <div>
              <label htmlFor="newSale-quantitySold" className={adminLabelClass}>Quantity</label>
              <input id="newSale-quantitySold" data-error-path="quantitySold" name="quantitySold" form="main-sale-form" type="number" min={1} max={chosen?.quantity ?? 99} value={Number.isFinite(quantity) ? quantity : 1} onChange={e => setQuantity(Math.min(chosen?.quantity ?? 1, Math.max(1, Number(e.target.value) || 1)))} className={`${adminInputClass} ${hasErr("quantitySold") ? ERROR_INPUT_RING : ""}`} />
              {hasErr("quantitySold") ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText("quantitySold")}</p> : chosen && (chosen.quantity ?? 0) < quantity ? <p className="mt-1 text-xs font-semibold text-[#C62828]">Only {chosen.quantity ?? 0} unit(s) available.</p> : null}
            </div>
            <div>
              <label className={adminLabelClass}>Sale total (auto)</label>
              <div className={`${adminInputClass} flex items-center justify-between font-display text-xl font-bold text-[#C62828]`}>{pkr(totalAmount)}<span className="text-xs font-normal text-[#6B7280]">{chosen ? `${chosen.price?.toLocaleString("en-PK")} x ${quantity}` : "Pick a bike"}</span></div>
              {hasErr("motorcycleVariantId") ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText("motorcycleVariantId")}</p> : null}
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
                  <input value={customerSearch ?? ""} onChange={e => setCustomerSearch(e.target.value)} className={adminInputClass} placeholder="By CNIC, phone, or name..." />
                  <div className="mt-2 max-h-60 overflow-auto rounded-md border border-[#E5E7EB]">
                    {matchedCustomers.length === 0 ? (
                      <p className="p-3 text-xs text-[#6B7280]">No match. Switch to New customer to register them.</p>
                    ) : matchedCustomers.map(c => (
                      <button key={c.id} type="button" onClick={() => { setExistingCustomerId(c.id); }} className={`flex w-full items-start gap-3 border-b border-[#F3F4F6] px-3 py-2 text-left transition-colors ${existingCustomerId === c.id ? "bg-[#FEF2F2]" : "hover:bg-[#FAFAFA]"}`}>
                        <div>
                          <p className="text-sm font-semibold">{c.full_name}</p>
                          <p className="text-xs text-[#6B7280]">CNIC: <span className="font-mono">{c.cnic}</span> | {c.phone_primary ?? "No phone"}</p>
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
                    ) : <p className="pt-2 text-xs text-[#6B7280]">Click a customer from the left, or switch to New customer.</p>}
                  </div>
                  {hasErr("customerId") ? <div className="mt-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#C62828]">{errText("customerId")}</div> : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <label htmlFor="newSale-newCustomer_fullName" className={adminLabelClass}>Full name <span className="text-[#C62828]">*</span></label>
                  <input id="newSale-newCustomer_fullName" data-error-path="newCustomer_fullName" name="customer.fullName" form="main-sale-form" required className={`${adminInputClass} ${hasErr("newCustomer_fullName") ? ERROR_INPUT_RING : ""}`} placeholder="e.g. Muhammad Ahmed" value={newCustomer.fullName} onChange={e => setNewCustomer(prev => ({ ...prev, fullName: e.target.value }))} />
                  {hasErr("newCustomer_fullName") ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText("newCustomer_fullName")}</p> : null}
                </div>
                <div>
                  <label htmlFor="newSale-newCustomer_cnic" className={adminLabelClass}>CNIC <span className="text-[#C62828]">*</span></label>
                  <input id="newSale-newCustomer_cnic" data-error-path="newCustomer_cnic" name="customer.cnic" form="main-sale-form" required inputMode="numeric" maxLength={15} pattern="^([0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9]{1})$" className={`${adminInputClass} font-mono ${hasErr("newCustomer_cnic") ? ERROR_INPUT_RING : ""}`} placeholder="35202-1234567-1" value={newCustomer.cnic} onChange={e => setNewCustomer(prev => ({ ...prev, cnic: formatCnic(e.target.value) }))} />
                  {hasErr("newCustomer_cnic") ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText("newCustomer_cnic")}</p> : null}
                </div>
                <div>
                  <label htmlFor="newSale-newCustomer_phonePrimary" className={adminLabelClass}>Primary phone</label>
                  <input id="newSale-newCustomer_phonePrimary" data-error-path="newCustomer_phonePrimary" name="customer.phonePrimary" form="main-sale-form" inputMode="tel" maxLength={14} pattern="^\+?[0-9 -]{10,20}$" className={`${adminInputClass} ${hasErr("newCustomer_phonePrimary") ? ERROR_INPUT_RING : ""}`} placeholder="+92 300 1234567" value={newCustomer.phonePrimary} onChange={e => setNewCustomer(prev => ({ ...prev, phonePrimary: formatPakPhone(e.target.value) }))} />
                  {hasErr("newCustomer_phonePrimary") ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText("newCustomer_phonePrimary")}</p> : null}
                </div>
                <div>
                  <label htmlFor="newSale-newCustomer_phoneSecondary" className={adminLabelClass}>Secondary phone</label>
                  <input id="newSale-newCustomer_phoneSecondary" data-error-path="newCustomer_phoneSecondary" name="customer.phoneSecondary" form="main-sale-form" inputMode="tel" maxLength={14} className={`${adminInputClass} ${hasErr("newCustomer_phoneSecondary") ? ERROR_INPUT_RING : ""}`} placeholder="Optional" value={newCustomer.phoneSecondary} onChange={e => setNewCustomer(prev => ({ ...prev, phoneSecondary: formatPakPhone(e.target.value) }))} />
                </div>
                <div>
                  <label htmlFor="newSale-newCustomer_city" className={adminLabelClass}>City / Town</label>
                  <input id="newSale-newCustomer_city" data-error-path="newCustomer_city" name="customer.city" form="main-sale-form" className={`${adminInputClass} ${hasErr("newCustomer_city") ? ERROR_INPUT_RING : ""}`} placeholder="e.g. Lahore" value={newCustomer.city} onChange={e => setNewCustomer(prev => ({ ...prev, city: e.target.value }))} />
                  {hasErr("newCustomer_city") ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText("newCustomer_city")}</p> : null}
                </div>
                <div>
                  <label htmlFor="newSale-newCustomer_address" className={adminLabelClass}>CNIC address</label>
                  <input id="newSale-newCustomer_address" data-error-path="newCustomer_address" name="customer.address" form="main-sale-form" className={`${adminInputClass} ${hasErr("newCustomer_address") ? ERROR_INPUT_RING : ""}`} placeholder="As per CNIC" value={newCustomer.address} onChange={e => setNewCustomer(prev => ({ ...prev, address: e.target.value }))} />
                  {hasErr("newCustomer_address") ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText("newCustomer_address")}</p> : null}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={adminLabelClass}>Optional sales notes</label>
            <textarea value={saleNotes ?? ""} onChange={e => setSaleNotes(e.target.value)} name="notes" form="main-sale-form" className={adminInputClass + " min-h-[84px]"} placeholder="Optional internal note." />
          </div>
        </div>
      </StepPanel>

      <StepPanel
        step={2}
        title="Payments"
        description="Match the paid amount to the sale total."
        status={stepStates[1]}
        open={visibleStep === 1}
        summary={
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <p><span className="font-bold text-[#111111]">Total:</span> {pkr(totalAmount)}</p>
            <p><span className="font-bold text-[#111111]">Paid:</span> {pkr(paidAmount)}</p>
            <p><span className="font-bold text-[#111111]">Status:</span> {paymentState}</p>
          </div>
        }
        footer={
          <>
            <button type="button" onClick={() => setActiveStep(0)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-5 text-sm font-semibold text-[#374151] transition-colors hover:bg-[#F7F7F8]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back</button>
            <button type="button" disabled={!paymentStepComplete} onClick={() => setActiveStep(2)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#A91F1F] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">Review sale <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
          </>
        }
        delay={160}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className={`rounded-md px-3 py-1.5 ${paidAmount > 0 ? "border border-green-200 bg-green-50 text-[#15803D]" : "border border-[#E5E7EB] bg-white text-[#6B7280]"}`}>Paid: {pkr(paidAmount)}</span>
            <span className={`rounded-md px-3 py-1.5 ${dueAmount !== 0 && totalAmount > 0 ? "border border-amber-200 bg-amber-50 text-[#B45309]" : "border border-green-200 bg-green-50 text-[#15803D]"}`}>{dueAmount < 0 ? "Extra" : "Due"}: {pkr(Math.abs(dueAmount))}</span>
            <span className="rounded-md border border-[#C62828] bg-[#FEF2F2] px-3 py-1.5 text-[#C62828]">Total: {pkr(totalAmount)}</span>
          </div>
        }
      >
        <div className="space-y-3">
          {payments.map((p, i) => {
            const pm = paymentMethods.find(m => m.value === p.payment_method as typeof paymentMethods[number]["value"]);
            const methodPath = `payments.${i}.paymentMethod`;
            const bankPath = `payments.${i}.bankId`;
            const amountPath = `payments.${i}.amount`;
            const anyError = hasErr(methodPath, bankPath, amountPath, "payments", "paymentsJson");
            return (
              <div key={p.id} className={`grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-[160px_220px_1fr_220px_220px_auto] md:items-end ${anyError ? "border-[#C62828]/60 bg-[#FEF2F2]/40" : "border-[#E5E7EB]"}`}>
                <div>
                  <label htmlFor={`pay-${p.id}-method`} className={adminLabelClass}>Method</label>
                  <select id={`pay-${p.id}-method`} data-error-path={methodPath} value={p.payment_method ?? "cash"} onChange={e => { updatePayment(p.id, { payment_method: e.target.value, bank_id: "" }); }} className={`${adminInputClass} ${hasErr(methodPath, "paymentsJson") ? ERROR_INPUT_RING : ""}`} form="main-sale-form">
                    {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {hasErr(methodPath) ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText(methodPath)}</p> : null}
                </div>
                <div>
                  <label htmlFor={`pay-${p.id}-bank`} className={`${adminLabelClass} inline-flex items-center gap-1`}><Building2 aria-hidden="true" className="h-3.5 w-3.5 text-[#6B7280]" />{pm?.bank_required ? "Bank (required)" : "Bank (optional)"}</label>
                  <select id={`pay-${p.id}-bank`} data-error-path={bankPath} value={p.bank_id ?? ""} onChange={e => updatePayment(p.id, { bank_id: e.target.value })} className={`${adminInputClass} ${hasErr(bankPath) ? ERROR_INPUT_RING : ""}`} form="main-sale-form">
                    <option value="">-- Select --</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {hasErr(bankPath) ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText(bankPath)}</p> : null}
                </div>
                <div>
                  <label htmlFor={`pay-${p.id}-amount`} className={adminLabelClass}>Amount (PKR)</label>
                  <input id={`pay-${p.id}-amount`} data-error-path={amountPath} type="text" inputMode="numeric" value={p.amount ?? ""} onChange={e => { const v = e.target.value.replace(/[^0-9,]/g, ""); updatePayment(p.id, { amount: v }); }} placeholder="0" className={`${adminInputClass} font-display text-lg font-bold text-[#C62828] ${hasErr(amountPath, "paymentsJson") ? ERROR_INPUT_RING : ""}`} form="main-sale-form" />
                  {hasErr(amountPath) ? <p className="mt-1 text-xs font-semibold text-[#C62828]">{errText(amountPath)}</p> : null}
                </div>
                <div>
                  <label htmlFor={`pay-${p.id}-instrument`} className={adminLabelClass}>Instrument # (Cheque / DD / PO #)</label>
                  <input id={`pay-${p.id}-instrument`} value={p.instrument_number ?? ""} onChange={e => updatePayment(p.id, { instrument_number: e.target.value })} placeholder="Optional" className={adminInputClass} form="main-sale-form" />
                </div>
                <div>
                  <label htmlFor={`pay-${p.id}-txn`} className={adminLabelClass}>Txn / Receipt reference</label>
                  <input id={`pay-${p.id}-txn`} value={p.transaction_ref ?? ""} onChange={e => updatePayment(p.id, { transaction_ref: e.target.value })} placeholder="e.g. 123456789012" className={adminInputClass} form="main-sale-form" />
                </div>
                <div className="flex justify-end">
                  {payments.length > 1 ? (
                    <button type="button" onClick={() => removePayment(p.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#FECACA] bg-white text-[#C62828] hover:bg-[#FEF2F2]" aria-label={`Remove payment ${i + 1}`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                  ) : <span className="inline-flex h-11 w-11 items-center justify-center text-[#D1D5DB]">1</span>}
                </div>
              </div>
            );
          })}
          {hasErr("payments", "paymentsJson") ? <div data-error-path="paymentsJson" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#C62828]">{errText("payments", "paymentsJson")}</div> : null}
          {paymentMismatch ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-[#B45309]">
              {dueAmount > 0
                ? `Payment is short by ${pkr(dueAmount)} for the selected bike.`
                : `Payment is over by ${pkr(Math.abs(dueAmount))} for the selected bike.`}
            </div>
          ) : null}
          <button type="button" onClick={addPayment} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-dashed border-[#C62828]/50 px-4 text-sm font-semibold text-[#C62828] hover:bg-[#FEF2F2]">
            <Plus aria-hidden="true" className="h-4 w-4" />Add payment split
          </button>
        </div>
      </StepPanel>

      <StepPanel
        step={3}
        title="Submit for Admin approval"
        description="Send the checked sale to Admin."
        status={stepStates[2]}
        open={visibleStep === 2}
        summary={<p className="text-sm text-[#6B7280]">Complete the previous checks to unlock final submission.</p>}
        delay={240}
      >
        <AdminForm
          action={initiateSale}
          submitLabel={canSubmit ? "Submit sale for Admin approval" : "Please fill required fields"}
          pendingLabel="Submitting sale..."
          confirmMessage={chosen ? `Submit sale for ${chosen.motorcycle?.brand?.name} ${chosen.motorcycle?.name} (${chosen.cc}cc ${chosen.color_name ?? "no color"}) for approval?` : "Continue"}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
          formAttributes={{ id: "main-sale-form", onSubmit: (event) => { if (!canSubmit) event.preventDefault(); } }}
          showErrorSummary={false}
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
            <p><strong>No stock deduction yet.</strong> Stock subtraction and receipt generation happen <strong>only after Admin approves</strong>. Until then, this is just a pending record.</p>
          </div>
          <div className="md:col-span-2 flex items-center justify-between gap-4">
            <span className="text-xs text-[#6B7280]">{payments.filter(p => Number(p.amount.replace(/[^0-9]/g, "")) > 0).length} payment(s) recorded.</span>
          </div>
        </AdminForm>
      </StepPanel>
    </div>
  );
}

