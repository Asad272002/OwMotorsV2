import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/data/blog";

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat("en-PK", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function BlogAuthorLine({ post, compact = false, onDark = false }: Readonly<{ post: BlogPost; compact?: boolean; onDark?: boolean }>) {
  return <div className="flex min-w-0 items-center gap-2.5">
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white ${compact ? "h-6 w-6 text-[8px]" : "h-8 w-8 text-[10px]"}`}>{post.authorInitials}</span>
    <div className="min-w-0"><p className={`${compact ? "text-[10px]" : "text-xs"} truncate font-semibold ${onDark ? "text-white" : "text-near-black"}`}>{post.authorName}</p><p className={`${compact ? "text-[9px]" : "text-[10px]"} mt-0.5 ${onDark ? "text-white/55" : "text-cool-gray"}`}>{formatBlogDate(post.publishedAt)} <span aria-hidden="true">·</span> {post.readingTimeMinutes} min read</p></div>
  </div>;
}

export function BlogCategoryBadge({ post }: Readonly<{ post: BlogPost }>) {
  return <span className="inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ backgroundColor: `${post.category.accentColor}14`, color: post.category.accentColor }}>{post.category.name}</span>;
}

export function BlogCard({ post }: Readonly<{ post: BlogPost }>) {
  return <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_16px_35px_rgb(17_17_17/10%)] motion-reduce:transform-none">
    <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/8.5] overflow-hidden bg-soft-gray" aria-label={`Read ${post.title}`}>
      <Image src={post.heroImage} alt={post.heroImageAlt} fill sizes="(max-width: 48rem) 100vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transform-none" />
    </Link>
    <div className="flex flex-1 flex-col p-5">
      <div className="flex flex-wrap items-center gap-2"><BlogCategoryBadge post={post} />{post.brandLabel ? <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-cool-gray">{post.brandLabel}</span> : null}</div>
      <h2 className="mt-3 font-display text-xl font-bold leading-[1.15] text-near-black"><Link href={`/blog/${post.slug}`} className="transition-colors hover:!text-brand">{post.title}</Link></h2>
      <p className="mt-3 line-clamp-3 text-xs leading-5 text-cool-gray">{post.excerpt}</p>
      <div className="mt-auto border-t border-border pt-4"><BlogAuthorLine post={post} compact /></div>
    </div>
  </article>;
}

