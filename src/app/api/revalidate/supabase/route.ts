import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

const webhookSchema = z.object({
  table: z.enum([
    "brands",
    "brand_campaign_images",
    "categories",
    "motorcycles",
    "motorcycle_categories",
    "motorcycle_variants",
    "motorcycle_images",
    "motorcycle_specifications",
    "motorcycle_features",
  ]),
  type: z.string().optional(),
  record: z.record(z.string(), z.unknown()).nullable().optional(),
  old_record: z.record(z.string(), z.unknown()).nullable().optional(),
}).passthrough();

function validSecret(provided: string | null) {
  const expected = process.env.SUPABASE_REVALIDATION_SECRET;
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get("x-ow-revalidation-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = webhookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });

  // Content records affect cross-linked homepage, brand, catalog, product, and
  // sitemap output. Revalidating the public route group prevents stale links.
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ revalidated: true, table: parsed.data.table });
}
