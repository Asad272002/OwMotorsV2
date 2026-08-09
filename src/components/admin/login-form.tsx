import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { loginAdmin } from "@/app/admin/auth-actions";

export function LoginForm() {
  return <AdminForm action={loginAdmin} submitLabel="Sign in" pendingLabel="Signing in…" showStatus={false} className="space-y-5 [&_button[type=submit]]:w-full">
    <label className={adminLabelClass}>Email<input className={adminInputClass} name="email" type="email" autoComplete="email" required /></label>
    <label className={adminLabelClass}>Password<input className={adminInputClass} name="password" type="password" autoComplete="current-password" required minLength={8} /></label>
  </AdminForm>;
}
