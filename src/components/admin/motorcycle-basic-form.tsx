import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, adminLabelClass, adminTextareaClass } from "@/components/admin/admin-ui";
import { createMotorcycle, updateMotorcycleBasic } from "@/app/admin/motorcycle-actions";
import type { Tables } from "@/lib/supabase/database.types";

export function MotorcycleBasicForm({ motorcycle, brands }: Readonly<{ motorcycle?: Tables<"motorcycles">; brands: readonly Tables<"brands">[] }>) {
  return <AdminForm action={motorcycle ? updateMotorcycleBasic : createMotorcycle} submitLabel={motorcycle ? "Update basic information" : "Create draft motorcycle"} pendingLabel={motorcycle ? "Updating…" : "Creating…"}>
    {motorcycle ? <input type="hidden" name="id" value={motorcycle.id} /> : null}
    <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Brand<select className={adminInputClass} name="brandId" required defaultValue={motorcycle?.brand_id ?? ""}><option value="">Select a brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.is_active ? "" : " (inactive)"}</option>)}</select></label><label className={adminLabelClass}>Model name<input className={adminInputClass} name="name" required minLength={2} maxLength={140} defaultValue={motorcycle?.name} /></label></div>
    <label className={adminLabelClass}>Slug<input className={adminInputClass} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={motorcycle?.slug} /></label>
    <label className={adminLabelClass}>Short description<textarea className={adminTextareaClass} name="shortDescription" required minLength={10} maxLength={320} rows={3} defaultValue={motorcycle?.short_description} /></label>
    <label className={adminLabelClass}>Full description<textarea className={adminTextareaClass} name="fullDescription" required minLength={20} rows={8} defaultValue={motorcycle?.full_description} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Base price (PKR)<input className={adminInputClass} name="basePrice" type="number" min={0} step="0.01" required defaultValue={motorcycle?.base_price ?? 0} /></label><label className="flex min-h-11 items-center gap-3 self-end text-sm font-semibold"><input type="checkbox" name="isFeatured" defaultChecked={motorcycle?.is_featured ?? false} className="h-4 w-4 accent-brand" /> Featured motorcycle</label></div>
  </AdminForm>;
}
