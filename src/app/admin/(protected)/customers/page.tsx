import { redirect } from "next/navigation";
import CustomersPageClient from "./client";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { createSubmissionSupabaseClient } from "@/lib/supabase/submission-client";
export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const actor = await getAuthenticatedProfile();
  if (!actor || !actor.profile.is_active) redirect("/admin/login");
  const role = actor.profile.role ?? "apprentice";
  const canEdit = role === "developer" || role === "admin" || role === "manager";
  const supabase = createSubmissionSupabaseClient();
  const { data } = await supabase
    .from("customers")
    .select(`
      *,
      sales:sales(*,
        payments:sale_payments(*),
        requestor:profiles!sales_requested_by_fkey(full_name)
      ),
      part_sales:part_sales(*, items:part_sale_items(*))
    `)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const normalized = rows.map(c => {
    const partPurchases = (Array.isArray((c as { part_sales?: unknown }).part_sales) ? (c as { part_sales: unknown[] }).part_sales : []) as unknown[];
    const purchases = (Array.isArray((c as { sales?: unknown }).sales)
      ? (c as { sales: unknown[] }).sales
      : Array.isArray((c as { purchases?: unknown }).purchases)
        ? (c as { purchases: unknown[] }).purchases
        : []) as unknown[];
    return { ...(c as object), purchases, partPurchases } as unknown;
  });
  return <CustomersPageClient customers={JSON.parse(JSON.stringify(normalized))} canEdit={canEdit} />;
}
