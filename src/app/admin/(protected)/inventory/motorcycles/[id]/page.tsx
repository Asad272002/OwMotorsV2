import { notFound } from "next/navigation";
import { MotorcycleInventoryEditor } from "@/components/admin/inventory/motorcycle-editor";
import { requireStaffPage } from "@/lib/admin/auth";
import { getAdminBrands, getAdminCategories, getAdminMotorcycle } from "@/lib/admin/queries";
import type { EditorSectionKey } from "@/lib/admin/inventory-readiness";
import { uuid } from "@/lib/admin/schemas";

const sections: readonly EditorSectionKey[] = ["basic", "categories", "variants", "images", "specifications", "features", "seo", "publishing"];

export default async function InventoryMotorcycleEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string | string[] }> }) {
  const [{ id }, query, actor] = await Promise.all([params, searchParams, requireStaffPage()]);
  if (!uuid.safeParse(id).success) notFound();
  const requested = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const section: EditorSectionKey = sections.includes(requested as EditorSectionKey) ? requested as EditorSectionKey : "basic";
  const [motorcycle, brands, categories] = await Promise.all([getAdminMotorcycle(id), getAdminBrands(), getAdminCategories()]);
  if (!motorcycle) notFound();
  return <MotorcycleInventoryEditor motorcycle={motorcycle} brands={brands} categories={categories} section={section} isAdmin={actor.profile.role === "admin"} />;
}
