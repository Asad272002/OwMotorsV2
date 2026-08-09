import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";
import { SITE_URL } from "@/lib/constants/site";

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function BreadcrumbStructuredData({
  items,
  currentPath,
}: Readonly<{ items: readonly BreadcrumbItem[]; currentPath: string }>) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href ?? currentPath),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", "\\u003c") }}
    />
  );
}
