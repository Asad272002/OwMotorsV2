import CustomersPageClient from "./client";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const actor = await getAuthenticatedProfile();
  const role = actor?.profile.role ?? "apprentice";
  const canEdit = role === "developer" || role === "admin" || role === "manager";
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("customers")
    .select(`
      *,
      sales:sales(*,
        payments:sale_payments(*),
        requestor:profiles!sales_requested_by_fkey(full_name)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const normalized = rows.map(c => {
    const purchases = (Array.isArray((c as { sales?: unknown }).sales)
      ? (c as { sales: unknown[] }).sales
      : Array.isArray((c as { purchases?: unknown }).purchases)
        ? (c as { purchases: unknown[] }).purchases
        : []) as unknown[];
    return { ...(c as object), purchases } as unknown;
  });
  return <CustomersPageClient customers={JSON.parse(JSON.stringify(normalized))} canEdit={canEdit} />;
}
