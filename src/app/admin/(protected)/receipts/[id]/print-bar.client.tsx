"use client";

import { Printer } from "lucide-react";

export function ReceiptPrintActionBar({
  receiptNumber,
}: Readonly<{
  receiptNumber: string;
}>) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 px-1 print:hidden">
      <div className="text-xs text-[#6B7280]">
        <span className="font-semibold text-[#111111]">{receiptNumber}</span> · Use browser Print to save to PDF.
      </div>
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") window.print();
        }}
        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#111111] bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
      >
        <Printer aria-hidden className="h-3.5 w-3.5" />Print / Save PDF
      </button>
    </div>
  );
}
