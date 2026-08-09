import "server-only";

import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/supabase/database.types";

const ALLOWED_DASHBOARD_ROLES: readonly ProfileRole[] = ["developer", "admin", "manager", "apprentice"] as const;
const ADMIN_PLUS_ROLES: readonly ProfileRole[] = ["developer", "admin"] as const;

export async function getStaffActor() {
  const actor = await getAuthenticatedProfile();
  if (!actor || !actor.profile.is_active) return null;
  if (!(ALLOWED_DASHBOARD_ROLES as readonly string[]).includes(actor.profile.role)) return null;
  return actor;
}

export async function requireStaffPage() {
  const actor = await getStaffActor();
  if (!actor) redirect("/admin/login");
  return actor;
}

export async function getAuthorizedAdminClient(requiredRole: "staff" | "admin" = "staff") {
  const actor = await getStaffActor();
  if (!actor) return null;
  if (requiredRole === "admin" && !(ADMIN_PLUS_ROLES as readonly string[]).includes(actor.profile.role)) return null;
  return { actor, supabase: await createServerSupabaseClient() };
}
