"use server";

import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { databaseAction, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { partReceiptGenerationSchema, partSaleApprovalSchema, partSaleSchema, partSchema, simpleBikeStockEditSchema, simpleBikeStockSchema, stockMovementApprovalSchema, stockMovementSchema, variantArchiveSchema, variantQuickUpdateSchema } from "@/lib/admin/schemas";
import { revalidateERP, serviceRoleClient, writeActivity } from "@/lib/admin/erp-action-runtime";
import type { Database } from "@/lib/supabase/database.types";


function formatBikeStockLabel(brandName: string, modelName: string, cc?: number | string | null, colorName?: string | null): string {
  const model = String(modelName ?? "").trim();
  const brand = String(brandName ?? "").trim();
  const modelWithBrand = brand && model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`.trim();
  return `${modelWithBrand} ${cc ?? ""}cc ${colorName ?? ""}`.replace(/\s+/g, " ").trim();
}
function slugifyStockName(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || `bike-${Date.now()}`;
}
function generatePartSaleNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  const tail = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `OWM-PART-${yy}${mm}${dd}${hh}${mi}${ss}${ms}${tail}`;
}

// ==============================================
// SIMPLE BIKE STOCK ENTRY (MANAGER+)
// ==============================================

export async function createSimpleBikeStock(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;

  const parsed = simpleBikeStockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();
  const brandRes = await sb.from("brands").select("id, name, slug, is_active").eq("id", parsed.data.brandId).maybeSingle();
  if (brandRes.error || !brandRes.data) return { status: "error", message: "Select a valid existing brand." };
  const brand = brandRes.data as { id: string; name: string; slug?: string | null; is_active?: boolean | null };
  if (brand.is_active === false) return { status: "error", message: "This brand is inactive. Activate the brand before adding stock." };

  const modelName = parsed.data.modelName.trim();
  const baseSlug = slugifyStockName(modelName);
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await sb.from("motorcycles").select("id").eq("slug", slug).maybeSingle();
    if (!existing.data) break;
    slug = `${baseSlug}-${String(Date.now()).slice(-5)}${attempt ? `-${attempt}` : ""}`;
  }

  const motorcycleInsert: Database["public"]["Tables"]["motorcycles"]["Insert"] = {
    brand_id: parsed.data.brandId,
    name: modelName,
    slug,
    short_description: `${brand.name} ${modelName} added from ERP stock entry.`,
    full_description: `${brand.name} ${modelName} was added for showroom stock management. Complete public website content later if this model should be published online.`,
    base_price: parsed.data.price,
    publication_status: "draft",
    is_featured: false,
  };

  const motorcycleRes = await sb.from("motorcycles").insert(motorcycleInsert).select("id").maybeSingle();
  if (motorcycleRes.error || !motorcycleRes.data) return databaseAction("createSimpleBikeStock motorcycle", motorcycleRes.error ?? new Error("Bike was not created."));
  const motorcycleId = (motorcycleRes.data as { id: string }).id;
  const qty = Math.max(0, parsed.data.quantity);
  const variantInsert: Database["public"]["Tables"]["motorcycle_variants"]["Insert"] = {
    motorcycle_id: motorcycleId,
    cc: parsed.data.cc,
    color_name: parsed.data.colorName.trim(),
    color_hex: parsed.data.colorHex.toUpperCase(),
    price: parsed.data.price,
    quantity: qty,
    stock_status: qty > 0 ? "in_stock" : "out_of_stock",
    is_default: true,
    is_active: true,
  };
  const variantRes = await sb.from("motorcycle_variants").insert(variantInsert).select("id").maybeSingle();
  if (variantRes.error || !variantRes.data) return databaseAction("createSimpleBikeStock variant", variantRes.error ?? new Error("Bike variant was not created."));

  try {
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "stock_applied",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} added bike stock item ${brand.name} ${modelName} ${parsed.data.cc}cc ${parsed.data.colorName} with ${qty} unit(s).`,
      targetTable: "motorcycle_variants",
      targetId: (variantRes.data as { id: string }).id,
      metadata: {
        event: "bike_stock_created",
        brand_id: parsed.data.brandId,
        brand_name: brand.name,
        motorcycle_id: motorcycleId,
        model_name: modelName,
        cc: parsed.data.cc,
        color_name: parsed.data.colorName,
        price: parsed.data.price,
        quantity: qty,
        target_context: {
          title: `${brand.name} ${modelName}`,
          subtitle: `${parsed.data.cc}cc | ${parsed.data.colorName} | ${qty} in stock`,
          amount: parsed.data.price,
        },
      },
    });
  } catch { /* noop */ }

  revalidateERP();
  return { status: "success", message: `${brand.name} ${modelName} added to stock with ${qty} unit(s).` };
}


