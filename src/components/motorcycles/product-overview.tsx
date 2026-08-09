import Image from "next/image";
import type { ProductDetail } from "@/data/products";

export function ProductOverview({ product }: Readonly<{ product: ProductDetail }>) {
  return <section aria-labelledby="product-overview-title" className="border-t border-border bg-soft-gray"><div className={`mx-auto grid max-w-7xl ${product.overviewImage ? "lg:grid-cols-2" : ""}`}><div className="flex flex-col justify-center px-[var(--page-gutter)] py-16 lg:px-16"><p className="text-eyebrow mb-3">Motorcycle Overview</p><h2 id="product-overview-title" className="text-display-lg">{product.overviewHeading}</h2><div className="mt-6 space-y-4">{product.overview.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-cool-gray">{paragraph}</p>)}</div></div>{product.overviewImage ? <div className="relative min-h-[380px] bg-near-black"><Image src={product.overviewImage.src} alt={product.overviewImage.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-8 lg:object-cover lg:p-0" /></div> : null}</div></section>;
}
