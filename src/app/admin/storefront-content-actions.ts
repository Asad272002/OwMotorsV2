"use server";

import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, revalidateAdminContent, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { ADMIN_IMAGE_MAX_BYTES, ADMIN_IMAGE_MAX_LABEL } from "@/lib/admin/upload-limits";
import type { Json } from "@/lib/supabase/database.types";
import {
  aboutPreviewContentSchema,
  brandsPageContentSchema,
  contactPreviewContentSchema,
  STOREFRONT_SETTING_KEYS,
  whyChooseContentSchema,
} from "@/lib/storefront/content";

const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const checked = (formData: FormData, name: string) => formData.get(name) === "on";
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const number = (formData: FormData, name: string) => Number(formData.get(name) ?? 0);

async function saveSetting(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthorizedAdminClient>>>,
  key: string,
  value: Json,
  description: string,
) {
  return auth.supabase.from("site_settings").upsert({ setting_key: key, setting_value: value, description }, { onConflict: "setting_key" });
}

export async function updateWhyChooseContent(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const cardCount = Math.min(Math.max(number(formData, "cardCount"), 1), 8);
  const cards = Array.from({ length: cardCount }, (_, index) => ({
    id: text(formData, `card${index}Id`),
    icon: text(formData, `card${index}Icon`),
    title: text(formData, `card${index}Title`),
    description: text(formData, `card${index}Description`),
    visible: checked(formData, `card${index}Visible`),
    order: number(formData, `card${index}Order`),
  }));
  const parsed = whyChooseContentSchema.safeParse({
    visible: checked(formData, "visible"),
    eyebrow: text(formData, "eyebrow"),
    heading: text(formData, "heading"),
    cards,
  });
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await saveSetting(auth, STOREFRONT_SETTING_KEYS.whyChoose, parsed.data as Json, "Homepage Why Choose section content and card presentation.");
  if (error) return databaseAction("updateWhyChooseContent", error);
  revalidateAdminContent();
  return { status: "success", message: "Why Choose section updated on the storefront." };
}

async function uploadAboutImage(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthorizedAdminClient>>>,
  file: FormDataEntryValue | null,
) {
  if (!(file instanceof File) || file.size === 0) return { path: null as string | null };
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) return { path: null, error: "Upload a JPEG, PNG, WebP, or AVIF image." };
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return { path: null, error: `Storefront images must be ${ADMIN_IMAGE_MAX_LABEL} or smaller.` };
  const path = `storefront/about/${crypto.randomUUID()}.${extension}`;
  const { error } = await auth.supabase.storage.from("motorcycles").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) return { path: null, error: "The About image could not be uploaded. Check the file and Storage policies." };
  return { path };
}

export async function updateAboutPreviewContent(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const uploaded = await uploadAboutImage(auth, formData.get("imageFile"));
  if (uploaded.error) return { status: "error", message: uploaded.error };
  const parsed = aboutPreviewContentSchema.safeParse({
    visible: checked(formData, "visible"),
    eyebrow: text(formData, "eyebrow"),
    heading: text(formData, "heading"),
    description: text(formData, "description"),
    imagePath: uploaded.path ?? text(formData, "imagePath"),
    imageAlt: text(formData, "imageAlt"),
    points: Array.from({ length: 4 }, (_, index) => text(formData, `point${index}`)),
    ctaLabel: text(formData, "ctaLabel"),
    ctaHref: text(formData, "ctaHref"),
    primaryStatValue: text(formData, "primaryStatValue"),
    primaryStatLabel: text(formData, "primaryStatLabel"),
    secondaryStatValue: text(formData, "secondaryStatValue"),
    secondaryStatLabel: text(formData, "secondaryStatLabel"),
  });
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await saveSetting(auth, STOREFRONT_SETTING_KEYS.aboutPreview, parsed.data as Json, "Homepage About preview content, image, facts, and action.");
  if (error) return databaseAction("updateAboutPreviewContent", error);
  revalidateAdminContent();
  return { status: "success", message: "About preview updated on the storefront." };
}

export async function updateContactPreviewContent(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = contactPreviewContentSchema.safeParse({
    visible: checked(formData, "visible"),
    eyebrow: text(formData, "eyebrow"),
    heading: text(formData, "heading"),
    location: text(formData, "location"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    openingHours: text(formData, "openingHours"),
    mapMessage: text(formData, "mapMessage"),
    ctaLabel: text(formData, "ctaLabel"),
    ctaHref: text(formData, "ctaHref"),
  });
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await saveSetting(auth, STOREFRONT_SETTING_KEYS.contactPreview, parsed.data as Json, "Homepage contact and location preview content.");
  if (error) return databaseAction("updateContactPreviewContent", error);
  revalidateAdminContent();
  return { status: "success", message: "Contact and Location preview updated on the storefront." };
}

export async function updateBrandsPageContent(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const brandCount = Math.min(Math.max(number(formData, "brandCount"), 0), 50);
  const showcase = Array.from({ length: brandCount }, (_, index) => ({
    brandId: text(formData, `brand${index}Id`),
    visible: checked(formData, `brand${index}Visible`),
    order: number(formData, `brand${index}Order`),
  }));
  const parsed = brandsPageContentSchema.safeParse({
    eyebrow: text(formData, "eyebrow"),
    heading: text(formData, "heading"),
    description: text(formData, "description"),
    showcase,
  });
  if (!parsed.success) return validationAction(parsed.error);

  const { data: brands, error: brandsError } = await auth.supabase.from("brands").select("id");
  if (brandsError) return databaseAction("updateBrandsPageContentBrands", brandsError);
  const validIds = new Set((brands ?? []).map((brand) => brand.id));
  if (parsed.data.showcase.some((item) => !validIds.has(item.brandId))) return { status: "error", message: "One of the selected brands no longer exists. Refresh and try again." };

  const { error } = await saveSetting(auth, STOREFRONT_SETTING_KEYS.brandsPage, parsed.data as Json, "Brands page introduction and brand showcase visibility/order.");
  if (error) return databaseAction("updateBrandsPageContent", error);
  revalidateAdminContent();
  return { status: "success", message: "Brands page presentation updated." };
}
