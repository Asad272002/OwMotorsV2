import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogAuthorLine, BlogCard, BlogCategoryBadge } from "@/components/blog/blog-card";
import { ArticleStructuredData } from "@/components/blog/article-structured-data";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { Container } from "@/components/ui/container";
import { getPublishedBlogPost, getRelatedBlogPosts } from "@/lib/blog/queries";
import { SITE_NAME, SITE_URL } from "@/lib/constants/site";

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return { title: "Article Not Found", robots: { index: false, follow: false } };
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  const path = `/blog/${post.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", siteName: SITE_NAME, title, description, url: path, images: [{ url: post.heroImage, alt: post.heroImageAlt }], publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: [post.authorName], section: post.category.name, tags: [...post.tags] },
    twitter: { card: "summary_large_image", title, description, images: [post.heroImage] },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();
  const related = await getRelatedBlogPosts(post);
  const path = `/blog/${post.slug}`;
  const articleUrl = `${SITE_URL}${path}`;
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.category.name, href: `/blog?category=${post.category.slug}` }, { label: post.title }];

  return <>
    <ArticleStructuredData post={post} />
    <BreadcrumbStructuredData items={breadcrumbs} currentPath={path} />
    <article>
      <header className="relative min-h-[360px] overflow-hidden bg-near-black text-white sm:min-h-[430px]">
        <Image src={post.heroImage} alt={post.heroImageAlt} fill sizes="100vw" priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
        <Container className="relative flex min-h-[360px] max-w-7xl items-end pb-12 pt-20 sm:min-h-[430px] sm:pb-16">
          <div className="max-w-3xl"><BlogCategoryBadge post={post} /><h1 className="mt-5 font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.02em] sm:text-[4.25rem]">{post.title}</h1><div className="mt-6"><BlogAuthorLine post={post} onDark /></div></div>
        </Container>
      </header>

      <div className="border-b border-border bg-soft-gray">
        <Container className="max-w-3xl py-4"><nav aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-2 text-[11px] text-cool-gray">{breadcrumbs.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index ? <span aria-hidden="true">›</span> : null}{item.href ? <Link href={item.href} className="transition-colors hover:!text-brand">{item.label}</Link> : <span aria-current="page" className="font-semibold text-near-black">{item.label}</span>}</li>)}</ol></nav></Container>
      </div>

      <Container className="max-w-3xl py-12 sm:py-16">
        <p className="border-l-2 border-brand pl-5 text-base leading-7 text-cool-gray sm:text-lg sm:leading-8">{post.lead}</p>
        <div className="mt-10 space-y-10">{post.sections.map((section) => <section key={section.heading}><h2 className="font-display text-2xl font-bold leading-tight text-near-black sm:text-[1.75rem]">{section.heading}</h2><p className="mt-3 text-sm leading-7 text-cool-gray sm:text-[15px]">{section.body}</p></section>)}</div>

        <div className="mt-12 border-y border-border py-5"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cool-gray">Tags:</span>{post.tags.map((tag) => <Link key={tag} href={`/blog?q=${encodeURIComponent(tag)}`} className="inline-flex min-h-8 items-center rounded-full border border-border px-3 text-[10px] text-cool-gray transition-colors hover:border-brand hover:!text-brand">{tag}</Link>)}</div></div>

        <div className="flex items-center gap-3 border-b border-border py-5"><span className="mr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cool-gray">Share:</span><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xs text-cool-gray transition-colors hover:border-brand hover:!text-brand">f</a><a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noreferrer" aria-label="Share on X" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xs text-cool-gray transition-colors hover:border-brand hover:!text-brand">𝕏</a><a href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(articleUrl)}`} aria-label="Share by email" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xs text-cool-gray transition-colors hover:border-brand hover:!text-brand">@</a></div>

        <aside className="mt-8 flex items-start gap-4 rounded-lg bg-soft-gray p-6"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{post.authorInitials}</span><div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-brand">Written by</p><h2 className="mt-1 text-sm font-bold text-near-black">{post.authorName}</h2><p className="mt-2 text-xs leading-5 text-cool-gray">{post.authorBio}</p></div></aside>
      </Container>
    </article>

    {related.length ? <section className="border-y border-border bg-soft-gray py-12 sm:py-16"><Container className="max-w-5xl"><div className="flex items-center justify-between"><h2 className="font-display text-3xl font-bold">Related Articles</h2><Link href="/blog" className="inline-flex min-h-11 items-center text-xs font-bold !text-brand hover:underline">All Articles →</Link></div><div className="mt-6 grid gap-5 md:grid-cols-2">{related.map((item) => <BlogCard key={item.id} post={item} />)}</div></Container></section> : null}

    <div className="bg-near-black py-8"><Container className="max-w-5xl"><Link href="/blog" className="inline-flex min-h-11 items-center rounded border border-white/15 px-4 text-xs font-semibold text-white/75 transition-colors hover:border-brand hover:text-white">← Back to Blog</Link></Container></div>
  </>;
}
