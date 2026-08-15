import { redirect } from "next/navigation";
import { UserPlus, Users, Eye, EyeOff, KeyRound } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { listStaffProfiles } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { createStaffUser, revokeStaffAccess, updateStaffUser } from "@/app/admin/erp-actions";

export const metadata = { title: "Users & Access" };

const roleLabels: Record<string, { label: string; tone: string }> = {
  developer: { label: "Developer", tone: "in_stock" },
  admin: { label: "Admin", tone: "completed" },
  manager: { label: "Manager", tone: "in_progress" },
  apprentice: { label: "Apprentice", tone: "new" },
};

export default async function UsersAccessPage() {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role) || !actor.profile.is_active) {
    redirect("/admin");
  }

  const staff = await listStaffProfiles();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Administration"
        title="Users & Team Access"
        description="Create showroom logins for managers and apprentices. Assign roles and temporary passwords. Revoke access when team members leave. Visible only to Admin and Developer roles."
        actions={
          <a href="#new-user" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#A91F1F]">
            <UserPlus aria-hidden="true" className="h-4 w-4" />Add team member
          </a>
        }
      />

      <AdminPanel
        title="Team Directory"
        description={`${staff.length} accounts. Apprentices see only customer data and stock availability. Managers process sales and data entry. Admins approve everything.`}
        actions={<span className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280]"><Users aria-hidden="true" className="h-4 w-4" />Role-based permissions enforced by database</span>}
      >
        {staff.length === 0 ? (
          <AdminEmptyState
            title="No staff accounts yet"
            description="Create the first manager or apprentice account. Their initial email and password will be shown to you for sharing."
            action={
              <a href="#new-user" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-4 text-sm font-semibold text-white hover:bg-[#A91F1F]"><UserPlus aria-hidden="true" className="h-4 w-4" />Create account</a>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
              <thead className="bg-[#F7F7F8]">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">Name</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">Role</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">Status</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">Initial Password</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {staff.map((p) => {
                  const roleMeta = roleLabels[p.role] ?? roleLabels.apprentice;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-[#111111]">{p.full_name}</p>
                          <p className="mt-0.5 text-xs text-[#6B7280]">ID: {p.id.slice(0, 8)}…</p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge value={roleMeta.tone} label={roleMeta.label} /></td>
                      <td className="px-4 py-3">
                        {p.is_active
                          ? <StatusBadge value="in_stock" label={p.revoked_at ? "Revoked" : "Active"} />
                          : <StatusBadge value="out_of_stock" label={p.revoked_at ? "Revoked" : "Inactive"} />}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#4B5563]">
                        {p.created_password ? (
                          <details className="group inline-block">
                            <summary className="flex cursor-pointer list-none items-center gap-1 hover:text-[#C62828]">
                              <Eye aria-hidden="true" className="h-3.5 w-3.5 group-open:hidden" />
                              <EyeOff aria-hidden="true" className="hidden h-3.5 w-3.5 group-open:block" />
                              <span className="group-open:hidden">Show</span>
                              <span className="group-open:inline hidden">{p.created_password}</span>
                            </summary>
                          </details>
                        ) : <span className="text-[#9CA3AF]">Set by user</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7280]">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {p.role !== "developer" ? (
                          <details className="group">
                            <summary className="cursor-pointer rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:border-[#C62828] hover:text-[#C62828]">Manage</summary>
                            <div className="mt-2 w-72 rounded-md border border-[#E5E7EB] bg-[#F7F7F8] p-3 shadow-lg">
                              <AdminForm action={updateStaffUser} submitLabel="Update user" className="space-y-3 text-xs" showStatus={false}>
                                <input type="hidden" name="id" value={p.id} />
                                <div>
                                  <label className={adminLabelClass}>Full name</label>
                                  <input name="fullName" defaultValue={p.full_name} className={`${adminInputClass} min-h-9`} />
                                </div>
                                <div>
                                  <label className={adminLabelClass}>Role</label>
                                  <select name="role" defaultValue={p.role} className={`${adminInputClass} min-h-9`}>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="apprentice">Apprentice</option>
                                  </select>
                                </div>
                                <div>
                                  <label className={`${adminLabelClass} inline-flex items-center gap-2`}>
                                    <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
                                    Reset password (leave blank to keep)
                                  </label>
                                  <input name="newPassword" type="text" placeholder="New password 8+ chars" className={`${adminInputClass} min-h-9`} />
                                </div>
                              </AdminForm>
                              <hr className="my-3 border-[#E5E7EB]" />
                              <AdminForm
                                action={revokeStaffAccess}
                                submitLabel="Revoke access"
                                destructive
                                confirmMessage={`Permanently disable ${p.full_name}'s login? They will lose all access immediately.`}
                                className="contents"
                                showStatus={false}
                              >
                                <input type="hidden" name="id" value={p.id} />
                              </AdminForm>
                            </div>
                          </details>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <section id="new-user">
        <AdminPanel
          title="Create a new team account"
          description="Enter the details below. A Supabase Auth login will be created and the password stored here for you to share. Share the password securely (not via public chat). Users can change their password later."
        >
          <AdminForm
            action={createStaffUser}
            submitLabel="Create account & show password"
            pendingLabel="Creating account…"
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            <div>
              <label className={adminLabelClass}>Full name</label>
              <input name="fullName" required className={adminInputClass} placeholder="e.g. Muhammad Saleem" />
            </div>
            <div>
              <label className={adminLabelClass}>Email address</label>
              <input name="email" type="email" required className={adminInputClass} placeholder="name@owmotors.pk" />
            </div>
            <div>
              <label className={adminLabelClass}>Access role</label>
              <select name="role" defaultValue="manager" required className={adminInputClass}>
                <option value="manager">Manager — sales, stock entry, customer records</option>
                <option value="apprentice">Apprentice — lookup only, no changes</option>
                <option value="admin">Admin — approve sales/stock, user management</option>
              </select>
            </div>
            <div>
              <label className={`${adminLabelClass} inline-flex items-center gap-2`}>
                <KeyRound aria-hidden="true" className="h-4 w-4 text-[#6B7280]" />
                Initial password (will be shown to you after save)
              </label>
              <input name="password" type="text" minLength={8} required className={adminInputClass} placeholder="8+ characters — share with user" />
            </div>
          </AdminForm>
        </AdminPanel>
      </section>

      <AdminPanel title="Role permissions matrix" description="What each role can see and do in the ERP. Enforced by database row-level security policies (RLS), not just UI.">
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full divide-y divide-[#E5E7EB]">
            <thead className="bg-[#F7F7F8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
              <tr>
                <th className="px-3 py-3 text-left">Area</th>
                <th className="px-3 py-3 text-center">Developer</th>
                <th className="px-3 py-3 text-center">Admin</th>
                <th className="px-3 py-3 text-center">Manager</th>
                <th className="px-3 py-3 text-center">Apprentice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {[
                ["Brands, Categories, Banners, Blog, SEO Media", "✅", "❌", "❌", "❌"],
                ["User management (add managers/apprentices)", "✅", "✅", "❌", "❌"],
                ["Approve pending sales", "✅", "✅", "❌", "❌"],
                ["Approve stock add/remove", "✅", "✅", "❌", "❌"],
                ["See exact stock quantities", "✅", "✅", "✅", "❌"],
                ["Initiate sales, record payments", "✅", "✅", "✅", "❌"],
                ["Customer records (CRUD)", "✅", "✅", "✅", "Read only"],
                ["Customer lookup by CNIC/chasis", "✅", "✅", "✅", "✅"],
                ["Stock availability (in stock / out of stock)", "✅", "✅", "✅", "✅"],
                ["Activity logs & audit trail", "✅", "✅", "❌", "❌"],
                ["Generate & print receipts", "✅", "✅", "After approval", "❌"],
              ].map(([area, ...cols], idx) => (
                <tr key={idx} className="hover:bg-[#FAFAFA]">
                  <td className="px-3 py-2.5 font-medium text-[#111111]">{area}</td>
                  {cols.map((c, i) => <td key={i} className="px-3 py-2.5 text-center font-mono text-xs">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}
