"use server";

import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, revalidateAdminContent, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { featureSchema, imageMetadataSchema, specificationSchema, uuid, variantSchema } from "@/lib/admin/schemas";
import { parseCsv } from "@/lib/admin/csv";
import { ADMIN_IMAGE_MAX_BYTES, ADMIN_IMAGE_MAX_LABEL } from "@/lib/admin/upload-limits";

const IMAGE_MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
};

export async function saveVariant(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = variantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const values = { motorcycle_id: parsed.data.motorcycleId, cc: parsed.data.cc, color_name: parsed.data.colorName, color_hex: parsed.data.colorHex.toUpperCase(), price: parsed.data.price, stock_status: parsed.data.stockStatus, quantity: parsed.data.quantity, is_default: parsed.data.isDefault, is_active: parsed.data.isActive };
  if (parsed.data.isDefault) {
    const { error } = await auth.supabase.from("motorcycle_variants").update({ is_default: false }).eq("motorcycle_id", parsed.data.motorcycleId).neq("id", parsed.data.id ?? "00000000-0000-0000-0000-000000000000");
    if (error) return databaseAction("unsetDefaultVariant", error);
  }
  const result = parsed.data.id
    ? await auth.supabase.from("motorcycle_variants").update(values).eq("id", parsed.data.id).eq("motorcycle_id", parsed.data.motorcycleId)
    : await auth.supabase.from("motorcycle_variants").insert(values);
  if (result.error) return databaseAction("saveVariant", result.error);
  revalidateAdminContent();
  return { status: "success", message: parsed.data.id ? "Variant updated." : "Variant created." };
}

export async function deleteVariant(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  const motorcycleId = uuid.safeParse(formData.get("motorcycleId"));
  if (!id.success || !motorcycleId.success) return { status: "error", message: "Variant selection is invalid." };
  const { error } = await auth.supabase.from("motorcycle_variants").delete().eq("id", id.data).eq("motorcycle_id", motorcycleId.data);
  if (error) return databaseAction("deleteVariant", error);
  revalidateAdminContent();
  return { status: "success", message: "Variant deleted." };
}

