import type { Metadata } from "next";
import { BrandsShowcase } from "@/components/brands/brands-showcase";
import { Container } from "@/components/ui/container";
import { getHomepageBrands, getStorefrontContent } from "@/lib/supabase/public-queries";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Motorcycle Brands",
  description: "Explore Taro, Lifan, Hi-Speed, and Super Star motorcycles available through OW Motors.",
  path: "/brands",
});
export default async function BrandsPage() {
  const [brands, storefront] = await Promise.all([getHomepageBrands(), getStorefrontContent()]);
  const settings = new Map(storefront.brandsPage.showcase.map((item) => [item.brandId, item]));
  const visibleBrands = brands
    .filter((brand) => settings.get(brand.databaseId)?.visible ?? true)
    .sort((a, b) => (settings.get(a.databaseId)?.order ?? Number.MAX_SAFE_INTEGER) - (settings.get(b.databaseId)?.order ?? Number.MAX_SAFE_INTEGER));
  return <><header className="border-b border-border bg-white py-16 text-center md:py-20"><Container><p className="text-eyebrow mb-4">{storefront.brandsPage.eyebrow}</p><h1 className="text-display-xl">{storefront.brandsPage.heading}</h1><p className="mx-auto mt-5 max-w-lg text-base text-cool-gray">{storefront.brandsPage.description}</p></Container></header><BrandsShowcase brands={visibleBrands} /></>;
}
