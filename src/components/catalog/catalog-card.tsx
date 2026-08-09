import Image from "next/image";
import Link from "next/link";
import type { CatalogMotorcycle } from "@/data/catalog";

export type CatalogCardPresentation = Readonly<{ showPrice: boolean; showAvailability: boolean; showSpecifications: boolean }>;
const defaultPresentation: CatalogCardPresentation = { showPrice: true, showAvailability: true, showSpecifications: true };
export function CatalogCard({ motorcycle, presentation = defaultPresentation }: Readonly<{ motorcycle: CatalogMotorcycle; presentation?: CatalogCardPresentation }>) {
  const href = `/motorcycles/${motorcycle.brand}/${motorcycle.slug}`;
  const availability = {
    "in-stock": { label: "In Stock", className: "bg-white text-emerald-700" },
    "out-of-stock": { label: "Out of Stock", className: "border border-brand/30 bg-white text-brand" },
    "coming-soon": { label: "Coming Soon", className: "border border-brand/30 bg-white text-brand" },
    discontinued: { label: "Discontinued", className: "border border-border bg-white text-cool-gray" },
  }[motorcycle.availability];
  return <article className="flex h-full flex-col border border-border bg-white transition-all hover:border-brand/40 hover:shadow-md focus-within:border-brand/40 focus-within:shadow-md active:scale-[.997] motion-reduce:transition-none">
    <Link href={href} className="group relative block aspect-[1.38] overflow-hidden bg-soft-gray"><Image src={motorcycle.image} alt={motorcycle.imageAlt} fill sizes="(min-width: 1024px) 240px, (min-width: 640px) 40vw, 92vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03] group-focus-visible:scale-[1.03] motion-reduce:transition-none" />{presentation.showAvailability ? <span className={`absolute left-3 top-3 px-2 py-1 text-[10px] font-semibold ${availability.className}`}>{availability.label}</span> : null}</Link>
    <div className="flex flex-1 flex-col p-5"><p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.2em] text-cool-gray">{motorcycle.brandName}</p><h2 className="mt-1 font-display text-xl font-bold leading-none text-near-black"><Link href={href} className="hover:text-brand">{motorcycle.name}</Link></h2>{presentation.showSpecifications ? <p className="mt-3 text-[13px] leading-5 text-cool-gray">{motorcycle.summary}</p> : null}{presentation.showPrice ? <p className="mt-4 font-display text-xl font-bold leading-none text-brand">{motorcycle.priceLabel}</p> : null}
      <div className="mt-auto grid grid-cols-1 gap-2 pt-6"><Link href={href} className="flex min-h-11 touch-manipulation items-center justify-center border border-brand bg-brand px-3 text-center text-xs font-semibold !text-white transition-colors hover:bg-white hover:!text-brand active:bg-white active:!text-brand">View Motorcycle</Link></div>
    </div>
  </article>;
}
