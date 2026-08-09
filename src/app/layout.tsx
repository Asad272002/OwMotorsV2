import type { Metadata, Viewport } from "next";
import { inter, rajdhani } from "@/app/fonts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Every real page defines its own title. This fallback is reserved for
    // unmatched routes, whose root not-found UI inherits root metadata.
    default: `Page Not Found | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  ...(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"
    ? { robots: { index: false, follow: false, nocache: true } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${rajdhani.variable}`}>
      <body>{children}</body>
    </html>
  );
}
