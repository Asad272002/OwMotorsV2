"use client";

import { useState, useRef, useEffect, useActionState } from "react";
import { AdminForm } from "@/components/admin/admin-form.client";
import { StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { decideSale, generateReceipt } from "@/app/admin/erp-actions/sales";
import { CircleCheck, CircleX } from "lucide-react";

type PendingApprovalSaleRow = {
  readonly id: string;
  readonly receipt_number: string;
  readonly requested_at: string;
  readonly brand_name_snapshot: string | null;
  readonly motorcycle_name_snapshot: string | null;
  readonly cc_snapshot: number | null;
  readonly color_name_snapshot: string | null;
  readonly chasis_number: string | null;
  readonly quantity_label: string;
  readonly customer_full_name: string | null;
  readonly customer_cnic: string | null;
  readonly customer_phone: string | null;
  readonly customer_city: string | null;
  readonly notes: string | null;
  readonly total_amount: number;
  readonly paid_amount: number;
  readonly due_amount: number;
  readonly payments: ReadonlyArray<{
    readonly id: string;
    readonly payment_method_label: string;
    readonly amount_pkr: string;
  }>;
};

function RejectReasonDialog({
  open,
  sale,
  onCancel,
}: Readonly<{
  open: boolean;
  sale: PendingApprovalSaleRow | null;
  onCancel: () => void;
}>) {
  const reasonRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) window.setTimeout(() => reasonRef.current?.focus(), 0);
  }, [open]);
  if (!open || !sale) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reject-sale-title"
        aria-describedby="reject-sale-description"
        className="w-full max-w-lg rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-2xl"
        onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-[#C62828]"><CircleX aria-hidden="true" className="h-5 w-5" /></span>
        <h2 id="reject-sale-title" className="mt-4 font-display text-2xl font-bold text-[#111111]">Reject sale</h2>
        <p id="reject-sale-description" className="mt-2 text-sm leading-6 text-[#6B7280]">Sale <strong className="font-mono text-[#111111]">{sale.receipt_number}</strong> — {sale.motorcycle_name_snapshot}. Provide a short reason so the manager can correct and resubmit. Stock will not be affected.</p>
        <AdminForm
          action={decideSale}
          className="mt-6 space-y-5"
          hideAutoSubmit={false}
          destructive={true}
          submitLabel="Confirm reject sale"
          pendingLabel="Rejecting..."
        >
          <input type="hidden" name="id" value={sale.id} />
          <input type="hidden" name="decision" value="rejected" />
          <div>
            <label htmlFor={`reject-reason-${sale.id}`} className={adminLabelClass}>Rejection reason (required, shown to manager)</label>
            <input
              ref={reasonRef}
              id={`reject-reason-${sale.id}`}
              name="rejectionReason"
              required
              minLength={3}
              maxLength={1000}
              placeholder="e.g. Payment details incomplete, check chasis number, contact number looks wrong..."
              className={adminInputClass}
            />
          </div>
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] transition-colors hover:border-[#9CA3AF] hover:bg-[#F7F7F8]"
            >Cancel</button>
          </div>
        </AdminForm>
      </section>
    </div>
  );
}

