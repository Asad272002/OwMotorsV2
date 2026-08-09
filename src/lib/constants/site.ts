export const SITE_NAME = "OW Motors";
export const SITE_DESCRIPTION =
  "Explore motorcycles from Taro, Lifan, Hi-Speed, and Super Star at OW Motors.";

function resolveSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  let url: URL;

  try {
    url = new URL(configured);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute http(s) URL.");
  }

  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }

  if (process.env.VERCEL_ENV === "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use the public production domain on Vercel production.");
  }

  return url.origin;
}

export const SITE_URL = resolveSiteUrl();
