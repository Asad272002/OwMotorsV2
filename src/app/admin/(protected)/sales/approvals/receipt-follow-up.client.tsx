"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, FileCheck, Printer } from "lucide-react";
import { generateReceipt } from "@/app/admin/erp-actions/sales";
import type { AdminActionState } from "@/lib/admin/action-state";

const initialState: AdminActionState = { status: "idle", message: "" };

export type ReceiptFollowUpSale = Readonly<{
  id: string;
  receipt_number: string;
  approved_at: string | null;
  motorcycle_label: string;
  chasis_number: string | null;
  customer_label: string;
  total_amount: number;
}>;

function pkr(n: number): string {
  return "PKR " + (Number(n) || 0).toLocaleString("en-PK");
}

export function IssueReceiptForm({ sale }: Readonly<{ sale: ReceiptFollowUpSale }>) {
  const [state, formAction, pending] = useActionState(generateReceipt, initialState);
  const receiptId = typeof state.data?.receiptId === "string" ? state.data.receiptId : null;
  const receiptNumber = typeof state.data?.receiptNumber === "string" ? state.data.receiptNumber : null;

  if (state.status === "success" && receiptId) {
    return (
      <div className="flex flex-col gap-2 sm:items-end">
        <div className="inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-[#15803D]">
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          Receipt {receiptNumber ?? "generated"} is ready.
        </div>
        <Link
          href={`/admin/receipts/${receiptId}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#111111] bg-[#111111] px-4 text-sm font-semibold text-white transition-colors hover:border-[#C62828] hover:bg-[#C62828]"
        >
          <Printer aria-hidden className="h-4 w-4" />
          Open receipt
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:items-end">
      <input type="hidden" name="saleId" value={sale.id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#A91F1F] disabled:cursor-wait disabled:opacity-70"
      >
        <FileCheck aria-hidden className="h-4 w-4" />
        {pending ? "Issuing..." : "Issue receipt"}
      </button>
      {state.status === "error" && state.message ? (
        <p className="max-w-xs text-right text-xs font-semibold text-[#C62828]">{state.message}</p>
      ) : null}
    </form>
  );
}

export function ReceiptFollowUpList({ sales }: Readonly<{ sales: readonly ReceiptFollowUpSale[] }>) {
  if (sales.length === 0) return null;

  return (
    <div className="space-y-3">
      {sales.map((sale) => (
        <div
          key={sale.id}
          className="grid grid-cols-1 gap-4 rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-bold text-[#111111]">{sale.receipt_number}</p>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#B45309]">
                Receipt pending
              </span>
            </div>
            <p className="mt-2 font-semibold text-[#111111]">{sale.motorcycle_label}</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Customer: <span className="font-semibold text-[#111111]">{sale.customer_label}</span>
              {sale.chasis_number ? <> | Chasis: <span className="font-mono uppercase">{sale.chasis_number}</span></> : null}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Approved {sale.approved_at ? new Date(sale.approved_at).toLocaleString() : "recently"} | {pkr(sale.total_amount)}
            </p>
          </div>
          <IssueReceiptForm sale={sale} />
        </div>
      ))}
    </div>
  );
}
