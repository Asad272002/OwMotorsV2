"use server";

import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, revalidateAdminContent, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { brandMoveSchema, brandSchema, uuid } from "@/lib/admin/schemas";
import { ADMIN_IMAGE_MAX_BYTES, ADMIN_IMAGE_MAX_LABEL } from "@/lib/admin/upload-limits";
import { ADMIN_LOGO_EXTENSIONS, validateSvgLogo } from "@/lib/admin/logo-files";

const BRAND_IMAGE_EXTENSIONS: Readonly<Record<string, string>> = ADMIN_LOGO_EXTENSIONS;

function values(data: ReturnType<typeof brandSchema.parse>) {
  return { name: data.name, slug: data.slug, logo_path: data.logoPath, short_description: data.shortDescription, full_description: data.fullDescription, hero_image_path: data.heroImagePath, seo_title: data.seoTitle, seo_description: data.seoDescription, is_active: data.isActive, display_order: data.displayOrder };
}

async function uploadBrandAsset(auth: NonNullable<Awaited<ReturnType<typeof getAuthorizedAdminClient>>>, file: FormDataEntryValue | null, kind: "logo" | "hero") {
  if (!(file instanceof File) || file.size === 0) return { path: null as string | null };
  const extension = BRAND_IMAGE_EXTENSIONS[file.type];
  if (!extension || (kind === "hero" && extension === "svg")) return { path: null, error: `Choose a supported ${kind === "logo" ? "logo" : "hero image"} file.` };
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return { path: null, error: `Brand images must be ${ADMIN_IMAGE_MAX_LABEL} or smaller.` };
  if (kind === "logo") {
    const svgError = await validateSvgLogo(file);
    if (svgError) return { path: null, error: svgError };
  }
  const path = `brand-assets/${crypto.randomUUID()}-${kind}.${extension}`;
  const { error } = await auth.supabase.storage.from("motorcycles").upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
  if (error) {
    console.error("[OW Motors brand asset upload failed]", { kind, name: error.name });
    return { path: null, error: "The brand image could not be uploaded. Check the file and Storage policies." };
  }
  return { path };
}

async function brandValuesWithUploads(auth: NonNullable<Awaited<ReturnType<typeof getAuthorizedAdminClient>>>, data: ReturnType<typeof brandSchema.parse>, formData: FormData) {
  const [logo, hero] = await Promise.all([uploadBrandAsset(auth, formData.get("logoFile"), "logo"), uploadBrandAsset(auth, formData.get("heroImageFile"), "hero")]);
  if (logo.error) return { error: logo.error };
  if (hero.error) return { error: hero.error };
  return { values: { ...values(data), logo_path: logo.path ?? data.logoPath, hero_image_path: hero.path ?? data.heroImagePath } };
}

export async function createBrand(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = brandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const uploaded = await brandValuesWithUploads(auth, parsed.data, formData);
  if (uploaded.error || !uploaded.values) return { status: "error", message: uploaded.error ?? "Brand images could not be prepared." };
  const { error } = await auth.supabase.from("brands").insert(uploaded.values);
  if (error) return databaseAction("createBrand", error);
  revalidateAdminContent();
  return { status: "success", message: "Brand created." };
}

export async function updateBrand(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = brandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.id) return parsed.success ? { status: "error", message: "Brand ID is missing." } : validationAction(parsed.error);
  const uploaded = await brandValuesWithUploads(auth, parsed.data, formData);
  if (uploaded.error || !uploaded.values) return { status: "error", message: uploaded.error ?? "Brand images could not be prepared." };
  const { error } = await auth.supabase.from("brands").update(uploaded.values).eq("id", parsed.data.id);
  if (error) return databaseAction("updateBrand", error);
  revalidateAdminContent();
  return { status: "success", message: "Brand updated." };
}

export async function moveBrand(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = brandMoveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await auth.supabase.rpc("move_homepage_brand", {
    target_brand_id: parsed.data.id,
    move_direction: parsed.data.direction,
  });
  if (error) return databaseAction("moveBrand", error);
  revalidateAdminContent();
  return { status: "success", message: `Homepage brand moved ${parsed.data.direction}.` };
}

export async function deleteBrand(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { status: "error", message: "Brand ID is invalid." };
  const { error } = await auth.supabase.from("brands").delete().eq("id", parsed.data);
  if (error) return databaseAction("deleteBrand", error);
  revalidateAdminContent();
  return { status: "success", message: "Brand deleted." };
}
