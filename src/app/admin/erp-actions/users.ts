"use server";

import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { databaseAction, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { revokeUserSchema, staffUserSchema, staffUserUpdateSchema } from "@/lib/admin/schemas";
import { revalidateERP, serviceRoleClient, writeActivity } from "@/lib/admin/erp-action-runtime";
import type { Database } from "@/lib/supabase/database.types";

async function getManagedProfileOrError(sb: ReturnType<typeof serviceRoleClient>, targetId: string, actorRole: string): Promise<{ profile?: { id: string; full_name: string | null; role: string }; error?: AdminActionState }> {
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", targetId)
    .maybeSingle();
  if (error) return { error: databaseAction("readStaffProfile", error) };
  if (!data) return { error: { status: "error", message: "User account not found." } };
  const profile = data as { id: string; full_name: string | null; role: string };
  if (profile.role === "developer" && actorRole !== "developer") {
    return { error: { status: "error", message: "Developer access is protected. Admins cannot view, edit, reset, or revoke the developer login." } };
  }
  return { profile };
}
// USER MANAGEMENT (ADMIN+)
// ==============================================

export async function createStaffUser(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role) || !actor.profile.is_active) {
    return unauthorizedAction;
  }
  const parsed = staffUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  try {
    const sb = serviceRoleClient();
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName, role: parsed.data.role }
    });
    if (authErr) return { status: "error", message: authErr.message };

    const { error: profileErr } = await sb
      .from("profiles")
      .insert({
        id: authData.user.id,
        full_name: parsed.data.fullName,
        role: parsed.data.role,
        is_active: true,
        created_by: actor.userId,
        created_password: parsed.data.password,
      });
    if (profileErr) {
      await sb.auth.admin.deleteUser(authData.user.id).catch(() => null);
      return databaseAction("createStaffUser profile", profileErr);
    }

    try {
      await writeActivity({
        actorUserId: actor.userId,
        actorRole: actor.profile.role,
        action: "user_created",
        summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} created new ${parsed.data.role.toUpperCase()} account for ${parsed.data.email}.`,
        targetTable: "profiles",
        targetId: authData.user.id,
        metadata: { role: parsed.data.role, email: parsed.data.email },
      });
    } catch { /* noop */ }

    revalidateERP();
    return {
      status: "success",
      message: `${parsed.data.role.toUpperCase()} created. Login: ${parsed.data.email} / ${parsed.data.password}`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? "Failed to create user.");
    return { status: "error", message: msg };
  }
}

export async function updateStaffUser(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role) || !actor.profile.is_active) {
    return unauthorizedAction;
  }
  const parsed = staffUserUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  try {
    const sb = serviceRoleClient();
    const target = await getManagedProfileOrError(sb, parsed.data.id, actor.profile.role);
    if (target.error) return target.error;
    const updates: Record<string, unknown> = {};
    if (parsed.data.fullName) updates.full_name = parsed.data.fullName;
    if (parsed.data.role) updates.role = parsed.data.role;
    if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive;

    if (Object.keys(updates).length) {
      const typedUpdate = updates as unknown as Database["public"]["Tables"]["profiles"]["Update"];
      const { error } = await sb.from("profiles").update(typedUpdate).eq("id", parsed.data.id);
      if (error) return databaseAction("updateStaffUser", error);
    }
    if (parsed.data.newPassword && parsed.data.newPassword.length >= 8) {
      const { error } = await sb.auth.admin.updateUserById(parsed.data.id, { password: parsed.data.newPassword });
      if (error) return { status: "error", message: error.message };
      const pwUpdate = { created_password: parsed.data.newPassword } as unknown as Database["public"]["Tables"]["profiles"]["Update"];
      await sb.from("profiles").update(pwUpdate).eq("id", parsed.data.id);
    }
    revalidateERP();
    return { status: "success", message: "User updated." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? "Update failed.");
    return { status: "error", message: msg };
  }
}

export async function revokeStaffAccess(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = revokeUserSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { status: "error", message: "Invalid user ID." };
  if (parsed.data.id === actor.userId) return { status: "error", message: "You cannot revoke your own access." };

  const sb = serviceRoleClient();
  const target = await getManagedProfileOrError(sb, parsed.data.id, actor.profile.role);
  if (target.error) return target.error;
  const revokeUpdate = {
    is_active: false,
    revoked_at: new Date().toISOString(),
    revoked_by: actor.userId,
  } as unknown as Database["public"]["Tables"]["profiles"]["Update"];
  const { error } = await sb
    .from("profiles")
    .update(revokeUpdate)
    .eq("id", parsed.data.id);
  if (error) return databaseAction("revokeStaffAccess", error);

  try {
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "user_revoked",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} revoked staff access for user ${parsed.data.id.slice(0, 8)}.`,
      targetTable: "profiles",
      targetId: parsed.data.id,
    });
  } catch { /* noop */ }

  revalidateERP();
  return { status: "success", message: "User access revoked." };
}

// ==============================================
