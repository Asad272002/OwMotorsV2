"use server";

import { revalidatePath } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { databaseAction, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import {
  staffUserSchema, staffUserUpdateSchema, revokeUserSchema,
  partSchema, stockMovementSchema, stockMovementApprovalSchema,
  customerSchema, saleInitiateSchema, salePaymentSchema,
  saleApprovalSchema, receiptGenerationSchema, receiptPrintSchema,
  variantQuickUpdateSchema,
} from "@/lib/admin/schemas";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { PaymentMethod, SaleStatus, StockApprovalStatus } from "@/lib/erp/types";
import type { Database } from "@/lib/supabase/database.types";
type ActivityRowInsert = Database["public"]["Tables"]["activity_logs"]["Insert"];

// Guaranteed activity writer: direct INSERT via service role (no RPC, no RLS).
// The previous rpc("log_activity") was being silently swallowed by try/catch
// because it required a "summary" column (not nullable) and some action values
// weren't in the enum — that's exactly why activity logs showed 0 entries.
async function writeActivity(params: {
  actorUserId: string;
  actorRole: string;
  action: string;
  summary: string;
  targetTable?: string | null;
  targetId?: string | null;
  metadata?: unknown;
}): Promise<void> {
  try {
    const now = new Date().toISOString();
    const row: ActivityRowInsert = {
      id: (typeof crypto !== "undefined" && "randomUUID" in (crypto ?? {}) ? crypto.randomUUID() : undefined),
      action: params.action as never,
      actor_id: params.actorUserId,
      actor_role: (params.actorRole || null) as never,
      target_table: params.targetTable ?? null,
      target_id: params.targetId ?? null,
      summary: params.summary,
      metadata: (params.metadata ?? null) as never,
      created_at: now,
    };
    const sb = serviceRoleClient();
    const { error } = await sb.from("activity_logs").insert(row);
    if (error) console.warn("activity_logs insert failed:", error.message, error.details, error.hint, JSON.stringify(row));
  } catch (e) {
    console.warn("activity_logs catch:", e instanceof Error ? e.message : String(e));
  }
}

// ==============================================
// SERVICE ROLE CLIENT - for auth admin user creation
// ==============================================

type ServiceRoleClient = SupabaseClient<Database>;

function serviceRoleClient(): ServiceRoleClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) throw new Error("ERP server error: service role unavailable");
  const { url } = getSupabaseConfig();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
  }) as ServiceRoleClient;
}

function revalidateERP() {
  revalidatePath("/admin", "layout");
}

// ==============================================
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
// PARTS INVENTORY (MANAGER+)
// ==============================================

export async function createOrUpdatePart(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = partSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());
  const values = {
    sku: parsed.data.sku, name: parsed.data.name, description: parsed.data.description,
    category: parsed.data.category, unit: parsed.data.unit, current_stock: parsed.data.currentStock,
    reorder_level: parsed.data.reorderLevel, unit_cost: parsed.data.unitCost,
    location: parsed.data.location, is_active: parsed.data.isActive,
    created_by: actor.userId
  };
  type DbErr = { code?: string; message?: string };
  let err: DbErr | null = null;
  if (parsed.data.id) {
    const { created_by, ...updateValues } = values;
    void created_by;
    ({ error: err } = await supabase.from("parts").update(updateValues).eq("id", parsed.data.id));
  } else {
    ({ error: err } = await supabase.from("parts").insert(values));
  }
  if (err) return databaseAction("createOrUpdatePart", err);
  revalidateERP();
  return { status: "success", message: parsed.data.id ? "Part updated." : "Part created." };
}

// ==============================================
// STOCK MOVEMENTS (MANAGER creates requests, ADMIN approves)
// ==============================================

