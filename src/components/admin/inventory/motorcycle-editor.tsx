import { CheckCircle2, CircleAlert, CircleDashed, Eye, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AdminPageHeader, AdminPanel, DraftPublishedStatus, StatusBadge } from "@/components/admin/admin-ui";
import { FeatureManager } from "@/components/admin/feature-manager";
import { ImageManager } from "@/components/admin/image-manager";
import { MotorcycleBasicForm } from "@/components/admin/motorcycle-basic-form";
import { MotorcycleCategoriesForm } from "@/components/admin/motorcycle-categories-form";
import { MotorcyclePublishingForm, MotorcycleSeoForm } from "@/components/admin/motorcycle-publishing-forms";
import { SpecificationManager } from "@/components/admin/specification-manager";
import { VariantManager } from "@/components/admin/variant-manager";
import { completionLabel, getMotorcycleCompletion, getMotorcycleEditorStatus, getMotorcycleStockStatus, type CompletionState, type EditorSectionKey } from "@/lib/admin/inventory-readiness";
import type { AdminMotorcycleInventoryItem } from "@/lib/admin/queries";
import type { Tables } from "@/lib/supabase/database.types";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";

type Props = {
  motorcycle: AdminMotorcycleInventoryItem;
  brands: readonly Tables<"brands">[];
  categories: readonly Tables<"categories">[];
  section: EditorSectionKey;
  isAdmin: boolean;
};

const stateIcon: Record<CompletionState, LucideIcon> = {
  complete: CheckCircle2,
  needs_attention: CircleAlert,
  incomplete: CircleDashed,
};

const stateColor: Record<CompletionState, string> = {
  complete: "text-[#15803D]",
  needs_attention: "text-[#D97706]",
  incomplete: "text-[#C62828]",
};

