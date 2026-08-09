import "server-only";

import { getSupabaseConfig } from "@/lib/supabase/config";

export function motorcycleStoragePublicUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/images/")) return path;
  if (path.startsWith("images/")) return `/${path}`;
  const { url } = getSupabaseConfig();
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${url}/storage/v1/object/public/motorcycles/${encoded}`;
}
