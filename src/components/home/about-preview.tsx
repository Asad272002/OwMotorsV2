import Image from "next/image";
import Link from "next/link";
import type { AboutPreviewContent } from "@/lib/storefront/content";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";

export function AboutPreview({ content }: Readonly<{ content: AboutPreviewContent }>) {
  if (!content.visible) return null;
  return (
    <section aria-labelledby="about-preview-title" className="border-t border-border bg-soft-gray">
      <div className="mx-auto grid max-w-7xl md:grid-cols-2">
        <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden bg-[#1a1a1a] sm:min-h-[440px] md:min-h-[520px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(198,40,40,.24),transparent_48%)]" />
          <Image src={motorcycleStoragePublicUrl(content.imagePath)} alt={content.imageAlt} width={1536} height={1024} className="relative h-auto w-[82%] object-contain brightness-110" sizes="(max-width: 768px) 82vw, 41vw" />
          <div className="absolute inset-x-4 bottom-4 grid grid-cols-2 gap-3 sm:inset-x-8 sm:bottom-8">
            <div className="bg-black/65 px-2 py-4 text-center backdrop-blur"><p className="font-display text-3xl font-bold text-white">{content.primaryStatValue}</p><p className="text-xs text-white/60">{content.primaryStatLabel}</p></div>
            <div className="bg-black/65 px-2 py-4 text-center backdrop-blur"><p className="font-display text-3xl font-bold text-white">{content.secondaryStatValue}</p><p className="text-xs text-white/60">{content.secondaryStatLabel}</p></div>
          </div>
        </div>
        <div className="flex flex-col justify-center px-[var(--page-gutter)] py-14 sm:py-20 md:px-16">
          <p className="text-eyebrow mb-4">{content.eyebrow}</p>
          <h2 id="about-preview-title" className="text-display-lg">{content.heading}</h2>
          <p className="mt-5 text-sm leading-relaxed text-cool-gray">{content.description}</p>
          <ul className="my-8 space-y-3">{content.points.map((point) => <li key={point} className="flex items-start gap-3 text-sm"><span aria-hidden="true" className="mt-0.5 text-brand">✓</span>{point}</li>)}</ul>
          <Link href={content.ctaHref} className="ow-button-primary self-start">{content.ctaLabel} <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
