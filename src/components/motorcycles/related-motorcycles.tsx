import Image from "next/image";
import Link from "next/link";
import type { RelatedMotorcycle } from "@/data/products";
import { Section } from "@/components/ui/section";

export function RelatedMotorcycles({ related }: Readonly<{ related: readonly RelatedMotorcycle[] }>) {
  if (!related.length) return null;
  return <Section labelledBy="related-title" className="border-t border-border bg-soft-gray py-16"><p className="text-eyebrow mb-2">Keep Exploring</p><h2 id="related-title" className="text-display-lg">Related Motorcycles</h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((item) => <article key={item.id} className="border border-border bg-white"><Link href={`/motorcycles/${item.brand}/${item.slug}`} className="group block"><div className="relative h-48 bg-soft-gray"><Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-contain p-4 transition-transform group-hover:scale-105 motion-reduce:transition-none" /></div><div className="p-5"><p className="text-eyebrow">{item.brandName}</p><h3 className="mt-1 font-display text-2xl font-bold">{item.name}</h3><p className="mt-3 text-sm font-semibold text-brand">View motorcycle →</p></div></Link></article>)}</div></Section>;
}
