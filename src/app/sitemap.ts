import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";
import { getPublicBrands, getPublicCatalogMotorcycles, getPublicCategories } from "@/lib/supabase/public-queries";
import { getPublishedBlogPosts } from "@/lib/blog/queries";

function latestTimestamp(values: readonly string[]) {
  return values.length
    ? values.reduce((latest, value) => value > latest ? value : latest)
    : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brands, categories, motorcycles, blogPosts] = await Promise.all([
    getPublicBrands(),
    getPublicCategories(),
    getPublicCatalogMotorcycles(),
    getPublishedBlogPosts(),
  ]);
  const populatedBrandSlugs = new Set(motorcycles.map((motorcycle) => motorcycle.brand));
  const populatedCategorySlugs = new Set(motorcycles.flatMap((motorcycle) => motorcycle.categories));
  const latestBrandUpdate = latestTimestamp(brands.map((brand) => brand.updatedAt));
  const latestProductUpdate = latestTimestamp(motorcycles.map((motorcycle) => motorcycle.updatedAt));
  const staticEntries = [
    { path: "", lastModified: latestTimestamp([latestBrandUpdate, latestProductUpdate].filter((value): value is string => Boolean(value))) },
    { path: "/brands", lastModified: latestBrandUpdate },
    ...(motorcycles.length ? [{ path: "/motorcycles", lastModified: latestProductUpdate }] : []),
    { path: "/about" },
    { path: "/contact" },
    { path: "/blog", lastModified: latestTimestamp(blogPosts.map((post) => post.updatedAt)) },
  ];
  const brandEntries = brands
    .filter((brand) => populatedBrandSlugs.has(brand.slug))
    .map((brand) => ({
      path: `/motorcycles/brand/${brand.slug}`,
      lastModified: latestTimestamp([
        brand.updatedAt,
        ...motorcycles.filter((motorcycle) => motorcycle.brand === brand.slug).map((motorcycle) => motorcycle.updatedAt),
      ]),
    }));
  const categoryEntries = categories
    .filter((category) => populatedCategorySlugs.has(category.slug))
    .map((category) => ({
      path: `/motorcycles/category/${category.slug}`,
      lastModified: latestTimestamp([
        category.updatedAt,
        ...motorcycles
          .filter((motorcycle) => motorcycle.categories.includes(category.slug))
          .map((motorcycle) => motorcycle.updatedAt),
      ]),
    }));
  const productEntries = motorcycles.map((product) => ({
    path: `/motorcycles/${product.brand}/${product.slug}`,
    lastModified: product.updatedAt,
  }));
  const blogEntries = blogPosts.map((post) => ({ path: `/blog/${post.slug}`, lastModified: post.updatedAt }));
  return [...staticEntries, ...brandEntries, ...categoryEntries, ...productEntries, ...blogEntries].map(({ path, lastModified }) => ({
    url: `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/motorcycles/") ? 0.8 : 0.7,
  }));
}
