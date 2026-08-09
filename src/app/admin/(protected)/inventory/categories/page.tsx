import { Search, Tags } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass } from "@/components/admin/admin-ui";
import { CategoryForm } from "@/components/admin/category-form";
import { requireStaffPage } from "@/lib/admin/auth";
import { getAdminCategories, getAdminMotorcycleInventory } from "@/lib/admin/queries";

function value(input: string | string[] | undefined) { return Array.isArray(input) ? input[0] ?? "" : input ?? ""; }

export default async function InventoryCategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; visibility?: string | string[] }> }) {
  const [query, categories, motorcycles, actor] = await Promise.all([searchParams, getAdminCategories(), getAdminMotorcycleInventory(), requireStaffPage()]);
  const q = value(query.q).trim().toLowerCase();
  const visibility = value(query.visibility);
  const filtered = categories.filter((category) => (!q || `${category.name} ${category.description}`.toLowerCase().includes(q)) && (!visibility || (visibility === "active") === category.is_active));
  const isAdmin = actor.profile.role === "admin";
  return <>
    <AdminPageHeader eyebrow="Inventory" title="Categories" description="Manage the browsing groups assigned to motorcycle records and indexable category pages." />
    <section className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-4"><form action="/admin/inventory/categories" method="get" className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_auto_auto]"><label className="relative"><span className="sr-only">Search categories</span><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" /><input name="q" defaultValue={value(query.q)} className={`${adminInputClass} mt-0 pl-10`} placeholder="Search categories" /></label><label><span className="sr-only">Visibility</span><select name="visibility" defaultValue={visibility} className={`${adminInputClass} mt-0`}><option value="">All visibility</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label><button className="min-h-11 rounded-md bg-[#111111] px-4 text-sm font-semibold text-white hover:bg-[#C62828]">Apply filters</button><Link href="/admin/inventory/categories" className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-[#C62828] hover:underline">Clear</Link></form></section>
    <AdminPanel title="Add category" description="Create a reusable inventory category; products are assigned by reference."><CategoryForm isAdmin={isAdmin} /></AdminPanel>
    <div className="mt-7 space-y-4">{filtered.map((category) => { const productCount = motorcycles.filter((motorcycle) => motorcycle.categoryLinks.some((link) => link.category_id === category.id)).length; return <details key={category.id} className="group overflow-hidden rounded-lg border border-[#E5E7EB] bg-white"><summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 px-5 hover:bg-[#F7F7F8] [&::-webkit-details-marker]:hidden"><span className="flex min-w-0 items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#FEF2F2] text-[#C62828]"><Tags aria-hidden="true" className="h-5 w-5" /></span><span><strong className="font-display text-xl">{category.name}</strong><span className="mt-1 block text-xs text-[#6B7280]">{productCount} assigned motorcycle{productCount === 1 ? "" : "s"}</span></span></span><span className="flex items-center gap-3"><StatusBadge value={category.is_active ? "active" : "inactive"} /><span aria-hidden="true" className="text-xl text-[#6B7280] transition-transform group-open:rotate-45">+</span></span></summary><div className="border-t border-[#E5E7EB] p-5 sm:p-6"><CategoryForm category={category} isAdmin={isAdmin} /></div></details>; })}</div>
  </>;
}
