import Link from "next/link";
import { Bike, PackagePlus } from "lucide-react";
import { createSimpleBikeStock } from "@/app/admin/erp-actions/stock";
import { AdminForm } from "@/components/admin/admin-form.client";
import { AdminEmptyState, AdminPageHeader, AdminPanel, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { listStockBrands } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";

export const metadata = { title: "Add Bike Stock" };

export default async function AddBikeStockPage() {
  const actor = await getAuthenticatedProfile();
  const role = actor?.profile.role ?? "apprentice";
  const allowed = ["developer", "admin", "manager"].includes(role);
  const brands = allowed ? await listStockBrands() : [];

  if (!allowed) {
    return <AdminEmptyState title="Not available" description="Your role can check stock, but cannot add bike stock records." action={<Link href="/admin/stock/availability" className="ow-button-primary">Back to stock</Link>} />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Stock Management"
        title="Add Bike To Stock"
        description="Simple backend entry for showroom stock. This creates a draft bike model and one active variant, so it immediately appears in Stock Availability and can be selected for sales. Website publishing/content can be handled separately later."
        actions={<Link href="/admin/stock/availability" className="inline-flex min-h-11 items-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#F7F7F8]">Back to stock</Link>}
      />

      {brands.length === 0 ? (
        <AdminEmptyState
          title="No active brands found"
          description="Add or activate brands first, then return here to create backend bike stock records."
          icon={Bike}
          action={<Link href="/admin/brands" className="ow-button-primary">Manage brands</Link>}
        />
      ) : (
        <AdminPanel title="Bike stock details" description="One form, one brand/model/color/CC variant. You can add more colors or quantities later from Stock Changes or the stock table.">
          <AdminForm action={createSimpleBikeStock} submitLabel="Add bike to stock" pendingLabel="Adding bike..." className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className={adminLabelClass}>Brand</label>
              <select name="brandId" required className={adminInputClass}>
                <option value="">Select existing brand</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>Model name</label>
              <input name="modelName" required className={adminInputClass} placeholder="e.g. GP 400R" />
            </div>
            <div>
              <label className={adminLabelClass}>CC</label>
              <input name="cc" required type="number" min={25} max={2500} className={adminInputClass} placeholder="150" />
            </div>
            <div>
              <label className={adminLabelClass}>Color</label>
              <input name="colorName" required className={adminInputClass} placeholder="Black" />
            </div>
            <div>
              <label className={adminLabelClass}>Color swatch</label>
              <input name="colorHex" required type="color" defaultValue="#111111" className="mt-2 h-11 w-full rounded-md border border-[#D1D5DB] bg-white p-1" />
            </div>
            <div>
              <label className={adminLabelClass}>Sale price, PKR</label>
              <input name="price" required type="number" min={0} step="1" className={adminInputClass} placeholder="285000" />
            </div>
            <div>
              <label className={adminLabelClass}>Opening quantity</label>
              <input name="quantity" required type="number" min={0} step="1" defaultValue={1} className={adminInputClass} />
            </div>
            <div className="md:col-span-2 flex items-end">
              <div className="flex w-full items-start gap-3 rounded-md border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                <PackagePlus aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#C62828]" />
                <p>This is for backend ERP stock. It will stay draft for the public website until a developer/admin completes catalog content and publishes it.</p>
              </div>
            </div>
          </AdminForm>
        </AdminPanel>
      )}
    </div>
  );
}