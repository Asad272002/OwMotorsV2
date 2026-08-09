import { Building2, Contact, Eye, ListChecks, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  updateAboutPreviewContent,
  updateBrandsPageContent,
  updateContactPreviewContent,
  updateWhyChooseContent,
} from "@/app/admin/storefront-content-actions";
import { AdminForm } from "@/components/admin/admin-form.client";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass, adminLabelClass, adminTextareaClass } from "@/components/admin/admin-ui";
import { BrandBannerManager } from "@/components/admin/brand-banner-manager";
import { BrandForm } from "@/components/admin/brand-form";
import { requireStaffPage } from "@/lib/admin/auth";
import { getAdminBrandCampaignImages, getAdminBrands, getAdminStorefrontContent } from "@/lib/admin/queries";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";

const sectionLinks = [
  { href: "#why-choose", label: "Why Choose", detail: "Heading and five benefit cards", icon: ListChecks },
  { href: "#about-preview", label: "About Preview", detail: "Image, copy, facts, and action", icon: Building2 },
  { href: "#contact-preview", label: "Contact & Location", detail: "Address, phone, email, hours, and map message", icon: Contact },
  { href: "#brands-page", label: "Brands Page", detail: "Introduction, showcase order, content, and images", icon: Store },
] as const;

const visibilityField = (visible: boolean) => (
  <label className="flex min-h-11 items-center gap-3 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-semibold">
    <input type="checkbox" name="visible" defaultChecked={visible} className="h-4 w-4 accent-[#C62828]" /> Show this section on the website
  </label>
);

