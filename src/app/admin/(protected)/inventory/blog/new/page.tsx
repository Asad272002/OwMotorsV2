import { createBlogPost } from "@/app/admin/blog-actions";
import { BlogPostForm } from "@/components/admin/blog-post-form";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getAdminBlogCategories } from "@/lib/blog/queries";

export default async function NewBlogPostPage() {
  const categories = await getAdminBlogCategories();
  return <><AdminPageHeader eyebrow="Blog" title="New article" description="Create a structured draft, add a hero image, review the search preview, and publish when ready." /><BlogPostForm post={null} categories={categories} action={createBlogPost} /></>;
}

