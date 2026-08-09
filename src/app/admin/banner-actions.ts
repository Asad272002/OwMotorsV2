"use server";

import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, revalidateAdminContent, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { brandBannerMetadataSchema, brandBannerMoveSchema, brandBannerUploadSchema, uuid } from "@/lib/admin/schemas";
import { ADMIN_IMAGE_MAX_BYTES, ADMIN_IMAGE_MAX_LABEL } from "@/lib/admin/upload-limits";

const IMAGE_MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function uploadBrandBanner(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = brandBannerUploadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a banner image to upload." };
  const extension = IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension) return { status: "error", message: "Upload a JPEG, PNG, WebP, or AVIF image." };
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return { status: "error", message: `Banner images must be ${ADMIN_IMAGE_MAX_LABEL} or smaller.` };

  const { data: finalBanner, error: orderError } = await auth.supabase
    .from("brand_campaign_images")
    .select("sort_order")
    .eq("brand_id", parsed.data.brandId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) return databaseAction("readBrandBannerOrder", orderError);

  const storagePath = `brand-banners/${parsed.data.brandId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await auth.supabase.storage.from("motorcycles").upload(storagePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error("[OW Motors banner upload failed]", { name: uploadError.name });
    return { status: "error", message: "The banner could not be uploaded. Check the file and Storage policies." };
  }

  const { error } = await auth.supabase.from("brand_campaign_images").insert({
    brand_id: parsed.data.brandId,
    storage_path: storagePath,
    alt_text: parsed.data.altText,
    sort_order: (finalBanner?.sort_order ?? -1) + 1,
    is_active: true,
  });
  if (error) {
    if (auth.actor.profile.role === "admin") await auth.supabase.storage.from("motorcycles").remove([storagePath]);
    return databaseAction("createBrandBanner", error);
  }

  revalidateAdminContent();
  return { status: "success", message: "Banner uploaded and added to the homepage sequence." };
}

export async function updateBrandBanner(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = brandBannerMetadataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const { error } = await auth.supabase
    .from("brand_campaign_images")
    .update({ alt_text: parsed.data.altText, is_active: parsed.data.isActive })
    .eq("id", parsed.data.id)
    .eq("brand_id", parsed.data.brandId);
  if (error) return databaseAction("updateBrandBanner", error);

  revalidateAdminContent();
  return { status: "success", message: "Banner updated." };
}

export async function replaceBrandBannerImage(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  const brandId = uuid.safeParse(formData.get("brandId"));
  if (!id.success || !brandId.success) return { status: "error", message: "Banner selection is invalid." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a replacement image." };
  const extension = IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension) return { status: "error", message: "Upload a JPEG, PNG, WebP, or AVIF image." };
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return { status: "error", message: `Banner images must be ${ADMIN_IMAGE_MAX_LABEL} or smaller.` };

  const { data: banner, error: readError } = await auth.supabase
    .from("brand_campaign_images")
    .select("storage_path")
    .eq("id", id.data)
    .eq("brand_id", brandId.data)
    .maybeSingle();
  if (readError) return databaseAction("readBrandBannerForReplacement", readError);
  if (!banner) return { status: "error", message: "Banner not found." };

  const newStoragePath = `brand-banners/${brandId.data}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await auth.supabase.storage.from("motorcycles").upload(newStoragePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error("[OW Motors replacement banner upload failed]", { name: uploadError.name });
    return { status: "error", message: "The replacement banner could not be uploaded." };
  }

  const { error } = await auth.supabase
    .from("brand_campaign_images")
    .update({ storage_path: newStoragePath })
    .eq("id", id.data)
    .eq("brand_id", brandId.data);
  if (error) {
    await auth.supabase.storage.from("motorcycles").remove([newStoragePath]);
    return databaseAction("replaceBrandBannerImage", error);
  }

  let storageCleanupFailed = false;
  if (!banner.storage_path.startsWith("images/")) {
    const { error: storageError } = await auth.supabase.storage.from("motorcycles").remove([banner.storage_path]);
    storageCleanupFailed = Boolean(storageError);
    if (storageError) console.error("[OW Motors orphaned replaced banner]", { name: storageError.name });
  }

  revalidateAdminContent();
  return {
    status: "success",
    message: storageCleanupFailed ? "Banner replaced; the previous Storage object needs manual cleanup." : "Banner image replaced.",
  };
}

export async function moveBrandBanner(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = brandBannerMoveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const { data: banner, error: readError } = await auth.supabase
    .from("brand_campaign_images")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("brand_id", parsed.data.brandId)
    .maybeSingle();
  if (readError) return databaseAction("readBrandBanner", readError);
  if (!banner) return { status: "error", message: "Banner not found." };

  const { error } = await auth.supabase.rpc("move_brand_campaign_image", {
    target_banner_id: parsed.data.id,
    move_direction: parsed.data.direction,
  });
  if (error) return databaseAction("moveBrandBanner", error);

  revalidateAdminContent();
  return { status: "success", message: `Banner moved ${parsed.data.direction}.` };
}

export async function deleteBrandBanner(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  const brandId = uuid.safeParse(formData.get("brandId"));
  if (!id.success || !brandId.success) return { status: "error", message: "Banner selection is invalid." };

  const { data: banner, error: readError } = await auth.supabase
    .from("brand_campaign_images")
    .select("storage_path")
    .eq("id", id.data)
    .eq("brand_id", brandId.data)
    .maybeSingle();
  if (readError) return databaseAction("readBrandBannerForDelete", readError);
  if (!banner) return { status: "error", message: "Banner not found." };

  const { error } = await auth.supabase
    .from("brand_campaign_images")
    .delete()
    .eq("id", id.data)
    .eq("brand_id", brandId.data);
  if (error) return databaseAction("deleteBrandBanner", error);

  let storageCleanupFailed = false;
  if (!banner.storage_path.startsWith("images/")) {
    const { error: storageError } = await auth.supabase.storage.from("motorcycles").remove([banner.storage_path]);
    storageCleanupFailed = Boolean(storageError);
    if (storageError) console.error("[OW Motors orphaned banner image]", { name: storageError.name });
  }

  revalidateAdminContent();
  return {
    status: "success",
    message: storageCleanupFailed ? "Banner removed; the Storage object needs manual cleanup." : "Banner removed.",
  };
}
