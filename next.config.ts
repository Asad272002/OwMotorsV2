import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storagePattern = supabaseUrl ? new URL("/storage/v1/object/public/**", supabaseUrl) : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  // Product metadata is database-backed and otherwise streams into <body> for
  // regular browser user agents. Keep it in the initial <head> so Lighthouse,
  // social preview tools, and HTML-only crawlers receive the same SEO markup.
  htmlLimitedBots: /.*/,
  images: {
    remotePatterns: storagePattern ? [{ protocol: storagePattern.protocol.replace(":", "") as "http" | "https", hostname: storagePattern.hostname, port: storagePattern.port, pathname: storagePattern.pathname }] : [],
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
      ],
    }];
  },
};

export default nextConfig;