export async function updateSimpleBikeStock(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;

  const parsed = simpleBikeStockEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();
  const current = await sb
    .from("motorcycle_variants")
    .select("id, motorcycle_id, cc, color_name, color_hex, price, quantity, motorcycle:motorcycles(id, name, brand_id, brand:brands(name))")
    .eq("id", parsed.data.variantId)
    .maybeSingle();
  if (current.error || !current.data) return { status: "error", message: "Bike stock record not found." };

  const brandRes = await sb.from("brands").select("id, name, is_active").eq("id", parsed.data.brandId).maybeSingle();
  if (brandRes.error || !brandRes.data) return { status: "error", message: "Select a valid existing brand." };
  const brand = brandRes.data as { id: string; name: string; is_active?: boolean | null };
  if (brand.is_active === false) return { status: "error", message: "This brand is inactive. Activate the brand before assigning bikes to it." };

  const row = current.data as unknown as {
    id: string;
    motorcycle_id: string;
    cc?: number | null;
    color_name?: string | null;
    color_hex?: string | null;
    price?: number | null;
    quantity?: number | null;
    motorcycle?: { id?: string | null; name?: string | null; brand_id?: string | null; brand?: { name?: string | null } | null } | null;
  };

  const qty = Math.max(0, parsed.data.quantity);
  const modelName = parsed.data.modelName.trim();
  const motorcycleUpdate: Database["public"]["Tables"]["motorcycles"]["Update"] = {
    brand_id: parsed.data.brandId,
    name: modelName,
    base_price: parsed.data.price,
  };
  const variantUpdate: Database["public"]["Tables"]["motorcycle_variants"]["Update"] = {
    cc: parsed.data.cc,
    color_name: parsed.data.colorName.trim(),
    color_hex: parsed.data.colorHex.toUpperCase(),
    price: parsed.data.price,
    quantity: qty,
    stock_status: qty > 0 ? "in_stock" : "out_of_stock",
  };

  const bikeRes = await sb.from("motorcycles").update(motorcycleUpdate).eq("id", row.motorcycle_id);
  if (bikeRes.error) return databaseAction("updateSimpleBikeStock motorcycle", bikeRes.error);

  const variantRes = await sb.from("motorcycle_variants").update(variantUpdate).eq("id", parsed.data.variantId);
  if (variantRes.error) return databaseAction("updateSimpleBikeStock variant", variantRes.error);

  const verify = await sb
    .from("motorcycle_variants")
    .select("id, cc, color_name, color_hex, price, quantity, motorcycle:motorcycles(id, brand_id, name)")
    .eq("id", parsed.data.variantId)
    .maybeSingle();
  if (verify.error || !verify.data) return databaseAction("updateSimpleBikeStock verify", verify.error ?? new Error("Bike update could not be verified."));
  const verified = verify.data as unknown as {
    cc?: number | null;
    color_name?: string | null;
    color_hex?: string | null;
    price?: number | null;
    quantity?: number | null;
    motorcycle?: { brand_id?: string | null; name?: string | null } | null;
  };
  const verifiedOk =
    verified.motorcycle?.brand_id === parsed.data.brandId &&
    verified.motorcycle?.name === modelName &&
    Number(verified.cc) === parsed.data.cc &&
    String(verified.color_name ?? "") === parsed.data.colorName.trim() &&
    String(verified.color_hex ?? "").toUpperCase() === parsed.data.colorHex.toUpperCase() &&
    Number(verified.price) === parsed.data.price &&
    Number(verified.quantity) === qty;
  if (!verifiedOk) {
    return { status: "error", message: "Bike details were submitted, but the saved database row did not match. Please refresh and try again." };
  }

  const oldLabel = formatBikeStockLabel(row.motorcycle?.brand?.name ?? "Bike", row.motorcycle?.name ?? "variant", row.cc, row.color_name);
  const newLabel = formatBikeStockLabel(brand.name, modelName, parsed.data.cc, parsed.data.colorName);

  try {
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "stock_applied",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} updated bike stock details from ${oldLabel} to ${newLabel}.`,
      targetTable: "motorcycle_variants",
      targetId: parsed.data.variantId,
      metadata: {
        event: "bike_stock_details_updated",
        old: {
          brand_id: row.motorcycle?.brand_id,
          model_name: row.motorcycle?.name,
          cc: row.cc,
          color_name: row.color_name,
          color_hex: row.color_hex,
          price: row.price,
          quantity: row.quantity,
        },
        new: {
          brand_id: parsed.data.brandId,
          model_name: modelName,
          cc: parsed.data.cc,
          color_name: parsed.data.colorName,
          color_hex: parsed.data.colorHex.toUpperCase(),
          price: parsed.data.price,
          quantity: qty,
        },
      },
    });
  } catch { /* noop */ }

  revalidateERP();
  return { status: "success", message: `${newLabel} updated.` };
}
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
    location: parsed.data.location, is_active: true,
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
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} created stock change request - ${parsed.data.movementType} x ${parsed.data.quantity}. Variant #${parsed.data.motorcycleVariantId?.slice(0, 8) ?? "-"} / Part #${parsed.data.partId?.slice(0, 8) ?? "-"}. Unit cost snapshot PKR ${resolvedUnitCostAtTime ?? 0}.`,
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
        summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} approved stock change #${parsed.data.id.slice(0, 8)} (${m.movement_type}) - variant +${variantDeltaQty}, parts +${partDeltaQty} net delta applied to inventory.`,
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
        summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} rejected stock movement #${parsed.data.id.slice(0, 8)} - reason: ${(parsed.data.rejectionReason || "(none provided)").slice(0, 140)}`,
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
// SPARE PART SALES (MANAGER+)
// ==============================================

