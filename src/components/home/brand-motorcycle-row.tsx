import Link from "next/link";
import type { HomepageBrand } from "@/data/homepage";
import { Container } from "@/components/ui/container";
import { MotorcycleRowControls } from "@/components/home/motorcycle-row-controls.client";

export function BrandMotorcycleRow({ brand, index }: Readonly<{ brand: HomepageBrand; index: number }>) {
  const background = index % 2 === 0 ? "bg-white" : "bg-soft-gray";

  return (
    <section aria-labelledby={`brand-row-${brand.id}`} className={`border-t border-border pb-6 pt-12 sm:pb-7 sm:pt-12 lg:pb-8 lg:pt-12 ${background}`}>
      <Container className="mb-12 lg:mb-14">
        <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.3em] text-brand">{brand.name} Motorcycles</p>
            <h2 id={`brand-row-${brand.id}`} className="font-display text-[clamp(3.1875rem,5vw,3.4375rem)] font-bold uppercase leading-none tracking-[-0.02em] text-near-black">{brand.displayName}</h2>
            <p className="mt-4 max-w-[560px] text-sm leading-6 text-cool-gray sm:text-[15px]">{brand.description}</p>
          </div>
          <Link href={brand.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-3 self-start border border-near-black px-5 text-sm font-semibold text-near-black transition-colors hover:border-brand hover:bg-brand hover:text-white sm:self-auto motion-reduce:transition-none">
            {brand.ctaLabel ?? `View All ${brand.name}`} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Container>
      {brand.motorcycles.length ? (
        <MotorcycleRowControls brand={brand} />
      ) : (
        <Container><div className="border border-border bg-soft-gray px-6 py-10 text-center text-sm text-cool-gray">No {brand.name} motorcycles are currently published.</div></Container>
      )}
    </section>
  );
}