export async function requestStockMovement(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;

  const raw = Object.fromEntries(formData);
  const targetType = String(raw.targetType ?? "variant");
  const movementFriendly = String(raw.movementType ?? "addition");
  const formVariantId = String(raw.variantId ?? "").trim();
  const formPartId = String(raw.partId ?? "").trim();
  const formUnitCost = String(raw.unitCost ?? "").trim();
  const formReason = String(raw.reason ?? "").trim();
  const formNotes = String(raw.notes ?? "").trim();
  const formQuantity = String(raw.quantity ?? "1").trim();

  function combineMovement(target: string, friendly: string): string {
    const t = target === "part" ? "part" : "motorcycle";
    const f = String(friendly).toLowerCase();
    if (f === "subtraction") return `${t}_subtract`;
    return `${t}_add`;
  }

  const normalized: Record<string, unknown> = {
    movementType: combineMovement(targetType, movementFriendly),
    motorcycleVariantId: formVariantId || undefined,
    partId: formPartId || undefined,
    quantity: formQuantity,
    unitCostAtTime: formUnitCost || undefined,
    reason: formReason,
    notes: formNotes || null,
    id: typeof raw.id === "string" && raw.id ? raw.id : undefined,
  };

  const parsed = stockMovementSchema.safeParse(normalized);
  if (!parsed.success) return validationAction(parsed.error);

  // ==== k3 auto-fill unit cost from DB snapshot (if manager left blank) ====
  let resolvedUnitCostAtTime: number | null = parsed.data.unitCostAtTime ?? null;
  if (resolvedUnitCostAtTime == null || Number.isNaN(resolvedUnitCostAtTime) || Number(resolvedUnitCostAtTime) <= 0) {
    try {
      const lookup = serviceRoleClient();
      if (parsed.data.motorcycleVariantId) {
        const vCur = await lookup.from("motorcycle_variants").select("price").eq("id", parsed.data.motorcycleVariantId).maybeSingle();
        if (!vCur.error && vCur.data) {
          const p = Number((vCur.data as unknown as { price: number }).price) || 0;
          if (p > 0) resolvedUnitCostAtTime = p;
        }
      } else if (parsed.data.partId) {
        const pCur = await lookup.from("parts").select("unit_cost").eq("id", parsed.data.partId).maybeSingle();
        if (!pCur.error && pCur.data) {
          const u = Number((pCur.data as unknown as { unit_cost: number }).unit_cost) || 0;
          if (u > 0) resolvedUnitCostAtTime = u;
        }
      }
    } catch { /* noop; null is acceptable if DB lookup fails */ }
  }

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());

  const insertPayload: Database["public"]["Tables"]["stock_movements"]["Insert"] = {
    movement_type: parsed.data.movementType as Database["public"]["Enums"]["stock_movement_type"],
    motorcycle_variant_id: parsed.data.motorcycleVariantId || null,
    part_id: parsed.data.partId || null,
    quantity: parsed.data.quantity,
    unit_cost_at_time: resolvedUnitCostAtTime,
    reason: parsed.data.reason,
    notes: parsed.data.notes ?? null,
    requested_by: actor.userId,
    approval_status: "pending_approval",
  };

  const { error } = await supabase.from("stock_movements").insert(insertPayload);
  if (error) return databaseAction("requestStockMovement", error);

  try {
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "stock_requested",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} created stock change request — ${parsed.data.movementType} × ${parsed.data.quantity}. Variant #${parsed.data.motorcycleVariantId?.slice(0, 8) ?? "-"} / Part #${parsed.data.partId?.slice(0, 8) ?? "-"}. Unit cost snapshot PKR ${resolvedUnitCostAtTime ?? 0}.`,
      targetTable: "stock_movements",
      targetId: null,
      metadata: {
        movement_type: parsed.data.movementType,
        motorcycle_variant_id: parsed.data.motorcycleVariantId ?? null,
        part_id: parsed.data.partId ?? null,
        quantity: parsed.data.quantity,
        unit_cost_at_time: resolvedUnitCostAtTime,
        reason: parsed.data.reason,
      },
    });
  } catch { /* noop */ }

  revalidateERP();
  return { status: "success", message: "Stock change submitted for admin approval." };
}

