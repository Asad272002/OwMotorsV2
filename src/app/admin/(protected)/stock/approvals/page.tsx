import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { listPendingStockMovements } from "@/lib/erp/queries";
import { decideStockMovement } from "@/app/admin/erp-actions";
import { CircleCheck, CircleX, ShieldCheck, Bike, PackageOpen } from "lucide-react";

export const metadata = { title: "Stock Change Approvals" };

export default async function StockApprovalsPage() {
  const pending = await listPendingStockMovements();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Approvals"
        title="Stock Change Approvals"
        description={pending.length
          ? `${pending.length} stock add/remove requests awaiting your approval. Only approved changes are applied to live inventory quantities.`
          : "No pending stock changes. Stock add/remove requests from managers land here first."}
        actions={<span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><ShieldCheck aria-hidden="true" className="h-4 w-4" />Approval = inventory is updated</span>}
      />
      {pending.length === 0 ? (
        <AdminPanel title="Queue is empty">
          <div className="flex flex-col items-center gap-2 rounded-md border border-green-200 bg-green-50 px-6 py-12 text-center text-[#15803D]">
            <CircleCheck aria-hidden="true" className="h-10 w-10" />
            <p className="font-display text-xl font-bold">No pending changes</p>
            <p className="text-sm opacity-80">All stock requests processed.</p>
          </div>
        </AdminPanel>
      ) : (
        pending.map((m) => (
          <AdminPanel
            key={m.id}
            title={`${String(m.movement_type).replaceAll("_", " ")} × ${m.quantity}${m.part ? ` — ${m.part.name}` : m.variant ? ` — ${m.variant.motorcycle?.name} ${m.variant.cc}cc ${m.variant.color_name ?? ""}` : ""}`}
            description={`Requested on ${new Date(m.created_at).toLocaleString()}${m.requested_by_profile?.full_name ? ` by ${m.requested_by_profile.full_name} (${m.requested_by_profile.role})` : ""}`}
            actions={<StatusBadge value="new" label="Pending" />}
          >
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="md:col-span-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Details</h3>
                <dl className="mt-3 grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-[#6B7280]">Target</p>
                    <div className="mt-1 inline-flex items-center gap-2">
                      {m.variant ? <Bike aria-hidden="true" className="h-4 w-4 text-[#C62828]" /> : <PackageOpen aria-hidden="true" className="h-4 w-4 text-[#374151]" />}
                      <span className="font-semibold">{m.variant ? `${m.variant.motorcycle?.brand?.name} ${m.variant.motorcycle?.name}` : m.part?.name}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-[#6B7280]">Movement type</p>
                    <StatusBadge value={m.movement_type === "addition" ? "in_stock" : m.movement_type === "subtraction" ? "out_of_stock" : "in_progress"} label={String(m.movement_type).replaceAll("_", " ")} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-[#6B7280]">Quantity</p>
                    <p className="mt-1 font-display text-2xl font-bold text-[#111111]">× {m.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-[#6B7280]">Current stock (before)</p>
                    <p className="mt-1 font-semibold text-[#374151]">{m.variant ? `QTY ${m.variant.quantity ?? "-"}` : `QTY ${m.part?.current_stock ?? "-"}`}</p>
                  </div>
                  {m.part ? (
                    <div className="col-span-2">
                      <p className="text-[11px] uppercase tracking-widest text-[#6B7280]">Unit cost impact</p>
                      <p className="mt-1 text-sm">
                        {m.unit_cost != null ? `PKR ${(m.unit_cost * m.quantity).toLocaleString("en-PK")} @ PKR ${m.unit_cost.toLocaleString("en-PK")}/ea` : "Cost not specified"}
                      </p>
                    </div>
                  ) : null}
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-widest text-[#6B7280]">Manager reason</p>
                    <p className="mt-1 rounded-md bg-[#F7F7F8] p-3 text-sm leading-6 text-[#111111]">{m.reason || "—"}</p>
                  </div>
                </dl>
              </div>
            </div>
            <div className="mt-8 flex flex-col-reverse gap-4 border-t border-[#E5E7EB] pt-6 sm:flex-row sm:items-start sm:justify-between">
              <AdminForm action={decideStockMovement} submitLabel="Reject" destructive confirmMessage="Reject this stock change? No inventory updates occur." className="contents" pendingLabel="Rejecting…">
                <input type="hidden" name="movementId" value={m.id} />
                <input type="hidden" name="decision" value="rejected" />
                <div className="w-full max-w-md sm:max-w-xs">
                  <label className={adminLabelClass}>Rejection reason (shown to manager)</label>
                  <input name="rejectionReason" required placeholder="e.g. Incorrect quantities, attach PDI" className={adminInputClass} />
                </div>
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#C62828] bg-white px-4 text-sm font-semibold text-[#C62828] hover:bg-[#FEF2F2] sm:w-auto">
                  <CircleX aria-hidden="true" className="h-4 w-4" />Reject
                </button>
              </AdminForm>
              <AdminForm
                action={decideStockMovement}
                submitLabel="Approve & apply to inventory"
                confirmMessage="Approve and apply this stock change? Actual live inventory is updated."
                pendingLabel="Approving…"
                className="contents"
              >
                <input type="hidden" name="movementId" value={m.id} />
                <input type="hidden" name="decision" value="approved" />
                <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold text-white hover:bg-[#A91F1F]">
                  <CircleCheck aria-hidden="true" className="h-4 w-4" />Approve & apply
                </button>
              </AdminForm>
            </div>
          </AdminPanel>
        ))
      )}
    </div>
  );
}
