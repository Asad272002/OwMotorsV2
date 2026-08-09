import "server-only";

import { cache } from "react";
import type {
  CatalogAvailability,
  CatalogFilterOptions,
  CatalogMotorcycle,
  NavigationMotorcycle,
} from "@/data/catalog";
import { getBrandPresentation, type HomepageBrand } from "@/data/homepage";
import type {
  ProductDetail,
  ProductFaq,
  ProductFeatureGroup,
  ProductImage,
  ProductSpecification,
  ProductVariant,
  RelatedMotorcycle,
  TechnicalGroup,
} from "@/data/products";
import { filterCatalog, type CatalogFilters } from "@/lib/catalog/filters";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createPublicServerSupabaseClient } from "@/lib/supabase/server";
import type { StockStatus, Tables } from "@/lib/supabase/database.types";
import { DEFAULT_STOREFRONT_CONTENT, parseStorefrontContent, storefrontSettingKeys, type StorefrontContent } from "@/lib/storefront/content";

const PAGE_SIZE = 6;

export const getStorefrontContent = cache(async (): Promise<StorefrontContent> => {
  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("setting_key, setting_value")
    .in("setting_key", storefrontSettingKeys());
  if (error) {
    console.error("[OW Motors storefront settings query failed]", { code: error.code });
    return DEFAULT_STOREFRONT_CONTENT;
  }
  return parseStorefrontContent(data ?? []);
});

type BrandRow = Tables<"brands">;
type BrandCampaignImageRow = Tables<"brand_campaign_images">;
type HomepageBrandSectionRow = Tables<"homepage_brand_sections">;
type CategoryRow = Tables<"categories">;
type MotorcycleRow = Tables<"motorcycles">;
type VariantRow = Tables<"motorcycle_variants">;
type ImageRow = Tables<"motorcycle_images">;
type SpecificationRow = Tables<"motorcycle_specifications">;
type FeatureRow = Tables<"motorcycle_features">;

type CatalogSourceRow = Pick<
  MotorcycleRow,
  "id" | "brand_id" | "name" | "slug" | "short_description" | "base_price" | "is_featured" | "updated_at"
> & {
  brand: Pick<BrandRow, "id" | "name" | "slug" | "logo_path" | "is_active">;
  variants: Array<Pick<VariantRow, "id" | "cc" | "color_name" | "color_hex" | "price" | "stock_status" | "is_default" | "is_active">>;
  images: Array<Pick<ImageRow, "id" | "variant_id" | "storage_path" | "alt_text" | "is_primary" | "sort_order">>;
  categoryLinks: Array<{ category: Pick<CategoryRow, "id" | "name" | "slug" | "is_active"> }>;
  specifications: Array<Pick<SpecificationRow, "variant_id" | "label" | "value" | "unit" | "sort_order">>;
};

type NavigationSourceRow = Pick<MotorcycleRow, "id" | "name" | "slug" | "base_price"> & {
  brand: Pick<BrandRow, "id" | "name" | "slug" | "is_active">;
  variants: Array<Pick<VariantRow, "cc" | "price" | "is_default" | "is_active">>;
  images: Array<Pick<ImageRow, "storage_path" | "alt_text" | "is_primary" | "sort_order">>;
  categoryLinks: Array<{ category: Pick<CategoryRow, "name" | "slug" | "is_active"> }>;
};

type ProductSourceRow = Pick<
  MotorcycleRow,
  | "id"
  | "brand_id"
  | "name"
  | "slug"
  | "short_description"
  | "full_description"
  | "base_price"
  | "seo_title"
  | "seo_description"
> & {
  variants: Array<VariantRow>;
  images: Array<ImageRow>;
  categoryLinks: Array<{ category: Pick<CategoryRow, "id" | "name" | "slug" | "is_active"> }>;
  specifications: Array<SpecificationRow>;
  features: Array<FeatureRow>;
};

export type PublicBrand = Readonly<{
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  logo: string;
  megaMenuLogo: string | null;
  heroImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  updatedAt: string;
}>;

export type PublicCategory = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  updatedAt: string;
}>;

export type CatalogPageData = Readonly<{
  motorcycles: readonly CatalogMotorcycle[];
  total: number;
  page: number;
  totalPages: number;
  options: CatalogFilterOptions;
}>;