export default async function StorefrontContentPage() {
  const [content, brands, campaignImages, actor] = await Promise.all([
    getAdminStorefrontContent(),
    getAdminBrands(),
    getAdminBrandCampaignImages(),
    requireStaffPage(),
  ]);
  const isAdmin = actor.profile.role === "admin";
  const brandSettings = new Map(content.brandsPage.showcase.map((item) => [item.brandId, item]));
  const orderedCards = [...content.whyChoose.cards].sort((a, b) => a.order - b.order);

  return (
    <>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Storefront Content"
        description="Edit the homepage information sections and Brands page from one obvious workspace. Changes save directly to the approved frontend components."
        actions={<Link href="/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold hover:border-[#C62828] hover:bg-[#FEF2F2] hover:text-[#C62828]"><Eye aria-hidden="true" className="h-4 w-4" />View storefront</Link>}
      />

      <nav aria-label="Storefront content sections" className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sectionLinks.map(({ href, label, detail, icon: Icon }) => <a key={href} href={href} className="group rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm transition-colors hover:border-[#C62828] hover:bg-[#FEF2F2]"><Icon aria-hidden="true" className="h-5 w-5 text-[#C62828]" /><strong className="mt-3 block font-display text-xl text-[#111111]">{label}</strong><span className="mt-1 block text-xs leading-5 text-[#6B7280]">{detail}</span></a>)}
      </nav>

      <div className="space-y-7">
        <AdminPanel id="why-choose" title="Why Choose OW Motors" description="Controls the heading and benefit cards shown directly below the motorcycle rows on the homepage.">
          <AdminForm action={updateWhyChooseContent} submitLabel="Save Why Choose section" pendingLabel="Saving section…">
            {visibilityField(content.whyChoose.visible)}
            <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Small label<input className={adminInputClass} name="eyebrow" required maxLength={80} defaultValue={content.whyChoose.eyebrow} /></label><label className={adminLabelClass}>Main heading<input className={adminInputClass} name="heading" required maxLength={140} defaultValue={content.whyChoose.heading} /></label></div>
            <input type="hidden" name="cardCount" value={orderedCards.length} />
            <div className="grid gap-4 xl:grid-cols-2">
              {orderedCards.map((card, index) => <fieldset key={card.id} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5"><legend className="px-2 font-display text-lg font-bold">Card {index + 1}</legend><input type="hidden" name={`card${index}Id`} value={card.id} /><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]"><label className={adminLabelClass}>Card title<input className={adminInputClass} name={`card${index}Title`} required maxLength={100} defaultValue={card.title} /></label><label className={adminLabelClass}>Position<input className={adminInputClass} name={`card${index}Order`} type="number" min={0} max={100} required defaultValue={card.order} /></label></div><label className={adminLabelClass}>Icon<select className={adminInputClass} name={`card${index}Icon`} defaultValue={card.icon}><option value="shield">Shield</option><option value="star">Star</option><option value="tag">Tag</option><option value="headphones">Support headset</option><option value="zap">Lightning</option></select></label><label className={adminLabelClass}>Description<textarea className={adminTextareaClass} name={`card${index}Description`} rows={4} required maxLength={360} defaultValue={card.description} /></label><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name={`card${index}Visible`} defaultChecked={card.visible} className="h-4 w-4 accent-[#C62828]" /> Show this card</label></fieldset>)}
            </div>
          </AdminForm>
        </AdminPanel>

        <AdminPanel id="about-preview" title="Homepage About Preview" description="Controls the split image-and-text section. Uploading a new image replaces the displayed artwork without exposing Storage paths.">
          <div className="mb-6 grid gap-5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-5"><div className="relative aspect-[4/3] overflow-hidden rounded-md border border-[#E5E7EB] bg-[#111111]"><Image src={motorcycleStoragePublicUrl(content.aboutPreview.imagePath)} alt={content.aboutPreview.imageAlt} fill sizes="180px" className="object-contain p-3" /></div><div className="self-center"><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#C62828]">Current storefront image</p><h3 className="mt-2 font-display text-2xl font-bold">{content.aboutPreview.heading}</h3><p className="mt-2 text-sm leading-6 text-[#6B7280]">Use the optional upload below only when replacing this image.</p></div></div>
          <AdminForm action={updateAboutPreviewContent} submitLabel="Save About preview" pendingLabel="Saving preview…">
            {visibilityField(content.aboutPreview.visible)}
            <input type="hidden" name="imagePath" value={content.aboutPreview.imagePath} />
            <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Small label<input className={adminInputClass} name="eyebrow" required maxLength={80} defaultValue={content.aboutPreview.eyebrow} /></label><label className={adminLabelClass}>Main heading<input className={adminInputClass} name="heading" required maxLength={140} defaultValue={content.aboutPreview.heading} /></label></div>
            <label className={adminLabelClass}>Description<textarea className={adminTextareaClass} name="description" rows={5} required maxLength={900} defaultValue={content.aboutPreview.description} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Replacement image<input className={`${adminInputClass} py-2`} name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><span className="mt-1 block text-xs font-normal text-[#6B7280]">Optional. Maximum 900 KB.</span></label><label className={adminLabelClass}>Image description<input className={adminInputClass} name="imageAlt" required maxLength={240} defaultValue={content.aboutPreview.imageAlt} /></label></div>
            <fieldset className="rounded-lg border border-[#E5E7EB] p-4 sm:p-5"><legend className="px-2 font-display text-lg font-bold">Checklist points</legend><div className="grid gap-4 sm:grid-cols-2">{content.aboutPreview.points.slice(0, 4).map((point, index) => <label key={index} className={adminLabelClass}>Point {index + 1}<input className={adminInputClass} name={`point${index}`} required maxLength={180} defaultValue={point} /></label>)}</div></fieldset>
            <fieldset className="rounded-lg border border-[#E5E7EB] p-4 sm:p-5"><legend className="px-2 font-display text-lg font-bold">Statistics</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className={adminLabelClass}>First value<input className={adminInputClass} name="primaryStatValue" required maxLength={20} defaultValue={content.aboutPreview.primaryStatValue} /></label><label className={adminLabelClass}>First label<input className={adminInputClass} name="primaryStatLabel" required maxLength={80} defaultValue={content.aboutPreview.primaryStatLabel} /></label><label className={adminLabelClass}>Second value<input className={adminInputClass} name="secondaryStatValue" required maxLength={20} defaultValue={content.aboutPreview.secondaryStatValue} /></label><label className={adminLabelClass}>Second label<input className={adminInputClass} name="secondaryStatLabel" required maxLength={80} defaultValue={content.aboutPreview.secondaryStatLabel} /></label></div></fieldset>
            <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Button label<input className={adminInputClass} name="ctaLabel" required maxLength={80} defaultValue={content.aboutPreview.ctaLabel} /></label><label className={adminLabelClass}>Button destination<input className={adminInputClass} name="ctaHref" required pattern="/.*" defaultValue={content.aboutPreview.ctaHref} /><span className="mt-1 block text-xs font-normal text-[#6B7280]">Example: /about</span></label></div>
          </AdminForm>
        </AdminPanel>

        <AdminPanel id="contact-preview" title="Contact & Location Preview" description="Keep the homepage contact details together here. Only publish verified dealership information.">
          <AdminForm action={updateContactPreviewContent} submitLabel="Save Contact preview" pendingLabel="Saving contact details…">
            {visibilityField(content.contactPreview.visible)}
            <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Small label<input className={adminInputClass} name="eyebrow" required maxLength={80} defaultValue={content.contactPreview.eyebrow} /></label><label className={adminLabelClass}>Main heading<input className={adminInputClass} name="heading" required maxLength={140} defaultValue={content.contactPreview.heading} /></label></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Location<input className={adminInputClass} name="location" required maxLength={300} defaultValue={content.contactPreview.location} /></label><label className={adminLabelClass}>Phone<input className={adminInputClass} name="phone" required maxLength={100} defaultValue={content.contactPreview.phone} /></label><label className={adminLabelClass}>Email<input className={adminInputClass} name="email" type="email" required maxLength={254} defaultValue={content.contactPreview.email} /></label><label className={adminLabelClass}>Opening hours<input className={adminInputClass} name="openingHours" required maxLength={240} defaultValue={content.contactPreview.openingHours} /></label></div>
            <label className={adminLabelClass}>Map-area message<textarea className={adminTextareaClass} name="mapMessage" rows={3} required maxLength={300} defaultValue={content.contactPreview.mapMessage} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Button label<input className={adminInputClass} name="ctaLabel" required maxLength={80} defaultValue={content.contactPreview.ctaLabel} /></label><label className={adminLabelClass}>Button destination<input className={adminInputClass} name="ctaHref" required pattern="/.*" defaultValue={content.contactPreview.ctaHref} /></label></div>
          </AdminForm>
        </AdminPanel>

        <AdminPanel id="brands-page" title="Brands Page" description="Control the page introduction and decide which active brand showcases appear and in what order.">
          <AdminForm action={updateBrandsPageContent} submitLabel="Save Brands page presentation" pendingLabel="Saving Brands page…">
            <div className="grid gap-4 sm:grid-cols-2"><label className={adminLabelClass}>Small label<input className={adminInputClass} name="eyebrow" required maxLength={80} defaultValue={content.brandsPage.eyebrow} /></label><label className={adminLabelClass}>Main heading<input className={adminInputClass} name="heading" required maxLength={140} defaultValue={content.brandsPage.heading} /></label></div>
            <label className={adminLabelClass}>Introduction<textarea className={adminTextareaClass} name="description" rows={3} required maxLength={360} defaultValue={content.brandsPage.description} /></label>
            <input type="hidden" name="brandCount" value={brands.length} />
            <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
              <div className="hidden grid-cols-[minmax(180px,1fr)_120px_130px] gap-4 border-b border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280] sm:grid"><span>Brand showcase</span><span>Position</span><span>Display</span></div>
              <div className="divide-y divide-[#E5E7EB]">{brands.map((brand, index) => { const setting = brandSettings.get(brand.id); return <div key={brand.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(180px,1fr)_120px_130px] sm:items-center"><input type="hidden" name={`brand${index}Id`} value={brand.id} /><div className="flex items-center gap-3"><div className="relative h-10 w-14 overflow-hidden rounded border border-[#E5E7EB] bg-[#F7F7F8]">{brand.logo_path ? <Image src={motorcycleStoragePublicUrl(brand.logo_path)} alt="" fill sizes="56px" className="object-contain p-1" /> : null}</div><div><strong className="font-display text-lg">{brand.name}</strong><span className="block text-[11px] text-[#6B7280]">{brand.is_active ? "Active inventory brand" : "Inactive inventory brand"}</span></div></div><label className={adminLabelClass}><span className="sm:sr-only">Position</span><input className={`${adminInputClass} mt-0`} name={`brand${index}Order`} type="number" min={0} max={100} required defaultValue={setting?.order ?? index} /></label><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name={`brand${index}Visible`} defaultChecked={setting?.visible ?? true} className="h-4 w-4 accent-[#C62828]" /> Show</label></div>; })}</div>
            </div>
          </AdminForm>

          <div className="mt-8 border-t border-[#E5E7EB] pt-7"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h3 className="font-display text-2xl font-bold">Brand content and images</h3><p className="mt-1 text-sm text-[#6B7280]">Edit the text, logo, hero, and campaign images used by each showcase without leaving this page.</p></div><StatusBadge value="active" label={`${brands.length} brands`} /></div><div className="space-y-4">{brands.map((brand) => { const banners = campaignImages.filter((image) => image.brand_id === brand.id); return <details key={brand.id} className="group overflow-hidden rounded-lg border border-[#E5E7EB] bg-white"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 hover:bg-[#F7F7F8] [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="relative h-10 w-14 overflow-hidden rounded border border-[#E5E7EB] bg-[#F7F7F8]">{brand.logo_path ? <Image src={motorcycleStoragePublicUrl(brand.logo_path)} alt={`${brand.name} logo`} fill sizes="56px" className="object-contain p-1" /> : null}</span><span><strong className="font-display text-xl">{brand.name}</strong><span className="block text-xs text-[#6B7280]">{banners.length} campaign image(s)</span></span></span><span aria-hidden="true" className="text-xl text-[#6B7280] transition-transform group-open:rotate-45">+</span></summary><div className="border-t border-[#E5E7EB] p-5 sm:p-6"><BrandForm brand={brand} isAdmin={isAdmin} /><BrandBannerManager brand={brand} banners={banners} isAdmin={isAdmin} /></div></details>; })}</div></div>
        </AdminPanel>
      </div>
    </>
  );
}
