import { AdminForm } from "@/components/admin/admin-form.client";
import { updateMotorcycleCategories } from "@/app/admin/motorcycle-actions";
import type { Tables } from "@/lib/supabase/database.types";

export function MotorcycleCategoriesForm({ motorcycleId, categories, selectedIds, isAdmin }: Readonly<{ motorcycleId: string; categories: readonly Tables<"categories">[]; selectedIds: readonly string[]; isAdmin: boolean }>) {
  return <AdminForm action={updateMotorcycleCategories} submitLabel="Update categories"><input type="hidden" name="motorcycleId" value={motorcycleId} /><fieldset><legend className="sr-only">Assigned categories</legend><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => <label key={category.id} className="flex min-h-12 cursor-pointer items-center gap-3 border border-border px-4 text-sm font-semibold hover:border-brand"><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={selectedIds.includes(category.id)} className="h-4 w-4 accent-brand" /><span>{category.name}{category.is_active ? "" : " (inactive)"}</span></label>)}</div></fieldset>{!isAdmin ? <p className="text-xs text-cool-gray">Editors may add category assignments. Removing an existing assignment requires an administrator.</p> : null}</AdminForm>;
}
