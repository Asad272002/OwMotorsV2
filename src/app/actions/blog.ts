"use server";

import { headers } from "next/headers";
import { z } from "zod";
import type { SubmissionState } from "@/lib/forms/submission-state";
import { allowSubmission } from "@/lib/security/rate-limit";
import { createSubmissionSupabaseClient } from "@/lib/supabase/submission-client";

const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function subscribeToNewsletter(_previous: SubmissionState, formData: FormData): Promise<SubmissionState> {
  const parsed = newsletterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter a valid email address.", errors: parsed.error.flatten().fieldErrors };
  if (parsed.data.website) return { status: "success", message: "You are subscribed." };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip") ?? "unknown";
  if (!allowSubmission(`newsletter:${ip}`, 4, 15 * 60 * 1000)) return { status: "error", message: "Please wait a few minutes before trying again." };
  try {
    const supabase = createSubmissionSupabaseClient();
    const { error } = await supabase.from("newsletter_subscriptions").insert({ email: parsed.data.email, source: "blog" });
    if (error && error.code !== "23505") {
      console.error("[OW Motors newsletter subscription failed]", { code: error.code });
      return { status: "error", message: "We could not subscribe you right now. Please try again shortly." };
    }
    return { status: "success", message: "You are subscribed to OW Motors updates." };
  } catch {
    return { status: "error", message: "Newsletter signup is not configured yet. Please try again later." };
  }
}

