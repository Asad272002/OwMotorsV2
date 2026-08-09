import { AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";
import { listActivityLogs } from "@/lib/erp/queries";

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
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#6B7280]">No activity yet. Actions will appear here as users work in the ERP.</td></tr>
              ) : logs.map((l) => (
                <tr key={l.id} className="hover:bg-[#FAFAFA] align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-[#6B7280]">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={badgeFor(l.action)} label={actionLabels[l.action] ?? l.action} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(() => {
                      const row = l as unknown as {
                        actor_role?: string | null;
                        actor_id?: string | null;
                        actor_profile?: { id: string; full_name: string; email?: string | null; role?: string | null } | null;
                      };
                      const profile = row.actor_profile ?? null;
                      if (profile) {
                        const roleLabel = (profile.role ?? row.actor_role ?? "staff") as string;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-[#111111]">{profile.full_name}</span>
                            <span className="text-[#6B7280]">{roleLabel.toUpperCase()}{profile.email ? <> · <span className="font-mono">{profile.email}</span></> : null}</span>
                          </div>
                        );
                      }
                      const actorRole = row.actor_role ?? null;
                      const actorId = row.actor_id ?? null;
                      if (actorRole || actorId) {
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-[#111111]">{actorRole ? actorRole.toUpperCase() : "-"}</span>
                            <span className="text-[#6B7280]">{actorId ? actorId.slice(0, 8) + "…" : "Unknown user"}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#111111]">System Automation</span>
                          <span className="text-[#6B7280]">Database trigger or scheduled job</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B7280]">
                    {l.target_table ? <span>{l.target_table}{l.target_id ? <span className="ml-2 font-mono">{l.target_id.slice(0, 8)}…</span> : null}</span> : <span>—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <pre className="max-h-20 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#F7F7F8] p-2 text-[11px] leading-4 text-[#374151]">{JSON.stringify(l.metadata ?? {}, null, 1).slice(0, 400)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}
