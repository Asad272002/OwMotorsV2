"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAdminClient } from "@/lib/admin/auth";
import { databaseAction, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { inquiryStatusSchema } from "@/lib/admin/schemas";

export async function updateInquiryStatus(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await getAuthorizedAdminClient();
  if (!auth) return unauthorizedAction;
  const parsed = inquiryStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);
  const { error } = await auth.supabase.from("contact_inquiries").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return databaseAction("updateInquiryStatus", error);
  revalidatePath("/admin/inquiries"); revalidatePath("/admin");
  return { status: "success", message: "Inquiry status updated." };
}
