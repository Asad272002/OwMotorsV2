import type { BlogPost } from "@/data/blog";
import { SITE_NAME, SITE_URL } from "@/lib/constants/site";

export function ArticleStructuredData({ post }: Readonly<{ post: BlogPost }>) {
  const graph = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    image: [new URL(post.heroImage, SITE_URL).toString()],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    articleSection: post.category.name,
    keywords: post.tags.join(", "),
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replaceAll("<", "\\u003c") }} />;
}

