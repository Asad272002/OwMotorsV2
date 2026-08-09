import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, adminLabelClass, adminTextareaClass } from "@/components/admin/admin-ui";
import { createBrand, deleteBrand, updateBrand } from "@/app/admin/brand-actions";
import type { Tables } from "@/lib/supabase/database.types";

export function BrandForm({ brand, isAdmin }: Readonly<{ brand?: Tables<"brands">; isAdmin: boolean }>) {
  return <div className="space-y-5"><AdminForm action={brand ? updateBrand : createBrand} submitLabel={brand ? "Update brand" : "Create brand"}>
    {brand ? <input type="hidden" name="id" value={brand.id} /> : null}
    <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Name<input className={adminInputClass} name="name" required minLength={2} maxLength={100} defaultValue={brand?.name} /></label><label className={adminLabelClass}>Slug<input className={adminInputClass} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={brand?.slug} /></label></div>
    <label className={adminLabelClass}>Short description<textarea className={adminTextareaClass} name="shortDescription" required minLength={10} maxLength={320} rows={3} defaultValue={brand?.short_description} /></label>
    <label className={adminLabelClass}>Full description<textarea className={adminTextareaClass} name="fullDescription" required minLength={20} rows={5} defaultValue={brand?.full_description} /></label>
    <input type="hidden" name="logoPath" value={brand?.logo_path ?? ""} />
    <input type="hidden" name="heroImagePath" value={brand?.hero_image_path ?? ""} />
    <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Brand logo<input className={`${adminInputClass} py-2`} name="logoFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" /><span className="mt-1 block text-xs font-normal leading-5 text-[#6B7280]">Upload only when replacing the current logo. SVG, PNG, WebP, AVIF, or JPEG.</span></label><label className={adminLabelClass}>Brand hero image<input className={`${adminInputClass} py-2`} name="heroImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><span className="mt-1 block text-xs font-normal leading-5 text-[#6B7280]">Upload only when replacing the current campaign hero.</span></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>SEO title<input className={adminInputClass} name="seoTitle" minLength={10} maxLength={70} defaultValue={brand?.seo_title ?? ""} /></label><label className={adminLabelClass}>Display order<input className={adminInputClass} name="displayOrder" type="number" min={0} required defaultValue={brand?.display_order ?? 0} /></label></div>
    <label className={adminLabelClass}>SEO description<textarea className={adminTextareaClass} name="seoDescription" minLength={50} maxLength={180} rows={3} defaultValue={brand?.seo_description ?? ""} /></label>
    <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name="isActive" defaultChecked={brand?.is_active ?? false} className="h-4 w-4 accent-brand" /> Active and publicly visible</label>
  </AdminForm>{brand && isAdmin ? <AdminForm action={deleteBrand} submitLabel="Delete brand" pendingLabel="Deleting…" destructive confirmMessage={`Delete ${brand.name}? This cannot be undone.`} className="border-t border-border pt-5"><input type="hidden" name="id" value={brand.id} /></AdminForm> : null}</div>;
}
