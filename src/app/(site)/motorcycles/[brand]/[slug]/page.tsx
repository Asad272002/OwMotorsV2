import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { AvailableColors } from "@/components/motorcycles/available-colors";
import { DetailedSpecifications } from "@/components/motorcycles/detailed-specifications";
import { ProductConfigurator } from "@/components/motorcycles/product-configurator.client";
import { ProductFaqs } from "@/components/motorcycles/product-faqs";
import { ProductFeatures } from "@/components/motorcycles/product-features";
import { ProductOverview } from "@/components/motorcycles/product-overview";
import { ProductStructuredData } from "@/components/motorcycles/product-structured-data";
import { RelatedMotorcycles } from "@/components/motorcycles/related-motorcycles";
import { Container } from "@/components/ui/container";
import { getPublicProduct, getRelatedMotorcycles } from "@/lib/supabase/public-queries";
import { createNotFoundMetadata, createPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ brand: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand, slug } = await params;
  const product = await getPublicProduct(brand, slug);
  if (!product) return createNotFoundMetadata();
  const title = product.seoTitle ?? `${product.brandName} ${product.name}`;
  const description = product.seoDescription ?? product.description;
  const url = `/motorcycles/${brand}/${slug}`;
  const image = product.variants[0]?.images[0] ?? product.overviewImage;
  return createPageMetadata({
    title,
    description,
    path: url,
    absoluteTitle: Boolean(product.seoTitle),
    ...(image ? { image: { src: image.src, alt: image.alt } } : {}),
  });
}

export default async function MotorcyclePage({ params }: Props) {
  const { brand, slug } = await params;
  const product = await getPublicProduct(brand, slug);
  if (!product) notFound();
  const related = await getRelatedMotorcycles(product);

  return <>
    <ProductStructuredData product={product} />
    <div className="border-b border-border bg-soft-gray py-3"><Container><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Motorcycles", href: "/motorcycles" }, { label: product.brandName, href: `/motorcycles/brand/${product.brand}` }, { label: product.name }]} /></Container></div>
    {product.variants.length ? <section aria-label={`${product.brandName} ${product.name} configuration`} className="bg-white pt-12"><ProductConfigurator brandName={product.brandName} productName={product.name} description={product.description} variants={product.variants} /></section> : <section className="bg-white py-16"><Container className="max-w-5xl"><p className="text-eyebrow mb-2">{product.brandName}</p><h1 className="text-display-xl">{product.name}</h1><p className="mt-5 max-w-2xl text-cool-gray">{product.description}</p><div className="mt-8 border border-border bg-soft-gray p-6"><h2 className="text-heading-sm">Configurations are not available yet</h2><p className="mt-2 text-sm text-cool-gray">OW Motors has not published an active variant for this motorcycle. Contact us for the latest information.</p></div></Container></section>}
    <ProductFeatures features={product.features} />
    <ProductOverview product={product} />
    <DetailedSpecifications groups={product.technicalGroups} />
    <AvailableColors product={product} />
    <RelatedMotorcycles related={related} />
    <ProductFaqs faqs={product.faqs} />
  </>;
}