export async function decideStockMovement(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;

  const raw = Object.fromEntries(formData);
  const normalizedId: Record<string, unknown> = {
    id: String(raw.movementId ?? raw.id ?? "").trim(),
    decision: String(raw.decision ?? "approved"),
    rejectionReason: String(raw.rejectionReason ?? "").trim(),
  };

  const parsed = stockMovementApprovalSchema.safeParse(normalizedId);
  if (!parsed.success) return validationAction(parsed.error);

  const sbService = serviceRoleClient();
  const movementRes = await sbService
    .from("stock_movements")
    .select(`*, motorcycle_variant_id, part_id, quantity, movement_type, approval_status, applied`)
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (movementRes.error || !movementRes.data) {
    return databaseAction("decideStockMovement load", movementRes.error ?? new Error("Movement not found"));
  }
  const m = movementRes.data;
  if (m.approval_status !== "pending_approval") {
    return { status: "error", message: "Movement already processed." };
  }

  const isApproved = parsed.data.decision === "approved";
  let variantDeltaQty = 0;
  let partDeltaQty = 0;
  if (isApproved && !m.applied) {
    const movement = String(m.movement_type ?? "");
    let sign = 0;
    if (movement.endsWith("_add")) sign = 1;
    else if (movement.endsWith("_subtract")) sign = -1;
    if (sign !== 0) {
      const delta = sign * Number(m.quantity) || 0;
      if (m.motorcycle_variant_id) variantDeltaQty = delta;
      else if (m.part_id) partDeltaQty = delta;
    }
  }

  const nowIso = new Date().toISOString();
  const updateBase: Database["public"]["Tables"]["stock_movements"]["Update"] = isApproved
    ? {
        approval_status: "approved",
        approved_by: actor.userId,
        approved_at: nowIso,
        applied: true,
      }
    : {
        approval_status: "rejected",
        rejected_by: actor.userId,
        rejected_at: nowIso,
        rejection_reason: (parsed.data.rejectionReason && parsed.data.rejectionReason.length >= 3 ? parsed.data.rejectionReason : null) as string | null,
      };

  try {
    const { error: updErr } = await sbService.from("stock_movements").update(updateBase).eq("id", parsed.data.id);
    if (updErr) return databaseAction("decideStockMovement status", updErr);

    if (isApproved) {
      if (variantDeltaQty !== 0 && m.motorcycle_variant_id) {
        const cur = await sbService.from("motorcycle_variants").select("quantity, stock_status").eq("id", m.motorcycle_variant_id).maybeSingle();
        if (cur.error || !cur.data) return { status: "error", message: "Variant not found." };
        const row = cur.data as unknown as { quantity: number; stock_status: string };
        const oldQty = Number(row.quantity) || 0;
        const newQty = Math.max(0, oldQty + variantDeltaQty);
        const newStatus: "in_stock" | "out_of_stock"
          = newQty <= 0 ? "out_of_stock" : "in_stock";
        const { error: vErr } = await sbService
          .from("motorcycle_variants")
          .update({ quantity: newQty, stock_status: newStatus })
          .eq("id", m.motorcycle_variant_id);
        if (vErr) return databaseAction("Variant stock update", vErr);
      }
      if (partDeltaQty !== 0 && m.part_id) {
        const cur = await sbService.from("parts").select("current_stock").eq("id", m.part_id).maybeSingle();
        if (cur.error || !cur.data) return { status: "error", message: "Part not found." };
        const row = cur.data as unknown as { current_stock: number };
        const oldQty = Number(row.current_stock) || 0;
        const newQty = Math.max(0, oldQty + partDeltaQty);
        const { error: pErr } = await sbService
          .from("parts")
          .update({ current_stock: newQty })
          .eq("id", m.part_id);
        if (pErr) return databaseAction("Part stock update", pErr);
      }
    }
  } catch (applyCatch) {
    const msg = applyCatch instanceof Error ? applyCatch.message : String(applyCatch ?? "Apply failed");
    return { status: "error", message: msg };
  }

  if (isApproved) {
    try {
      await writeActivity({
        actorUserId: actor.userId,
        actorRole: actor.profile.role,
        action: "stock_approved",
        summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} approved stock change #${parsed.data.id.slice(0, 8)} (${m.movement_type}) — variant +${variantDeltaQty}, parts +${partDeltaQty} net delta applied to inventory.`,
        targetTable: "stock_movements",
        targetId: parsed.data.id,
        metadata: {
          movement_type: m.movement_type,
          variant_id: m.motorcycle_variant_id,
          part_id: m.part_id,
          quantity: m.quantity,
          delta_variant: variantDeltaQty,
          delta_part: partDeltaQty,
        },
      });
      await writeActivity({
        actorUserId: actor.userId,
        actorRole: actor.profile.role,
        action: "stock_applied",
        summary: `Inventory sync: ${m.movement_type} movement #${parsed.data.id.slice(0, 8)} applied live to stock tables.`,
        targetTable: m.motorcycle_variant_id ? "motorcycle_variants" : "parts",
        targetId: m.motorcycle_variant_id ?? m.part_id ?? null,
        metadata: { variant_delta: variantDeltaQty, part_delta: partDeltaQty, qty: m.quantity },
      });
    } catch { /* noop */ }
  } else {
    try {
      await writeActivity({
        actorUserId: actor.userId,
        actorRole: actor.profile.role,
        action: "stock_rejected",
        summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} rejected stock movement #${parsed.data.id.slice(0, 8)} — reason: ${(parsed.data.rejectionReason || "(none provided)").slice(0, 140)}`,
        targetTable: "stock_movements",
        targetId: parsed.data.id,
        metadata: { rejection_reason: parsed.data.rejectionReason ?? null },
      });
    } catch { /* noop */ }
  }

  revalidateERP();
  return {
    status: "success",
    message: isApproved
      ? `Stock movement applied.${variantDeltaQty !== 0 ? ` Bike variant stock ${variantDeltaQty > 0 ? "+" : ""}${variantDeltaQty}.` : ""}${partDeltaQty !== 0 ? ` Part stock ${partDeltaQty > 0 ? "+" : ""}${partDeltaQty}.` : ""}`
      : "Stock movement rejected.",
  };
}

