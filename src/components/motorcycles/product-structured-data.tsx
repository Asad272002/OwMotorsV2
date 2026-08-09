import type { ProductDetail } from "@/data/products";
import { SITE_URL } from "@/lib/constants/site";

const availability = {
  "in-stock": "https://schema.org/InStock",
  "out-of-stock": "https://schema.org/OutOfStock",
  "coming-soon": "https://schema.org/PreOrder",
  discontinued: "https://schema.org/Discontinued",
} as const;

function absoluteImage(src: string) {
  return /^https?:\/\//i.test(src) ? src : `${SITE_URL}${src}`;
}

export function ProductStructuredData({ product }: Readonly<{ product: ProductDetail }>) {
  const url = `${SITE_URL}/motorcycles/${product.brand}/${product.slug}`;
  const images = [...new Set(product.variants.flatMap((variant) => variant.images.map((image) => absoluteImage(image.src))))];
  const productNode = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: `${product.brandName} ${product.name}`,
    description: product.description,
    ...(images.length ? { image: images } : {}),
    brand: { "@type": "Brand", name: product.brandName },
    ...(product.variants.length ? { offers: product.variants.map((variant) => ({ "@id": `${url}#offer-${variant.id}` })) } : {}),
  };
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      productNode,
      ...product.variants.map((variant) => ({ "@type": "Offer", "@id": `${url}#offer-${variant.id}`, url, priceCurrency: "PKR", price: variant.price, availability: availability[variant.availability], itemCondition: "https://schema.org/NewCondition", itemOffered: { "@id": `${url}#product` } })),
      { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Motorcycles", item: `${SITE_URL}/motorcycles` },
        { "@type": "ListItem", position: 3, name: product.brandName, item: `${SITE_URL}/motorcycles/brand/${product.brand}` },
        { "@type": "ListItem", position: 4, name: product.name, item: url },
      ] },
      ...(product.faqs.length ? [{
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: product.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }] : []),
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replaceAll("<", "\\u003c") }} />;
}
