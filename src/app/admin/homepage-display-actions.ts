"use server";

import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import {
  databaseAction,
  revalidateAdminContent,
  unauthorizedAction,
  validationAction,
} from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import {
  homepageDisplayMoveSchema,
  homepageDisplayStatusSchema,
  homepageLogoVisibilitySchema,
  uuid,
} from "@/lib/admin/schemas";
import { ADMIN_IMAGE_MAX_BYTES, ADMIN_IMAGE_MAX_LABEL } from "@/lib/admin/upload-limits";
import { ADMIN_LOGO_EXTENSIONS, validateSvgLogo } from "@/lib/admin/logo-files";

async function uploadLogo(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthorizedAdminClient>>>,
  file: FormDataEntryValue | null,
  folder: string,
) {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a logo image." } as const;
  const extension = ADMIN_LOGO_EXTENSIONS[file.type];
  if (!extension) return { error: "Upload an SVG, PNG, WebP, AVIF, or JPEG logo." } as const;
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return { error: `Logo images must be ${ADMIN_IMAGE_MAX_LABEL} or smaller.` } as const;
  const svgError = await validateSvgLogo(file);
  if (svgError) return { error: svgError } as const;

  const storagePath = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await auth.supabase.storage.from("motorcycles").upload(storagePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[OW Motors display logo upload failed]", { name: error.name });
    return { error: "The logo could not be uploaded. Check the file and Storage policies." } as const;
  }
  return { path: storagePath } as const;
}

export async function moveHomepageDisplayItem(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = homepageDisplayMoveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const { error } = await auth.supabase.rpc("move_homepage_brand_section", {
    target_section_id: parsed.data.id,
    move_direction: parsed.data.direction,
  });
  if (error) return databaseAction("moveHomepageDisplayItem", error);
  revalidateAdminContent();
  return { status: "success", message: `Display item moved ${parsed.data.direction}.` };
}

export async function setHomepageDisplayStatus(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = homepageDisplayStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const { error } = await auth.supabase
    .from("homepage_brand_sections")
    .update({ display_status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) return databaseAction("setHomepageDisplayStatus", error);
  revalidateAdminContent();
  const message = parsed.data.status === "visible"
    ? "Item is now shown on the homepage."
    : parsed.data.status === "hidden"
      ? "Item hidden from the homepage."
      : "Item removed from the homepage display. It can be restored here.";
  return { status: "success", message };
}

export async function uploadHomepageBannerLogo(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Banner selection is invalid." };

  const uploaded = await uploadLogo(auth, formData.get("file"), `homepage-overlay-logos/${id.data}`);
  if (!("path" in uploaded)) return { status: "error", message: uploaded.error ?? "The logo could not be uploaded." };
  const { data, error } = await auth.supabase
    .from("homepage_brand_sections")
    .update({ overlay_logo_path: uploaded.path, show_overlay_logo: true })
    .eq("id", id.data)
    .eq("section_type", "brand_banner")
    .select("id")
    .maybeSingle();
  if (error) return databaseAction("uploadHomepageBannerLogo", error);
  if (!data) return { status: "error", message: "Banner display item was not found." };
  revalidateAdminContent();
  return { status: "success", message: "Banner watermark logo updated and shown." };
}

export async function setHomepageBannerLogoVisibility(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = homepageLogoVisibilitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await auth.supabase
    .from("homepage_brand_sections")
    .update({ show_overlay_logo: parsed.data.visible })
    .eq("id", parsed.data.id)
    .eq("section_type", "brand_banner");
  if (error) return databaseAction("setHomepageBannerLogoVisibility", error);
  revalidateAdminContent();
  return { status: "success", message: parsed.data.visible ? "Banner watermark logo restored." : "Banner watermark logo removed from display." };
}

export async function uploadMegaMenuLogo(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Brand selection is invalid." };

  const uploaded = await uploadLogo(auth, formData.get("file"), `mega-menu-logos/${id.data}`);
  if (!("path" in uploaded)) return { status: "error", message: uploaded.error ?? "The logo could not be uploaded." };
  const { data, error } = await auth.supabase
    .from("brands")
    .update({ mega_menu_logo_path: uploaded.path, show_mega_menu_logo: true })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error) return databaseAction("uploadMegaMenuLogo", error);
  if (!data) return { status: "error", message: "Brand was not found." };
  revalidateAdminContent();
  return { status: "success", message: "Brands menu logo updated and shown." };
}

export async function setMegaMenuLogoVisibility(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = homepageLogoVisibilitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await auth.supabase
    .from("brands")
    .update({ show_mega_menu_logo: parsed.data.visible })
    .eq("id", parsed.data.id);
  if (error) return databaseAction("setMegaMenuLogoVisibility", error);
  revalidateAdminContent();
  return { status: "success", message: parsed.data.visible ? "Brands menu logo restored." : "Logo removed from the Brands menu." };
}
