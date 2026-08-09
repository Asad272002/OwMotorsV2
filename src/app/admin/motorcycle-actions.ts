"use server";

import { redirect } from "next/navigation";
import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, revalidateAdminContent, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { motorcycleBasicSchema, motorcycleCategoriesSchema, motorcyclePublishingSchema, motorcycleSeoSchema, uuid } from "@/lib/admin/schemas";

function basicValues(data: ReturnType<typeof motorcycleBasicSchema.parse>) {
  return { brand_id: data.brandId, name: data.name, slug: data.slug, short_description: data.shortDescription, full_description: data.fullDescription, base_price: data.basePrice, is_featured: data.isFeatured };
}

export async function createMotorcycle(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = motorcycleBasicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const { data, error } = await auth.supabase.from("motorcycles").insert({ ...basicValues(parsed.data), publication_status: "draft" }).select("id").single();
  if (error) return databaseAction("createMotorcycle", error);
  revalidateAdminContent();
  redirect(`/admin/inventory/motorcycles/${data.id}`);
}

export async function updateMotorcycleBasic(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = motorcycleBasicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.id) return parsed.success ? { status: "error", message: "Motorcycle ID is missing." } : validationAction(parsed.error);
  const { error } = await auth.supabase.from("motorcycles").update(basicValues(parsed.data)).eq("id", parsed.data.id);
  if (error) return databaseAction("updateMotorcycleBasic", error);
  revalidateAdminContent();
  return { status: "success", message: "Basic information updated." };
}

export async function updateMotorcycleSeo(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = motorcycleSeoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await auth.supabase.from("motorcycles").update({ seo_title: parsed.data.seoTitle, seo_description: parsed.data.seoDescription }).eq("id", parsed.data.id);
  if (error) return databaseAction("updateMotorcycleSeo", error);
  revalidateAdminContent();
  return { status: "success", message: "SEO metadata updated." };
}

export async function updateMotorcyclePublishing(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = motorcyclePublishingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  if (parsed.data.publicationStatus === "published") {
    const [variants, images, motorcycle] = await Promise.all([
      auth.supabase.from("motorcycle_variants").select("id, is_default").eq("motorcycle_id", parsed.data.id).eq("is_active", true),
      auth.supabase.from("motorcycle_images").select("id", { count: "exact", head: true }).eq("motorcycle_id", parsed.data.id),
      auth.supabase.from("motorcycles").select("brand_id").eq("id", parsed.data.id).maybeSingle(),
    ]);
    if (variants.error) return databaseAction("validateMotorcycleVariants", variants.error);
    if (images.error) return databaseAction("validateMotorcycleImages", images.error);
    if (motorcycle.error) return databaseAction("validateMotorcycleBrand", motorcycle.error);
    if (!motorcycle.data) return { status: "error", message: "Motorcycle not found." };
    const { data: brand, error: brandError } = await auth.supabase.from("brands").select("is_active").eq("id", motorcycle.data.brand_id).maybeSingle();
    if (brandError) return databaseAction("validateActiveMotorcycleBrand", brandError);
    if (!brand?.is_active) return { status: "error", message: "Activate the motorcycle brand before publishing this product." };
    if (!variants.data?.length || !variants.data.some((variant) => variant.is_default)) return { status: "error", message: "Publishing requires at least one active default variant." };
    if (!images.count) return { status: "error", message: "Publishing requires at least one motorcycle image." };
  }

  const { error } = await auth.supabase.from("motorcycles").update({ publication_status: parsed.data.publicationStatus }).eq("id", parsed.data.id);
  if (error) return databaseAction("updateMotorcyclePublishing", error);
  revalidateAdminContent();
  return { status: "success", message: `Motorcycle status changed to ${parsed.data.publicationStatus}.` };
}

export async function updateMotorcycleCategories(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = motorcycleCategoriesSchema.safeParse({ motorcycleId: formData.get("motorcycleId"), categoryIds: formData.getAll("categoryIds") });
  if (!parsed.success) return validationAction(parsed.error);
  const { data: existing, error: readError } = await auth.supabase.from("motorcycle_categories").select("category_id").eq("motorcycle_id", parsed.data.motorcycleId);
  if (readError) return databaseAction("readMotorcycleCategories", readError);
  const current = new Set((existing ?? []).map((item) => item.category_id));
  const requested = new Set(parsed.data.categoryIds);
  const additions = parsed.data.categoryIds.filter((id) => !current.has(id));
  const removals = [...current].filter((id) => !requested.has(id));
  if (removals.length && auth.actor.profile.role !== "admin") return { status: "error", message: "Only administrators can remove assigned categories. You may add new categories." };
  if (additions.length) {
    const { error } = await auth.supabase.from("motorcycle_categories").insert(additions.map((categoryId) => ({ motorcycle_id: parsed.data.motorcycleId, category_id: categoryId })));
    if (error) return databaseAction("addMotorcycleCategories", error);
  }
  if (removals.length) {
    const { error } = await auth.supabase.from("motorcycle_categories").delete().eq("motorcycle_id", parsed.data.motorcycleId).in("category_id", removals);
    if (error) return databaseAction("removeMotorcycleCategories", error);
  }
  revalidateAdminContent();
  return { status: "success", message: "Category assignments updated." };
}

export async function deleteMotorcycle(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { status: "error", message: "Motorcycle ID is invalid." };
  const { error } = await auth.supabase.from("motorcycles").delete().eq("id", parsed.data);
  if (error) return databaseAction("deleteMotorcycle", error);
  revalidateAdminContent();
  redirect("/admin/inventory/motorcycles");
}
