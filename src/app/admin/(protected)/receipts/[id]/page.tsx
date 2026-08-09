import Image from "next/image";
import { notFound } from "next/navigation";
import { getReceipt } from "@/lib/erp/queries";
import { ReceiptPrintActionBar } from "./print-bar.client";
import { Building2, Phone, Globe2, MapPin } from "lucide-react";

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
    }> | null;
    customer?: {
      full_name: string; cnic: string; phone_primary?: string | null;
      phone_secondary?: string | null; address?: string | null; city?: string | null;
    } | null;
  };
  const paymentsJoin = s as unknown as { payments?: Array<{id:string;amount?:unknown;payment_method?:unknown;bank?:{id:string;name:string}|null;instrument_number?:string|null;transaction_ref?:string|null;bank_name_snapshot?:string|null}> | null; sale_payments?: Array<{id:string;amount?:unknown;payment_method?:unknown;bank?:{id:string;name:string}|null;instrument_number?:string|null;transaction_ref?:string|null;bank_name_snapshot?:string|null}> | null };
  const payments = (Array.isArray(paymentsJoin.payments) ? paymentsJoin.payments : Array.isArray(paymentsJoin.sale_payments) ? paymentsJoin.sale_payments : []) ?? [];
  const qty = Number((s as unknown as { quantity_sold?: number }).quantity_sold ?? s.quantity ?? 1);
  const totalPaid = payments.reduce((t, p) => t + (Number(p.amount) ?? 0), 0);
  const due = Math.max(0, Number(s.total_amount ?? 0) - totalPaid);

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-10 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 print:px-0">
        <ReceiptPrintActionBar receiptNumber={receipt.receipt_number ?? "OWM-RCPT-PENDING"} />

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none" style={{ fontFamily: "Rajdhani, Inter, system-ui, sans-serif" }}>
          <header className="relative overflow-hidden border-b-4 border-[#C62828] bg-gradient-to-br from-white via-[#FFF8F8] to-[#FEF2F2] px-8 py-6">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#C62828]/5 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-2">
                  <Image src="/images/ow-motors-logo.png" alt="OW Motors" width={1536} height={1024} className="h-full w-full object-contain" priority />
                </div>
                <div>
                  <p className="font-display text-4xl font-black leading-none tracking-[-0.02em] text-[#111111]">OW MOTORS</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#C62828]">Multi-Brand Motorcycle Showroom</p>
                  <div className="mt-2 grid grid-cols-1 gap-0.5 text-[12px] text-[#374151] sm:grid-cols-2 sm:gap-x-5">
                    <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden className="h-3.5 w-3.5 text-[#C62828]" />Showroom Address (TBD)</span>
                    <span className="inline-flex items-center gap-1.5"><Phone aria-hidden className="h-3.5 w-3.5 text-[#C62828]" />Phone (TBD)</span>
                    <span className="inline-flex items-center gap-1.5"><Globe2 aria-hidden className="h-3.5 w-3.5 text-[#C62828]" />www.owmotors.pk</span>
                    <span className="inline-flex items-center gap-1.5"><Building2 aria-hidden className="h-3.5 w-3.5 text-[#C62828]" />NTN / STRN (TBD)</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-5xl font-black tracking-[-0.03em] text-[#C62828] leading-none">RECEIPT</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#6B7280]">Sale Invoice · Motor Vehicle</p>
                <dl className="mt-4 space-y-1 border border-[#E5E7EB] bg-white/80 p-3 text-[12px]">
                  <div className="flex justify-between gap-6"><dt className="text-[#6B7280]">Receipt No.</dt><dd className="font-mono font-bold text-[#111111]">{receipt.receipt_number}</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-[#6B7280]">Sale Ref.</dt><dd className="font-mono">{s.receipt_number}</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-[#6B7280]">Date</dt><dd className="font-semibold">{new Date(receipt.generated_at ?? s.requested_at).toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-[#6B7280]">Place</dt><dd className="font-semibold">OW Motors Showroom</dd></div>
                </dl>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8 px-8 py-7 md:grid-cols-2">
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C62828]">Customer Information</h2>
              <dl className="mt-3 space-y-2 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-[13px]">
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">Full name</dt><dd className="font-semibold text-[#111111]">{s.customer?.full_name ?? "—"}</dd></div>
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">CNIC No.</dt><dd className="font-mono font-semibold">{s.customer?.cnic ?? "—"}</dd></div>
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">Phone</dt><dd className="font-mono font-semibold">{s.customer?.phone_primary ?? "—"}{s.customer?.phone_secondary ? <> · {s.customer.phone_secondary}</> : null}</dd></div>
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">City</dt><dd className="font-semibold">{s.customer?.city ?? "—"}</dd></div>
                <div className="flex flex-col gap-1"><dt className="text-[#6B7280]">Address (as per CNIC)</dt><dd className="font-semibold leading-5 text-[#111111]">{s.customer?.address ?? "—"}</dd></div>
              </dl>
            </section>

            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C62828]">Vehicle Information</h2>
              <dl className="mt-3 space-y-2 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-[13px]">
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">Brand</dt><dd className="font-display text-lg font-bold text-[#111111]">{s.brand_name_snapshot}</dd></div>
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">Model</dt><dd className="font-display text-lg font-bold text-[#111111]">{s.motorcycle_name_snapshot}</dd></div>
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">Displacement</dt><dd className="font-semibold">{s.cc_snapshot} cc</dd></div>
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">Color</dt><dd className="font-semibold">{s.color_name_snapshot ?? "—"}</dd></div>
                <div className="flex justify-between gap-4 border-b border-white pb-1.5"><dt className="text-[#6B7280]">Chasis No.</dt><dd className="font-mono font-bold text-[#C62828]">{s.chasis_number}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#6B7280]">Quantity</dt><dd className="font-display text-2xl font-black text-[#111111]">× {qty}</dd></div>
              </dl>
            </section>
          </div>

          <div className="px-8 pb-7">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C62828]">Payment Breakdown</h2>
            <p className="mt-1 text-[12px] text-[#6B7280]">Record of every payment method and bank used for this sale.</p>
            <div className="mt-3 overflow-hidden rounded-md border border-[#E5E7EB]">
              <table className="w-full border-collapse text-[13px]">
                <thead className="bg-[#C62828] text-white">
                  <tr className="text-[11px] font-bold uppercase tracking-[0.12em]">
                    <th className="px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Payment Method</th>
                    <th className="px-3 py-2.5 text-left">Bank</th>
                    <th className="px-3 py-2.5 text-left">Instrument #</th>
                    <th className="px-3 py-2.5 text-left">Txn / Ref</th>
                    <th className="px-3 py-2.5 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {payments.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-[#6B7280]">No payments recorded yet.</td></tr>
                  ) : payments.map((p, i) => {
                    const methodKey = String(p.payment_method ?? "cash").toLowerCase();
                    const amountNum = Number(p.amount) || 0;
                    const bankName = String(p.bank_name_snapshot ?? ((typeof p.bank === "object" && p.bank !== null) ? (p.bank as { name?: unknown }).name ?? null : null) ?? "");
                    return (
                      <tr key={String(p.id ?? i)} className="hover:bg-[#FAFAFA]">
                        <td className="px-3 py-2 text-[#6B7280]">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold">{methodLabel[methodKey] ?? methodKey.replaceAll("_", " ")}</td>
                        <td className="px-3 py-2">{bankName ? bankName : <span className="text-[#9CA3AF]">—</span>}</td>
                        <td className="px-3 py-2 font-mono text-[12px]">{typeof p.instrument_number === "string" && p.instrument_number ? p.instrument_number : <span className="text-[#9CA3AF]">—</span>}</td>
                        <td className="px-3 py-2 font-mono text-[12px]">{typeof p.transaction_ref === "string" && p.transaction_ref ? p.transaction_ref : <span className="text-[#9CA3AF]">—</span>}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{amountNum.toLocaleString("en-PK")}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#FAFAFA] text-[13px]">
                  <tr className="border-t-2 border-[#C62828]/40">
                    <td colSpan={5} className="px-3 py-2 text-right font-semibold text-[#6B7280]">Subtotal (Vehicle)</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{(Number(s.total_amount) || 0).toLocaleString("en-PK")}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right font-semibold text-[#15803D]">Total Paid</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-[#15803D]">{totalPaid.toLocaleString("en-PK")}</td>
                  </tr>
                  <tr className={due > 0 ? "text-[#B45309]" : "text-[#15803D]"}>
                    <td colSpan={5} className="px-3 py-2 text-right font-bold uppercase tracking-wider">{due > 0 ? "Balance Due" : "Fully Paid"}</td>
                    <td className="px-3 py-2 text-right font-display text-xl font-black">{due.toLocaleString("en-PK")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-3 text-center font-display text-3xl font-black tracking-[-0.02em] text-[#C62828]">
              TOTAL RECEIVED: {pkr(totalPaid)}
            </p>
            <p className="text-center text-[12px] text-[#6B7280]">Rupees in words: <span className="font-semibold text-[#111111]">— (to be filled manually / stamped)</span></p>
          </div>

          {s.notes ? (
            <div className="mx-8 mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-[13px] text-[#B45309]">
              <p className="text-[10px] font-bold uppercase tracking-widest">Sale notes</p>
              <p className="mt-1">{s.notes}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-10 border-t border-gray-200 bg-[#FAFAFA] px-8 py-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">For OW Motors</p>
              <p className="mt-14 border-b border-dashed border-[#9CA3AF]" />
              <p className="mt-2 text-[13px] font-semibold">Manager / Authorized Signatory</p>
              <p className="text-[12px] text-[#6B7280]">Name, Signature & Stamp</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">Customer Acknowledgment</p>
              <p className="mt-4 text-[12px] leading-5 text-[#374151]">I hereby confirm receiving the above vehicle in good, roadworthy condition along with all documents and accessories. I acknowledge the payment split as stated above.</p>
              <p className="mt-6 border-b border-dashed border-[#9CA3AF]" />
              <p className="mt-2 text-[13px] font-semibold">Customer Signature & Name</p>
              <p className="text-[12px] text-[#6B7280]">Date: ______________________</p>
            </div>
          </div>

          <footer className="border-t-2 border-[#C62828] bg-[#C62828]/5 px-8 py-4 text-center text-[12px] text-[#6B7280]">
            <p className="font-semibold text-[#111111]">Thank you for choosing OW MOTORS — Ride Safe, Ride Happy!</p>
            <p className="mt-1 text-[11px]">This is a computer-generated receipt. No signature required for validity. Subject to showroom terms & conditions. Vehicle subject to manufacturer warranty. All disputes subject to local courts.</p>
          </footer>
        </section>
      </div>
    </div>
  );
}
