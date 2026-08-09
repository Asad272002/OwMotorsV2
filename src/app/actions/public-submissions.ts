"use server";

import { headers } from "next/headers";
import { contactInquirySchema } from "@/lib/forms/schemas";
import type { SubmissionState } from "@/lib/forms/submission-state";
import { allowSubmission } from "@/lib/security/rate-limit";
import { createSubmissionSupabaseClient } from "@/lib/supabase/submission-client";

async function requestKey() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `contact:${forwarded ?? requestHeaders.get("x-real-ip") ?? "unknown"}`;
}

function invalidResult(error: { flatten: () => { fieldErrors: Record<string, string[]> } }): SubmissionState {
  return { status: "error", message: "Please correct the highlighted fields.", errors: error.flatten().fieldErrors };
}

function getSubmissionClient() {
  try {
    return createSubmissionSupabaseClient();
  } catch {
    console.error("[OW Motors submission client unavailable]", { operation: "contact" });
    return null;
  }
}

export async function submitContactInquiry(_previous: SubmissionState, formData: FormData): Promise<SubmissionState> {
  const parsed = contactInquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidResult(parsed.error);
  if (parsed.data.website) return { status: "success", message: "Thank you. Your inquiry has been received." };
  if (!allowSubmission(await requestKey())) return { status: "error", message: "Too many requests. Please wait a few minutes and try again." };

  const supabase = getSubmissionClient();
  if (!supabase) return { status: "error", message: "We could not submit your inquiry right now. Please try again shortly." };
  const { error } = await supabase.from("contact_inquiries").insert({
    full_name: parsed.data.fullName,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });
  if (error) {
    console.error("[OW Motors contact submission failed]", { code: error.code });
    return { status: "error", message: "We could not submit your inquiry right now. Please try again shortly." };
  }
  return { status: "success", message: "Thank you. Your inquiry has been received." };
}