export async function sellSpareParts(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;

  const parsed = partSaleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();
  type PartSaleCustomer = { id: string; full_name: string; cnic: string; phone_primary: string; phone_secondary?: string | null; address?: string | null; city?: string | null };
  let customer: PartSaleCustomer | null = null;
  if (parsed.data.customerMode === "existing") {
    const customerRes = await sb
      .from("customers")
      .select("id, full_name, cnic, phone_primary, phone_secondary, address, city")
      .eq("id", parsed.data.customerId || "")
      .maybeSingle();
    if (customerRes.error || !customerRes.data) return { status: "error", message: "Selected customer was not found.", errors: { customerId: ["Select a valid existing customer."] } };
    customer = customerRes.data as PartSaleCustomer;
  } else {
    const cnic = String(parsed.data.newCustomer_cnic ?? "").replace(/[^0-9]/g, "");
    const existing = await sb
      .from("customers")
      .select("id, full_name, cnic, phone_primary, phone_secondary, address, city")
      .eq("cnic", cnic)
      .maybeSingle();
    if (!existing.error && existing.data) {
      customer = existing.data as PartSaleCustomer;
    } else {
      const newCustomerRes = await sb
        .from("customers")
        .insert({
          full_name: String(parsed.data.newCustomer_fullName ?? "").trim(),
          cnic,
          phone_primary: String(parsed.data.newCustomer_phonePrimary ?? "").trim(),
          phone_secondary: String(parsed.data.newCustomer_phoneSecondary ?? "").trim() || null,
          city: String(parsed.data.newCustomer_city ?? "").trim() || null,
          address: String(parsed.data.newCustomer_address ?? "").trim() || null,
          created_by: actor.userId,
        })
        .select("id, full_name, cnic, phone_primary, phone_secondary, address, city")
        .maybeSingle();
      if (newCustomerRes.error || !newCustomerRes.data) return databaseAction("sellSpareParts create customer", newCustomerRes.error ?? new Error("Customer was not created."));
      customer = newCustomerRes.data as PartSaleCustomer;
    }
  }
  const merged = new Map<string, { partId: string; quantity: number; unitPrice: number }>();
  for (const item of parsed.data.itemsJson) {
    const existing = merged.get(item.partId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.unitPrice = item.unitPrice;
    } else {
      merged.set(item.partId, { ...item });
    }
  }

  const items = Array.from(merged.values());
  const partIds = items.map((item) => item.partId);
  const partsRes = await sb
    .from("parts")
    .select("id, sku, name, current_stock, unit_cost, is_active")
    .in("id", partIds);
  if (partsRes.error) return databaseAction("sellSpareParts load parts", partsRes.error);

  type PartStockRow = { id: string; sku: string; name: string; current_stock: number; unit_cost: number; is_active: boolean };
  const partRows = (partsRes.data ?? []) as PartStockRow[];
  const byId = new Map(partRows.map((part) => [part.id, part]));

  for (const item of items) {
    const part = byId.get(item.partId);
    if (!part) return { status: "error", message: "One selected spare part no longer exists.", errors: { itemsJson: ["Refresh the page and select the part again."] } };
    const available = Number(part.current_stock ?? 0);
    if (available < item.quantity) {
      return {
        status: "error",
        message: `${part.sku} has only ${available} unit(s) available.`,
        errors: { itemsJson: [`Reduce ${part.name} quantity to ${available} or less.`] },
      };
    }
  }

  const saleNumber = generatePartSaleNumber();
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  let bankNameSnapshot: string | null = null;
  if (parsed.data.bankId) {
    const bankRes = await sb.from("banks").select("name").eq("id", parsed.data.bankId).maybeSingle();
    if (bankRes.error || !bankRes.data) return { status: "error", message: "Selected payment bank was not found.", errors: { bankId: ["Select a valid bank."] } };
    bankNameSnapshot = String((bankRes.data as { name?: string | null }).name ?? "").trim() || null;
  }

  const saleInsert: Database["public"] ["Tables"] ["part_sales"] ["Insert"] = {
    sale_number: saleNumber,
    customer_name: customer?.full_name ?? null,
    customer_phone: customer?.phone_primary ?? null,
    customer_id: customer?.id ?? null,
    total_amount: total,
    notes: parsed.data.notes ?? null,
    sold_by: actor.userId,
    sale_status: "pending_approval",
    payment_method: parsed.data.paymentMethod as Database["public"] ["Enums"] ["payment_method"],
    bank_id: parsed.data.bankId || null,
    bank_name_snapshot: bankNameSnapshot,
    transaction_reference: parsed.data.transactionReference ?? null,
    paid_amount: total,
    stock_deducted: false,
    receipt_generated: false,
  };

  const saleRes = await sb.from("part_sales").insert(saleInsert).select("id, sale_number").maybeSingle();
  if (saleRes.error || !saleRes.data) return databaseAction("sellSpareParts create sale", saleRes.error ?? new Error("Part sale was not created."));

  const saleId = (saleRes.data as { id: string }).id;
  const itemInserts: Database["public"]["Tables"]["part_sale_items"]["Insert"][] = items.map((item) => {
    const part = byId.get(item.partId) as PartStockRow;
    return {
      part_sale_id: saleId,
      part_id: item.partId,
      sku_snapshot: part.sku,
      name_snapshot: part.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.quantity * item.unitPrice,
    };
  });

  const itemRes = await sb.from("part_sale_items").insert(itemInserts);
  if (itemRes.error) return databaseAction("sellSpareParts create items", itemRes.error);
try {
    const itemSummary = itemInserts.map((item) => `${item.sku_snapshot} x ${item.quantity}`).join(", ");
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "part_sale_created",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} requested spare-part sale ${saleNumber}: ${itemSummary} for PKR ${total.toLocaleString("en-PK")}.`,
      targetTable: "part_sales",
      targetId: saleId,
      metadata: {
        event: "part_sale_created",
        sale_number: saleNumber,
        total_amount: total,
        customer_id: customer?.id ?? null,
        customer_name: customer?.full_name ?? null,
        customer_cnic: customer?.cnic ?? null,
        payment_method: parsed.data.paymentMethod,
        bank_id: parsed.data.bankId || null,
        bank_name_snapshot: bankNameSnapshot,
        transaction_reference: parsed.data.transactionReference ?? null,
        approval_status: "pending_approval",
        items: itemInserts.map((item) => ({
          part_id: item.part_id,
          sku: item.sku_snapshot,
          name: item.name_snapshot,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
        })),
        target_context: {
          title: saleNumber,
          subtitle: `${items.length} spare part line(s) sold | Customer: ${customer?.full_name ?? "-"}`,
          amount: total,
        },
      },
    });
  } catch { /* noop */ }

  revalidateERP();
  return { status: "success", message: `Spare part sale ${saleNumber} submitted for admin approval. Stock will deduct only after approval.` };
}

export async function decidePartSale(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = partSaleApprovalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();
  const saleRes = await sb
    .from("part_sales")
    .select("*, items:part_sale_items(*)")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (saleRes.error || !saleRes.data) return databaseAction("decidePartSale load", saleRes.error ?? new Error("Part sale not found."));

  const sale = saleRes.data as unknown as { id: string; sale_number: string; sale_status: string; stock_deducted?: boolean; items?: Array<{ part_id: string; quantity: number; sku_snapshot: string; name_snapshot: string }> };
  if (sale.sale_status !== "pending_approval") return { status: "error", message: "This part sale has already been processed." };
  const now = new Date().toISOString();

  if (parsed.data.decision === "rejected") {
    const upd = await sb.from("part_sales").update({ sale_status: "rejected", rejected_by: actor.userId, rejected_at: now, rejection_reason: parsed.data.rejectionReason || null }).eq("id", parsed.data.id);
    if (upd.error) return databaseAction("decidePartSale reject", upd.error);
    await writeActivity({ actorUserId: actor.userId, actorRole: actor.profile.role, action: "part_sale_rejected", summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} rejected part sale ${sale.sale_number}: ${parsed.data.rejectionReason || "No reason"}.`, targetTable: "part_sales", targetId: sale.id, metadata: { sale_number: sale.sale_number, rejection_reason: parsed.data.rejectionReason ?? null } });
    revalidateERP();
    return { status: "success", message: "Part sale rejected. Stock was not changed." };
  }

  const items = sale.items ?? [];
  for (const item of items) {
    const cur = await sb.from("parts").select("current_stock").eq("id", item.part_id).maybeSingle();
    if (cur.error || !cur.data) return { status: "error", message: `${item.sku_snapshot} was not found in parts stock.` };
    const current = Number((cur.data as { current_stock?: number }).current_stock ?? 0);
    if (current < Number(item.quantity)) return { status: "error", message: `${item.sku_snapshot} has only ${current} unit(s), cannot approve ${item.quantity}.` };
  }

  for (const item of items) {
    const cur = await sb.from("parts").select("current_stock").eq("id", item.part_id).maybeSingle();
    const current = Number((cur.data as { current_stock?: number } | null)?.current_stock ?? 0);
    const next = Math.max(0, current - Number(item.quantity));
    const updPart = await sb.from("parts").update({ current_stock: next }).eq("id", item.part_id);
    if (updPart.error) return databaseAction("decidePartSale deduct part", updPart.error);
  }

  const upd = await sb.from("part_sales").update({ sale_status: "approved", approved_by: actor.userId, approved_at: now, stock_deducted: true }).eq("id", parsed.data.id);
  if (upd.error) return databaseAction("decidePartSale approve", upd.error);
  await writeActivity({ actorUserId: actor.userId, actorRole: actor.profile.role, action: "part_sale_approved", summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} approved part sale ${sale.sale_number}; stock deducted for ${items.length} line(s).`, targetTable: "part_sales", targetId: sale.id, metadata: { sale_number: sale.sale_number, items } });
  revalidateERP();
  return { status: "success", message: "Part sale approved. Stock deducted and receipt can now be generated." };
}

export async function generatePartSaleReceipt(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = partReceiptGenerationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const sb = serviceRoleClient();
  const saleRes = await sb.from("part_sales").select("id, sale_number, sale_status, receipt_generated").eq("id", parsed.data.id).maybeSingle();
  if (saleRes.error || !saleRes.data) return databaseAction("generatePartSaleReceipt load", saleRes.error ?? new Error("Part sale not found."));
  const sale = saleRes.data as { id: string; sale_number: string; sale_status: string; receipt_generated?: boolean };
  if (sale.sale_status !== "approved" && sale.sale_status !== "completed") return { status: "error", message: "Admin approval is required before receipt generation." };
  const now = new Date().toISOString();
  const upd = await sb.from("part_sales").update({ sale_status: "completed", receipt_generated: true, receipt_generated_at: now }).eq("id", parsed.data.id);
  if (upd.error) return databaseAction("generatePartSaleReceipt", upd.error);
  await writeActivity({ actorUserId: actor.userId, actorRole: actor.profile.role, action: "part_receipt_generated", summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} generated receipt for part sale ${sale.sale_number}.`, targetTable: "part_sales", targetId: sale.id, metadata: { sale_number: sale.sale_number } });
  revalidateERP();
  return { status: "success", message: "Part receipt generated. You can print it now." };
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
      action: "stock_applied",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} updated variant pricing/stock for variant #${parsed.data.variantId.slice(0, 8)} price PKR ${row.price ?? 0} -> PKR ${payload.price ?? 0}; qty ${row.quantity ?? 0} -> ${typeof payload.quantity === "number" ? payload.quantity : "(unchanged)"}.`,
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

