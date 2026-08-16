import Image from "next/image";
import { notFound } from "next/navigation";
import { Globe2, MapPin, Phone } from "lucide-react";
import { getPartSale } from "@/lib/erp/queries";
import { ReceiptPrintActionBar } from "@/app/admin/(protected)/receipts/[id]/print-bar.client";

export const metadata = { title: "Spare Part Receipt" };

const SHOWROOM = {
  address: "Shop#61-A, Main Peco Road Township, Lahore, Pakistan",
  phone: "+92 322 2033399",
  website: "owmotorsport.com",
};

function pkr(value: number): string {
  return "PKR " + (Number(value) || 0).toLocaleString("en-PK", { minimumFractionDigits: 0 });
}

function numberToPKRWords(raw: number): string {
  const n = Math.floor(Number(raw) || 0);
  if (n === 0) return "Zero Rupees Only";
  const below20 = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
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
    return [h ? `${below20[h]} Hundred` : "", rem ? belowHundred(rem) : ""].filter(Boolean).join(" and ");
  }
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const words = [
    crore ? `${belowThousand(crore)} Crore` : "",
    lakh ? `${belowThousand(lakh)} Lakh` : "",
    thousand ? `${belowThousand(thousand)} Thousand` : "",
    rest ? belowThousand(rest) : "",
  ].filter(Boolean).join(", ");
  return `${words} Rupees Only`;
}

export default async function PartSaleReceiptPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const sale = await getPartSale(id);
  if (!sale) notFound();

  const customer = sale.customer as { full_name?: string | null; cnic?: string | null; phone_primary?: string | null } | null | undefined;
  const items = sale.items ?? [];
  const date = new Date(sale.sold_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-6 print:px-0">
        <ReceiptPrintActionBar receiptNumber={sale.sale_number} />

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
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Counter sale | Spare parts</p>
                <dl className="mt-3 overflow-hidden rounded-md border border-[#E5E7EB] text-[11px]">
                  <div className="bg-[#111111] px-3 py-2 text-left font-mono text-[10px] font-bold text-white">{sale.sale_number}</div>
                  <div className="grid grid-cols-[82px_1fr] gap-2 border-t border-[#E5E7EB] px-3 py-1.5"><dt className="text-left text-[#6B7280]">Date</dt><dd className="font-semibold">{date}</dd></div>
                  <div className="grid grid-cols-[82px_1fr] gap-2 border-t border-[#E5E7EB] px-3 py-1.5"><dt className="text-left text-[#6B7280]">Items</dt><dd className="font-semibold">{items.length} line(s) / {totalQty} unit(s)</dd></div>
                  <div className="grid grid-cols-[82px_1fr] gap-2 border-t border-[#E5E7EB] px-3 py-1.5"><dt className="text-left text-[#6B7280]">Place</dt><dd className="font-semibold">Township, Lahore</dd></div>
                </dl>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 px-7 py-5 md:grid-cols-2 print:px-5 print:py-3">
            <section>
              <h2 className="border-b-2 border-[#C62828] pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C62828]">Customer Information</h2>
              <dl className="mt-2 divide-y divide-[#E5E7EB] rounded-md border border-[#E5E7EB] bg-white text-[12px]">
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Full name</dt><dd className="text-right font-bold text-[#111111]">{customer?.full_name ?? sale.customer_name ?? "Walk-in"}</dd></div>
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">CNIC</dt><dd className="text-right font-mono font-semibold">{customer?.cnic ?? "-"}</dd></div>
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Phone</dt><dd className="text-right font-mono font-semibold">{customer?.phone_primary ?? sale.customer_phone ?? "-"}</dd></div>
              </dl>
            </section>
            <section>
              <h2 className="border-b-2 border-[#C62828] pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C62828]">Sale Summary</h2>
              <dl className="mt-2 divide-y divide-[#E5E7EB] rounded-md border border-[#E5E7EB] bg-white text-[12px]">
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Sold by</dt><dd className="text-right font-bold text-[#111111]">{sale.seller?.full_name ?? "OW Motors"}</dd></div>
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Status</dt><dd className="text-right font-bold text-[#15803D]">Paid</dd></div>
                <div className="grid grid-cols-[88px_1fr] gap-3 px-3 py-2"><dt className="text-[#6B7280]">Total</dt><dd className="text-right font-display text-lg font-black text-[#C62828]">{pkr(sale.total_amount)}</dd></div>
              </dl>
            </section>
          </div>

          <div className="px-7 pb-5 print:px-5 print:pb-3">
            <h2 className="border-b-2 border-[#C62828] pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C62828]">Spare Parts</h2>
            <div className="mt-2 overflow-hidden rounded-md border border-[#E5E7EB]">
              <table className="w-full border-collapse text-[12px]">
                <thead className="bg-[#C62828] text-white">
                  <tr className="text-[10px] font-bold uppercase tracking-[0.12em]">
                    <th className="w-8 px-2.5 py-2 text-left">#</th>
                    <th className="px-2.5 py-2 text-left">SKU</th>
                    <th className="px-2.5 py-2 text-left">Part</th>
                    <th className="px-2.5 py-2 text-right">Qty</th>
                    <th className="px-2.5 py-2 text-right">Unit</th>
                    <th className="px-2.5 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-2.5 py-1.5 text-[#6B7280]">{index + 1}</td>
                      <td className="px-2.5 py-1.5 font-mono text-[11px] font-semibold">{item.sku_snapshot}</td>
                      <td className="px-2.5 py-1.5 font-semibold">{item.name_snapshot}</td>
                      <td className="px-2.5 py-1.5 text-right font-bold">{item.quantity}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{Number(item.unit_price).toLocaleString("en-PK")}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-bold">{Number(item.line_total).toLocaleString("en-PK")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FAFAFA] text-[12px]">
                  <tr className="border-t-2 border-[#C62828]/40">
                    <td colSpan={5} className="px-2.5 py-2 text-right font-bold uppercase tracking-wider text-[#15803D]">Total Paid</td>
                    <td className="px-2.5 py-2 text-right font-display text-lg font-black text-[#15803D]">{Number(sale.total_amount).toLocaleString("en-PK")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-3 text-center font-display text-2xl font-black tracking-normal text-[#C62828] print:text-xl">Total Received: {pkr(sale.total_amount)}</p>
            <p className="text-center text-[11px] text-[#6B7280]">Rupees in words: <span className="font-semibold text-[#111111]">{numberToPKRWords(sale.total_amount)}</span></p>
          </div>

          {sale.notes ? <div className="mx-7 mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-[#92400E] print:mx-5 print:mb-3"><strong>Sale notes:</strong> {sale.notes}</div> : null}

          <footer className="grid grid-cols-1 gap-5 bg-[#FAFAFA] px-7 py-5 text-[11px] text-[#6B7280] md:grid-cols-2 print:px-5 print:py-4">
            <div>
              <p className="font-bold uppercase tracking-[0.18em] text-[#6B7280]">For OW Motors</p>
              <div className="mt-8 border-t border-dashed border-[#9CA3AF] pt-2 font-semibold text-[#111111]">Manager / Authorized Signatory</div>
              <p>Name, Signature & Stamp</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-[0.18em] text-[#6B7280]">Customer Acknowledgement</p>
              <p className="mt-2 leading-5">I acknowledge receiving the spare parts listed above in acceptable condition.</p>
              <div className="mt-6 border-t border-dashed border-[#9CA3AF] pt-2 font-semibold text-[#111111]">Customer Signature & Name</div>
              <p>Date: ________________</p>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}