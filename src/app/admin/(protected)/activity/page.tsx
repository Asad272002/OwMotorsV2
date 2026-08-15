import { AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";
import { listActivityLogs } from "@/lib/erp/queries";
import type { ActivityLogWithContext } from "@/lib/erp/queries";

export const metadata = { title: "Activity Logs" };

const actionLabels: Record<string, string> = {
  user_created: "User created",
  user_revoked: "User revoked",
  user_role_changed: "Role changed",
  sale_requested: "Sale requested",
  sale_approved: "Sale approved",
  sale_rejected: "Sale rejected",
  sale_completed: "Sale completed",
  payment_recorded: "Payment recorded",
  receipt_generated: "Receipt generated",
  receipt_printed: "Receipt printed",
  stock_requested: "Stock change requested",
  stock_approved: "Stock change approved",
  stock_rejected: "Stock change rejected",
  stock_applied: "Stock change applied to inventory",
  part_created: "Spare part created",
  part_updated: "Spare part updated",
  customer_created: "Customer registered",
  customer_updated: "Customer record updated",
  seo_content_updated: "SEO content changed",
  login_success: "Login",
  login_failure: "Failed login",
  password_set_by_admin: "Admin reset password",
};

function badgeFor(action: string): string {
  if (action.includes("created") || action.includes("generated") || action.includes("success")) return "in_stock";
  if (action.includes("approved") || action.includes("completed") || action.includes("applied")) return "completed";
  if (action.includes("revoked") || action.includes("rejected") || action.includes("failure")) return "out_of_stock";
  if (action.includes("requested")) return "new";
  return "in_progress";
}

function money(value: number | null | undefined): string | null {
  if (typeof value !== "number") return null;
  return `PKR ${value.toLocaleString("en-PK")}`;
}

function sentenceFor(log: ActivityLogWithContext): string {
  const actor = log.resolved_actor?.full_name ?? "System";
  const target = log.target_context?.title ?? log.target_table ?? "record";
  const amount = money(log.target_context?.amount);
  const reason = log.target_context?.reason;

  switch (log.action) {
    case "sale_requested":
      return `${actor} submitted sale ${target}${amount ? ` for ${amount}` : ""}.`;
    case "sale_approved":
      return `${actor} approved sale ${target}${amount ? ` for ${amount}` : ""}.`;
    case "sale_rejected":
      return `${actor} rejected sale ${target}${reason ? ` because "${reason}"` : ""}.`;
    case "sale_completed":
      return `${actor} completed sale ${target}.`;
    case "receipt_generated":
      return `${actor} generated receipt ${target}.`;
    case "receipt_printed":
      return `${actor} printed receipt ${target}.`;
    case "stock_requested":
      return `${actor} requested a stock change.`;
    case "stock_approved":
      return `${actor} approved a stock change.`;
    case "stock_rejected":
      return `${actor} rejected a stock change.`;
    case "stock_applied":
      return `Inventory was updated from an approved stock change.`;
    default:
      return `${actor} performed ${actionLabels[log.action] ?? log.action}.`;
  }
}

export default async function ActivityLogsPage() {
  const logs = await listActivityLogs(500);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Audit Trail"
        title="Activity Logs"
        description={`Complete tamper-resistant audit trail of all ERP actions: sales, approvals, stock changes, user management, and logins. ${logs.length} recent entries.`}
      />
      <AdminPanel title="All activities" description="Most recent at the top. Cannot be edited or deleted by users.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
            <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#6B7280]">
                    No activity yet. Actions will appear here as users work in the ERP.
                  </td>
                </tr>
              ) : logs.map((log) => {
                const row = log as unknown as {
                  actor_role?: string | null;
                  actor_role_snapshot?: string | null;
                  actor_id?: string | null;
                  actor_profile?: { id: string; full_name: string; role?: string | null } | null;
                };
                const profile = log.resolved_actor ?? row.actor_profile ?? null;
                const actorRole = profile?.role ?? row.actor_role ?? row.actor_role_snapshot ?? null;
                const actorId = row.actor_id ?? null;
                const target = log.target_context;

                return (
                  <tr key={log.id} className="hover:bg-[#FAFAFA] align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#6B7280]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={badgeFor(log.action)} label={actionLabels[log.action] ?? log.action} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {profile ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#111111]">{profile.full_name}</span>
                          <span className="text-[#6B7280]">{(actorRole ?? "staff").toUpperCase()}</span>
                        </div>
                      ) : actorRole || actorId ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#111111]">{actorRole ? actorRole.toUpperCase() : "-"}</span>
                          <span className="text-[#6B7280]">{actorId ? `${actorId.slice(0, 8)}...` : "Unknown user"}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#111111]">System Automation</span>
                          <span className="text-[#6B7280]">Database trigger or scheduled job</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">
                      {target ? (
                        <div className="flex max-w-sm flex-col gap-1">
                          <span className="font-semibold text-[#111111]">{target.title}</span>
                          {target.subtitle ? <span>{target.subtitle}</span> : null}
                        </div>
                      ) : log.target_table ? (
                        <span className="capitalize">{log.target_table.replaceAll("_", " ")}</span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p className="text-sm leading-6 text-[#374151]">{sentenceFor(log)}</p>
                      {target?.reason ? <p className="mt-1 text-xs font-semibold text-[#C62828]">Reason: {target.reason}</p> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}
