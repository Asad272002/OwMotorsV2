import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants/site";

type PageMetadataOptions = Readonly<{
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
  image?: Readonly<{ src: string; alt: string }>;
}>;

export function createPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  noIndex = false,
  image,
}: PageMetadataOptions): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      ...(image ? { images: [{ url: image.src, alt: image.alt }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image.src] } : {}),
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: true,
            googleBot: { index: false, follow: true },
          },
        }
      : {}),
  };
}

export function createNotFoundMetadata(): Metadata {
  return {
    title: { absolute: `Page Not Found | ${SITE_NAME}` },
    description: "The requested OW Motors page could not be found.",
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}

export function catalogMetadataPolicy(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
  basePath: string,
) {
  const populated = Object.entries(searchParams).filter(([, value]) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined,
  );

  if (!populated.length) return { canonicalPath: basePath, noIndex: false } as const;

  if (populated.length === 1 && populated[0][0] === "page") {
    const value = populated[0][1];
    if (typeof value === "string" && /^\d+$/.test(value)) {
      const page = Number.parseInt(value, 10);
      if (page === 1) return { canonicalPath: basePath, noIndex: false } as const;
      if (page > 1) return { canonicalPath: `${basePath}?page=${page}`, noIndex: false } as const;
    }
  }

  return { canonicalPath: basePath, noIndex: true } as const;
}

export function hasAnySearchParameters(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
) {
  return Object.values(searchParams).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined,
  );
}
