import type { Metadata } from "next";
import { CatalogLayout } from "@/components/catalog/catalog-layout";
import { parseCatalogFilters, type RawSearchParams } from "@/lib/catalog/filters";
import { catalogMetadataPolicy, createPageMetadata } from "@/lib/seo/metadata";
import { getCatalogPageData } from "@/lib/supabase/public-queries";

type Props = { searchParams: Promise<RawSearchParams> };

const TITLE = "All Motorcycles";
const DESCRIPTION = "Explore the complete OW Motors motorcycle lineup.";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await searchParams;
  const filters = parseCatalogFilters(query);
  const catalog = await getCatalogPageData(filters, undefined, undefined, 6);
  const policy = catalogMetadataPolicy(query, "/motorcycles");
  const invalidPage = filters.page > catalog.totalPages;
  return createPageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: invalidPage ? "/motorcycles" : policy.canonicalPath,
    noIndex: policy.noIndex || invalidPage || catalog.total === 0,
  });
}

export default async function MotorcyclesPage({ searchParams }: Props) {
  const filters = parseCatalogFilters(await searchParams);
  const catalog = await getCatalogPageData(filters, undefined, undefined, 6);
  return <CatalogLayout title={TITLE} description={DESCRIPTION} pathname="/motorcycles" filters={filters} catalog={catalog} breadcrumbs={[{ label: "Home", href: "/" }, { label: "Motorcycles" }]} desktopColumns={3} />;
}
