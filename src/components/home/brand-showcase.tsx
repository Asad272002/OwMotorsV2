import Image from "next/image";
import Link from "next/link";
import type { HomepageBrand } from "@/data/homepage";

type BrandShowcaseProps = Readonly<{ brand: HomepageBrand; index: number }>;

export function BrandShowcase({ brand, index }: BrandShowcaseProps) {
  return (
    <section aria-labelledby={`brand-showcase-${brand.id}`} className="brand-showcase relative isolate h-[clamp(320px,40vw,480px)] overflow-hidden" style={{ backgroundColor: brand.background }}>
      {brand.campaignImages.length ? (
        <div className="brand-media-track absolute inset-y-0 left-0 flex w-max" aria-hidden="true">
          {brand.campaignImages.map((image, imageIndex) => (
            <div key={image.src} className="relative h-full w-[clamp(600px,55vw,900px)] shrink-0">
              <Image
                src={image.src}
                alt=""
                fill
                sizes="(max-width: 640px) 600px, 55vw"
                loading={index === 0 && imageIndex === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 && imageIndex === 0 ? "high" : "auto"}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-end px-[8vw] opacity-30" aria-hidden="true">
          <Image src={brand.logo} alt="" width={447} height={447} className="h-[75%] w-auto object-contain grayscale" sizes="35vw" />
        </div>
      )}

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,.92)_0%,rgba(0,0,0,.60)_35%,rgba(0,0,0,.15)_60%,transparent_80%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.35)_0%,transparent_50%)]" />

      <div className="absolute inset-0 z-10 flex items-center px-[var(--page-gutter)] lg:px-20">
        <div className="max-w-lg">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">OW Motors — 0{index + 1}</p>
          <h2 id={`brand-showcase-${brand.id}`} className="font-display text-[clamp(3rem,8vw,6rem)] font-bold leading-none tracking-[-0.02em] text-white">{brand.displayName}</h2>
          <p className="mb-7 mt-3 text-sm text-white/65 md:text-base">{brand.tagline}</p>
          <Link href={brand.href} className="inline-flex min-h-11 touch-manipulation items-center gap-2 border border-white/30 px-5 py-2.5 text-sm font-semibold !text-white transition-all duration-300 hover:gap-3 hover:border-white hover:bg-white hover:!text-near-black hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[.98] active:border-white active:bg-white active:!text-near-black motion-reduce:transition-none">
            {brand.ctaLabel ?? `Explore ${brand.name}`} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {brand.overlayLogo ? <Image src={brand.overlayLogo} alt="" width={447} height={447} className="pointer-events-none absolute bottom-4 right-6 z-10 h-auto w-[clamp(140px,22vw,280px)] select-none object-contain opacity-[0.07] brightness-[10] grayscale md:right-14" sizes="22vw" /> : null}
      <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-brand/70" />
    </section>
  );
}
