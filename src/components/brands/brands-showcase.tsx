import Image from "next/image";
import Link from "next/link";
import { BrandReveal } from "@/components/brands/brand-reveal.client";
import type { HomepageBrand } from "@/data/homepage";

export function BrandsShowcase({ brands }: Readonly<{ brands: readonly HomepageBrand[] }>) {
  if (!brands.length) {
    return <section className="px-6 py-20 text-center"><h2 className="text-heading-sm">No brands are published yet</h2><p className="mt-3 text-sm text-cool-gray">Published brands will appear here automatically.</p></section>;
  }

  return <div>{brands.map((brand, index) => {
    const reverse = index % 2 === 1;
    const galleryImages = brand.campaignImages.length
      ? brand.campaignImages.slice(0, 4)
      : [{ src: brand.logo, alt: `${brand.name} logo` }];

    const content = <BrandReveal direction="up" className={`order-1 flex h-full flex-col justify-center px-[var(--page-gutter)] py-12 sm:py-16 md:px-12 lg:px-16 ${reverse ? "md:order-2" : ""}`}>
      <div className="mb-6 flex items-center gap-3">
        <span className="h-10 w-1 shrink-0 bg-brand" aria-hidden="true" />
        <h2 id={`brand-${brand.id}`} className="font-display text-[clamp(2.8rem,5vw,4.5rem)] font-bold leading-none tracking-[-0.01em] text-near-black">{brand.name}</h2>
      </div>
      <p className="mb-9 max-w-[380px] text-base leading-7 text-cool-gray">{brand.fullDescription}</p>
      <div className="mb-7 flex items-center gap-2.5"><span className="h-px w-8 bg-brand" aria-hidden="true" /><p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand">{brand.tagline}</p></div>
      <Link href={brand.href} className="inline-flex min-h-11 w-fit touch-manipulation items-center gap-2 border border-brand bg-brand px-6 text-[0.82rem] font-semibold tracking-[0.04em] !text-white transition-all hover:bg-white hover:!text-brand active:scale-[.98] active:bg-white active:!text-brand">
        {brand.ctaLabel ?? `Explore ${brand.name}`} <span aria-hidden="true">→</span>
      </Link>
    </BrandReveal>;

    const imagery = <BrandReveal direction={reverse ? "left" : "right"} className={`order-2 relative min-h-[340px] overflow-hidden sm:min-h-[420px] ${reverse ? "md:order-1" : ""}`}>
      <div className="grid h-full min-h-[340px] grid-cols-2 grid-rows-2 gap-0.5 bg-border sm:min-h-[420px]">
        {galleryImages.map((image, imageIndex) => <div key={image.src} className={`${galleryImages.length === 1 ? "col-span-2 row-span-2" : ""} group relative overflow-hidden bg-soft-gray`}>
          <Image src={image.src} alt={image.alt} fill sizes="(max-width: 768px) 50vw, 30vw" className={`${galleryImages.length === 1 ? "object-contain p-10 sm:p-16" : "object-cover"} transition-transform duration-700 group-hover:scale-[1.04] group-focus-within:scale-[1.04] motion-reduce:transition-none`} />
          {imageIndex === 0 && galleryImages.length > 1 ? <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(198,40,40,.08),transparent_60%)]" aria-hidden="true" /> : null}
        </div>)}
      </div>
    </BrandReveal>;

    return <section key={brand.id} aria-labelledby={`brand-${brand.id}`} className={`overflow-hidden border-t border-border ${reverse ? "bg-soft-gray" : "bg-white"}`}>
      <div className="grid min-h-[420px] md:grid-cols-[40%_60%]">{reverse ? <>{imagery}{content}</> : <>{content}{imagery}</>}</div>
    </section>;
  })}</div>;
}
