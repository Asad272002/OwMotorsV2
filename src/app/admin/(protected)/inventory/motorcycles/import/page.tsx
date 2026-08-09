import { ArrowLeft, Download, Upload } from "lucide-react";
import Link from "next/link";
import { importMotorcycleInventoryCsv } from "@/app/admin/motorcycle-import-actions";
import { AdminForm } from "@/components/admin/admin-form.client";
import { AdminPageHeader, AdminPanel, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";

const recordTypes = [
  ["motorcycle", "One row per new bike", "motorcycle_slug, brand_slug, name, short_description, full_description, base_price; SEO and featured fields are optional"],
  ["category", "One row per category assignment", "motorcycle_slug, category_slug"],
  ["variant", "One row per CC and color combination", "motorcycle_slug, cc, color_name, color_hex, price, stock_status, quantity, is_default, is_active"],
  ["specification", "One row per technical value", "motorcycle_slug, group_name, label, value, sort_order; unit and variant fields are optional"],
  ["feature", "One row per product feature", "motorcycle_slug, group_name, title, description, sort_order; icon_identifier is optional"],
] as const;

export default function BulkMotorcycleImportPage() {
  return <>
    <AdminPageHeader eyebrow="Inventory" title="Bulk Import Motorcycles" description="Create multiple motorcycle drafts, colors, categories, specifications, and features from one CSV file. Images are added afterward from each motorcycle editor." actions={<Link href="/admin/inventory/motorcycles" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold hover:border-[#C62828] hover:text-[#C62828]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to inventory</Link>} />

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:items-start">
      <AdminPanel title="Upload inventory CSV" description="Every imported motorcycle is saved as a draft. Nothing is published until images are added and the normal publishing checks pass.">
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F7F7F8] p-5">
          <div className="flex items-start gap-3"><Download aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#C62828]" /><div><h2 className="font-display text-xl font-bold">Start with the template</h2><p className="mt-1 text-sm leading-6 text-[#6B7280]">Keep all columns in their original order. Add or copy rows as needed and remove the example motorcycle before importing your real inventory.</p><a href="/templates/motorcycle-bulk-import.csv" download className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#C62828] bg-white px-4 text-sm font-semibold !text-[#C62828] transition-colors hover:bg-[#FEF2F2]"><Download aria-hidden="true" className="h-4 w-4" />Download CSV template</a></div></div>
        </div>
        <div className="mt-6"><AdminForm action={importMotorcycleInventoryCsv} submitLabel="Import motorcycle drafts" pendingLabel="Validating and importing…" confirmMessage="Import every valid motorcycle, variant, specification, category, and feature in this CSV as new draft inventory?"><label className={adminLabelClass}>Completed CSV file<input className={`${adminInputClass} py-2`} type="file" name="file" accept=".csv,text/csv" required /><span className="mt-1 block text-xs font-normal leading-5 text-[#6B7280]">CSV only, maximum 512 KB and 1,000 data rows.</span></label></AdminForm></div>
      </AdminPanel>

      <aside className="space-y-6">
        <section className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"><div className="flex items-center gap-2"><Upload aria-hidden="true" className="h-5 w-5 text-[#C62828]" /><h2 className="font-display text-2xl font-bold">CSV row format</h2></div><p className="mt-2 text-sm leading-6 text-[#6B7280]">Use the <strong className="text-[#111111]">record_type</strong> column to tell the importer what each row creates. All related rows connect through motorcycle_slug—no database IDs are required.</p><div className="mt-5 space-y-4">{recordTypes.map(([type, purpose, fields]) => <div key={type} className="border-t border-[#E5E7EB] pt-4 first:border-0 first:pt-0"><code className="text-xs font-bold text-[#C62828]">{type}</code><p className="mt-1 text-sm font-semibold text-[#111111]">{purpose}</p><p className="mt-1 text-xs leading-5 text-[#6B7280]">Required columns: {fields}</p></div>)}</div></section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5"><h2 className="font-display text-xl font-bold text-[#92400E]">Important rules</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-[#78350F]"><li>Brands and categories must already exist and are referenced by their slugs.</li><li>Each motorcycle needs at least one variant and exactly one active default variant.</li><li>Use an existing imported CC/color pair for variant-specific specifications.</li><li>Use standard CSV quotes around descriptions or values containing commas.</li><li>Duplicate brand/slug motorcycles are rejected; existing inventory is never overwritten.</li><li>The complete file imports transactionally—if one row fails, nothing is created.</li></ul></section>
      </aside>
    </div>
  </>;
}