function PreviewPublishPanel({ motorcycle, isAdmin }: Readonly<{ motorcycle: AdminMotorcycleInventoryItem; isAdmin: boolean }>) {
  const statuses = getMotorcycleEditorStatus(motorcycle);
  const overall = getMotorcycleCompletion(motorcycle);
  const stock = getMotorcycleStockStatus(motorcycle);
  const primaryImage = motorcycle.images.find((image) => image.is_primary) ?? motorcycle.images[0];
  const publicHref = motorcycle.brand ? `/motorcycles/${motorcycle.brand.slug}/${motorcycle.slug}` : null;

  return <div className="space-y-6">
    <section id="preview" className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white" aria-labelledby="inventory-preview-title">
      <header className="flex flex-col justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-center"><div><h2 id="inventory-preview-title" className="font-display text-2xl font-bold">Private inventory preview</h2><p className="mt-1 text-sm text-[#6B7280]">Draft data stays inside the protected dashboard until the product is published.</p></div>{publicHref && motorcycle.publication_status === "published" ? <Link href={publicHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold transition-colors hover:border-[#C62828] hover:bg-[#FEF2F2] hover:text-[#C62828]"><Eye aria-hidden="true" className="h-4 w-4" />Open live product</Link> : <StatusBadge value="draft" label="Private preview" />}</header>
      <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="relative aspect-[4/3] bg-[#F7F7F8]">{primaryImage ? <Image src={motorcycleStoragePublicUrl(primaryImage.storage_path)} alt={primaryImage.alt_text} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-contain p-5" /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-[#9CA3AF]">Add an image to preview this motorcycle</div>}</div>
        <div className="border-t border-[#E5E7EB] p-6 md:border-l md:border-t-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C62828]">{motorcycle.brand?.name ?? "Brand required"}</p><h3 className="mt-2 font-display text-4xl font-bold text-[#111111]">{motorcycle.name}</h3><p className="mt-3 text-sm leading-6 text-[#6B7280]">{motorcycle.short_description}</p><p className="mt-6 font-display text-2xl font-bold text-[#C62828]">PKR {Number(motorcycle.base_price).toLocaleString("en-PK")}</p><div className="mt-5 flex flex-wrap gap-2"><StatusBadge value={motorcycle.publication_status} /><StatusBadge value={stock} /><StatusBadge value={overall} label={completionLabel(overall)} /></div></div>
      </div>
    </section>

    <AdminPanel title="Publishing readiness" description="Resolve incomplete items before making the product public.">
      <ul className="grid gap-3 sm:grid-cols-2">{statuses.filter((status) => status.key !== "publishing").map((status) => { const Icon = stateIcon[status.state]; return <li key={status.key} className="flex gap-3 rounded-md border border-[#E5E7EB] p-4"><Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${stateColor[status.state]}`} /><div><p className="text-sm font-bold text-[#111111]">{status.label}</p><p className="mt-1 text-xs leading-5 text-[#6B7280]">{status.detail}</p></div></li>; })}</ul>
    </AdminPanel>
    <AdminPanel title="Preview & Publish" description="Publishing is validated on the server and remains protected by existing authorization and RLS rules."><MotorcyclePublishingForm motorcycle={motorcycle} activeDefaultVariant={motorcycle.variants.some((variant) => variant.is_active && variant.is_default)} imageCount={motorcycle.images.length} isAdmin={isAdmin} /></AdminPanel>
  </div>;
}

export function MotorcycleInventoryEditor({ motorcycle, brands, categories, section, isAdmin }: Readonly<Props>) {
  const statuses = getMotorcycleEditorStatus(motorcycle);
  const selectedCategoryIds = motorcycle.categoryLinks.map((link) => link.category_id);
  const panels: Record<EditorSectionKey, React.ReactNode> = {
    basic: <AdminPanel title="Basic Information" description="Customer-facing identity, descriptions, brand, and starting price."><MotorcycleBasicForm motorcycle={motorcycle} brands={brands} /></AdminPanel>,
    categories: <AdminPanel title="Categories" description="Assign the existing product to one or more public browsing categories."><MotorcycleCategoriesForm motorcycleId={motorcycle.id} categories={categories} selectedIds={selectedCategoryIds} isAdmin={isAdmin} /></AdminPanel>,
    variants: <AdminPanel title="Variants" description="Each active CC and color pair is a valid customer-selectable combination."><VariantManager motorcycleId={motorcycle.id} variants={motorcycle.variants} isAdmin={isAdmin} /></AdminPanel>,
    images: <AdminPanel title="Images" description="Manage customer-facing product imagery without exposing file-storage paths."><ImageManager motorcycleId={motorcycle.id} images={motorcycle.images} variants={motorcycle.variants} isAdmin={isAdmin} /></AdminPanel>,
    specifications: <AdminPanel title="Specifications" description="Add shared or variant-specific technical values for the product page."><SpecificationManager motorcycleId={motorcycle.id} variants={motorcycle.variants} specifications={motorcycle.specifications} isAdmin={isAdmin} /></AdminPanel>,
    features: <AdminPanel title="Features" description="Organize the product benefits customers use to compare motorcycles."><FeatureManager motorcycleId={motorcycle.id} features={motorcycle.features} isAdmin={isAdmin} /></AdminPanel>,
    seo: <AdminPanel title="SEO" description="Optimize search-result wording; route generation and structured data remain automatic."><MotorcycleSeoForm motorcycle={motorcycle} /></AdminPanel>,
    publishing: <PreviewPublishPanel motorcycle={motorcycle} isAdmin={isAdmin} />,
  };
  const publicHref = motorcycle.brand ? `/motorcycles/${motorcycle.brand.slug}/${motorcycle.slug}` : null;

  return <>
    <AdminPageHeader eyebrow={motorcycle.brand?.name ?? "Inventory"} title={motorcycle.name} description="Edit one inventory record across product details, stock combinations, media, and publishing." actions={<div className="flex flex-wrap items-center gap-3"><DraftPublishedStatus status={motorcycle.publication_status} />{publicHref && motorcycle.publication_status === "published" ? <Link href={publicHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold transition-colors hover:border-[#C62828] hover:bg-[#FEF2F2] hover:text-[#C62828]"><Eye aria-hidden="true" className="h-4 w-4" />View live product</Link> : null}<Link href="/admin/inventory/motorcycles" className="inline-flex min-h-11 items-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold hover:border-[#9CA3AF] hover:bg-[#F7F7F8]">Back to inventory</Link></div>} />

    <nav aria-label="Motorcycle editor sections" className="sticky top-[72px] z-20 mb-5 overflow-x-auto border-y border-[#E5E7EB] bg-white/95 backdrop-blur lg:hidden"><ul className="flex min-w-max">{statuses.map((item) => { const Icon = stateIcon[item.state]; return <li key={item.key}><Link href={`/admin/inventory/motorcycles/${motorcycle.id}?tab=${item.key}`} aria-current={section === item.key ? "page" : undefined} className={`flex min-h-12 items-center gap-2 border-b-2 px-4 text-xs font-bold ${section === item.key ? "border-[#C62828] bg-[#FEF2F2] text-[#C62828]" : "border-transparent text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#111111]"}`}><Icon aria-hidden="true" className={`h-4 w-4 ${stateColor[item.state]}`} />{item.label}</Link></li>; })}</ul></nav>

    <div className="lg:grid lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <aside className="sticky top-[96px] hidden overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] lg:block"><header className="border-b border-[#E5E7EB] px-4 py-4"><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#C62828]">Editor sections</p><p className="mt-1 text-xs leading-5 text-[#6B7280]">Work through each area without scrolling one long form.</p></header><nav aria-label="Motorcycle editor progress"><ul className="p-2">{statuses.map((item) => { const Icon = stateIcon[item.state]; return <li key={item.key}><Link href={`/admin/inventory/motorcycles/${motorcycle.id}?tab=${item.key}`} aria-current={section === item.key ? "page" : undefined} className={`group flex min-h-16 items-start gap-3 rounded-md border-l-[3px] px-3 py-3 transition-colors ${section === item.key ? "border-[#C62828] bg-[#FEF2F2]" : "border-transparent hover:bg-[#F7F7F8]"}`}><Icon aria-hidden="true" className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${stateColor[item.state]}`} /><span className="min-w-0"><strong className={`block text-sm ${section === item.key ? "text-[#C62828]" : "text-[#111111]"}`}>{item.label}</strong><span className={`mt-1 block text-[11px] font-semibold ${stateColor[item.state]}`}>{completionLabel(item.state)}</span></span></Link></li>; })}</ul></nav></aside>
      <div className="min-w-0">{panels[section]}</div>
    </div>
  </>;
}
