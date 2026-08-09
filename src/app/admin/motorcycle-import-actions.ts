"use server";

import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, revalidateAdminContent, unauthorizedAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { parseCsv } from "@/lib/admin/csv";
import { featureSchema, motorcycleBasicSchema, motorcycleSeoSchema, specificationSchema, variantSchema } from "@/lib/admin/schemas";
import type { Json } from "@/lib/supabase/database.types";

const HEADERS = [
  "record_type", "motorcycle_slug", "brand_slug", "name", "short_description", "full_description", "base_price", "is_featured", "seo_title", "seo_description",
  "category_slug", "cc", "color_name", "color_hex", "price", "stock_status", "quantity", "is_default", "is_active",
  "group_name", "label", "value", "unit", "sort_order", "title", "description", "icon_identifier", "variant_cc", "variant_color",
] as const;
const MAX_BYTES = 524_288;
const MAX_ROWS = 1_000;
const separator = String.fromCharCode(0);

type CsvRecord = Record<(typeof HEADERS)[number], string>;
class ImportError extends Error {}

function importError(row: number, message: string): never {
  throw new ImportError(`CSV row ${row}: ${message}`);
}

function required(record: CsvRecord, key: keyof CsvRecord, row: number) {
  const value = record[key].trim();
  if (!value) importError(row, `${key} is required for ${record.record_type || "this record"} rows.`);
  return value;
}

function booleanValue(value: string, row: number, field: string, defaultValue: boolean) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;
  return importError(row, `${field} must be true or false.`);
}

function recordFromRow(columns: readonly string[]) {
  return Object.fromEntries(HEADERS.map((header, index) => [header, columns[index]?.trim() ?? ""])) as CsvRecord;
}

function issueMessage(result: { success: false; error: { issues: readonly { message: string }[] } }) {
  return result.error.issues[0]?.message ?? "One or more values are invalid.";
}

