import { notFound } from "next/navigation";
import { deleteBlogPost, updateBlogPost } from "@/app/admin/blog-actions";
import { AdminForm } from "@/components/admin/admin-form.client";
import { BlogPostForm } from "@/components/admin/blog-post-form";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getAdminBlogCategories, getAdminBlogPost } from "@/lib/blog/queries";

export default async function EditBlogPostPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const [post, categories] = await Promise.all([getAdminBlogPost(id), getAdminBlogCategories()]);
  if (!post) notFound();
  return <><AdminPageHeader eyebrow="Blog" title={post.title} description="Edit the story, preview its public URL, and control draft or published status." /><BlogPostForm post={post} categories={categories} action={updateBlogPost} /><section className="mt-8 rounded-lg border border-red-200 bg-white p-6"><h2 className="font-display text-2xl font-bold text-[#111111]">Danger zone</h2><p className="mt-2 text-sm text-[#6B7280]">Archive articles whenever possible. Permanent deletion is restricted to administrators.</p><AdminForm action={deleteBlogPost} destructive submitLabel="Delete permanently" pendingLabel="Deleting…" confirmMessage="Permanently delete this article? This cannot be undone." className="mt-5"><input type="hidden" name="id" value={post.id} /></AdminForm></section></>;
}

