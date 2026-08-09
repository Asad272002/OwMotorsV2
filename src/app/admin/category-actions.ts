"use server";

import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, revalidateAdminContent, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { categorySchema, uuid } from "@/lib/admin/schemas";

function values(data: ReturnType<typeof categorySchema.parse>) {
  return { name: data.name, slug: data.slug, description: data.description, seo_title: data.seoTitle, seo_description: data.seoDescription, is_active: data.isActive, display_order: data.displayOrder };
}

export async function createCategory(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await auth.supabase.from("categories").insert(values(parsed.data));
  if (error) return databaseAction("createCategory", error);
  revalidateAdminContent();
  return { status: "success", message: "Category created." };
}

export async function updateCategory(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.id) return parsed.success ? { status: "error", message: "Category ID is missing." } : validationAction(parsed.error);
  const { error } = await auth.supabase.from("categories").update(values(parsed.data)).eq("id", parsed.data.id);
  if (error) return databaseAction("updateCategory", error);
  revalidateAdminContent();
  return { status: "success", message: "Category updated." };
}

export async function deleteCategory(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient("admin");
  if (!auth) return unauthorizedAction;
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { status: "error", message: "Category ID is invalid." };
  const { error } = await auth.supabase.from("categories").delete().eq("id", parsed.data);
  if (error) return databaseAction("deleteCategory", error);
  revalidateAdminContent();
  return { status: "success", message: "Category deleted." };
}
