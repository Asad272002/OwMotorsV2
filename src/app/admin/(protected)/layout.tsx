import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell.client";
import { requireStaffPage } from "@/lib/admin/auth";
import { getAdminActionCounts } from "@/lib/erp/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s | OW Motors Admin" }, robots: { index: false, follow: false, nocache: true } };

export default async function ProtectedAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actor = await requireStaffPage();
  const actionCounts = await getAdminActionCounts();
  return <AdminShell actorName={actor.profile.full_name} actorRole={actor.profile.role} actionCounts={actionCounts}>{children}</AdminShell>;
}