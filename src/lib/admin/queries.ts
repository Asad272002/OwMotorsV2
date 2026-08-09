import "server-only";

import { requireStaffPage } from "@/lib/admin/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { parseStorefrontContent, storefrontSettingKeys, type StorefrontContent } from "@/lib/storefront/content";

type BrandRow = Tables<"brands">;
type BrandCampaignImageRow = Tables<"brand_campaign_images">;
type HomepageBrandSectionRow = Tables<"homepage_brand_sections">;
type CategoryRow = Tables<"categories">;
type MotorcycleRow = Tables<"motorcycles">;
type VariantRow = Tables<"motorcycle_variants">;
type ImageRow = Tables<"motorcycle_images">;
type SpecificationRow = Tables<"motorcycle_specifications">;
type FeatureRow = Tables<"motorcycle_features">;

export type AdminMotorcycleListItem = MotorcycleRow & { brand: Pick<BrandRow, "id" | "name" | "slug"> | null };
export type AdminMotorcycle = MotorcycleRow & {
  brand: BrandRow | null;
  categoryLinks: Array<{ category_id: string }>;
  variants: VariantRow[];
  images: ImageRow[];
  specifications: SpecificationRow[];
  features: FeatureRow[];
};
export type AdminMotorcycleInventoryItem = AdminMotorcycle;

function fail(operation: string, code?: string): never {
  console.error("[OW Motors admin query failed]", { operation, code: code ?? "unknown" });
  throw new Error("Admin data is temporarily unavailable.");
}

async function client() {
  await requireStaffPage();
  return createServerSupabaseClient();
}

export async function getAdminStorefrontContent(): Promise<StorefrontContent> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("site_settings")
    .select("setting_key, setting_value")
    .in("setting_key", storefrontSettingKeys());
  if (error) fail("getAdminStorefrontContent", error.code);
  return parseStorefrontContent(data ?? []);
}

export async function getAdminBrands(): Promise<readonly BrandRow[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("brands").select("*").order("display_order").order("name");
  if (error) fail("getAdminBrands", error.code);
  return data ?? [];
}

export async function getAdminBrandCampaignImages(): Promise<readonly BrandCampaignImageRow[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("brand_campaign_images")
    .select("*")
    .order("brand_id")
    .order("sort_order")
    .order("created_at");
  if (error) fail("getAdminBrandCampaignImages", error.code);
  return data ?? [];
}

export async function getAdminHomepageBrandSections(): Promise<readonly HomepageBrandSectionRow[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("homepage_brand_sections")
    .select("*")
    .order("section_type")
    .order("display_order")
    .order("created_at");
  if (error) fail("getAdminHomepageBrandSections", error.code);
  return data ?? [];
}

export async function getAdminCategories(): Promise<readonly CategoryRow[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("categories").select("*").order("display_order").order("name");
  if (error) fail("getAdminCategories", error.code);
  return data ?? [];
}

export async function getAdminMotorcycles(): Promise<readonly AdminMotorcycleListItem[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("motorcycles").select("*, brand:brands!motorcycles_brand_id_fkey(id, name, slug)").order("updated_at", { ascending: false }).limit(250);
  if (error) fail("getAdminMotorcycles", error.code);
  return (data ?? []) as unknown as AdminMotorcycleListItem[];
}

export async function getAdminMotorcycleInventory(): Promise<readonly AdminMotorcycleInventoryItem[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("motorcycles").select(`
    *,
    brand:brands!motorcycles_brand_id_fkey(*),
    categoryLinks:motorcycle_categories(category_id),
    variants:motorcycle_variants(*),
    images:motorcycle_images(*),
    specifications:motorcycle_specifications(*),
    features:motorcycle_features(*)
  `).order("updated_at", { ascending: false }).limit(500);
  if (error) fail("getAdminMotorcycleInventory", error.code);
  return (data ?? []).map((row) => {
    const motorcycle = row as unknown as AdminMotorcycleInventoryItem;
    motorcycle.variants.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.cc - b.cc || a.color_name.localeCompare(b.color_name));
    motorcycle.images.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    motorcycle.specifications.sort((a, b) => a.group_name.localeCompare(b.group_name) || a.sort_order - b.sort_order);
    motorcycle.features.sort((a, b) => a.group_name.localeCompare(b.group_name) || a.sort_order - b.sort_order);
    return motorcycle;
  });
}

export async function getAdminMotorcycle(id: string): Promise<AdminMotorcycle | null> {
  const supabase = await client();
  const { data, error } = await supabase.from("motorcycles").select(`
    *,
    brand:brands!motorcycles_brand_id_fkey(*),
    categoryLinks:motorcycle_categories(category_id),
    variants:motorcycle_variants(*),
    images:motorcycle_images(*),
    specifications:motorcycle_specifications(*),
    features:motorcycle_features(*)
  `).eq("id", id).maybeSingle();
  if (error) fail("getAdminMotorcycle", error.code);
  if (!data) return null;
  const motorcycle = data as unknown as AdminMotorcycle;
  motorcycle.variants.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.cc - b.cc || a.color_name.localeCompare(b.color_name));
  motorcycle.images.sort((a, b) => a.sort_order - b.sort_order);
  motorcycle.specifications.sort((a, b) => a.group_name.localeCompare(b.group_name) || a.sort_order - b.sort_order);
  motorcycle.features.sort((a, b) => a.group_name.localeCompare(b.group_name) || a.sort_order - b.sort_order);
  return motorcycle;
}

export async function getAdminDashboardSummary() {
  const supabase = await client();
  const [brands, categories, motorcycles, published, inquiries, recentInquiries] = await Promise.all([
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("motorcycles").select("id", { count: "exact", head: true }),
    supabase.from("motorcycles").select("id", { count: "exact", head: true }).eq("publication_status", "published"),
    supabase.from("contact_inquiries").select("id", { count: "exact", head: true }).in("status", ["new", "in_progress"]),
    supabase.from("contact_inquiries").select("id, full_name, subject, status, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const results = [brands, categories, motorcycles, published, inquiries, recentInquiries];
  const error = results.find((result) => result.error)?.error;
  if (error) fail("getAdminDashboardSummary", error.code);
  return {
    counts: { brands: brands.count ?? 0, categories: categories.count ?? 0, motorcycles: motorcycles.count ?? 0, published: published.count ?? 0, openInquiries: inquiries.count ?? 0 },
    recentInquiries: recentInquiries.data ?? [],
  };
}

export async function getAdminInquiries() {
  const supabase = await client();
  const { data, error } = await supabase.from("contact_inquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) fail("getAdminInquiries", error.code);
  return data ?? [];
}
