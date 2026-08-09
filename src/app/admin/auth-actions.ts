"use server";

import { redirect } from "next/navigation";
import type { AdminActionState } from "@/lib/admin/action-state";
import { loginSchema } from "@/lib/admin/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/supabase/database.types";

const ALLOWED_DASHBOARD_ROLES: readonly ProfileRole[] = ["developer", "admin", "manager", "apprentice"] as const;

export async function loginAdmin(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter a valid email address and password.", errors: parsed.error.flatten().fieldErrors };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { status: "error", message: "The email or password is incorrect." };

  const { data: profile, error: profileError } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (profileError || !profile?.is_active || !(ALLOWED_DASHBOARD_ROLES as readonly string[]).includes(profile.role)) {
    await supabase.auth.signOut();
    return { status: "error", message: "This account does not have active OW Motors dashboard access." };
  }
  redirect("/admin");
}

export async function logoutAdmin() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
