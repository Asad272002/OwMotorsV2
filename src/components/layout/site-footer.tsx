import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PRIMARY_LINKS } from "@/lib/constants/navigation";
import { getPublicBrands, getStorefrontContent } from "@/lib/supabase/public-queries";
import { DEFAULT_STOREFRONT_CONTENT } from "@/lib/storefront/content";

const FOOTER_LINKS = PRIMARY_LINKS;
const socialIcons = [{ label: "Facebook", glyph: "f" }, { label: "Instagram", glyph: "◎" }, { label: "X", glyph: "𝕏" }, { label: "YouTube", glyph: "▶" }] as const;

export async function SiteFooter() {
  const [brands, storefront] = await Promise.all([
    getPublicBrands().catch(() => []),
    getStorefrontContent().catch(() => DEFAULT_STOREFRONT_CONTENT),
  ]);
  const contact = storefront.contactPreview;
  return <footer className="bg-near-black text-white"><Container className="max-w-5xl pb-8 pt-14">
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
      <div><Link href="/" aria-label="OW Motors home" className="inline-flex items-center"><Image src="/images/ow-motors-logo.png" alt="OW Motors" width={1536} height={1024} className="h-10 w-auto object-contain brightness-0 invert" sizes="100px" /></Link><p className="mt-4 max-w-[220px] text-sm leading-[1.55] text-white/50">Premium multi-brand motorcycle dealership. Taro, Lifan, Hi-Speed, and Super Star — all under one roof.</p><div className="mt-5 flex gap-2" role="group" aria-label="OW Motors social channels">{socialIcons.map((item)=><span key={item.label} title={item.label} className="flex h-7 w-7 items-center justify-center border border-white/10 text-[11px] font-semibold text-white/50" aria-hidden="true">{item.glyph}</span>)}</div></div>
      <div><h2 className="mb-5 text-xs font-bold uppercase tracking-[0.08em] text-white">Quick Links</h2><ul>{FOOTER_LINKS.map((link)=><li key={link.href}><Link className="inline-flex min-h-11 touch-manipulation items-center text-sm !text-white/50 transition-colors hover:!text-white sm:min-h-8" href={link.href}>{link.label}</Link></li>)}</ul></div>
      <div><h2 className="mb-5 text-xs font-bold uppercase tracking-[0.08em] text-white">Our Brands</h2><ul>{brands.map((brand)=><li key={brand.id}><Link className="inline-flex min-h-11 touch-manipulation items-center text-sm !text-white/50 transition-colors hover:!text-white sm:min-h-8" href={`/motorcycles/brand/${brand.slug}`}>{brand.name} Motorcycles</Link></li>)}</ul></div>
      <div><h2 className="mb-5 text-xs font-bold uppercase tracking-[0.08em] text-white">Contact</h2><address className="space-y-3.5 not-italic"><p className="flex items-start gap-2 text-sm leading-[1.45] text-white/50"><MapPin size={12} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span>{contact.location}</span></p><p className="flex items-center gap-2 text-sm text-white/50"><Phone size={12} className="shrink-0 text-brand" aria-hidden="true" /><span>{contact.phone}</span></p><p className="flex items-center gap-2 text-sm text-white/50"><Mail size={12} className="shrink-0 text-brand" aria-hidden="true" /><span>{contact.email}</span></p></address></div>
    </div>
    <div className="mt-11 flex flex-col justify-between gap-4 border-t border-white/[0.08] pt-7 sm:flex-row sm:items-center"><p className="text-xs text-white/50">© {new Date().getFullYear()} OW Motors. All rights reserved.</p><div className="flex gap-6 text-xs text-white/50"><span>Privacy Policy</span><span>Terms of Service</span></div></div>
  </Container></footer>;
}