function ApproveSaleFollowUp({ sale }: Readonly<{ sale: PendingApprovalSaleRow }>) {
  const [state, formAction, pending] = useActionState(decideSale, { status: "idle", message: "" });
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-[#15803D]">Approved. Generate the receipt now.</div>
        <AdminForm action={generateReceipt} className="contents" hideAutoSubmit={true} submitLabel="Generate receipt" pendingLabel="Generating...">
          <input type="hidden" name="saleId" value={sale.id} />
          <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#111111] bg-[#111111] px-5 text-sm font-semibold text-white hover:bg-[#C62828] sm:w-auto">
            <CircleCheck aria-hidden="true" className="h-4 w-4" />Generate receipt
          </button>
        </AdminForm>
      </div>
    );
  }
  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="id" value={sale.id} />
      <input type="hidden" name="decision" value="approved" />
      <button type="submit" disabled={pending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-6 text-sm font-semibold text-white hover:bg-[#A91F1F] disabled:cursor-wait disabled:opacity-70 sm:w-auto">
        <CircleCheck aria-hidden="true" className="h-4 w-4" />{pending ? "Approving..." : "Approve sale"}
      </button>
      {state.status === "error" && state.message ? <p className="text-xs font-semibold text-[#C62828]">{state.message}</p> : null}
    </form>
  );
}
export function SaleApprovalsClient({
  pendingSales,
}: Readonly<{
  pendingSales: ReadonlyArray<PendingApprovalSaleRow>;
}>) {
  const [rejectOpenFor, setRejectOpenFor] = useState<PendingApprovalSaleRow | null>(null);

  function pkr(n: number): string {
    return "PKR " + (n || 0).toLocaleString("en-PK");
  }

  return (
    <>
      <div className="space-y-8">
        {pendingSales.length === 0 ? null : (
          pendingSales.map((s) => {
            return (
              <div key={s.id} className="rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-[#E5E7EB] p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#111111]">{s.motorcycle_name_snapshot} — <span className="font-mono text-[#C62828]">{s.receipt_number}</span></h2>
                    <p className="mt-1 text-sm text-[#6B7280]">Requested by manager on {new Date(s.requested_at).toLocaleString()}</p>
                  </div>
                  <StatusBadge value="new" label="Pending approval" />
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-5 md:grid-cols-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Bike</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Brand</dt><dd className="font-semibold">{s.brand_name_snapshot ?? "—"}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Model</dt><dd className="font-semibold">{s.motorcycle_name_snapshot ?? "—"}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">CC</dt><dd className="font-semibold">{s.cc_snapshot ? `${s.cc_snapshot}cc` : "—"}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Color</dt><dd className="font-semibold">{s.color_name_snapshot ?? "Color TBD"}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Chasis #</dt><dd className="font-mono text-xs">{s.chasis_number ?? "—"}</dd></div>
                      <div className="flex justify-between"><dt className="text-[#6B7280]">Quantity</dt><dd className="font-semibold">{s.quantity_label}</dd></div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Customer</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Name</dt><dd className="font-semibold">{s.customer_full_name ?? "—"}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">CNIC</dt><dd className="font-mono text-xs">{s.customer_cnic ?? "—"}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Phone</dt><dd className="font-mono text-xs">{s.customer_phone ?? "—"}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">City</dt><dd className="font-semibold">{s.customer_city ?? "—"}</dd></div>
                      <div className="flex justify-between"><dt className="text-[#6B7280]">Sales notes</dt><dd className="text-right text-xs">{s.notes ?? "—"}</dd></div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Payments & Totals</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Total sale</dt><dd className="font-display text-lg font-bold text-[#C62828]">{pkr(s.total_amount)}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Paid so far</dt><dd className="font-semibold text-[#15803D]">{pkr(s.paid_amount)}</dd></div>
                      <div className="flex justify-between border-b border-[#F3F4F6] pb-2"><dt className="text-[#6B7280]">Due</dt><dd className={`font-semibold ${s.due_amount > 0 ? "text-[#B45309]" : "text-[#15803D]"}`}>{pkr(s.due_amount)}</dd></div>
                      {s.payments.length > 0 && (
                        <div className="mt-3 rounded-md border border-[#E5E7EB] p-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Payment split</p>
                          <ul className="mt-2 space-y-1 text-xs">
                            {s.payments.map((p) => (
                              <li key={p.id} className="flex justify-between gap-2">
                                <span className="text-[#6B7280]">{p.payment_method_label}</span>
                                <span className="font-mono font-semibold">{p.amount_pkr}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-[#E5E7EB] p-5 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setRejectOpenFor(s)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#C62828] bg-white px-5 text-sm font-semibold text-[#C62828] transition-colors hover:bg-[#FEF2F2] sm:w-auto"
                  >
                    <CircleX aria-hidden="true" className="h-4 w-4" />Reject sale…
                  </button>
                  <ApproveSaleFollowUp sale={s} />
                </div>
              </div>
            );
          })
        )}
      </div>
      <RejectReasonDialog
        open={!!rejectOpenFor}
        sale={rejectOpenFor}
        onCancel={() => setRejectOpenFor(null)}
      />
    </>
  );
}






