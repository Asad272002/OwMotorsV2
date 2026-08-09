import Image from "next/image";
import type { ProductDetail } from "@/data/products";
import { Section } from "@/components/ui/section";

export function AvailableColors({ product }: Readonly<{ product: ProductDetail }>) {
  const colors = [...new Map(product.variants.map((variant) => [variant.colorId, variant])).values()];
  if (!colors.length) return null;
  return <Section labelledBy="available-colors-title" className="border-t border-border bg-soft-gray py-16"><h2 id="available-colors-title" className="text-display-lg">Available Colors</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{colors.map((variant, index) => <article key={variant.colorId} className={`overflow-hidden border bg-white ${index === 0 ? "border-brand" : "border-border"}`}><div className="relative aspect-[16/9] bg-soft-gray"><Image src={variant.images[0].src} alt={`${product.brandName} ${product.name} in ${variant.colorName}`} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-contain p-3" /></div><div className="flex items-center justify-between p-3 text-xs font-semibold"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-black/20" style={{ backgroundColor: variant.colorHex }} />{variant.colorName}</span>{index === 0 ? <span className="text-brand">Selected</span> : null}</div></article>)}</div></Section>;
}
