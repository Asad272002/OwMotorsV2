import Link from "next/link";
import { Bike, Layers, PackagePlus, Palette } from "lucide-react";
import { createBikeStockVariant, createSimpleBikeStock } from "@/app/admin/erp-actions/stock";
import { AdminForm } from "@/components/admin/admin-form.client";
import { AdminEmptyState, AdminPageHeader, AdminPanel, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { listStockBrands, listStockMotorcycleModels } from "@/lib/erp/queries";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";

export const metadata = { title: "Add Bike Stock" };

export default async function AddBikeStockPage() {
  const actor = await getAuthenticatedProfile();
  const role = actor?.profile.role ?? "apprentice";
  const allowed = ["developer", "admin", "manager"].includes(role);
  const [brands, models] = allowed ? await Promise.all([listStockBrands(), listStockMotorcycleModels()]) : [[], []];

  if (!allowed) {
    return <AdminEmptyState title="Not available" description="Your role can check stock, but cannot add bike stock records." action={<Link href="/admin/stock/availability" className="ow-button-primary">Back to stock</Link>} />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Stock Management"
        title="Add Bike Stock"
        description="Create a model once, then add every CC and color as a separate stock variant."
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)]">
          <AdminPanel title="New bike model" description="Use this once for a model that does not exist yet.">
            <AdminForm action={createSimpleBikeStock} submitLabel="Create model" pendingLabel="Creating..." className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={adminLabelClass}>Brand</label>
                <select name="brandId" required className={adminInputClass}>
                  <option value="">Select brand</option>
                  {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </select>
              </div>
              <div>
                <label className={adminLabelClass}>Model name</label>
                <input name="modelName" required className={adminInputClass} placeholder="e.g. GP V3" />
              </div>
              <div>
                <label className={adminLabelClass}>CC</label>
                <input name="cc" required type="number" min={25} max={2500} className={adminInputClass} placeholder="250" />
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
                <input name="quantity" required type="number" min={1} step="1" defaultValue={1} className={adminInputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={adminLabelClass}>Chasis numbers</label>
                <textarea name="chasisNumbers" required className={adminInputClass + " min-h-28 py-3 font-mono"} placeholder="One chasis number per bike, one per line" />
                <p className="mt-1 text-xs text-[#6B7280]">Quantity and chasis count must match.</p>
              </div>
              <div className="flex items-end rounded-md border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                <div className="flex items-start gap-3">
                  <PackagePlus aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#C62828]" />
                  <span>Creates one model with its first variant.</span>
                </div>
              </div>
            </AdminForm>
          </AdminPanel>

          <AdminPanel title="Add color / CC" description="Use this for more variants of an existing model.">
            {models.length === 0 ? (
              <div className="flex min-h-52 items-center justify-center rounded-md border border-dashed border-[#D1D5DB] bg-[#FAFAFA] p-6 text-center">
                <div>
                  <Layers aria-hidden className="mx-auto h-8 w-8 text-[#9CA3AF]" />
                  <p className="mt-3 text-sm font-semibold text-[#374151]">Create a model first.</p>
                </div>
              </div>
            ) : (
              <AdminForm action={createBikeStockVariant} submitLabel="Add variant" pendingLabel="Adding..." className="grid grid-cols-1 gap-5">
                <div>
                  <label className={adminLabelClass}>Existing bike</label>
                  <select name="motorcycleId" required className={adminInputClass}>
                    <option value="">Select bike model</option>
                    {models.map((model) => <option key={model.id} value={model.id}>{model.brand.name} - {model.name} ({model.variant_count} variant{model.variant_count === 1 ? "" : "s"})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className={adminLabelClass}>CC</label>
                    <input name="cc" required type="number" min={25} max={2500} className={adminInputClass} placeholder="250" />
                  </div>
                  <div>
                    <label className={adminLabelClass}>Color</label>
                    <input name="colorName" required className={adminInputClass} placeholder="Red" />
                  </div>
                  <div>
                    <label className={adminLabelClass}>Color swatch</label>
                    <input name="colorHex" required type="color" defaultValue="#C62828" className="mt-2 h-11 w-full rounded-md border border-[#D1D5DB] bg-white p-1" />
                  </div>
                  <div>
                    <label className={adminLabelClass}>Sale price, PKR</label>
                    <input name="price" required type="number" min={0} step="1" className={adminInputClass} placeholder="285000" />
                  </div>
                                    <div>
                    <label className={adminLabelClass}>Opening quantity</label>
                    <input name="quantity" required type="number" min={1} step="1" defaultValue={1} className={adminInputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={adminLabelClass}>Chasis numbers</label>
                    <textarea name="chasisNumbers" required className={adminInputClass + " min-h-28 py-3 font-mono"} placeholder="One chasis number per bike, one per line" />
                    <p className="mt-1 text-xs text-[#6B7280]">Quantity and chasis count must match.</p>
                  </div>
                  <div className="flex items-end rounded-md border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
                    <div className="flex items-start gap-3">
                      <Palette aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#C62828]" />
                      <span>Adds a separate sellable stock row.</span>
                    </div>
                  </div>
                </div>
              </AdminForm>
            )}
          </AdminPanel>
        </div>
      )}
    </div>
  );
}
