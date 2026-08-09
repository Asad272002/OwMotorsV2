import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, adminLabelClass, adminTextareaClass } from "@/components/admin/admin-ui";
import { createCategory, deleteCategory, updateCategory } from "@/app/admin/category-actions";
import type { Tables } from "@/lib/supabase/database.types";

export function CategoryForm({ category, isAdmin }: Readonly<{ category?: Tables<"categories">; isAdmin: boolean }>) {
  return <div className="space-y-5"><AdminForm action={category ? updateCategory : createCategory} submitLabel={category ? "Update category" : "Create category"}>
    {category ? <input type="hidden" name="id" value={category.id} /> : null}
    <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Name<input className={adminInputClass} name="name" required minLength={2} maxLength={100} defaultValue={category?.name} /></label><label className={adminLabelClass}>Slug<input className={adminInputClass} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={category?.slug} /></label></div>
    <label className={adminLabelClass}>Description<textarea className={adminTextareaClass} name="description" required minLength={20} rows={5} defaultValue={category?.description} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>SEO title<input className={adminInputClass} name="seoTitle" minLength={10} maxLength={70} defaultValue={category?.seo_title ?? ""} /></label><label className={adminLabelClass}>Display order<input className={adminInputClass} name="displayOrder" type="number" min={0} required defaultValue={category?.display_order ?? 0} /></label></div>
    <label className={adminLabelClass}>SEO description<textarea className={adminTextareaClass} name="seoDescription" minLength={50} maxLength={180} rows={3} defaultValue={category?.seo_description ?? ""} /></label>
    <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name="isActive" defaultChecked={category?.is_active ?? false} className="h-4 w-4 accent-brand" /> Active and publicly visible</label>
  </AdminForm>{category && isAdmin ? <AdminForm action={deleteCategory} submitLabel="Delete category" pendingLabel="Deleting…" destructive confirmMessage={`Delete ${category.name}? This cannot be undone.`} className="border-t border-border pt-5"><input type="hidden" name="id" value={category.id} /></AdminForm> : null}</div>;
}
