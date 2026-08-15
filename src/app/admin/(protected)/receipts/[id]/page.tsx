import Image from "next/image";
import { notFound } from "next/navigation";
import { getReceipt } from "@/lib/erp/queries";
import { ReceiptPrintActionBar } from "./print-bar.client";
import { Phone, Globe2, MapPin } from "lucide-react";

export const metadata = { title: "Receipt" };

function pkr(n: number): string {
  return "PKR " + (n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0 });
}

const methodLabel: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer / Online",
  cheque: "Cheque",
  demand_draft: "Demand Draft (DD)",
  pay_order: "Pay Order (PO)",
  card: "Card / POS",
  other: "Other",
};

const SHOWROOM = {
  address: "Shop#61-A, Main Peco Road Township, Lahore, Pakistan",
  phone: "+92 322 2033399",
  website: "owmotorsport.com",
};

function numberToPKRWords(raw: number): string {
  const n = Math.floor(Number(raw) || 0);
  if (n === 0) return "Zero Rupees Only";
  if (n < 0) return `(Negative) ${numberToPKRWords(Math.abs(n))}`;
  const below20 = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function belowHundred(v: number): string {
    if (v < 20) return below20[v];
    const t = Math.floor(v / 10);
    const u = v % 10;
    return tens[t] + (u ? "-" + below20[u] : "");
  }
  function belowThousand(v: number): string {
    const h = Math.floor(v / 100);
    const rem = v % 100;
    const parts: string[] = [];
    if (h) parts.push(`${below20[h]} Hundred`);
    if (rem) parts.push(belowHundred(rem));
    return parts.join(" and ");
  }
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const out: string[] = [];
  if (crore) out.push(`${belowThousand(crore)} Crore`);
  if (lakh) out.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) out.push(`${belowThousand(thousand)} Thousand`);
  if (rest) out.push(belowThousand(rest));
  let joined = out.filter(Boolean).join(", ");
  joined = joined.replace(/^,/, "").trim();
  if (!joined) return "Zero Rupees Only";
  return `${joined} Rupees Only`;
}

