import Image from "next/image";
import Link from "next/link";
import { Eye, ImageIcon, MenuSquare, Rows3 } from "lucide-react";
import {
  moveHomepageDisplayItem,
  setHomepageBannerLogoVisibility,
  setHomepageDisplayStatus,
  setMegaMenuLogoVisibility,
  uploadHomepageBannerLogo,
  uploadMegaMenuLogo,
} from "@/app/admin/homepage-display-actions";
import { AdminForm } from "@/components/admin/admin-form.client";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import {
  getAdminBrandCampaignImages,
  getAdminBrands,
  getAdminHomepageBrandSections,
  getAdminMotorcycles,
} from "@/lib/admin/queries";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";
import type { HomepageDisplayStatus, Tables } from "@/lib/supabase/database.types";

type DisplayItem = Tables<"homepage_brand_sections">;
type Brand = Tables<"brands">;

function DisplayStatusActions({ item, label }: Readonly<{ item: DisplayItem; label: string }>) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {item.display_status !== "visible" ? (
        <AdminForm action={setHomepageDisplayStatus} submitLabel={item.display_status === "removed" ? "Restore and show" : "Show"} pendingLabel="Updating…" className="contents">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value="visible" />
        </AdminForm>
      ) : (
        <AdminForm action={setHomepageDisplayStatus} submitLabel="Hide" pendingLabel="Hiding…" className="contents">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value="hidden" />
        </AdminForm>
      )}
      {item.display_status !== "removed" ? (
        <AdminForm action={setHomepageDisplayStatus} submitLabel="Remove from homepage" pendingLabel="Removing…" destructive confirmMessage={`Remove ${label} from the homepage display? The inventory will remain safe and this can be restored.`} className="contents">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value="removed" />
        </AdminForm>
      ) : null}
    </div>
  );
}

function OrderActions({ item }: Readonly<{ item: DisplayItem }>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <AdminForm action={moveHomepageDisplayItem} submitLabel="Move up" pendingLabel="Moving…" className="contents">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="direction" value="up" />
      </AdminForm>
      <AdminForm action={moveHomepageDisplayItem} submitLabel="Move down" pendingLabel="Moving…" className="contents">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="direction" value="down" />
      </AdminForm>
    </div>
  );
}

function displayStatusLabel(status: HomepageDisplayStatus) {
  if (status === "visible") return "Shown";
  if (status === "hidden") return "Hidden";
  return "Removed";
}

function SequenceCard({
  item,
  brand,
  position,
  detail,
  image,
  children,
}: Readonly<{
  item: DisplayItem;
  brand: Brand;
  position: number;
  detail: string;
  image: string | null;
  children?: React.ReactNode;
}>) {
  return (
    <article className={`overflow-hidden rounded-lg border bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${item.display_status === "removed" ? "border-dashed border-[#D1D5DB] opacity-75" : "border-[#E5E7EB]"}`}>
      <div className="grid min-h-36 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative min-h-36 overflow-hidden border-b border-[#E5E7EB] bg-[#F7F7F8] sm:border-b-0 sm:border-r">
          {image ? <Image src={motorcycleStoragePublicUrl(image)} alt="" fill sizes="180px" className="object-contain p-3" /> : <span className="absolute inset-0 flex items-center justify-center text-[#9CA3AF]"><ImageIcon aria-hidden="true" className="h-7 w-7" /></span>}
          <span className="absolute left-3 top-3 rounded bg-[#111111] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Position {position}</span>
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-5 p-4 sm:p-5">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-display text-2xl font-bold text-[#111111]">{brand.name}</h3><p className="mt-1 text-sm leading-5 text-[#6B7280]">{detail}</p></div>
              <StatusBadge value={item.display_status === "visible" ? "active" : item.display_status === "hidden" ? "inactive" : "archived"} label={displayStatusLabel(item.display_status)} />
            </div>
          </div>
          <div className="space-y-2"><OrderActions item={item} /><DisplayStatusActions item={item} label={`${brand.name} ${item.section_type === "brand_banner" ? "banner" : "motorcycle row"}`} /></div>
        </div>
      </div>
      {children}
    </article>
  );
}

