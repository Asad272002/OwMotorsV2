import Image from "next/image";
import { deleteBrandBanner, moveBrandBanner, replaceBrandBannerImage, updateBrandBanner, uploadBrandBanner } from "@/app/admin/banner-actions";
import { AdminForm } from "@/components/admin/admin-form.client";
import { adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";
import type { Tables } from "@/lib/supabase/database.types";

type Banner = Tables<"brand_campaign_images">;

export function BrandBannerManager({
  brand,
  banners,
  isAdmin,
}: Readonly<{
  brand: Tables<"brands">;
  banners: readonly Banner[];
  isAdmin: boolean;
}>) {
  return (
    <section className="mt-6 border-t border-border pt-6" aria-labelledby={`brand-banners-${brand.id}`}>
      <div className="mb-5">
        <h3 id={`brand-banners-${brand.id}`} className="font-display text-2xl font-bold">Homepage banners</h3>
        <p className="mt-1 text-xs leading-5 text-cool-gray">Upload campaign images up to 900 KB, edit accessible descriptions, control visibility, and change their homepage sequence.</p>
      </div>

      <div className="border border-border bg-soft-gray p-4">
        <h4 className="font-display text-lg font-bold">Add banner</h4>
        <AdminForm action={uploadBrandBanner} submitLabel="Upload banner" pendingLabel="Uploading…" className="mt-4 space-y-4">
          <input type="hidden" name="brandId" value={brand.id} />
          <div className="grid gap-4 lg:grid-cols-2">
            <label className={adminLabelClass}>Image file<input className={`${adminInputClass} py-2`} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required /></label>
            <label className={adminLabelClass}>Alt description<input className={adminInputClass} name="altText" required minLength={3} maxLength={240} placeholder={`${brand.name} motorcycle campaign scene`} /></label>
          </div>
        </AdminForm>
      </div>

      {banners.length ? (
        <ol className="mt-5 grid gap-5 xl:grid-cols-2">
          {banners.map((banner, index) => (
            <li key={banner.id} className="border border-border bg-white">
              <div className="relative aspect-[16/7] overflow-hidden bg-soft-gray">
                <Image src={motorcycleStoragePublicUrl(banner.storage_path)} alt={banner.alt_text} fill sizes="(min-width:1280px) 38vw, 90vw" className="object-cover" />
                <span className="absolute left-3 top-3 bg-near-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Position {index + 1}</span>
                {!banner.is_active ? <span className="absolute right-3 top-3 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cool-gray">Hidden</span> : null}
              </div>
              <div className="space-y-5 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <AdminForm action={moveBrandBanner} submitLabel="Move up" pendingLabel="Moving…" className="contents">
                    <input type="hidden" name="id" value={banner.id} />
                    <input type="hidden" name="brandId" value={brand.id} />
                    <input type="hidden" name="direction" value="up" />
                  </AdminForm>
                  <AdminForm action={moveBrandBanner} submitLabel="Move down" pendingLabel="Moving…" className="contents">
                    <input type="hidden" name="id" value={banner.id} />
                    <input type="hidden" name="brandId" value={brand.id} />
                    <input type="hidden" name="direction" value="down" />
                  </AdminForm>
                </div>
                <AdminForm action={updateBrandBanner} submitLabel="Update banner">
                  <input type="hidden" name="id" value={banner.id} />
                  <input type="hidden" name="brandId" value={brand.id} />
                  <label className={adminLabelClass}>Alt description<input className={adminInputClass} name="altText" required minLength={3} maxLength={240} defaultValue={banner.alt_text} /></label>
                  <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name="isActive" defaultChecked={banner.is_active} className="h-4 w-4 accent-brand" /> Visible on homepage</label>
                </AdminForm>
                {isAdmin ? (
                  <div className="space-y-5 border-t border-border pt-5">
                    <AdminForm action={replaceBrandBannerImage} submitLabel="Replace image" pendingLabel="Replacing…" confirmMessage={`Replace banner ${index + 1} artwork?`}>
                      <input type="hidden" name="id" value={banner.id} />
                      <input type="hidden" name="brandId" value={brand.id} />
                      <label className={adminLabelClass}>Replacement file<input className={`${adminInputClass} py-2`} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required /></label>
                    </AdminForm>
                    <AdminForm action={deleteBrandBanner} submitLabel="Remove banner" pendingLabel="Removing…" destructive confirmMessage={`Remove banner ${index + 1} from ${brand.name}?`}>
                      <input type="hidden" name="id" value={banner.id} />
                      <input type="hidden" name="brandId" value={brand.id} />
                    </AdminForm>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="mt-5 border border-dashed border-border p-5 text-sm text-cool-gray">No banners yet. The homepage will show the brand-logo fallback until an active banner is uploaded.</p>}
    </section>
  );
}