export default async function ReceiptPrintPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const receipt = await getReceipt(params.id);
  if (!receipt?.sale) notFound();
  const s = receipt.sale as unknown as {
    id: string;
    receipt_number: string;
    total_amount: number;
    requested_at: string;
    sale_status: string;
    brand_name_snapshot: string;
    motorcycle_name_snapshot: string;
    cc_snapshot: number;
    color_name_snapshot?: string | null;
    chasis_number: string;
    quantity: number;
    notes?: string | null;
    sale_payments?: Array<{
      id: string; amount: number; payment_method: string;
      bank?: { id: string; name: string } | null;
      instrument_number?: string | null;
      transaction_ref?: string | null;
      created_at?: string | null;
    }> | null;
    customer?: {
      full_name: string; cnic: string; phone_primary?: string | null;
      phone_secondary?: string | null; address?: string | null; city?: string | null;
    } | null;
  };
  const paymentsJoin = s as unknown as { payments?: Array<{id:string;amount?:unknown;payment_method?:unknown;bank?:{id:string;name:string}|null;instrument_number?:string|null;transaction_ref?:string|null;bank_name_snapshot?:string|null;created_at?:string|null}> | null; sale_payments?: Array<{id:string;amount?:unknown;payment_method?:unknown;bank?:{id:string;name:string}|null;instrument_number?:string|null;transaction_ref?:string|null;bank_name_snapshot?:string|null;created_at?:string|null}> | null };
  const payments = (Array.isArray(paymentsJoin.payments) ? paymentsJoin.payments : Array.isArray(paymentsJoin.sale_payments) ? paymentsJoin.sale_payments : []) ?? [];
  const qty = Number((s as unknown as { quantity_sold?: number }).quantity_sold ?? s.quantity ?? 1);
  const totalPaid = payments.reduce((t, p) => t + (Number(p.amount) ?? 0), 0);
  const due = Math.max(0, Number(s.total_amount ?? 0) - totalPaid);
  const receiptId = String((receipt as unknown as { id?: unknown }).id ?? "");
  const displayReceiptNumber = (
    (receipt.receipt_number && String(receipt.receipt_number).trim().length > 0)
      ? receipt.receipt_number
      : (s.receipt_number && String(s.receipt_number).trim().length > 0)
        ? s.receipt_number
        : `OWM-RCPT-${receiptId.slice(0, 8).toUpperCase()}`
  );
  const saleRefNumber = s.receipt_number || displayReceiptNumber;
  const dateIso = receipt.generated_at ?? s.requested_at;
  const receiptDate = new Date(dateIso).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  const vehicleLabel = [s.brand_name_snapshot, s.motorcycle_name_snapshot, s.cc_snapshot ? `${s.cc_snapshot}cc` : null].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-6 print:px-0">
        <ReceiptPrintActionBar receiptNumber={displayReceiptNumber} />

        <section data-receipt-root className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none" style={{ fontFamily: "Rajdhani, Inter, system-ui, sans-serif" }}>
          <header className="border-b-4 border-[#C62828] bg-white px-7 py-5 print:px-5 print:py-4">
            <div className="flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-2 print:h-14 print:w-20">
                  <Image src="/images/ow-motors-logo.png" alt="OW Motors" width={1536} height={1024} className="h-full w-full object-contain" priority />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-3xl font-black leading-none tracking-normal text-[#111111] print:text-2xl">OW MOTORS</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C62828]">Multi-brand motorcycle showroom</p>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] leading-4 text-[#374151] print:text-[10px]">
                    <span className="inline-flex items-start gap-1.5"><MapPin aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C62828]" />{SHOWROOM.address}</span>
                    <span className="inline-flex items-center gap-1.5"><Phone aria-hidden className="h-3.5 w-3.5 text-[#C62828]" />{SHOWROOM.phone}</span>
                    <span className="inline-flex items-center gap-1.5"><Globe2 aria-hidden className="h-3.5 w-3.5 text-[#C62828]" />{SHOWROOM.website}</span>
                  </div>
                </div>
              </div>
              <div className="w-[270px] shrink-0 text-right print:w-[240px]">
                <p className="font-display text-4xl font-black leading-none tracking-normal text-[#C62828] print:text-3xl">RECEIPT</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Sale invoice | Motor vehicle</p>
                <dl className="mt-3 overflow-hidden rounded-md border border-[#E5E7EB] text-[11px]">
                  <div className="bg-[#111111] px-3 py-2 text-left font-mono text-[10px] font-bold text-white">{displayReceiptNumber}</div>
                  <div className="grid grid-cols-[82px_1fr] gap-2 border-t border-[#E5E7EB] px-3 py-1.5"><dt className="text-left text-[#6B7280]">Sale Ref.</dt><dd className="truncate font-mono font-semibold text-[#111111]">{saleRefNumber}</dd></div>
                  <div className="grid grid-cols-[82px_1fr] gap-2 border-t border-[#E5E7EB] px-3 py-1.5"><dt className="text-left text-[#6B7280]">Date</dt><dd className="font-semibold">{receiptDate}</dd></div>
                  <div className="grid grid-cols-[82px_1fr] gap-2 border-t border-[#E5E7EB] px-3 py-1.5"><dt className="text-left text-[#6B7280]">Place</dt><dd className="font-semibold">Township, Lahore</dd></div>
                </dl>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-200 pt-3 text-[11px] print:mt-3 print:pt-2">
              <div>
                <p className="font-bold uppercase tracking-[0.18em] text-[#6B7280]">Vehicle</p>
                <p className="mt-0.5 font-display text-lg font-bold text-[#111111] print:text-base">{vehicleLabel}</p>
              </div>
              <div className="text-right">
                <p className="font-bold uppercase tracking-[0.18em] text-[#6B7280]">Amount received</p>
                <p className="mt-0.5 font-display text-xl font-black text-[#C62828] print:text-lg">{pkr(totalPaid)}</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 px-7 py-5 md:grid-cols-2 print:gap-3 print:px-5 print:py-3">
            <section>
              <h2 className="border-b-2 border-[#C62828] pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C62828]">Customer Information</h2>
              <dl className="mt-2 divide-y divide-[#E5E7EB] rounded-md border border-[#E5E7EB] bg-white text-[12px]">
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Full name</dt><dd className="text-right font-bold text-[#111111]">{s.customer?.full_name ?? "-"}</dd></div>
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">CNIC No.</dt><dd className="text-right font-mono font-semibold">{s.customer?.cnic ?? "-"}</dd></div>
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Phone</dt><dd className="text-right font-mono font-semibold">{s.customer?.phone_primary ?? "-"}{s.customer?.phone_secondary ? <> | {s.customer.phone_secondary}</> : null}</dd></div>
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">City</dt><dd className="text-right font-semibold">{s.customer?.city ?? "-"}</dd></div>
                <div className="px-3 py-2"><dt className="text-[#6B7280]">Address</dt><dd className="mt-0.5 font-semibold leading-4 text-[#111111]">{s.customer?.address ?? "-"}</dd></div>
              </dl>
            </section>

            <section>
              <h2 className="border-b-2 border-[#C62828] pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C62828]">Vehicle Information</h2>
              <dl className="mt-2 divide-y divide-[#E5E7EB] rounded-md border border-[#E5E7EB] bg-white text-[12px]">
                <div className="grid grid-cols-[96px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Brand</dt><dd className="text-right font-display text-base font-bold text-[#111111]">{s.brand_name_snapshot}</dd></div>
                <div className="grid grid-cols-[96px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Model</dt><dd className="text-right font-display text-base font-bold text-[#111111]">{s.motorcycle_name_snapshot}</dd></div>
                <div className="grid grid-cols-[96px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Displacement</dt><dd className="text-right font-semibold">{s.cc_snapshot} cc</dd></div>
                <div className="grid grid-cols-[96px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Color</dt><dd className="text-right font-semibold">{s.color_name_snapshot ?? "-"}</dd></div>
                <div className="grid grid-cols-[96px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Chasis No.</dt><dd className="text-right font-mono font-bold text-[#C62828]">{s.chasis_number}</dd></div>
                <div className="grid grid-cols-[96px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Quantity</dt><dd className="text-right font-display text-xl font-black text-[#111111]">x {qty}</dd></div>
              </dl>
            </section>
          </div>

          <div className="px-7 pb-5 print:px-5 print:pb-3">
            <h2 className="border-b-2 border-[#C62828] pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C62828]">Payment Breakdown</h2>
            <p className="mt-0.5 text-[11px] text-[#6B7280]">Record of every payment method and bank used for this sale.</p>
            <div className="mt-2 overflow-hidden rounded-md border border-[#E5E7EB]">
              <table className="w-full border-collapse text-[12px]">
                <thead className="bg-[#C62828] text-white">
                  <tr className="text-[10px] font-bold uppercase tracking-[0.12em]">
                    <th className="w-8 px-2.5 py-2 text-left">#</th>
                    <th className="px-2.5 py-2 text-left">Payment Method</th>
                    <th className="px-2.5 py-2 text-left">Bank</th>
                    <th className="px-2.5 py-2 text-left">Instrument #</th>
                    <th className="px-2.5 py-2 text-left">Txn / Ref</th>
                    <th className="px-2.5 py-2 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {payments.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-5 text-center text-[#6B7280]">No payments recorded yet.</td></tr>
                  ) : payments.map((p, i) => {
                    const methodKey = String(p.payment_method ?? "cash").toLowerCase();
                    const amountNum = Number(p.amount) || 0;
                    const bankName = String(p.bank_name_snapshot ?? ((typeof p.bank === "object" && p.bank !== null) ? (p.bank as { name?: unknown }).name ?? null : null) ?? "");
                    const paymentIdShort = String(p.id ?? `p${i}`).slice(0, 8).toUpperCase();
                    const pDate = p.created_at ? new Date(p.created_at) : new Date(dateIso);
                    const dateTag = `${pDate.getFullYear()}${String(pDate.getMonth() + 1).padStart(2, "0")}${String(pDate.getDate()).padStart(2, "0")}`;
                    let instrument = typeof p.instrument_number === "string" && p.instrument_number.trim().length > 0 ? p.instrument_number.trim() : "";
                    let txnRef = typeof p.transaction_ref === "string" && p.transaction_ref.trim().length > 0 ? p.transaction_ref.trim() : "";
                    if (!instrument) {
                      if (methodKey === "cash") instrument = `CASH-${dateTag}`;
                      else if (methodKey === "card") instrument = `POS-${paymentIdShort}`;
                      else if (methodKey === "bank_transfer") instrument = `TRF-${paymentIdShort}`;
                      else if (methodKey === "cheque") instrument = `CHQ-${dateTag}`;
                      else instrument = `${methodLabel[methodKey] ?? methodKey}-${dateTag}`.toUpperCase();
                    }
                    if (!txnRef) {
                      if (methodKey === "cash") txnRef = `CASH-${paymentIdShort}`;
                      else if (methodKey === "card") txnRef = `POS-${dateTag}-${paymentIdShort}`;
                      else if (methodKey === "bank_transfer") txnRef = `TRF-${dateTag}-${paymentIdShort}`;
                      else if (methodKey === "cheque") txnRef = `CHQ-${paymentIdShort}`;
                      else txnRef = `${methodKey.toUpperCase()}-${paymentIdShort}`;
                    }
                    return (
                      <tr key={String(p.id ?? i)} className="hover:bg-[#FAFAFA]">
                        <td className="px-2.5 py-1.5 text-[#6B7280]">{i + 1}</td>
                        <td className="px-2.5 py-1.5 font-semibold">{methodLabel[methodKey] ?? methodKey.replaceAll("_", " ")}</td>
                        <td className="px-2.5 py-1.5">{bankName ? bankName : <span className="text-[#9CA3AF]">-</span>}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[11px]">{instrument}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[11px]">{txnRef}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono font-bold">{amountNum.toLocaleString("en-PK")}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#FAFAFA] text-[12px]">
                  <tr className="border-t-2 border-[#C62828]/40">
                    <td colSpan={5} className="px-2.5 py-1.5 text-right font-semibold text-[#6B7280]">Subtotal (Vehicle)</td>
                    <td className="px-2.5 py-1.5 text-right font-mono font-semibold">{(Number(s.total_amount) || 0).toLocaleString("en-PK")}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2.5 py-1.5 text-right font-semibold text-[#15803D]">Total Paid</td>
                    <td className="px-2.5 py-1.5 text-right font-mono font-bold text-[#15803D]">{totalPaid.toLocaleString("en-PK")}</td>
                  </tr>
                  <tr className={due > 0 ? "text-[#B45309]" : "text-[#15803D]"}>
                    <td colSpan={5} className="px-2.5 py-1.5 text-right font-bold uppercase tracking-wider">{due > 0 ? "Balance Due" : "Fully Paid"}</td>
                    <td className="px-2.5 py-1.5 text-right font-display text-lg font-black">{due.toLocaleString("en-PK")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-3 text-center font-display text-2xl font-black tracking-normal text-[#C62828] print:mt-2 print:text-xl">
              Total Received: {pkr(totalPaid)}
            </p>
            <p className="text-center text-[11px] text-[#6B7280]">Rupees in words: <span className="font-semibold text-[#111111]">{numberToPKRWords(totalPaid)}</span></p>
          </div>

          {s.notes ? (
            <div className="mx-7 mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-[#92400E] print:mx-5 print:mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Sale notes</p>
              <p className="mt-0.5 leading-4">{s.notes}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-8 border-t border-gray-200 bg-[#FAFAFA] px-7 py-5 print:gap-6 print:px-5 print:py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">For OW Motors</p>
              <p className="mt-10 border-b border-dashed border-[#9CA3AF] print:mt-7" />
              <p className="mt-2 text-[12px] font-bold text-[#111111]">Manager / Authorized Signatory</p>
              <p className="text-[10px] text-[#6B7280]">Name, signature and stamp</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Customer Acknowledgment</p>
              <p className="mt-2 text-[10px] leading-4 text-[#374151]">I confirm receiving the above vehicle in satisfactory condition with documents and accessories. Payment details are accepted as stated.</p>
              <p className="mt-4 border-b border-dashed border-[#9CA3AF] print:mt-3" />
              <p className="mt-2 text-[12px] font-bold text-[#111111]">Customer Signature & Name</p>
              <p className="text-[10px] text-[#6B7280]">Date: ______________________</p>
            </div>
          </div>

          <footer className="border-t-2 border-[#C62828] bg-white px-7 py-3 text-center text-[11px] text-[#6B7280] print:px-5 print:py-2">
            <p className="font-semibold text-[#111111]">Thank you for choosing OW MOTORS - Ride Safe, Ride Happy!</p>
            <p className="mt-0.5 text-[10px]">This is a computer-generated receipt. No signature required for validity. Subject to showroom terms & conditions. Vehicle subject to manufacturer warranty. All disputes subject to Lahore courts.</p>
          </footer>
        </section>
      </div>
    </div>
  );
}