// ==============================================
// VARIANT PRICE / STOCK QUICK ADMIN UPDATE
// Admin + Developer only. Manager/Apprentice blocked.
// Used by Stock Availability dashboard inline row editor.
// ==============================================
export async function updateVariantDetails(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;

  const raw = Object.fromEntries(formData);
  const input: Record<string, unknown> = {
    variantId: String(raw.variantId ?? "").trim(),
    price: String(raw.price ?? "").trim() || 0,
    quantity: String(raw.quantity ?? "").trim() || undefined,
    stockStatus: String(raw.stockStatus ?? "").trim() || undefined,
  };

  const parsed = variantQuickUpdateSchema.safeParse(input);
  if (!parsed.success) return validationAction(parsed.error);

  const sbService = serviceRoleClient();
  const existCheck = await sbService
    .from("motorcycle_variants")
    .select("id, price, quantity, stock_status")
    .eq("id", parsed.data.variantId)
    .maybeSingle();
  if (existCheck.error || !existCheck.data) return { status: "error", message: "Variant not found." };
  const row = existCheck.data as unknown as { id: string; price: number; quantity: number; stock_status: string };

  const payload: Database["public"]["Tables"]["motorcycle_variants"]["Update"] = {
    price: parsed.data.price,
  };
  if (typeof parsed.data.quantity === "number") payload.quantity = Math.max(0, parsed.data.quantity);
  if (parsed.data.stockStatus) payload.stock_status = parsed.data.stockStatus as "in_stock" | "out_of_stock" | "coming_soon" | "discontinued";

  if (typeof parsed.data.quantity === "number" && !payload.stock_status) {
    const qty = Number(payload.quantity);
    payload.stock_status = qty <= 0 ? "out_of_stock" : "in_stock";
  }

  const { error } = await sbService.from("motorcycle_variants").update(payload).eq("id", parsed.data.variantId);
  if (error) return databaseAction("updateVariantDetails", error);

  try {
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "variant_updated",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} updated variant pricing/stock for variant #${parsed.data.variantId.slice(0, 8)} price PKR ${row.price ?? 0} → PKR ${payload.price ?? 0}; qty ${row.quantity ?? 0} → ${typeof payload.quantity === "number" ? payload.quantity : "(unchanged)"}.`,
      targetTable: "motorcycle_variants",
      targetId: parsed.data.variantId,
      metadata: {
        old_price: row.price,
        new_price: payload.price,
        old_quantity: row.quantity,
        new_quantity: payload.quantity,
      },
    });
  } catch { /* noop */ }

  revalidateERP();
  return { status: "success", message: "Variant details updated." };
}

// ==============================================
// CUSTOMERS (MANAGER CRUD, APPRENTICE read)
// ==============================================

export async function createOrUpdateCustomer(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());
  const values = {
    cnic: parsed.data.cnic, full_name: parsed.data.fullName,
    phone_primary: parsed.data.phonePrimary, phone_secondary: parsed.data.phoneSecondary,
    email: parsed.data.email, address: parsed.data.address, city: parsed.data.city,
    notes: parsed.data.notes, created_by: actor.userId
  };
  type DbErr = { code?: string; message?: string };
  let err: DbErr | null = null;
  if (parsed.data.id) {
    const { created_by, ...updateValues } = values;
    void created_by;
    ({ error: err } = await supabase.from("customers").update(updateValues).eq("id", parsed.data.id));
  } else {
    ({ error: err } = await supabase.from("customers").insert(values));
  }
  if (err) return databaseAction("createOrUpdateCustomer", err);
  revalidateERP();
  return { status: "success", message: parsed.data.id ? "Customer updated." : "Customer created." };
}