export class PublicDataError extends Error {
  constructor() {
    super("The requested OW Motors content is temporarily unavailable.");
    this.name = "PublicDataError";
  }
}

function failQuery(operation: string, code?: string) {
  console.error("[OW Motors Supabase query failed]", { operation, code: code ?? "unknown" });
  throw new PublicDataError();
}

function formatPrice(price: number) {
  return `PKR ${price.toLocaleString("en-PK")}`;
}

function formatSpecificationValue(value: string, unit: string | null) {
  return unit ? `${value} ${unit}` : value;
}

function toFilterValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function colorId(value: string) {
  return toFilterValue(value) || "color";
}

function toAvailability(status: StockStatus): CatalogAvailability {
  return status.replaceAll("_", "-") as CatalogAvailability;
}

function availabilityLabel(value: CatalogAvailability) {
  return {
    "in-stock": "In Stock",
    "out-of-stock": "Out of Stock",
    "coming-soon": "Coming Soon",
    discontinued: "Discontinued",
  }[value];
}

function localBrandLogo(slug: string) {
  return getBrandPresentation(slug).localLogo;
}

function resolveStorageImage(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return path;
  if (path.startsWith("images/")) return `/${path}`;
  const { url } = getSupabaseConfig();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${url}/storage/v1/object/public/motorcycles/${encodedPath}`;
}

function sortImages<T extends { is_primary: boolean; sort_order: number }>(images: readonly T[]) {
  return [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
}

function sortVariants<T extends { is_default: boolean; cc: number }>(variants: readonly T[]) {
  return [...variants].sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.cc - b.cc);
}

function specificationValue(
  specifications: readonly CatalogSourceRow["specifications"][number][],
  label: string,
  variantId?: string,
) {
  const normalized = label.toLowerCase();
  const candidates = specifications
    .filter((item) => item.label.toLowerCase() === normalized)
    .sort((a, b) => a.sort_order - b.sort_order);
  const item = candidates.find((candidate) => candidate.variant_id === variantId)
    ?? candidates.find((candidate) => candidate.variant_id === null);
  return item ? formatSpecificationValue(item.value, item.unit) : "";
}

function toPublicBrand(row: BrandRow): PublicBrand {
  const presentation = getBrandPresentation(row.slug);
  const databaseLogo = row.logo_path ? resolveStorageImage(row.logo_path) : null;
  const databaseHero = row.hero_image_path ? resolveStorageImage(row.hero_image_path) : null;
  const megaMenuLogoPath = row.mega_menu_logo_path ?? row.logo_path;
  const megaMenuLogo = row.show_mega_menu_logo && megaMenuLogoPath
    ? resolveStorageImage(megaMenuLogoPath)
    : null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    logo: databaseLogo ?? presentation.localLogo,
    megaMenuLogo,
    heroImage: databaseHero,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    displayOrder: row.display_order,
    updatedAt: row.updated_at,
  };
}

function toPublicCategory(row: CategoryRow): PublicCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    displayOrder: row.display_order,
    updatedAt: row.updated_at,
  };
}

export const getPublicBrands = cache(async (): Promise<readonly PublicBrand[]> => {
  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_path, mega_menu_logo_path, show_mega_menu_logo, short_description, full_description, hero_image_path, seo_title, seo_description, is_active, display_order, created_at, updated_at")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) failQuery("getPublicBrands", error.code);
  return (data ?? []).map(toPublicBrand);
});

export const getPublicCategories = cache(async (): Promise<readonly PublicCategory[]> => {
  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, seo_title, seo_description, is_active, display_order, created_at, updated_at")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) failQuery("getPublicCategories", error.code);
  return (data ?? []).map(toPublicCategory);
});

export const getPublicBrandBySlug = cache(async (slug: string) => {
  const brands = await getPublicBrands();
  return brands.find((brand) => brand.slug === slug) ?? null;
});

export const getPublicCategoryBySlug = cache(async (slug: string) => {
  const categories = await getPublicCategories();
  return categories.find((category) => category.slug === slug) ?? null;
});

const getCatalogSource = cache(async (): Promise<readonly CatalogSourceRow[]> => {
  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase
    .from("motorcycles")
    .select(`
      id,
      brand_id,
      name,
      slug,
      short_description,
      base_price,
      is_featured,
      updated_at,
      brand:brands!motorcycles_brand_id_fkey!inner(id, name, slug, logo_path, is_active),
      variants:motorcycle_variants(id, cc, color_name, color_hex, price, stock_status, is_default, is_active),
      images:motorcycle_images(id, variant_id, storage_path, alt_text, is_primary, sort_order),
      categoryLinks:motorcycle_categories(category:categories!inner(id, name, slug, is_active)),
      specifications:motorcycle_specifications(variant_id, label, value, unit, sort_order)
    `)
    .eq("publication_status", "published")
    .eq("brand.is_active", true)
    .eq("categoryLinks.category.is_active", true)
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) failQuery("getCatalogSource", error.code);
  return (data ?? []) as unknown as CatalogSourceRow[];
});

function toCatalogMotorcycle(row: CatalogSourceRow): CatalogMotorcycle | null {
  const variants = sortVariants(row.variants.filter((variant) => variant.is_active));
  const selectedVariant = variants[0];
  const images = sortImages(row.images);
  const selectedImage = images.find((image) => image.variant_id === selectedVariant?.id)
    ?? images.find((image) => image.variant_id === null)
    ?? images[0];
  const categories = row.categoryLinks
    .map((link) => link.category)
    .filter((category) => category.is_active);
  const engine = selectedVariant ? `${selectedVariant.cc}cc` : "Not specified";
  const transmission = specificationValue(row.specifications, "Transmission", selectedVariant?.id) || "Not specified";
  const cooling = specificationValue(row.specifications, "Cooling System", selectedVariant?.id) || "Not specified";
  const fuel = specificationValue(row.specifications, "Fuel Type", selectedVariant?.id) || "Not specified";
  const availability = selectedVariant ? toAvailability(selectedVariant.stock_status) : "out-of-stock";
  const price = selectedVariant?.price ?? row.base_price;
  const productImage = images.find((image) => image.variant_id === null) ?? images[0];
  const colors = [...new Map(variants.map((variant) => {
    const variantImage = images.find((image) => image.variant_id === variant.id) ?? productImage;
    return [variant.color_name.toLowerCase(), {
      id: variant.id,
      name: variant.color_name,
      hex: variant.color_hex,
      image: variantImage ? resolveStorageImage(variantImage.storage_path) : localBrandLogo(row.brand.slug),
      imageAlt: variantImage?.alt_text ?? `${row.name} in ${variant.color_name}`,
    }] as const;
  })).values()];

  return {
    id: row.id,
    brand: row.brand.slug,
    brandName: row.brand.name,
    name: row.name,
    slug: row.slug,
    categories: categories.map((category) => category.slug),
    categoryLabels: categories.map((category) => category.name),
    engine,
    cooling,
    transmission: toFilterValue(transmission),
    transmissionLabel: transmission,
    fuel: toFilterValue(fuel),
    availability,
    image: selectedImage ? resolveStorageImage(selectedImage.storage_path) : localBrandLogo(row.brand.slug),
    imageAlt: selectedImage?.alt_text ?? `${row.brand.name} logo shown while ${row.name} photography is unavailable`,
    shortDescription: row.short_description,
    colors,
    summary: [engine, transmission, fuel].join(" · "),
    price,
    priceLabel: formatPrice(price),
    featuredOrder: row.is_featured ? 0 : 1,
    updatedAt: row.updated_at,
  };
}

export const getPublicCatalogMotorcycles = cache(async (): Promise<readonly CatalogMotorcycle[]> => {
  const rows = await getCatalogSource();
  return rows.flatMap((row) => {
    const item = toCatalogMotorcycle(row);
    return item ? [item] : [];
  });
});

/**
 * Lean, bounded data for the shared mega menus. It intentionally excludes
 * variants, specifications, prices, and the rest of the full catalog payload.
 */
export const getNavigationMotorcycles = cache(async (): Promise<readonly NavigationMotorcycle[]> => {
  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase
    .from("motorcycles")
    .select(`
      id,
      name,
      slug,
      base_price,
      brand:brands!motorcycles_brand_id_fkey!inner(id, name, slug, is_active),
      variants:motorcycle_variants(cc, price, is_default, is_active),
      images:motorcycle_images(storage_path, alt_text, is_primary, sort_order),
      categoryLinks:motorcycle_categories(category:categories!inner(name, slug, is_active))
    `)
    .eq("publication_status", "published")
    .eq("brand.is_active", true)
    .eq("images.is_primary", true)
    .eq("categoryLinks.category.is_active", true)
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) failQuery("getNavigationMotorcycles", error.code);

  return ((data ?? []) as unknown as NavigationSourceRow[]).map((row) => {
    const image = sortImages(row.images)[0];
    const variant = sortVariants(row.variants.filter((item) => item.is_active))[0];
    const price = variant?.price ?? row.base_price;
    const activeCategories = row.categoryLinks
      .map((link) => link.category)
      .filter((category) => category.is_active);
    return {
      id: row.id,
      brand: row.brand.slug,
      brandName: row.brand.name,
      name: row.name,
      slug: row.slug,
      categories: activeCategories.map((category) => category.slug),
      categoryLabels: activeCategories.map((category) => category.name),
      image: image ? resolveStorageImage(image.storage_path) : localBrandLogo(row.brand.slug),
      imageAlt: image?.alt_text ?? `${row.brand.name} logo shown while ${row.name} photography is unavailable`,
      price,
      priceLabel: formatPrice(price),
    };
  });
});

function uniqueOptions(values: readonly Readonly<{ value: string; label: string }>[]) {
  return [...new Map(values.filter((item) => item.value).map((item) => [item.value, item])).values()]
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getCatalogPageData(
  filters: CatalogFilters,
  lockedBrand?: string,
  lockedCategory?: string,
  pageSize = PAGE_SIZE,
): Promise<CatalogPageData> {
  const [allMotorcycles, brands, categories] = await Promise.all([
    getPublicCatalogMotorcycles(),
    getPublicBrands(),
    getPublicCategories(),
  ]);
  const filtered = filterCatalog(allMotorcycles, filters, lockedBrand, lockedCategory);
  const safePageSize = Math.max(3, Math.min(48, Math.trunc(pageSize)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / safePageSize));
  const page = Math.min(filters.page, totalPages);
  const motorcycles = filtered.slice((page - 1) * safePageSize, page * safePageSize);

  const options: CatalogFilterOptions = {
    brand: brands.map((brand) => ({ value: brand.slug, label: brand.name })),
    category: categories.map((category) => ({ value: category.slug, label: category.name })),
    engine: uniqueOptions(allMotorcycles.map((item) => ({ value: toFilterValue(item.engine), label: item.engine }))),
    transmission: uniqueOptions(allMotorcycles.map((item) => ({ value: item.transmission, label: item.transmission === "not-specified" ? "Not specified" : item.transmission.replaceAll("-", " ") }))),
    fuel: uniqueOptions(allMotorcycles.map((item) => ({ value: item.fuel, label: item.fuel === "not-specified" ? "Not specified" : item.fuel.replaceAll("-", " ") }))),
    availability: uniqueOptions(allMotorcycles.map((item) => ({ value: item.availability, label: availabilityLabel(item.availability) }))),
  };

  return { motorcycles, total: filtered.length, page, totalPages, options };
}

export const getHomepageBrands = cache(async (): Promise<readonly HomepageBrand[]> => {
  const [brands, motorcycles, campaignImages] = await Promise.all([
    getPublicBrands(),
    getPublicCatalogMotorcycles(),
    getPublicBrandCampaignImages(),
  ]);

  return brands.map((brand) => {
    const presentation = getBrandPresentation(brand.slug);
    const brandMotorcycles = motorcycles.filter((motorcycle) => motorcycle.brand === brand.slug).slice(0, 8);
    return {
      id: brand.slug,
      databaseId: brand.id,
      name: brand.name,
      displayName: brand.name,
      href: `/motorcycles/brand/${brand.slug}`,
      tagline: presentation.tagline,
      description: brand.shortDescription,
      fullDescription: brand.fullDescription,
      background: presentation.background,
      logo: brand.logo,
      overlayLogo: brand.logo,
      campaignImages: campaignImages
        .filter((image) => image.brand_id === brand.id)
        .map((image) => ({ id: image.id, src: resolveStorageImage(image.storage_path), alt: image.alt_text })),
      motorcycles: brandMotorcycles.map((motorcycle) => ({
        id: motorcycle.id,
        name: motorcycle.name,
        slug: motorcycle.slug,
        image: motorcycle.image,
        imageAlt: motorcycle.imageAlt,
        tagline: motorcycle.shortDescription,
        engine: motorcycle.engine,
        cooling: motorcycle.cooling,
        gearbox: motorcycle.transmissionLabel,
        colors: motorcycle.colors,
        specification: motorcycle.summary,
        priceLabel: motorcycle.priceLabel,
      })),
    };
  });
});

const getPublicHomepageBrandSections = cache(async (): Promise<readonly HomepageBrandSectionRow[]> => {
  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase
    .from("homepage_brand_sections")
    .select("*")
    .eq("display_status", "visible")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) failQuery("getPublicHomepageBrandSections", error.code);
  return data ?? [];
});

export const getHomepageDisplay = cache(async (): Promise<Readonly<{
  banners: readonly HomepageBrand[];
  motorcycleRows: readonly HomepageBrand[];
}>> => {
  const [brands, sections] = await Promise.all([
    getHomepageBrands(),
    getPublicHomepageBrandSections(),
  ]);
  const brandsById = new Map(brands.map((brand) => [brand.databaseId, brand]));
  const toBrand = (section: HomepageBrandSectionRow) => {
    const brand = brandsById.get(section.brand_id);
    if (!brand) return null;
    return {
      ...brand,
      overlayLogo: section.section_type === "brand_banner" && section.show_overlay_logo
        ? resolveStorageImage(section.overlay_logo_path ?? brand.logo)
        : null,
    } satisfies HomepageBrand;
  };
  const select = (sectionType: HomepageBrandSectionRow["section_type"]) => sections
    .filter((section) => section.section_type === sectionType)
    .map(toBrand)
    .filter((brand): brand is HomepageBrand => brand !== null);

  return {
    banners: select("brand_banner"),
    motorcycleRows: select("motorcycle_row"),
  };
});

const getPublicBrandCampaignImages = cache(async (): Promise<readonly BrandCampaignImageRow[]> => {
  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase
    .from("brand_campaign_images")
    .select("id, brand_id, storage_path, alt_text, sort_order, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) failQuery("getPublicBrandCampaignImages", error.code);
  return data ?? [];
});

function mapProductImage(image: ImageRow): ProductImage {
  return { src: resolveStorageImage(image.storage_path), alt: image.alt_text };
}

function groupSpecifications(items: readonly SpecificationRow[]): readonly TechnicalGroup[] {
  const groups = new Map<string, ProductSpecification[]>();
  [...items].sort((a, b) => a.sort_order - b.sort_order).forEach((item) => {
    const group = groups.get(item.group_name) ?? [];
    group.push({ label: item.label, value: formatSpecificationValue(item.value, item.unit) });
    groups.set(item.group_name, group);
  });
  return [...groups].map(([title, specifications]) => ({ title, items: specifications }));
}

function groupFeatures(items: readonly FeatureRow[]): readonly ProductFeatureGroup[] {
  const groups = new Map<string, { icon: string; items: Array<{ title: string; description: string }> }>();
  [...items].sort((a, b) => a.sort_order - b.sort_order).forEach((item) => {
    const group = groups.get(item.group_name) ?? { icon: item.icon_identifier ?? "•", items: [] };
    group.items.push({ title: item.title, description: item.description });
    groups.set(item.group_name, group);
  });
  return [...groups].map(([title, group]) => ({ title, icon: group.icon, items: group.items }));
}

function buildProductFaqs(name: string, variants: readonly ProductVariant[]): readonly ProductFaq[] {
  if (!variants.length) return [];
  const capacities = [...new Set(variants.map((variant) => `${variant.cc}cc`))];
  const colors = [...new Set(variants.map((variant) => variant.colorName))];
  const statuses = [...new Set(variants.map((variant) => availabilityLabel(variant.availability)))];
  return [
    { question: `Which engine capacities are available for the ${name}?`, answer: capacities.join(", ") },
    { question: `Which colors are available for the ${name}?`, answer: colors.join(", ") },
    { question: `What is the current ${name} availability?`, answer: `Current variant statuses: ${statuses.join(", ")}. Select a configuration above for its exact status.` },
    { question: `How can I ask OW Motors about the ${name}?`, answer: "Use the contact page to ask about this motorcycle, its configurations, and current purchasing information." },
  ];
}

export const getPublicProduct = cache(async (brandSlug: string, productSlug: string): Promise<ProductDetail | null> => {
  const brand = await getPublicBrandBySlug(brandSlug);
  if (!brand) return null;

  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase
    .from("motorcycles")
    .select(`
      id,
      brand_id,
      name,
      slug,
      short_description,
      full_description,
      base_price,
      seo_title,
      seo_description,
      variants:motorcycle_variants(*),
      images:motorcycle_images(*),
      categoryLinks:motorcycle_categories(category:categories!inner(id, name, slug, is_active)),
      specifications:motorcycle_specifications(*),
      features:motorcycle_features(*)
    `)
    .eq("brand_id", brand.id)
    .eq("slug", productSlug)
    .eq("publication_status", "published")
    .eq("categoryLinks.category.is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) failQuery("getPublicProduct", error.code);
  if (!data) return null;

  const row = data as unknown as ProductSourceRow;
  const activeVariants = sortVariants(row.variants.filter((variant) => variant.is_active));
  const images = sortImages(row.images);
  const productImages = images.filter((image) => image.variant_id === null);
  const productSpecifications = row.specifications.filter((specification) => specification.variant_id === null);
  const categories = row.categoryLinks
    .map((link) => link.category)
    .filter((category) => category.is_active);
  const fallbackImage: ProductImage = {
    src: brand.logo,
    alt: `${brand.name} logo shown while ${row.name} photography is unavailable`,
  };

  const variants: ProductVariant[] = activeVariants.map((variant) => {
    const variantImages = images.filter((image) => image.variant_id === variant.id);
    const applicableImages = variantImages.length ? variantImages : productImages;
    const applicableSpecifications = [
      ...productSpecifications,
      ...row.specifications.filter((specification) => specification.variant_id === variant.id),
    ].sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: variant.id,
      cc: variant.cc,
      colorId: colorId(variant.color_name),
      colorName: variant.color_name,
      colorHex: variant.color_hex,
      price: variant.price,
      availability: toAvailability(variant.stock_status),
      stockStatus: variant.stock_status,
      quantity: variant.quantity,
      isDefault: variant.is_default,
      images: applicableImages.length ? applicableImages.map(mapProductImage) : [fallbackImage],
      specifications: [
        { label: "Brand", value: brand.name },
        { label: "Model", value: row.name },
        { label: "Engine capacity", value: `${variant.cc}cc` },
        ...applicableSpecifications.map((item) => ({
          label: item.label,
          value: formatSpecificationValue(item.value, item.unit),
        })),
      ],
    };
  });

  const overviewImageRow = images.find((image) => image.image_type === "overview")
    ?? images.find((image) => image.image_type === "hero")
    ?? productImages[0]
    ?? images[0];
  const paragraphs = row.full_description.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
  const detailedSpecifications = [
    ...productSpecifications,
    ...row.specifications.filter((specification) => specification.variant_id === defaultVariant?.id),
  ];

  return {
    id: row.id,
    brand: brand.slug,
    brandName: brand.name,
    name: row.name,
    slug: row.slug,
    categories: categories.map((category) => category.slug),
    description: row.short_description,
    fullDescription: row.full_description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    overviewHeading: `${brand.name} ${row.name}`,
    overview: paragraphs.length ? paragraphs : [row.full_description],
    overviewImage: overviewImageRow ? mapProductImage(overviewImageRow) : fallbackImage,
    variants,
    features: groupFeatures(row.features),
    technicalGroups: groupSpecifications(detailedSpecifications),
    faqs: buildProductFaqs(row.name, variants),
  };
});

export async function getRelatedMotorcycles(product: ProductDetail): Promise<readonly RelatedMotorcycle[]> {
  const motorcycles = await getPublicCatalogMotorcycles();
  return motorcycles
    .filter((item) => item.id !== product.id && (
      item.brand === product.brand
      || item.categories.some((category) => product.categories.includes(category))
    ))
    .slice(0, 4);
}