export async function importMotorcycleInventoryCsv(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose an inventory CSV file." };
  if (!file.name.toLowerCase().endsWith(".csv")) return { status: "error", message: "Upload a file with the .csv extension." };
  if (file.size > MAX_BYTES) return { status: "error", message: "Bulk inventory CSV files must be 512 KB or smaller." };

  const csv = parseCsv(await file.text());
  if (!csv.ok) return { status: "error", message: csv.error };
  if (!csv.rows.length) return { status: "error", message: "The CSV file is empty." };
  const header = csv.rows[0].map((value) => value.trim().toLowerCase());
  if (header.length !== HEADERS.length || !HEADERS.every((name, index) => header[index] === name)) {
    return { status: "error", message: "The inventory CSV columns do not match the downloadable template. Keep every template column in its original order." };
  }
  const rows = csv.rows.slice(1);
  if (!rows.length) return { status: "error", message: "Add inventory rows below the CSV header." };
  if (rows.length > MAX_ROWS) return { status: "error", message: `Import no more than ${MAX_ROWS} rows at once.` };
  for (const [index, row] of rows.entries()) {
    if (row.length !== HEADERS.length) return { status: "error", message: `CSV row ${index + 2} must contain exactly ${HEADERS.length} columns.` };
  }

  const [{ data: brands, error: brandError }, { data: categories, error: categoryError }, { data: existing, error: existingError }] = await Promise.all([
    auth.supabase.from("brands").select("id, slug"),
    auth.supabase.from("categories").select("id, slug"),
    auth.supabase.from("motorcycles").select("brand_id, slug"),
  ]);
  if (brandError) return databaseAction("readBrandsForBulkImport", brandError);
  if (categoryError) return databaseAction("readCategoriesForBulkImport", categoryError);
  if (existingError) return databaseAction("readMotorcyclesForBulkImport", existingError);

  const brandBySlug = new Map((brands ?? []).map((brand) => [brand.slug.toLowerCase(), brand]));
  const categoryBySlug = new Map((categories ?? []).map((category) => [category.slug.toLowerCase(), category]));
  const existingKeys = new Set((existing ?? []).map((motorcycle) => [motorcycle.brand_id, motorcycle.slug].join(separator)));
  const records = rows.map((columns) => recordFromRow(columns));
  const motorcycles: Array<Record<string, Json>> = [];
  const categoryLinks: Array<Record<string, Json>> = [];
  const variants: Array<Record<string, Json>> = [];
  const specifications: Array<Record<string, Json>> = [];
  const features: Array<Record<string, Json>> = [];
  const motorcycleBySlug = new Map<string, { id: string; brandId: string; row: number }>();
  const variantByKey = new Map<string, { id: string; motorcycleId: string }>();
  const categoryKeys = new Set<string>();
  const specificationKeys = new Set<string>();
  const featureKeys = new Set<string>();

  try {
    for (const [index, record] of records.entries()) {
      const row = index + 2;
      if (record.record_type.toLowerCase() !== "motorcycle") continue;
      const slug = required(record, "motorcycle_slug", row).toLowerCase();
      const brandSlug = required(record, "brand_slug", row).toLowerCase();
      const brand = brandBySlug.get(brandSlug);
      if (!brand) importError(row, `brand_slug must match an existing brand. No brand named ${brandSlug} was found.`);
      if (motorcycleBySlug.has(slug)) importError(row, `motorcycle_slug ${slug} is duplicated in this file.`);
      if (existingKeys.has([brand.id, slug].join(separator))) importError(row, `${brandSlug}/${slug} already exists in inventory.`);
      const id = crypto.randomUUID();
      const isFeatured = booleanValue(record.is_featured, row, "is_featured", false);
      const basic = motorcycleBasicSchema.safeParse({
        brandId: brand.id,
        name: required(record, "name", row),
        slug,
        shortDescription: required(record, "short_description", row),
        fullDescription: required(record, "full_description", row),
        basePrice: required(record, "base_price", row),
        isFeatured: isFeatured ? "true" : "false",
      });
      if (!basic.success) importError(row, issueMessage(basic));
      const seo = motorcycleSeoSchema.safeParse({ id, seoTitle: record.seo_title, seoDescription: record.seo_description });
      if (!seo.success) importError(row, issueMessage(seo));
      motorcycles.push({
        id,
        brand_id: basic.data.brandId,
        name: basic.data.name,
        slug: basic.data.slug,
        short_description: basic.data.shortDescription,
        full_description: basic.data.fullDescription,
        base_price: basic.data.basePrice,
        is_featured: basic.data.isFeatured,
        seo_title: seo.data.seoTitle,
        seo_description: seo.data.seoDescription,
      });
      motorcycleBySlug.set(slug, { id, brandId: brand.id, row });
    }
    if (!motorcycles.length) throw new ImportError("Add at least one motorcycle row to the CSV file.");

    for (const [index, record] of records.entries()) {
      const row = index + 2;
      const type = record.record_type.toLowerCase();
      if (!type) importError(row, "record_type is required.");
      if (!["motorcycle", "category", "variant", "specification", "feature"].includes(type)) importError(row, `record_type ${type} is not supported.`);
      if (type === "motorcycle") continue;
      const slug = required(record, "motorcycle_slug", row).toLowerCase();
      const motorcycle = motorcycleBySlug.get(slug);
      if (!motorcycle) importError(row, `motorcycle_slug ${slug} must reference a motorcycle row in this file.`);

      if (type === "category") {
        const categorySlug = required(record, "category_slug", row).toLowerCase();
        const category = categoryBySlug.get(categorySlug);
        if (!category) importError(row, `category_slug must match an existing category. No category named ${categorySlug} was found.`);
        const key = [motorcycle.id, category.id].join(separator);
        if (categoryKeys.has(key)) importError(row, `category ${categorySlug} is assigned more than once to ${slug}.`);
        categoryKeys.add(key);
        categoryLinks.push({ motorcycle_id: motorcycle.id, category_id: category.id });
        continue;
      }

      if (type === "variant") {
        const isDefault = booleanValue(record.is_default, row, "is_default", false);
        const isActive = booleanValue(record.is_active, row, "is_active", true);
        const parsed = variantSchema.safeParse({
          motorcycleId: motorcycle.id,
          cc: required(record, "cc", row),
          colorName: required(record, "color_name", row),
          colorHex: required(record, "color_hex", row),
          price: required(record, "price", row),
          stockStatus: required(record, "stock_status", row),
          quantity: required(record, "quantity", row),
          isDefault: isDefault ? "true" : "false",
          isActive: isActive ? "true" : "false",
        });
        if (!parsed.success) importError(row, issueMessage(parsed));
        if ((parsed.data.stockStatus === "in_stock") !== (parsed.data.quantity > 0)) {
          importError(row, "in_stock variants require quantity above zero; every other stock status requires quantity zero.");
        }
        const key = [slug, String(parsed.data.cc), parsed.data.colorName.toLowerCase()].join(separator);
        if (variantByKey.has(key)) importError(row, `${parsed.data.cc}cc / ${parsed.data.colorName} is duplicated for ${slug}.`);
        const id = crypto.randomUUID();
        variantByKey.set(key, { id, motorcycleId: motorcycle.id });
        variants.push({
          id,
          motorcycle_id: motorcycle.id,
          cc: parsed.data.cc,
          color_name: parsed.data.colorName,
          color_hex: parsed.data.colorHex.toUpperCase(),
          price: parsed.data.price,
          stock_status: parsed.data.stockStatus,
          quantity: parsed.data.quantity,
          is_default: parsed.data.isDefault,
          is_active: parsed.data.isActive,
        });
        continue;
      }

      if (type === "specification") {
        if ((record.variant_cc && !record.variant_color) || (!record.variant_cc && record.variant_color)) importError(row, "variant_cc and variant_color must both be filled or both blank.");
        let variantId: string | null = null;
        if (record.variant_cc && record.variant_color) {
          const cc = Number(record.variant_cc);
          const variant = variantByKey.get([slug, String(cc), record.variant_color.toLowerCase()].join(separator));
          if (!variant) importError(row, `no imported ${record.variant_cc}cc / ${record.variant_color} variant exists for ${slug}. Put variant rows before specification rows.`);
          variantId = variant.id;
        }
        const parsed = specificationSchema.safeParse({
          motorcycleId: motorcycle.id,
          variantId: variantId ?? "",
          groupName: required(record, "group_name", row),
          label: required(record, "label", row),
          value: required(record, "value", row),
          unit: record.unit,
          sortOrder: required(record, "sort_order", row),
        });
        if (!parsed.success) importError(row, issueMessage(parsed));
        const key = [variantId ?? motorcycle.id, parsed.data.groupName, parsed.data.label].join(separator);
        if (specificationKeys.has(key)) importError(row, `${parsed.data.groupName} / ${parsed.data.label} is duplicated for ${slug}.`);
        specificationKeys.add(key);
        specifications.push({
          motorcycle_id: motorcycle.id,
          variant_id: parsed.data.variantId,
          group_name: parsed.data.groupName,
          label: parsed.data.label,
          value: parsed.data.value,
          unit: parsed.data.unit,
          sort_order: parsed.data.sortOrder,
        });
        continue;
      }

      const parsed = featureSchema.safeParse({
        motorcycleId: motorcycle.id,
        groupName: required(record, "group_name", row),
        title: required(record, "title", row),
        description: required(record, "description", row),
        iconIdentifier: record.icon_identifier,
        sortOrder: required(record, "sort_order", row),
      });
      if (!parsed.success) importError(row, issueMessage(parsed));
      const key = [motorcycle.id, parsed.data.groupName, parsed.data.title].join(separator);
      if (featureKeys.has(key)) importError(row, `${parsed.data.groupName} / ${parsed.data.title} is duplicated for ${slug}.`);
      featureKeys.add(key);
      features.push({ motorcycle_id: motorcycle.id, group_name: parsed.data.groupName, title: parsed.data.title, description: parsed.data.description, icon_identifier: parsed.data.iconIdentifier, sort_order: parsed.data.sortOrder });
    }

    for (const [slug, motorcycle] of motorcycleBySlug) {
      const motorcycleVariants = variants.filter((variant) => variant.motorcycle_id === motorcycle.id);
      if (!motorcycleVariants.length) throw new ImportError(`Motorcycle ${slug} requires at least one variant row.`);
      const defaults = motorcycleVariants.filter((variant) => variant.is_default === true && variant.is_active === true);
      if (defaults.length !== 1) throw new ImportError(`Motorcycle ${slug} requires exactly one active default variant.`);
    }
  } catch (error) {
    if (error instanceof ImportError) return { status: "error", message: error.message };
    throw error;
  }

  const payload: Json = { motorcycles, category_links: categoryLinks, variants, specifications, features };
  const { data, error } = await auth.supabase.rpc("import_motorcycle_inventory", { payload });
  if (error) return databaseAction("importMotorcycleInventoryCsv", error);
  revalidateAdminContent();
  const result = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const created = typeof result.motorcycles_created === "number" ? result.motorcycles_created : motorcycles.length;
  return { status: "success", message: `${created} motorcycle draft${created === 1 ? "" : "s"} imported. Add images and review each draft before publishing.` };
}