export async function uploadMotorcycleImage(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = imageMetadataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose an image to upload." };
  const extension = IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension) return { status: "error", message: "Upload a JPEG, PNG, WebP, or AVIF image." };
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return { status: "error", message: `Images must be ${ADMIN_IMAGE_MAX_LABEL} or smaller.` };
  const storagePath = `${parsed.data.motorcycleId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await auth.supabase.storage.from("motorcycles").upload(storagePath, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("[OW Motors image upload failed]", { name: uploadError.name });
    return { status: "error", message: "The image could not be uploaded. Check the file and Storage policies." };
  }
  if (parsed.data.isPrimary) {
    const { error } = await auth.supabase.from("motorcycle_images").update({ is_primary: false }).eq("motorcycle_id", parsed.data.motorcycleId);
    if (error) return databaseAction("unsetPrimaryImage", error);
  }
  const { error } = await auth.supabase.from("motorcycle_images").insert({ motorcycle_id: parsed.data.motorcycleId, variant_id: parsed.data.variantId, storage_path: storagePath, alt_text: parsed.data.altText, image_type: parsed.data.imageType, sort_order: parsed.data.sortOrder, is_primary: parsed.data.isPrimary });
  if (error) return databaseAction("createMotorcycleImage", error);
  revalidateAdminContent();
  return { status: "success", message: "Image uploaded." };
}

export async function updateMotorcycleImage(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = imageMetadataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.id) return parsed.success ? { status: "error", message: "Image ID is missing." } : validationAction(parsed.error);
  if (parsed.data.isPrimary) {
    const { error } = await auth.supabase.from("motorcycle_images").update({ is_primary: false }).eq("motorcycle_id", parsed.data.motorcycleId).neq("id", parsed.data.id);
    if (error) return databaseAction("unsetPrimaryImage", error);
  }
  const { error } = await auth.supabase.from("motorcycle_images").update({ variant_id: parsed.data.variantId, alt_text: parsed.data.altText, image_type: parsed.data.imageType, sort_order: parsed.data.sortOrder, is_primary: parsed.data.isPrimary }).eq("id", parsed.data.id).eq("motorcycle_id", parsed.data.motorcycleId);
  if (error) return databaseAction("updateMotorcycleImage", error);
  revalidateAdminContent();
  return { status: "success", message: "Image metadata updated." };
}

export async function deleteMotorcycleImage(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  const motorcycleId = uuid.safeParse(formData.get("motorcycleId"));
  if (!id.success || !motorcycleId.success) return { status: "error", message: "Image selection is invalid." };
  const { data: image, error: readError } = await auth.supabase.from("motorcycle_images").select("storage_path").eq("id", id.data).eq("motorcycle_id", motorcycleId.data).maybeSingle();
  if (readError) return databaseAction("readMotorcycleImage", readError);
  if (!image) return { status: "error", message: "Image not found." };
  const { error } = await auth.supabase.from("motorcycle_images").delete().eq("id", id.data).eq("motorcycle_id", motorcycleId.data);
  if (error) return databaseAction("deleteMotorcycleImage", error);
  const { error: storageError } = await auth.supabase.storage.from("motorcycles").remove([image.storage_path]);
  if (storageError) console.error("[OW Motors orphaned storage image]", { name: storageError.name });
  revalidateAdminContent();
  return { status: "success", message: storageError ? "Image record deleted; the Storage object needs manual cleanup." : "Image deleted." };
}

export async function saveSpecification(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = specificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const values = { motorcycle_id: parsed.data.motorcycleId, variant_id: parsed.data.variantId, group_name: parsed.data.groupName, label: parsed.data.label, value: parsed.data.value, unit: parsed.data.unit, sort_order: parsed.data.sortOrder };
  const result = parsed.data.id
    ? await auth.supabase.from("motorcycle_specifications").update(values).eq("id", parsed.data.id).eq("motorcycle_id", parsed.data.motorcycleId)
    : await auth.supabase.from("motorcycle_specifications").insert(values);
  if (result.error) return databaseAction("saveSpecification", result.error);
  revalidateAdminContent();
  return { status: "success", message: parsed.data.id ? "Specification updated." : "Specification created." };
}

const SPECIFICATION_CSV_HEADERS = ["group_name", "label", "value", "unit", "sort_order", "variant_cc", "variant_color"] as const;
const SPECIFICATION_CSV_MAX_BYTES = 262_144;
const SPECIFICATION_CSV_MAX_ROWS = 300;

export async function importSpecificationsCsv(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;

  const motorcycleId = uuid.safeParse(formData.get("motorcycleId"));
  if (!motorcycleId.success) return { status: "error", message: "Motorcycle selection is invalid." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a CSV file to import." };
  if (!file.name.toLowerCase().endsWith(".csv")) return { status: "error", message: "Upload a file with the .csv extension." };
  if (file.size > SPECIFICATION_CSV_MAX_BYTES) return { status: "error", message: "Specification CSV files must be 256 KB or smaller." };

  const parsedCsv = parseCsv(await file.text());
  if (!parsedCsv.ok) return { status: "error", message: parsedCsv.error };
  if (!parsedCsv.rows.length) return { status: "error", message: "The CSV file is empty." };

  const header = parsedCsv.rows[0].map((value) => value.trim().toLowerCase());
  if (header.length !== SPECIFICATION_CSV_HEADERS.length || !SPECIFICATION_CSV_HEADERS.every((name, index) => header[index] === name)) {
    return { status: "error", message: `Use these columns in order: ${SPECIFICATION_CSV_HEADERS.join(", ")}.` };
  }
  const dataRows = parsedCsv.rows.slice(1);
  if (!dataRows.length) return { status: "error", message: "Add at least one specification row below the CSV header." };
  if (dataRows.length > SPECIFICATION_CSV_MAX_ROWS) return { status: "error", message: `Import no more than ${SPECIFICATION_CSV_MAX_ROWS} rows at once.` };

  const [{ data: motorcycle, error: motorcycleError }, { data: variants, error: variantsError }, { data: existing, error: existingError }] = await Promise.all([
    auth.supabase.from("motorcycles").select("id").eq("id", motorcycleId.data).maybeSingle(),
    auth.supabase.from("motorcycle_variants").select("id, cc, color_name").eq("motorcycle_id", motorcycleId.data),
    auth.supabase.from("motorcycle_specifications").select("variant_id, group_name, label").eq("motorcycle_id", motorcycleId.data),
  ]);
  if (motorcycleError) return databaseAction("readMotorcycleForSpecificationImport", motorcycleError);
  if (!motorcycle) return { status: "error", message: "Motorcycle was not found." };
  if (variantsError) return databaseAction("readVariantsForSpecificationImport", variantsError);
  if (existingError) return databaseAction("readSpecificationsForImport", existingError);

  const existingKeys = new Set((existing ?? []).map((item) => `${item.variant_id ?? "shared"}\\u0000${item.group_name}\\u0000${item.label}`));
  const importedKeys = new Set<string>();
  const values: Array<{
    motorcycle_id: string;
    variant_id: string | null;
    group_name: string;
    label: string;
    value: string;
    unit: string | null;
    sort_order: number;
  }> = [];

  for (const [rowIndex, columns] of dataRows.entries()) {
    const csvRow = rowIndex + 2;
    if (columns.length !== SPECIFICATION_CSV_HEADERS.length) {
      return { status: "error", message: `CSV row ${csvRow} must contain exactly ${SPECIFICATION_CSV_HEADERS.length} columns.` };
    }
    const [groupName = "", label = "", value = "", unit = "", sortOrderText = "", variantCc = "", variantColor = ""] = columns.map((column) => column.trim());
    if (!sortOrderText) return { status: "error", message: `CSV row ${csvRow}: sort_order is required.` };
    if ((variantCc && !variantColor) || (!variantCc && variantColor)) {
      return { status: "error", message: `CSV row ${csvRow}: variant_cc and variant_color must both be filled or both left blank.` };
    }

    let variantId: string | null = null;
    if (variantCc && variantColor) {
      const cc = Number(variantCc);
      if (!Number.isInteger(cc) || cc <= 0) return { status: "error", message: `CSV row ${csvRow}: variant_cc must be a positive whole number.` };
      const matches = (variants ?? []).filter((variant) => variant.cc === cc && variant.color_name.localeCompare(variantColor, undefined, { sensitivity: "accent" }) === 0);
      if (matches.length !== 1) return { status: "error", message: `CSV row ${csvRow}: no unique ${cc}cc / ${variantColor} variant exists for this motorcycle.` };
      variantId = matches[0].id;
    }

    const parsed = specificationSchema.safeParse({
      motorcycleId: motorcycleId.data,
      variantId: variantId ?? "",
      groupName,
      label,
      value,
      unit,
      sortOrder: sortOrderText,
    });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid specification values.";
      return { status: "error", message: `CSV row ${csvRow}: ${message}` };
    }
    const key = `${variantId ?? "shared"}\\u0000${parsed.data.groupName}\\u0000${parsed.data.label}`;
    if (existingKeys.has(key)) return { status: "error", message: `CSV row ${csvRow}: ${parsed.data.groupName} / ${parsed.data.label} already exists.` };
    if (importedKeys.has(key)) return { status: "error", message: `CSV row ${csvRow} duplicates an earlier row in this file.` };
    importedKeys.add(key);
    values.push({
      motorcycle_id: parsed.data.motorcycleId,
      variant_id: parsed.data.variantId,
      group_name: parsed.data.groupName,
      label: parsed.data.label,
      value: parsed.data.value,
      unit: parsed.data.unit,
      sort_order: parsed.data.sortOrder,
    });
  }

  const { error } = await auth.supabase.from("motorcycle_specifications").insert(values);
  if (error) return databaseAction("importSpecificationsCsv", error);
  revalidateAdminContent();
  return { status: "success", message: `${values.length} specification${values.length === 1 ? "" : "s"} imported from CSV.` };
}

export async function deleteSpecification(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  const motorcycleId = uuid.safeParse(formData.get("motorcycleId"));
  if (!id.success || !motorcycleId.success) return { status: "error", message: "Specification selection is invalid." };
  const { error } = await auth.supabase.from("motorcycle_specifications").delete().eq("id", id.data).eq("motorcycle_id", motorcycleId.data);
  if (error) return databaseAction("deleteSpecification", error);
  revalidateAdminContent();
  return { status: "success", message: "Specification deleted." };
}

export async function saveFeature(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = featureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const values = { motorcycle_id: parsed.data.motorcycleId, group_name: parsed.data.groupName, title: parsed.data.title, description: parsed.data.description, icon_identifier: parsed.data.iconIdentifier, sort_order: parsed.data.sortOrder };
  const result = parsed.data.id
    ? await auth.supabase.from("motorcycle_features").update(values).eq("id", parsed.data.id).eq("motorcycle_id", parsed.data.motorcycleId)
    : await auth.supabase.from("motorcycle_features").insert(values);
  if (result.error) return databaseAction("saveFeature", result.error);
  revalidateAdminContent();
  return { status: "success", message: parsed.data.id ? "Feature updated." : "Feature created." };
}

export async function deleteFeature(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  const motorcycleId = uuid.safeParse(formData.get("motorcycleId"));
  if (!id.success || !motorcycleId.success) return { status: "error", message: "Feature selection is invalid." };
  const { error } = await auth.supabase.from("motorcycle_features").delete().eq("id", id.data).eq("motorcycle_id", motorcycleId.data);
  if (error) return databaseAction("deleteFeature", error);
  revalidateAdminContent();
  return { status: "success", message: "Feature deleted." };
}
