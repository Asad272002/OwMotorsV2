import { ImageOff, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AdminEmptyState, AdminPageHeader, StatusBadge, adminInputClass } from "@/components/admin/admin-ui";
import { getAdminBrandCampaignImages, getAdminBrands, getAdminMotorcycleInventory } from "@/lib/admin/queries";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";

function value(input: string | string[] | undefined) { return Array.isArray(input) ? input[0] ?? "" : input ?? ""; }

export default async function InventoryMediaPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; type?: string | string[] }> }) {
  const [query, motorcycles, brands, campaigns] = await Promise.all([searchParams, getAdminMotorcycleInventory(), getAdminBrands(), getAdminBrandCampaignImages()]);
  const q = value(query.q).trim().toLowerCase();
  const type = value(query.type);
  const productMedia = motorcycles.flatMap((motorcycle) => motorcycle.images.map((image) => ({ kind: "product" as const, image, title: motorcycle.name, subtitle: `${motorcycle.brand?.name ?? "Brand unavailable"} · ${image.image_type.replaceAll("_", " ")}`, editHref: `/admin/inventory/motorcycles/${motorcycle.id}?tab=images`, active: true })));
  const campaignMedia = campaigns.map((image) => { const brand = brands.find((item) => item.id === image.brand_id); return { kind: "campaign" as const, image, title: `${brand?.name ?? "Brand"} campaign`, subtitle: "Homepage campaign image", editHref: "/admin/inventory/brands", active: image.is_active }; });
  const media = [...productMedia, ...campaignMedia].filter((item) => (!type || item.kind === type) && (!q || `${item.title} ${item.subtitle} ${item.image.alt_text}`.toLowerCase().includes(q)));
  return <>
    <AdminPageHeader eyebrow="Inventory" title="Media" description="Find customer-facing imagery by motorcycle or brand, without exposing storage locations." />
    <section className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-4"><form action="/admin/inventory/media" method="get" className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_200px_auto_auto]"><label className="relative"><span className="sr-only">Search media</span><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" /><input name="q" defaultValue={value(query.q)} className={`${adminInputClass} mt-0 pl-10`} placeholder="Search image descriptions or products" /></label><label><span className="sr-only">Media type</span><select name="type" defaultValue={type} className={`${adminInputClass} mt-0`}><option value="">All media</option><option value="product">Product images</option><option value="campaign">Brand campaigns</option></select></label><button className="min-h-11 rounded-md bg-[#111111] px-4 text-sm font-semibold text-white hover:bg-[#C62828]">Apply filters</button><Link href="/admin/inventory/media" className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-[#C62828] hover:underline">Clear</Link></form></section>
    <div className="mb-4"><p className="text-sm font-bold">{media.length} media item{media.length === 1 ? "" : "s"}</p><p className="mt-1 text-xs text-[#6B7280]">Every image keeps its accessible description and approved inventory relationship.</p></div>
    {media.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{media.map((item) => <article key={`${item.kind}-${item.image.id}`} className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]"><div className="relative aspect-[16/10] bg-[#F7F7F8]"><Image src={motorcycleStoragePublicUrl(item.image.storage_path)} alt={item.image.alt_text} fill sizes="(min-width:1280px) 30vw, (min-width:640px) 48vw, 100vw" className="object-contain p-2" /></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold">{item.title}</h2><p className="mt-1 text-xs capitalize text-[#6B7280]">{item.subtitle}</p></div><StatusBadge value={item.active ? "active" : "inactive"} /></div><p className="mt-3 line-clamp-2 text-sm leading-5 text-[#374151]">{item.image.alt_text}</p><Link href={item.editHref} className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#C62828] hover:underline">Manage image</Link></div></article>)}</div> : <AdminEmptyState icon={ImageOff} title="No media matches this view" description="Clear the filters or upload imagery from a motorcycle or brand editor." />}
  </>;
}