// ==============================================
// SALES WORKFLOW
// Manager initiates sale + records payments.
// Admin approves sale (triggers stock deduction + receipt generation unlock).
// ==============================================

export async function initiateSale(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = saleInitiateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();

  // 1. Determine customer (create new inline if needed)
  let customerId = "";
  if (parsed.data.useExistingCustomer) {
    customerId = parsed.data.customerId || "";
    if (!customerId) return { status: "error", message: "Select existing customer." };
    const existCheck = await sb.from("customers").select("id").eq("id", customerId).maybeSingle();
    if (existCheck.error || !existCheck.data) return { status: "error", message: "Selected customer not found." };
  } else {
    // New customer inline. Handle CNIC dup: SELECT existing if CNIC already present, else INSERT.
    const cnic = String(parsed.data.newCustomer_cnic ?? "").replace(/[^0-9]/g, "");
    const phoneP = String(parsed.data.newCustomer_phonePrimary ?? "").trim();
    const phoneS = String(parsed.data.newCustomer_phoneSecondary ?? "").trim();
    const city = String(parsed.data.newCustomer_city ?? "").trim() || null;
    const address = String(parsed.data.newCustomer_address ?? "").trim() || null;

    let existingCust: { id: string } | null = null;
    if (cnic.length >= 13) {
      const checkCnic = await sb.from("customers").select("id").eq("cnic", cnic).maybeSingle();
      if (!checkCnic.error && checkCnic.data) existingCust = checkCnic.data;
    }
    if (existingCust) {
      customerId = existingCust.id;
    } else {
      const { data: newCust, error: custErr } = await sb
        .from("customers")
        .insert({
          full_name: String(parsed.data.newCustomer_fullName ?? "").trim(),
          cnic,
          phone_primary: phoneP,
          phone_secondary: (phoneS && phoneS !== phoneP) ? phoneS : null,
          city,
          address,
        })
        .select("id")
        .maybeSingle();
      if (custErr || !newCust) return databaseAction("create customer inline", custErr ?? new Error("Failed to create new customer."));
      customerId = newCust.id;
    }
  }

  // 2. Lookup variant snapshot
  const { data: variant, error: vErr } = await sb
    .from("motorcycle_variants")
    .select("*, motorcycle:motorcycles(name, brand:brands(name))")
    .eq("id", parsed.data.motorcycleVariantId)
    .maybeSingle();
  if (vErr || !variant) return { status: "error", message: "Variant not found." };

  const unitPrice = parsed.data.unitPrice || 0;
  const qty = parsed.data.quantitySold || 1;
  const discount = parsed.data.discountAmount || 0;
  const total = Math.max(0, unitPrice * qty - discount);

  // 3. Generate SALE reference number: OWM-SALE-YYMMDDHHMMSSmmmRRR (all digits after prefix, ≥6 required)
  function generateSaleRef(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const yymmdd = String(now.getFullYear() - 2000).padStart(2, "0") + pad(now.getMonth() + 1) + pad(now.getDate());
    const hhmmssmmm = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + pad(now.getMilliseconds(), 3);
    const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return "OWM-SALE-" + yymmdd + hhmmssmmm + rnd;
  }
  const receiptNumber = generateSaleRef();

  type VariantWithJoins = {
    motorcycle?: { name?: string; brand?: { name?: string } | null } | null;
  };
  const v = variant as unknown as VariantWithJoins;
  const { data: insertedSale, error } = await sb.from("sales").insert({
    receipt_number: receiptNumber,
    customer_id: customerId,
    motorcycle_variant_id: parsed.data.motorcycleVariantId,
    motorcycle_name_snapshot: v.motorcycle?.name ?? "Unknown",
    brand_name_snapshot: v.motorcycle?.brand?.name ?? "Unknown",
    color_name_snapshot: variant.color_name ?? null,
    color_hex_snapshot: variant.color_hex ?? null,
    cc_snapshot: variant.cc ?? null,
    chasis_number: parsed.data.chasisNumber,
    engine_number: parsed.data.engineNumber ?? null,
    quantity_sold: qty,
    unit_price: unitPrice,
    discount_amount: discount,
    total_amount: total,
    requested_by: actor.userId,
    sale_status: "pending_approval" satisfies SaleStatus,
    notes: parsed.data.notes ?? null,
  }).select("id").maybeSingle();
  if (error) return databaseAction("initiateSale", error);
  const saleId = insertedSale?.id;
  if (!saleId) return { status: "error", message: "Sale creation failed (no id returned)." };

  // 4. Record any positive payment splits in the same submit (no extra clicks needed)
  let recordedPayments = 0;
  const payments = (parsed.data.paymentsJson ?? []).filter(p => Number(p.amount) > 0);
  const BANK_REQUIRED_METHODS: readonly PaymentMethod[] = ["bank_transfer", "cheque", "demand_draft", "pay_order", "card"];
  function serverTxnRef(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const ts = String(now.getFullYear() - 2000).padStart(2, "0")
      + pad(now.getMonth() + 1) + pad(now.getDate())
      + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + pad(now.getMilliseconds(), 3);
    const rnd = String(Math.floor(Math.random() * 900) + 100);
    return "OWM-TXN-" + ts + "-" + rnd;
  }
  if (payments.length > 0) {
    for (const p of payments) {
      let bankNameSnapshot: string | null = null;
      if (p.bankId && p.bankId.length > 5) {
        const b = await sb.from("banks").select("name").eq("id", p.bankId).maybeSingle();
        bankNameSnapshot = (b.data as { name?: string } | null)?.name ?? null;
      }
      const method = (["cash","bank_transfer","cheque","demand_draft","pay_order","easypaisa","jazzcash","sadapay","card","other"].includes(p.paymentMethod)
        ? p.paymentMethod
        : "other") as PaymentMethod;
      const bankRequired = BANK_REQUIRED_METHODS.includes(method);
      const finalTxnRef: string | null = (p.transactionReference && p.transactionReference.trim() ? p.transactionReference.trim() : (!bankRequired ? serverTxnRef() : null));
      const insErr = (await sb.from("sale_payments").insert({
        sale_id: saleId,
        payment_method: method,
        bank_id: (p.bankId && p.bankId.length > 5) ? p.bankId : null,
        bank_name_snapshot: bankNameSnapshot,
        transaction_reference: finalTxnRef,
        instrument_number: p.instrumentNumber ?? null,
        amount: Number(p.amount) || 0,
        payment_date: (p.paymentDate ?? new Date()).toISOString(),
        depositor_name: p.depositorName ?? null,
        account_number_used: p.accountNumberUsed ?? null,
        notes: p.notes ?? null,
        recorded_by: actor.userId,
      })).error;
      if (!insErr) recordedPayments += 1;
    }
  }

  revalidateERP();
  return { status: "success", message: `Sale ${receiptNumber} submitted for approval. ${recordedPayments} payment split(s) attached.` };
}

