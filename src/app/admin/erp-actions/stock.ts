"use server";

import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { databaseAction, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { partSchema, stockMovementApprovalSchema, stockMovementSchema, variantQuickUpdateSchema } from "@/lib/admin/schemas";
import { revalidateERP, serviceRoleClient, writeActivity } from "@/lib/admin/erp-action-runtime";
import type { Database } from "@/lib/supabase/database.types";

// PARTS INVENTORY (MANAGER+)
// ==============================================

export async function createOrUpdatePart(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = partSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());
  const compatibleMotorcycleId = parsed.data.compatibleMotorcycleId || null;
  let compatibleBrandId = parsed.data.compatibleBrandId || null;
  if (compatibleMotorcycleId) {
    const bike = await supabase
      .from("motorcycles")
      .select("brand_id")
      .eq("id", compatibleMotorcycleId)
      .maybeSingle();
    const brandId = (bike.data as { brand_id?: string | null } | null)?.brand_id ?? null;
    if (brandId) compatibleBrandId = brandId;
  }
  const values = {
    sku: parsed.data.sku, name: parsed.data.name, description: parsed.data.description,
    category: parsed.data.category, unit: parsed.data.unit, current_stock: parsed.data.currentStock,
    reorder_level: parsed.data.reorderLevel, unit_cost: parsed.data.unitCost,
    compatible_brand_id: compatibleBrandId,
    compatible_motorcycle_id: compatibleMotorcycleId,
    location: parsed.data.location, is_active: parsed.data.isActive,
    created_by: actor.userId
  };
  type DbErr = { code?: string; message?: string };
  let err: DbErr | null = null;
  if (parsed.data.id) {
    const { created_by, ...updateValues } = values;
    void created_by;
    ({ error: err } = await supabase.from("parts").update(updateValues).eq("id", parsed.data.id));
    if (err?.code === "42703") {
      const { compatible_brand_id, compatible_motorcycle_id, ...legacyValues } = updateValues;
      void compatible_brand_id;
      void compatible_motorcycle_id;
      ({ error: err } = await supabase.from("parts").update(legacyValues).eq("id", parsed.data.id));
    }
  } else {
    ({ error: err } = await supabase.from("parts").insert(values));
    if (err?.code === "42703") {
      const { compatible_brand_id, compatible_motorcycle_id, ...legacyValues } = values;
      void compatible_brand_id;
      void compatible_motorcycle_id;
      ({ error: err } = await supabase.from("parts").insert(legacyValues));
    }
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

  const { data: insertedMovement, error } = await supabase.from("stock_movements").insert(insertPayload).select("id").maybeSingle();
  if (error) return databaseAction("requestStockMovement", error);
  const movementId = (insertedMovement as { id?: string } | null)?.id ?? null;

  try {
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "stock_requested",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} created stock change request — ${parsed.data.movementType} × ${parsed.data.quantity}. Variant #${parsed.data.motorcycleVariantId?.slice(0, 8) ?? "-"} / Part #${parsed.data.partId?.slice(0, 8) ?? "-"}. Unit cost snapshot PKR ${resolvedUnitCostAtTime ?? 0}.`,
      targetTable: "stock_movements",
      targetId: movementId,
      metadata: {
        event: "stock_change_requested",
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
  try {
    if (isApproved) {
      if (variantDeltaQty !== 0 && m.motorcycle_variant_id) {
        const cur = await sbService.from("motorcycle_variants").select("quantity, stock_status").eq("id", m.motorcycle_variant_id).maybeSingle();
        if (cur.error || !cur.data) return { status: "error", message: "Variant not found." };
        const row = cur.data as unknown as { quantity: number; stock_status: string };
        const oldQty = Number(row.quantity) || 0;
        if (variantDeltaQty < 0 && oldQty + variantDeltaQty < 0) {
          return { status: "error", message: `Cannot approve: bike stock has ${oldQty} unit(s), request subtracts ${Math.abs(variantDeltaQty)}.` };
        }
        const newQty = oldQty + variantDeltaQty;
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
        if (partDeltaQty < 0 && oldQty + partDeltaQty < 0) {
          return { status: "error", message: `Cannot approve: part stock has ${oldQty} unit(s), request subtracts ${Math.abs(partDeltaQty)}.` };
        }
        const newQty = oldQty + partDeltaQty;
        const { error: pErr } = await sbService
          .from("parts")
          .update({ current_stock: newQty })
          .eq("id", m.part_id);
        if (pErr) return databaseAction("Part stock update", pErr);
      }
    }

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
    const { error: updErr } = await sbService.from("stock_movements").update(updateBase).eq("id", parsed.data.id);
    if (updErr) return databaseAction("decideStockMovement status", updErr);
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
