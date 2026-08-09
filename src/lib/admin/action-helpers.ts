import "server-only";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";
import type { AdminActionState } from "@/lib/admin/action-state";

export const unauthorizedAction: AdminActionState = { status: "error", message: "You are not authorized to perform this action." };

export function validationAction(error: ZodError): AdminActionState {
  return { status: "error", message: "Please correct the highlighted fields.", errors: error.flatten().fieldErrors };
}

type DbErrorLike = { code?: string | number | null; message?: string | null; details?: string | null; table?: string | null; constraint?: string | null };
export function databaseAction(operation: string, error: PostgrestError | DbErrorLike | null | undefined): AdminActionState {
  const code = String(error?.code ?? "");
  const msg = String(error?.message ?? "");
  const details = String((error as DbErrorLike)?.details ?? "");
  const constraint = (error as DbErrorLike)?.constraint ? String((error as DbErrorLike).constraint) : "";
  console.error("[OW Motors admin action failed]", { operation, code, msg, details, constraint });

  if (code === "23505") {
    // Unique violation. Diagnose by constraint name / details content for user-friendly message.
    const combined = (msg + " " + details + " " + constraint).toLowerCase();
    if (combined.includes("customers_cnic") || combined.includes("cnic"))
      return { status: "error", message: "A customer with this CNIC already exists. Use the 'Existing customer' search in Step 1 instead to select them, or enter a different CNIC." };
    if (combined.includes("sales_receipt_number") || combined.includes("receipt_number"))
      return { status: "error", message: "This sale reference number collided with an existing one. Press Submit again — a new reference will be generated automatically." };
    if (combined.includes("banks_name") || combined.includes("banks_pkey"))
      return { status: "error", message: "That bank name or code is already registered." };
    if (combined.includes("parts_sku") || combined.includes("parts_pkey"))
      return { status: "error", message: "A spare part with this part code (SKU) already exists." };
    if (combined.includes("slug") || combined.includes("variant") || combined.includes("motorcycles"))
      return { status: "error", message: "That slug or variant combination is already in use." };
    return { status: "error", message: "This record conflicts with an existing entry. Please change the value and try again." };
  }
  if (code === "23503") return { status: "error", message: "This record is still used by related content and cannot be removed." };
  if (code === "42501" || code === "PGRST301") return { status: "error", message: "You do not have permission for this operation." };
  if (msg) return { status: "error", message: "Database error: " + msg };
  return { status: "error", message: "The change could not be saved. Please try again." };
}

export function revalidateAdminContent() {
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/brands");
  revalidatePath("/contact");
  revalidatePath("/motorcycles", "layout");
  revalidatePath("/sitemap.xml");
}