export async function recordSalePayment(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = salePaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());

  let bankSnapshot: string | null = null;
  if (parsed.data.bankId) {
    const { data } = await supabase.from("banks").select("name").eq("id", parsed.data.bankId).maybeSingle();
    bankSnapshot = (data as { name?: string } | null)?.name ?? null;
  }

  const { error } = await supabase.from("sale_payments").insert({
    sale_id: parsed.data.saleId,
    payment_method: parsed.data.paymentMethod as PaymentMethod,
    bank_id: parsed.data.bankId || null,
    bank_name_snapshot: bankSnapshot,
    transaction_reference: parsed.data.transactionReference,
    instrument_number: parsed.data.instrumentNumber,
    amount: parsed.data.amount,
    payment_date: parsed.data.paymentDate.toISOString(),
    depositor_name: parsed.data.depositorName,
    account_number_used: parsed.data.accountNumberUsed,
    notes: parsed.data.notes,
    recorded_by: actor.userId,
  });
  if (error) return databaseAction("recordSalePayment", error);
  revalidateERP();
  return { status: "success", message: "Payment recorded." };
}

export async function decideSale(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = saleApprovalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();
  const now = new Date().toISOString();
  const update = (parsed.data.decision === "approved"
    ? { sale_status: "approved" satisfies SaleStatus, approved_by: actor.userId, approved_at: now }
    : { sale_status: "rejected" satisfies SaleStatus, rejected_by: actor.userId, rejected_at: now, rejection_reason: parsed.data.rejectionReason || null }
  ) as unknown as Database["public"]["Tables"]["sales"]["Update"];
  const { error } = await sb.from("sales").update(update).eq("id", parsed.data.id);
  if (error) return databaseAction("decideSale", error);
  revalidateERP();
  return { status: "success", message: `Sale ${parsed.data.decision}. Stock will be deducted automatically.` };
}

