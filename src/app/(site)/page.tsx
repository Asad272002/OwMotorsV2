import type { Metadata } from "next";
import { AboutPreview } from "@/components/home/about-preview";
import { BrandMotorcycleRow } from "@/components/home/brand-motorcycle-row";
import { BrandShowcase } from "@/components/home/brand-showcase";
import { ContactPreview } from "@/components/home/contact-preview";
import { WhyChoose } from "@/components/home/why-choose";
import { getHomepageDisplay, getStorefrontContent } from "@/lib/supabase/public-queries";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants/site";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Multi-Brand Motorcycle Dealership`,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const [{ banners, motorcycleRows }, storefront] = await Promise.all([getHomepageDisplay(), getStorefrontContent()]);
  const hasHomepageBrandContent = banners.length > 0 || motorcycleRows.length > 0;

  return (
    <>
      <h1 className="sr-only">OW Motors motorcycle dealership</h1>
      {hasHomepageBrandContent ? (
        <>
          {banners.length ? <div>{banners.map((brand, index) => <BrandShowcase key={brand.id} brand={brand} index={index} />)}</div> : null}
          {motorcycleRows.length ? <div>{motorcycleRows.map((brand, index) => <BrandMotorcycleRow key={brand.id} brand={brand} index={index} />)}</div> : null}
        </>
      ) : (
        <section className="border-b border-border bg-white px-6 py-20 text-center">
          <h2 className="text-heading-sm">Our motorcycle range is being prepared</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-cool-gray">Published brands and motorcycles will appear here as soon as they are available.</p>
        </section>
      )}
      <WhyChoose content={storefront.whyChoose} />
      <AboutPreview content={storefront.aboutPreview} />
      <ContactPreview content={storefront.contactPreview} />
    </>
  );
}