function BannerLogoControls({ item, brand }: Readonly<{ item: DisplayItem; brand: Brand }>) {
  const logo = item.overlay_logo_path;
  return (
    <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#C62828]">Lower-right banner logo</p>
          <div className={`relative mt-3 h-20 overflow-hidden rounded-md border border-[#E5E7EB] bg-[#111111] ${item.show_overlay_logo ? "" : "opacity-45"}`}>
            {logo ? <Image src={motorcycleStoragePublicUrl(logo)} alt={`${brand.name} banner watermark logo`} fill sizes="180px" className="object-contain p-3 brightness-[8] grayscale" /> : <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/60">No logo selected</span>}
          </div>
        </div>
        <div className="space-y-4">
          <AdminForm action={uploadHomepageBannerLogo} submitLabel={logo ? "Replace logo" : "Add logo"} pendingLabel="Uploading…">
            <input type="hidden" name="id" value={item.id} />
            <label className={adminLabelClass}>Logo image<input className={`${adminInputClass} py-2`} type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" required /><span className="mt-1 block text-xs font-normal leading-5 text-[#6B7280]">SVG, PNG, WebP, AVIF, or JPEG. Maximum 900 KB.</span></label>
            <p className="text-xs leading-5 text-[#6B7280]">A transparent PNG or WebP works best. Uploading a replacement automatically shows it.</p>
          </AdminForm>
          <AdminForm action={setHomepageBannerLogoVisibility} submitLabel={item.show_overlay_logo ? "Remove logo from banner" : "Restore logo on banner"} pendingLabel="Updating…" destructive={item.show_overlay_logo} confirmMessage={item.show_overlay_logo ? `Remove the ${brand.name} watermark logo from its homepage banner?` : undefined}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="visible" value={item.show_overlay_logo ? "false" : "true"} />
          </AdminForm>
        </div>
      </div>
    </div>
  );
}

function MegaMenuLogoCard({ brand }: Readonly<{ brand: Brand }>) {
  const logo = brand.mega_menu_logo_path ?? brand.logo_path;
  return (
    <article className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5">
      <div className="flex items-start gap-4">
        <div className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F7F7F8] ${brand.show_mega_menu_logo ? "" : "opacity-40"}`}>
          {logo ? <Image src={motorcycleStoragePublicUrl(logo)} alt={`${brand.name} Brands menu logo`} fill sizes="96px" className="object-contain p-2" /> : null}
        </div>
        <div className="min-w-0 flex-1"><h3 className="font-display text-xl font-bold">{brand.name}</h3><p className="mt-1 text-xs leading-5 text-[#6B7280]">{brand.show_mega_menu_logo ? "Logo is shown in desktop and mobile brand menus." : "Brand name remains available; its logo is hidden."}</p></div>
        <StatusBadge value={brand.show_mega_menu_logo ? "active" : "inactive"} label={brand.show_mega_menu_logo ? "Shown" : "Hidden"} />
      </div>
      <div className="mt-5 space-y-4 border-t border-[#E5E7EB] pt-4">
        <AdminForm action={uploadMegaMenuLogo} submitLabel={logo ? "Replace menu logo" : "Add menu logo"} pendingLabel="Uploading…">
          <input type="hidden" name="id" value={brand.id} />
          <label className={adminLabelClass}>Logo image<input className={`${adminInputClass} py-2`} type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" required /><span className="mt-1 block text-xs font-normal leading-5 text-[#6B7280]">SVG, PNG, WebP, AVIF, or JPEG. Maximum 900 KB.</span></label>
        </AdminForm>
        <AdminForm action={setMegaMenuLogoVisibility} submitLabel={brand.show_mega_menu_logo ? "Remove from menu" : "Restore in menu"} pendingLabel="Updating…" destructive={brand.show_mega_menu_logo} confirmMessage={brand.show_mega_menu_logo ? `Remove the ${brand.name} logo from the Brands mega menu? The brand link stays available.` : undefined}>
          <input type="hidden" name="id" value={brand.id} />
          <input type="hidden" name="visible" value={brand.show_mega_menu_logo ? "false" : "true"} />
        </AdminForm>
      </div>
    </article>
  );
}

export default async function HomepageDisplayPage() {
  const [brands, items, campaignImages, motorcycles] = await Promise.all([
    getAdminBrands(),
    getAdminHomepageBrandSections(),
    getAdminBrandCampaignImages(),
    getAdminMotorcycles(),
  ]);
  const brandsById = new Map(brands.map((brand) => [brand.id, brand]));
  const bannerItems = items.filter((item) => item.section_type === "brand_banner");
  const rowItems = items.filter((item) => item.section_type === "motorcycle_row");

  return (
    <>
      <AdminPageHeader eyebrow="Inventory" title="Homepage Display" description="Arrange inventory-powered brand banners and motorcycle rows independently. Hiding or removing a display item never deletes its brand or motorcycles." actions={<Link href="/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold hover:border-[#C62828] hover:bg-[#FEF2F2] hover:text-[#C62828]"><Eye aria-hidden="true" className="h-4 w-4" />View homepage</Link>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <a href="#banner-sequence" className="group rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm hover:border-[#C62828]"><ImageIcon aria-hidden="true" className="h-5 w-5 text-[#C62828]" /><strong className="mt-3 block font-display text-xl">Banner sequence</strong><span className="mt-1 block text-xs leading-5 text-[#6B7280]">Order, visibility, removal, and watermark logos</span></a>
        <a href="#row-sequence" className="group rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm hover:border-[#C62828]"><Rows3 aria-hidden="true" className="h-5 w-5 text-[#C62828]" /><strong className="mt-3 block font-display text-xl">Motorcycle rows</strong><span className="mt-1 block text-xs leading-5 text-[#6B7280]">Independent order and display state</span></a>
        <a href="#mega-menu-logos" className="group rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm hover:border-[#C62828]"><MenuSquare aria-hidden="true" className="h-5 w-5 text-[#C62828]" /><strong className="mt-3 block font-display text-xl">Brands menu logos</strong><span className="mt-1 block text-xs leading-5 text-[#6B7280]">Replace, remove, or restore each logo</span></a>
      </div>

      <div className="space-y-7">
        <AdminPanel id="banner-sequence" title="Brand banner sequence" description="These positions control only the cinematic homepage banners. Campaign artwork is still managed in Inventory → Brands.">
          <div className="space-y-4">
            {bannerItems.map((item, index) => {
              const brand = brandsById.get(item.brand_id);
              if (!brand) return null;
              const campaigns = campaignImages.filter((image) => image.brand_id === brand.id);
              const thumbnail = campaigns.find((image) => image.is_active)?.storage_path ?? brand.hero_image_path ?? brand.logo_path;
              return <SequenceCard key={item.id} item={item} brand={brand} position={index + 1} detail={`${campaigns.filter((image) => image.is_active).length} active campaign image(s)`} image={thumbnail}><BannerLogoControls item={item} brand={brand} /></SequenceCard>;
            })}
          </div>
        </AdminPanel>

        <AdminPanel id="row-sequence" title="Brand motorcycle row sequence" description="Rows use the published motorcycle inventory for each brand. Their order and visibility no longer depend on banner order.">
          <div className="space-y-4">
            {rowItems.map((item, index) => {
              const brand = brandsById.get(item.brand_id);
              if (!brand) return null;
              const products = motorcycles.filter((motorcycle) => motorcycle.brand_id === brand.id && motorcycle.publication_status === "published");
              return <SequenceCard key={item.id} item={item} brand={brand} position={index + 1} detail={`${products.length} published motorcycle${products.length === 1 ? "" : "s"} will appear in this row`} image={brand.logo_path} />;
            })}
          </div>
        </AdminPanel>

        <AdminPanel id="mega-menu-logos" title="Brands mega-menu logos" description="Control the logo shown beside each brand in desktop and mobile navigation. Removing a logo keeps the crawlable brand link and text label intact.">
          <div className="grid gap-4 xl:grid-cols-2">{brands.map((brand) => <MegaMenuLogoCard key={brand.id} brand={brand} />)}</div>
        </AdminPanel>
      </div>
    </>
  );
}