export async function markSaleCompleted(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const id = formData.get("id")?.toString();
  if (!id) return { status: "error", message: "Sale ID missing." };

  const sb = serviceRoleClient();
  const completeUpdate = { sale_status: "completed" satisfies SaleStatus, completed_at: new Date().toISOString() } as unknown as Database["public"]["Tables"]["sales"]["Update"];
  const { error } = await sb
    .from("sales")
    .update(completeUpdate)
    .eq("id", id)
    .eq("sale_status", "approved");
  if (error) return databaseAction("markSaleCompleted", error);
  revalidateERP();
  return { status: "success", message: "Sale marked completed." };
}

// ==============================================
// RECEIPT GENERATION
// ==============================================

export async function generateReceipt(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer", "manager"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = receiptGenerationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();
  const { data: saleRaw, error: sErr } = await sb
    .from("sales")
    .select("sale_status, receipt_number, receipt_generated")
    .eq("id", parsed.data.saleId)
    .maybeSingle();
  if (sErr || !saleRaw) return { status: "error", message: "Sale not found." };
  const sale = saleRaw as { sale_status: string; receipt_number: string; receipt_generated: boolean | null };
  if (sale.sale_status !== "approved" && sale.sale_status !== "completed") return { status: "error", message: "Receipt can only be generated after admin approval." };
  if (sale.receipt_generated) return { status: "error", message: "A receipt already exists for this sale." };

  function generateRcptRef(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const yymmdd = String(now.getFullYear() - 2000).padStart(2, "0") + pad(now.getMonth() + 1) + pad(now.getDate());
    const hhmmssmmm = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + pad(now.getMilliseconds(), 3);
    const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return "OWM-RCPT-" + yymmdd + hhmmssmmm + rnd;
  }
  let receiptNumber: string;
  try {
    const { data, error: rpcErr } = await sb.rpc("generate_receipt_number", { p_prefix: "OWM-RCPT-" });
    if (!rpcErr && typeof data === "string" && /^OWM-RCPT-[0-9]{6,}$/.test(data)) {
      receiptNumber = data;
    } else {
      receiptNumber = generateRcptRef();
    }
  } catch {
    receiptNumber = generateRcptRef();
  }

  const qr = JSON.stringify({
    r: receiptNumber, s: sale.receipt_number, a: actor.userId.slice(0, 8) });

  const sb2 = serviceRoleClient();
  const { error } = await sb2.from("receipts").insert({
    sale_id: parsed.data.saleId,
    receipt_number: receiptNumber,
    generated_by: actor.userId,
    qr_code_payload: qr,
  });
  if (error) return databaseAction("generateReceipt", error);
  const { error: updErr } = await sb2.from("sales").update({ receipt_generated: true, sale_status: "completed" satisfies SaleStatus }).eq("id", parsed.data.saleId);
  if (updErr) return databaseAction("mark sale completed after receipt", updErr);
  revalidateERP();
  return { status: "success", message: `Receipt ${receiptNumber} generated.`, data: { receiptNumber } };
}

export async function incrementReceiptPrint(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor) return unauthorizedAction;
  const parsed = receiptPrintSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());
  const now = new Date().toISOString();
  const { error } = await supabase.rpc("increment_receipt_print_count", { p_receipt_id: parsed.data.receiptId, p_printed_at: now });
  if (error && error.code !== "42883") {
    const { error: updateErr } = await supabase
      .from("receipts")
      .update({ last_printed_at: now })
      .eq("id", parsed.data.receiptId);
    if (updateErr) return databaseAction("incrementReceiptPrint", updateErr);
  } else if (error && error.code === "42883") {
    return { status: "success", message: "Print recorded." };
  }
  if (error) return databaseAction("incrementReceiptPrint", error);
  return { status: "success", message: "Print recorded." };
}
