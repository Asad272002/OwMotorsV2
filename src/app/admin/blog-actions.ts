"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { blogPostSchema, uuid } from "@/lib/admin/schemas";
import { ADMIN_IMAGE_MAX_BYTES, ADMIN_IMAGE_MAX_LABEL } from "@/lib/admin/upload-limits";
import type { Json } from "@/lib/supabase/database.types";

const imageExtensions: Readonly<Record<string, string>> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function sections(formData: FormData) {
  return Array.from({ length: 12 }, (_, index) => ({
    heading: String(formData.get(`sectionHeading${index}`) ?? "").trim(),
    body: String(formData.get(`sectionBody${index}`) ?? "").trim(),
  })).filter((section) => section.heading || section.body);
}

function validateSections(items: ReturnType<typeof sections>): AdminActionState | null {
  if (!items.length) return { status: "error", message: "Add at least one article section." };
  if (items.some((item) => item.heading.length < 3 || item.heading.length > 180 || item.body.length < 20 || item.body.length > 5000)) return { status: "error", message: "Each section needs a 3–180 character heading and at least 20 characters of body copy." };
  return null;
}

async function uploadHero(auth: NonNullable<Awaited<ReturnType<typeof getAuthorizedAdminClient>>>, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = imageExtensions[file.type];
  if (!extension) throw new Error("Choose a JPG, PNG, WebP, or AVIF hero image.");
  if (file.size > ADMIN_IMAGE_MAX_BYTES) throw new Error(`Blog images must be ${ADMIN_IMAGE_MAX_LABEL} or smaller.`);
  const path = `blog-assets/${crypto.randomUUID()}.${extension}`;
  const { error } = await auth.supabase.storage.from("motorcycles").upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
  if (error) throw new Error("The blog image could not be uploaded. Check the file and Storage policies.");
  return path;
}

function revalidateBlog(slug?: string) {
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/inventory/blog", "layout");
}

function values(data: ReturnType<typeof blogPostSchema.parse>, contentSections: Json, actorId: string, heroImagePath: string) {
  return {
    category_id: data.categoryId,
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    brand_label: data.brandLabel,
    hero_image_path: heroImagePath,
    hero_image_alt: data.heroImageAlt,
    lead: data.lead,
    content_sections: contentSections,
    tags: data.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
    author_name: data.authorName,
    author_initials: data.authorInitials.toUpperCase(),
    author_bio: data.authorBio,
    reading_time_minutes: data.readingTimeMinutes,
    publication_status: data.publicationStatus,
    is_featured: data.isFeatured,
    seo_title: data.seoTitle,
    seo_description: data.seoDescription,
    published_at: data.publicationStatus === "published" ? new Date().toISOString() : null,
    updated_by: actorId,
  } as const;
}

export async function createBlogPost(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = blogPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const contentSections = sections(formData);
  const invalid = validateSections(contentSections);
  if (invalid) return invalid;
  let uploaded: string | null;
  try { uploaded = await uploadHero(auth, formData.get("heroImageFile")); } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "The image could not be uploaded." }; }
  const heroImagePath = uploaded ?? parsed.data.heroImagePath;
  if (!heroImagePath) return { status: "error", message: "Upload a hero image or provide an existing image path." };
  const { error } = await auth.supabase.from("blog_posts").insert({ ...values(parsed.data, contentSections as unknown as Json, auth.actor.userId, heroImagePath), created_by: auth.actor.userId });
  if (error) return databaseAction("createBlogPost", error);
  revalidateBlog(parsed.data.slug);
  return { status: "success", message: parsed.data.publicationStatus === "published" ? "Article published." : "Article draft created." };
}

export async function updateBlogPost(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = blogPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.id) return parsed.success ? { status: "error", message: "Article ID is missing." } : validationAction(parsed.error);
  const contentSections = sections(formData);
  const invalid = validateSections(contentSections);
  if (invalid) return invalid;
  let uploaded: string | null;
  try { uploaded = await uploadHero(auth, formData.get("heroImageFile")); } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "The image could not be uploaded." }; }
  const heroImagePath = uploaded ?? parsed.data.heroImagePath;
  if (!heroImagePath) return { status: "error", message: "Upload a hero image or retain an existing image path." };
  const { error } = await auth.supabase.from("blog_posts").update(values(parsed.data, contentSections as unknown as Json, auth.actor.userId, heroImagePath)).eq("id", parsed.data.id);
  if (error) return databaseAction("updateBlogPost", error);
  revalidateBlog(parsed.data.slug);
  return { status: "success", message: parsed.data.publicationStatus === "published" ? "Article published." : parsed.data.publicationStatus === "archived" ? "Article archived." : "Draft saved." };
}

export async function deleteBlogPost(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Article ID is invalid." };
  const { error } = await auth.supabase.from("blog_posts").delete().eq("id", id.data);
  if (error) return databaseAction("deleteBlogPost", error);
  revalidateBlog();
  return { status: "success", message: "Article permanently deleted." };
}
