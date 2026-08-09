import { CheckCircle2, CircleDashed } from "lucide-react";
import Link from "next/link";
import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin/admin-ui";
import { MotorcycleBasicForm } from "@/components/admin/motorcycle-basic-form";
import { getAdminBrands } from "@/lib/admin/queries";

const steps = ["Basic Information", "Categories", "Variants", "Images", "Specifications", "Features", "SEO", "Preview & Publish"];

export default async function NewInventoryMotorcyclePage() {
  const brands = await getAdminBrands();
  return <>
    <AdminPageHeader eyebrow="Inventory" title="Add Motorcycle" description="Start with the customer-facing identity. The remaining editor sections open after the draft is created." actions={<Link href="/admin/inventory/motorcycles" className="inline-flex min-h-11 items-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold hover:border-[#C62828] hover:text-[#C62828]">Back to inventory</Link>} />
    {brands.length ? <div className="lg:grid lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start lg:gap-6"><aside className="mb-5 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white lg:sticky lg:top-[96px] lg:mb-0"><header className="border-b border-[#E5E7EB] px-4 py-4"><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#C62828]">Editor setup</p><p className="mt-1 text-xs leading-5 text-[#6B7280]">Create the draft to unlock inventory management.</p></header><ol className="p-2">{steps.map((step, index) => <li key={step} className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold ${index === 0 ? "bg-[#FEF2F2] text-[#C62828]" : "text-[#9CA3AF]"}`}>{index === 0 ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <CircleDashed aria-hidden="true" className="h-4 w-4" />}{step}</li>)}</ol></aside><AdminPanel title="Basic Information" description="No internal record identifiers are shown; staff work only with dealership-facing fields."><MotorcycleBasicForm brands={brands} /></AdminPanel></div> : <AdminEmptyState title="Create a brand first" description="Every motorcycle belongs to an existing inventory brand." action={<Link href="/admin/inventory/brands" className="ow-button-primary">Manage brands</Link>} />}
  </>;
}
