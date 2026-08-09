import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass } from "@/components/admin/admin-ui";
import { BrandBannerManager } from "@/components/admin/brand-banner-manager";
import { BrandForm } from "@/components/admin/brand-form";
import { requireStaffPage } from "@/lib/admin/auth";
import { getAdminBrandCampaignImages, getAdminBrands, getAdminMotorcycleInventory } from "@/lib/admin/queries";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

export default async function InventoryBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; visibility?: string | string[] }>;
}) {
  const [query, brands, banners, motorcycles, actor] = await Promise.all([
    searchParams,
    getAdminBrands(),
    getAdminBrandCampaignImages(),
    getAdminMotorcycleInventory(),
    requireStaffPage(),
  ]);
  const q = value(query.q).trim().toLowerCase();
  const visibility = value(query.visibility);
  const filtered = brands.filter((brand) => (
    (!q || `${brand.name} ${brand.short_description}`.toLowerCase().includes(q))
    && (!visibility || (visibility === "active") === brand.is_active)
  ));
  const isAdmin = actor.profile.role === "admin";

  return (
    <>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Brands"
        description="Maintain dealership brand identity and campaign assets used across the website."
        actions={<div className="flex flex-wrap gap-3"><Link href="/admin/inventory/storefront-content#brands-page" className="inline-flex min-h-11 items-center rounded-md border border-[#C62828] bg-[#C62828] px-4 text-sm font-semibold text-white hover:bg-[#A91F1F]">Edit Brands page</Link><Link href="/admin/inventory/homepage-display" className="inline-flex min-h-11 items-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold hover:border-[#C62828] hover:bg-[#FEF2F2] hover:text-[#C62828]">Banners & rows</Link></div>}
      />
      <section className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-4">
        <form action="/admin/inventory/brands" method="get" className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_auto_auto]">
          <label className="relative"><span className="sr-only">Search brands</span><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" /><input name="q" defaultValue={value(query.q)} className={`${adminInputClass} mt-0 pl-10`} placeholder="Search brands" /></label>
          <label><span className="sr-only">Visibility</span><select name="visibility" defaultValue={visibility} className={`${adminInputClass} mt-0`}><option value="">All visibility</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <button className="min-h-11 rounded-md bg-[#111111] px-4 text-sm font-semibold text-white hover:bg-[#C62828]">Apply filters</button>
          <Link href="/admin/inventory/brands" className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-[#C62828] hover:underline">Clear</Link>
        </form>
      </section>
      <AdminPanel title="Add brand" description="Create the brand once and manage its public identity, visibility, and campaign media here."><BrandForm isAdmin={isAdmin} /></AdminPanel>
      <div className="mt-7 space-y-4">
        {filtered.map((brand) => {
          const logo = brand.logo_path;
          const productCount = motorcycles.filter((motorcycle) => motorcycle.brand_id === brand.id).length;
          const brandBanners = banners.filter((banner) => banner.brand_id === brand.id);
          return (
            <details key={brand.id} className="group overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 px-5 transition-colors hover:bg-[#F7F7F8] [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-4">
                  <span className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F7F7F8]">
                    {logo ? <Image src={motorcycleStoragePublicUrl(logo)} alt={`${brand.name} logo`} fill sizes="64px" className="object-contain p-1.5" /> : <span className="font-display text-lg font-bold text-[#9CA3AF]">{brand.name.slice(0, 2).toUpperCase()}</span>}
                  </span>
                  <span className="min-w-0"><strong className="block truncate font-display text-xl">{brand.name}</strong><span className="mt-1 block text-xs text-[#6B7280]">{productCount} motorcycle{productCount === 1 ? "" : "s"} · {brandBanners.length} campaign image(s)</span></span>
                </span>
                <span className="flex items-center gap-3"><StatusBadge value={brand.is_active ? "active" : "inactive"} /><span aria-hidden="true" className="text-xl text-[#6B7280] transition-transform duration-200 group-open:rotate-45">+</span></span>
              </summary>
              <div className="border-t border-[#E5E7EB] p-5 sm:p-6"><BrandForm brand={brand} isAdmin={isAdmin} /><BrandBannerManager brand={brand} banners={brandBanners} isAdmin={isAdmin} /></div>
            </details>
          );
        })}
      </div>
    </>
  );
}
