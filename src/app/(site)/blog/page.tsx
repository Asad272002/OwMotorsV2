import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { BlogAuthorLine, BlogCard, BlogCategoryBadge } from "@/components/blog/blog-card";
import { NewsletterForm } from "@/components/blog/newsletter-form.client";
import { Container } from "@/components/ui/container";
import { createPageMetadata } from "@/lib/seo/metadata";
import { getBlogCategories, getPublishedBlogPosts } from "@/lib/blog/queries";

const BLOG_DESCRIPTION = "Read OW Motors motorcycle reviews, first-ride guides, comparisons, ownership tips, and brand news for riders in Pakistan.";

export const metadata: Metadata = createPageMetadata({ title: "Motorcycle Blog", description: BLOG_DESCRIPTION, path: "/blog" });

type SearchParams = { q?: string | string[]; category?: string | string[] };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function BlogPage({ searchParams }: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const [params, posts, categories] = await Promise.all([searchParams, getPublishedBlogPosts(), getBlogCategories()]);
  const query = first(params.q).trim();
  const category = first(params.category).trim();
  const normalizedQuery = query.toLocaleLowerCase();
  const filtered = posts.filter((post) => (!category || post.category.slug === category) && (!normalizedQuery || `${post.title} ${post.excerpt} ${post.brandLabel ?? ""} ${post.tags.join(" ")}`.toLocaleLowerCase().includes(normalizedQuery)));
  const featured = posts.find((post) => post.isFeatured) ?? posts[0];

  return <>
    <section className="blog-grid-bg relative overflow-hidden bg-[#101010] py-16 text-white sm:py-20 lg:py-24">
      <span aria-hidden="true" className="pointer-events-none absolute -right-4 -top-16 font-display text-[12rem] font-bold leading-none text-white/[0.025] sm:text-[18rem]">BLOG</span>
      <Container className="relative max-w-4xl">
        <p className="text-eyebrow">OW Motors</p>
        <h1 className="mt-4 font-display text-[3.5rem] font-bold leading-[0.95] tracking-[-0.03em] sm:text-[4.75rem]">Rides.<br />Reviews.<br /><span className="text-brand">Real Stories.</span></h1>
        <p className="mt-6 max-w-md text-base leading-7 text-white/55 sm:text-lg sm:leading-8">Expert motorcycle reviews, riding guides, brand news, and practical tips from the OW Motors team.</p>
        <form action="/blog" method="get" role="search" className="relative mt-7 max-w-sm">
          <label htmlFor="article-search" className="sr-only">Search articles</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input id="article-search" name="q" defaultValue={query} placeholder="Search articles..." className="min-h-12 w-full rounded-md border border-white/10 bg-white/[0.07] pl-11 pr-4 text-sm text-white outline-none focus-visible:!outline-none transition-colors placeholder:text-white/35 hover:border-white/20 focus:border-brand" />
        </form>
      </Container>
    </section>

    <Container className="max-w-5xl py-12 sm:py-16">
      {!query && !category && featured ? <article className="grid overflow-hidden rounded-xl border border-border bg-white md:grid-cols-2">
        <Link href={`/blog/${featured.slug}`} className="relative min-h-[270px] overflow-hidden bg-soft-gray md:min-h-[340px]" aria-label={`Read ${featured.title}`}><Image src={featured.heroImage} alt={featured.heroImageAlt} fill sizes="(max-width: 48rem) 100vw, 50vw" priority className="object-cover transition-transform duration-300 hover:scale-[1.025] motion-reduce:transform-none" /></Link>
        <div className="flex flex-col justify-center p-7 sm:p-9">
          <div className="flex items-center gap-2"><BlogCategoryBadge post={featured} /><span className="rounded-full bg-soft-gray px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-cool-gray">Featured</span></div>
          <h2 className="mt-4 font-display text-[2rem] font-bold leading-[1.05] text-near-black sm:text-[2.4rem]"><Link href={`/blog/${featured.slug}`} className="transition-colors hover:!text-brand">{featured.title}</Link></h2>
          <p className="mt-4 text-sm leading-6 text-cool-gray">{featured.excerpt}</p>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><BlogAuthorLine post={featured} /><Link href={`/blog/${featured.slug}`} className="inline-flex min-h-11 items-center text-xs font-bold !text-brand hover:underline">Read Article <span aria-hidden="true" className="ml-1">→</span></Link></div>
        </div>
      </article> : null}

      <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Blog categories" className="ow-horizontal-scroll -mx-1 overflow-x-auto px-1"><ul className="flex min-w-max gap-2">
          <li><Link href="/blog" aria-current={!category ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-xs font-semibold transition-colors ${!category ? "border-brand bg-brand !text-white" : "border-border bg-white text-cool-gray hover:border-brand hover:!text-brand"}`}>All</Link></li>
          {categories.map((item) => <li key={item.id}><Link href={`/blog?category=${item.slug}`} aria-current={category === item.slug ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-xs font-semibold transition-colors ${category === item.slug ? "border-brand bg-brand !text-white" : "border-border bg-white text-cool-gray hover:border-brand hover:!text-brand"}`}>{item.name}</Link></li>)}
        </ul></nav>
        <p className="shrink-0 text-xs text-cool-gray">{filtered.length} article{filtered.length === 1 ? "" : "s"}</p>
      </div>

      {filtered.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((post) => <BlogCard key={post.id} post={post} />)}</div> : <section className="mt-6 rounded-xl border border-dashed border-border px-6 py-16 text-center"><h2 className="font-display text-3xl font-bold">No articles found</h2><p className="mt-2 text-sm text-cool-gray">Try another search or browse all OW Motors articles.</p><Link href="/blog" className="ow-button-primary mt-6">View all articles</Link></section>}

      <section className="relative mt-14 overflow-hidden rounded-xl bg-near-black px-7 py-9 text-white sm:px-10 sm:py-10">
        <span aria-hidden="true" className="absolute right-4 top-0 font-display text-[8rem] font-bold leading-none text-white/[0.025]">OW</span>
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-eyebrow">Stay updated</p><h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Get the Latest Moto News</h2><p className="mt-2 max-w-md text-xs leading-5 text-white/50">New reviews, launch updates, and useful OW Motors guides—straight to your inbox.</p></div><NewsletterForm /></div>
      </section>
    </Container>
  </>;
}

