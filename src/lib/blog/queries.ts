import "server-only";

import { cache } from "react";
import { FALLBACK_BLOG_CATEGORIES, FALLBACK_BLOG_POSTS, type BlogCategory, type BlogPost, type BlogSection } from "@/data/blog";
import { requireStaffPage } from "@/lib/admin/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";
import type { Tables } from "@/lib/supabase/database.types";

type CategoryRow = Tables<"blog_categories">;
type PostRow = Tables<"blog_posts">;
type PostSource = PostRow & { category: CategoryRow | null };

function parseSections(value: PostRow["content_sections"]): readonly BlogSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const heading = item.heading;
    const body = item.body;
    return typeof heading === "string" && typeof body === "string" ? [{ heading, body }] : [];
  });
}

function mapCategory(row: CategoryRow): BlogCategory {
  return { id: row.id, name: row.name, slug: row.slug, accentColor: row.accent_color };
}

function mapPost(row: PostSource): BlogPost | null {
  if (!row.category) return null;
  const sections = parseSections(row.content_sections);
  if (!sections.length || !row.published_at) return null;
  return {
    id: row.id,
    category: mapCategory(row.category),
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    brandLabel: row.brand_label,
    heroImage: motorcycleStoragePublicUrl(row.hero_image_path),
    heroImageAlt: row.hero_image_alt,
    lead: row.lead,
    sections,
    tags: row.tags,
    authorName: row.author_name,
    authorInitials: row.author_initials,
    authorBio: row.author_bio,
    readingTimeMinutes: row.reading_time_minutes,
    isFeatured: row.is_featured,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

export const getBlogCategories = cache(async (): Promise<readonly BlogCategory[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("blog_categories").select("*").eq("is_active", true).order("display_order").order("name");
  if (error) return FALLBACK_BLOG_CATEGORIES;
  return (data ?? []).map(mapCategory);
});

export const getPublishedBlogPosts = cache(async (): Promise<readonly BlogPost[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, category:blog_categories!blog_posts_category_id_fkey(*)")
    .eq("publication_status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) return FALLBACK_BLOG_POSTS;
  return (data ?? []).map((row) => mapPost(row as unknown as PostSource)).filter((post): post is BlogPost => post !== null);
});

export const getPublishedBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const posts = await getPublishedBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
});

export async function getRelatedBlogPosts(post: BlogPost, limit = 2) {
  const posts = await getPublishedBlogPosts();
  return posts
    .filter((candidate) => candidate.id !== post.id)
    .sort((left, right) => Number(right.category.slug === post.category.slug) - Number(left.category.slug === post.category.slug))
    .slice(0, limit);
}

export type AdminBlogPost = PostRow & { category: CategoryRow | null };

export async function getAdminBlogCategories(): Promise<readonly CategoryRow[]> {
  await requireStaffPage();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("blog_categories").select("*").order("display_order").order("name");
  if (error) throw new Error("Blog categories are unavailable. Apply the latest Supabase migration and try again.");
  return data ?? [];
}

export async function getAdminBlogPosts(): Promise<readonly AdminBlogPost[]> {
  await requireStaffPage();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("blog_posts").select("*, category:blog_categories!blog_posts_category_id_fkey(*)").order("updated_at", { ascending: false }).limit(250);
  if (error) throw new Error("Blog posts are unavailable. Apply the latest Supabase migration and try again.");
  return (data ?? []) as unknown as AdminBlogPost[];
}

export async function getAdminBlogPost(id: string): Promise<AdminBlogPost | null> {
  await requireStaffPage();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("blog_posts").select("*, category:blog_categories!blog_posts_category_id_fkey(*)").eq("id", id).maybeSingle();
  if (error) throw new Error("The blog post could not be loaded.");
  return data as unknown as AdminBlogPost | null;
}