export async function archiveMotorcycleVariant(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;

  const parsed = variantArchiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sbService = serviceRoleClient();
  const current = await sbService
    .from("motorcycle_variants")
    .select("id, is_active, cc, color_name, quantity, motorcycle:motorcycles(name, brand:brands(name))")
    .eq("id", parsed.data.variantId)
    .maybeSingle();

  if (current.error || !current.data) return { status: "error", message: "Bike variant not found." };

  const restore = parsed.data.mode === "restore";
  const { error } = await sbService
    .from("motorcycle_variants")
    .update({ is_active: restore })
    .eq("id", parsed.data.variantId);

  if (error) return databaseAction("archiveMotorcycleVariant", error);

  const row = current.data as unknown as {
    cc?: number | null;
    color_name?: string | null;
    quantity?: number | null;
    motorcycle?: { name?: string | null; brand?: { name?: string | null } | null } | null;
  };
  const bikeLabel = `${row.motorcycle?.brand?.name ?? "Bike"} ${row.motorcycle?.name ?? "variant"} ${row.cc ?? ""}cc ${row.color_name ?? ""}`.replace(/\s+/g, " ").trim();

  try {
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "stock_applied",
      summary: `${actor.profile.full_name || actor.userId.slice(0, 8)} ${restore ? "restored" : "archived"} ${bikeLabel}.`,
      targetTable: "motorcycle_variants",
      targetId: parsed.data.variantId,
      metadata: {
        event: restore ? "bike_stock_restored" : "bike_stock_archived",
        bike: bikeLabel,
        quantity: row.quantity ?? 0,
      },
    });
  } catch { /* noop */ }

  revalidateERP();
  return { status: "success", message: restore ? "Bike restored to stock workflows." : "Bike archived and hidden from stock workflows." };
}
// ==============================================

