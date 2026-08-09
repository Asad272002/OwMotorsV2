import Image from "next/image";
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form.client";
import { AdminPanel, adminInputClass, adminLabelClass, adminTextareaClass } from "@/components/admin/admin-ui";
import type { AdminActionState } from "@/lib/admin/action-state";
import type { Tables } from "@/lib/supabase/database.types";
import { motorcycleStoragePublicUrl } from "@/lib/supabase/storage";
import type { AdminBlogPost } from "@/lib/blog/queries";

type Action = (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;

function readSections(post: AdminBlogPost | null) {
  if (!post || !Array.isArray(post.content_sections)) return [];
  return post.content_sections.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    return typeof item.heading === "string" && typeof item.body === "string" ? [{ heading: item.heading, body: item.body }] : [];
  });
}

export function BlogPostForm({ post, categories, action }: Readonly<{ post: AdminBlogPost | null; categories: readonly Tables<"blog_categories">[]; action: Action }>) {
  const sections = readSections(post);
  const sectionCount = Math.min(12, Math.max(5, sections.length + 2));
  return <AdminForm action={action} submitLabel={post ? "Save article" : "Create article"} pendingLabel="Saving article…" className="space-y-6">
    {post ? <input type="hidden" name="id" value={post.id} /> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <AdminPanel title="Story" description="Write the title, summary, and structured article sections readers will see.">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={`${adminLabelClass} sm:col-span-2`}>Article title<input name="title" required minLength={10} maxLength={180} defaultValue={post?.title ?? ""} className={adminInputClass} /></label>
            <label className={adminLabelClass}>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={post?.slug ?? ""} className={adminInputClass} /><span className="mt-1.5 block text-xs font-normal text-[#6B7280]">Lowercase words separated by hyphens.</span></label>
            <label className={adminLabelClass}>Category<select name="categoryId" required defaultValue={post?.category_id ?? categories[0]?.id ?? ""} className={adminInputClass}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className={`${adminLabelClass} sm:col-span-2`}>Card summary<textarea name="excerpt" required minLength={30} maxLength={420} rows={3} defaultValue={post?.excerpt ?? ""} className={adminTextareaClass} /><span className="mt-1.5 block text-xs font-normal text-[#6B7280]">Appears on the blog grid and in search results when no custom SEO description is supplied.</span></label>
            <label className={`${adminLabelClass} sm:col-span-2`}>Opening paragraph<textarea name="lead" required minLength={30} maxLength={1000} rows={4} defaultValue={post?.lead ?? ""} className={adminTextareaClass} /></label>
          </div>
        </AdminPanel>

        <AdminPanel title="Article sections" description="Use clear headings and plain text. No HTML, scripts, or layout code is accepted.">
          <div className="space-y-5">{Array.from({ length: sectionCount }, (_, index) => <fieldset key={index} className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4"><legend className="px-2 text-xs font-bold uppercase tracking-[0.12em] text-[#6B7280]">Section {index + 1}</legend><label className={adminLabelClass}>Heading<input name={`sectionHeading${index}`} defaultValue={sections[index]?.heading ?? ""} className={adminInputClass} maxLength={180} /></label><label className={`${adminLabelClass} mt-4`}>Body<textarea name={`sectionBody${index}`} defaultValue={sections[index]?.body ?? ""} className={adminTextareaClass} rows={5} maxLength={5000} /></label></fieldset>)}</div>
        </AdminPanel>

        <AdminPanel title="Search and discovery" description="Help people understand the article before they click it.">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={adminLabelClass}>SEO title<input name="seoTitle" defaultValue={post?.seo_title ?? ""} minLength={10} maxLength={70} className={adminInputClass} /></label>
            <label className={adminLabelClass}>Tags<input name="tags" defaultValue={post?.tags.join(", ") ?? ""} maxLength={500} className={adminInputClass} /><span className="mt-1.5 block text-xs font-normal text-[#6B7280]">Separate tags with commas.</span></label>
            <label className={`${adminLabelClass} sm:col-span-2`}>SEO description<textarea name="seoDescription" defaultValue={post?.seo_description ?? ""} minLength={50} maxLength={180} rows={3} className={adminTextareaClass} /></label>
          </div>
        </AdminPanel>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
        <AdminPanel title="Publishing" description="Drafts stay private until you publish them.">
          <div className="space-y-5">
            <label className={adminLabelClass}>Status<select name="publicationStatus" defaultValue={post?.publication_status ?? "draft"} className={adminInputClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[#374151]"><input type="checkbox" name="isFeatured" defaultChecked={post?.is_featured ?? false} className="h-5 w-5 accent-[#C62828]" />Feature on the blog page</label>
            {post?.publication_status === "published" ? <Link href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold !text-[#C62828] hover:underline">Open published article →</Link> : null}
          </div>
        </AdminPanel>

        <AdminPanel title="Hero image" description="This image appears on cards, social previews, and the article header.">
          {post?.hero_image_path ? <div className="relative mb-4 aspect-video overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F7F7F8]"><Image src={motorcycleStoragePublicUrl(post.hero_image_path)} alt={post.hero_image_alt} fill sizes="320px" className="object-cover" /></div> : null}
          <label className={adminLabelClass}>Upload replacement<input name="heroImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={`${adminInputClass} py-2`} /></label>
          <label className={`${adminLabelClass} mt-4`}>Existing image path<input name="heroImagePath" defaultValue={post?.hero_image_path ?? ""} className={adminInputClass} placeholder="/images/... or uploaded path" /></label>
          <label className={`${adminLabelClass} mt-4`}>Image description<input name="heroImageAlt" required minLength={8} maxLength={240} defaultValue={post?.hero_image_alt ?? ""} className={adminInputClass} /></label>
        </AdminPanel>

        <AdminPanel title="Byline" description="Reader-facing author details.">
          <div className="space-y-4"><label className={adminLabelClass}>Author name<input name="authorName" required defaultValue={post?.author_name ?? "OW Motors Team"} className={adminInputClass} /></label><label className={adminLabelClass}>Initials<input name="authorInitials" required maxLength={5} defaultValue={post?.author_initials ?? "OW"} className={adminInputClass} /></label><label className={adminLabelClass}>Reading time (minutes)<input name="readingTimeMinutes" type="number" min={1} max={90} required defaultValue={post?.reading_time_minutes ?? 5} className={adminInputClass} /></label><label className={adminLabelClass}>Optional brand label<input name="brandLabel" defaultValue={post?.brand_label ?? ""} className={adminInputClass} /></label><label className={adminLabelClass}>Author bio<textarea name="authorBio" required minLength={20} maxLength={700} rows={4} defaultValue={post?.author_bio ?? "The OW Motors editorial team shares practical motorcycle guides, product information, and dealership news."} className={adminTextareaClass} /></label></div>
        </AdminPanel>
      </aside>
    </div>
  </AdminForm>;
}

