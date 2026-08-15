import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSubmissionSupabaseClient } from "@/lib/supabase/submission-client";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import type { Database } from "@/lib/supabase/database.types";
import type {
  StaffProfile, Part, StockMovementWithDetails,
  Customer, Bank, Sale, SalePayment, SaleWithPayments, Receipt,
  ActivityLog, CustomerPurchaseHistory, ReceiptPrintPayload, PartSale,
} from "@/lib/erp/types";
import type { StaffRole } from "@/lib/erp/types";

// ==============================================
// PRIVILEGED CLIENT - used for admin-only ops
// (createSubmissionSupabaseClient uses service-role)
// ==============================================

type PrivClient = SupabaseClient<Database> | null;

function privileged(): PrivClient {
  try { return createSubmissionSupabaseClient() as unknown as PrivClient; } catch { return null; }
}

// ==============================================
// USER MANAGEMENT QUERIES (Admin+ only)
// ==============================================

export async function listStaffProfiles(): Promise<readonly StaffProfile[]> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role) || !actor.profile.is_active) {
    return [];
  }

  const sb = privileged();
  if (!sb) return [];
  const { data } = await sb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as StaffProfile[]) ?? [];
}

export async function getStaffProfile(id: string): Promise<StaffProfile | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as StaffProfile | null;
}

// ==============================================
// BANKS
// ==============================================

export const listBanks = cache(async (): Promise<readonly Bank[]> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("banks")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data as Bank[]) ?? [];
});


export const listStockBrands = cache(async (): Promise<readonly { id: string; name: string; slug: string; is_active: boolean }[]> => {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["developer", "admin", "manager"].includes(actor.profile.role) || !actor.profile.is_active) return [];
  const sb = privileged();
  if (!sb) return [];
  const { data } = await sb
    .from("brands")
    .select("id, name, slug, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data as { id: string; name: string; slug: string; is_active: boolean }[]) ?? [];
});

// ==============================================
// PARTS INVENTORY
// ==============================================

export const listParts = cache(async (): Promise<readonly Part[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("parts")
    .select("*, compatible_brand:brands(id, name, slug), compatible_motorcycle:motorcycles(id, name, slug, brand:brands(id, name, slug))")
    .order("name", { ascending: true });
  if (error) {
    const fallback = await supabase
      .from("parts")
      .select("*")
      .order("name", { ascending: true });
    return (fallback.data as Part[]) ?? [];
  }
  return (data as Part[]) ?? [];
});

export const listPartsForApprentice = cache(async (): Promise<readonly (Omit<Part, "current_stock" | "reorder_level" | "unit_cost"> & { in_stock: boolean })[]> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("parts")
    .select("id, sku, name, description, category, unit, location, is_active, current_stock")
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id, sku: p.sku, name: p.name, description: p.description,
    category: p.category, unit: p.unit, location: p.location, is_active: p.is_active,
    in_stock: Number(p.current_stock ?? 0) > 0
  }));
});


export const listPendingPartSales = cache(async (): Promise<readonly PartSale[]> => {
  const all = await listPartSales();
  return all.filter((sale) => (sale.sale_status ?? "pending_approval") === "pending_approval");
});

export async function getPartSale(id: string): Promise<PartSale | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("part_sales")
    .select(`
      *,
      seller:profiles!part_sales_sold_by_fkey(full_name, role),
      customer:customers(*),
      items:part_sale_items(*, part:parts(id, sku, name, current_stock, unit_cost))
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return (data as unknown as PartSale) ?? null;
}
export async function getPart(id: string): Promise<Part | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("parts").select("*").eq("id", id).maybeSingle();
  return data as Part | null;
}

// ==============================================
// STOCK MOVEMENTS
// ==============================================

export const listStockMovements = cache(async (): Promise<readonly StockMovementWithDetails[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select(`
      *,
      variant:motorcycle_variants(
        id, cc, color_name, quantity, stock_status,
        motorcycle:motorcycles(name, brand:brands(id, name, slug))
      ),
      part:parts(id, name, sku, current_stock, unit_cost, compatible_brand_id, compatible_motorcycle_id, compatible_brand:brands(id, name, slug), compatible_motorcycle:motorcycles(id, name, slug, brand:brands(id, name, slug))),
      requestor:profiles!stock_movements_requested_by_fkey(full_name, role),
      approver:profiles!stock_movements_approved_by_fkey(full_name, role)
    `)
    .order("created_at", { ascending: false });
  if (error) {
    const fallback = await supabase
      .from("stock_movements")
      .select(`
        *,
        variant:motorcycle_variants(
          id, cc, color_name, quantity, stock_status,
          motorcycle:motorcycles(name, brand:brands(id, name, slug))
        ),
        part:parts(id, name, sku, current_stock, unit_cost),
        requestor:profiles!stock_movements_requested_by_fkey(full_name, role),
        approver:profiles!stock_movements_approved_by_fkey(full_name, role)
      `)
      .order("created_at", { ascending: false });
    return (fallback.data as unknown as StockMovementWithDetails[]) ?? [];
  }
  return (data as unknown as StockMovementWithDetails[]) ?? [];
});

export const listPartSales = cache(async (): Promise<readonly PartSale[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("part_sales")
    .select(`
      *,
      seller:profiles!part_sales_sold_by_fkey(full_name, role),
      customer:customers(*),
      items:part_sale_items(*, part:parts(id, sku, name, current_stock, unit_cost))
    `)
    .order("sold_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return (data as unknown as PartSale[]) ?? [];
});

export const listPendingStockMovements = cache(async (): Promise<readonly StockMovementWithDetails[]> => {
  const all = await listStockMovements();
  return all.filter(m => m.approval_status === "pending_approval");
});

export async function getStockMovement(id: string): Promise<StockMovementWithDetails | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("stock_movements")
    .select(`
      *,
      variant:motorcycle_variants(id, cc, color_name, quantity, stock_status, motorcycle:motorcycles(name, brand:brands(id, name, slug))),
      part:parts(id, name, sku, current_stock, unit_cost, compatible_brand_id, compatible_motorcycle_id, compatible_brand:brands(id, name, slug), compatible_motorcycle:motorcycles(id, name, slug, brand:brands(id, name, slug))),
      requestor:profiles!stock_movements_requested_by_fkey(full_name, role),
      approver:profiles!stock_movements_approved_by_fkey(full_name, role)
    `)
    .eq("id", id)
    .maybeSingle();
  return data as unknown as StockMovementWithDetails | null;
}

// ==============================================
// CUSTOMERS
// ==============================================

export async function searchCustomers(query: string, by: "cnic" | "chasis" | "name"): Promise<readonly CustomerPurchaseHistory[]> {
  const supabase = await createServerSupabaseClient();
  let q = supabase.from("customers").select(`
    *,
    sales:sales(*, payments:sale_payments(*), requestor:profiles!sales_requested_by_fkey(full_name))
  `);
  if (by === "cnic") q = q.ilike("cnic", `%${query.replace(/\D/g, "")}%`);
  else if (by === "chasis") q = q.contains("chasis_numbers", [query]);
  else q = q.ilike("full_name", `%${query}%`);
  const { data } = await q.limit(50);
  return (data as unknown as CustomerPurchaseHistory[]) ?? [];
}

export const listCustomers = cache(async (): Promise<readonly Customer[]> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("customers")
    .select(`
      *,
      sales:sales(*, payments:sale_payments(*), requestor:profiles!sales_requested_by_fkey(full_name))
    `)
    .order("created_at", { ascending: false })
    .limit(500);
  type Row = Customer & { sales?: unknown[]; purchases?: unknown[] };
  const rows = (data as Row[]) ?? [];
  return rows.map((r) => {
    const purchases = Array.isArray((r as { sales?: unknown[] }).sales)
      ? (r as { sales: unknown[] }).sales
      : Array.isArray((r as { purchases?: unknown[] }).purchases)
        ? (r as { purchases: unknown[] }).purchases
        : [];
    const approvedPurchases = (purchases as unknown as { sale_status?: string; chasis_number?: string }[])
      .filter(p => p.sale_status === "approved" || p.sale_status === "completed");
    const chasisFromApproved = approvedPurchases.map(p => (p.chasis_number ?? "").toUpperCase()).filter(Boolean);
    const existingChasis = Array.isArray(r.chasis_numbers) ? r.chasis_numbers.map(x => String(x).toUpperCase()) : [];
    const mergedChasis = Array.from(new Set<string>([...existingChasis, ...chasisFromApproved]));
    return { ...r, chasis_numbers: mergedChasis, sales: purchases as Customer["sales"], purchases: purchases as Customer["purchases"] } as Customer;
  });
});

export async function getCustomer(id: string): Promise<CustomerPurchaseHistory | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("customers")
    .select(`
      *,
      sales:sales(*, payments:sale_payments(*), requestor:profiles!sales_requested_by_fkey(full_name))
    `)
    .eq("id", id)
    .maybeSingle();
  return data as unknown as CustomerPurchaseHistory | null;
}

// ==============================================
// MOTORCYCLE VARIANTS FOR SALE (with stock numbers)
// ==============================================

export const listMotorcycleVariantsForSale = cache(async (): Promise<readonly {
  id: string; motorcycle_id: string; cc: number; color_name: string; color_hex: string;
  price: number; quantity: number; stock_status: string;
  motorcycle: { id: string; name: string; slug: string; brand: { id: string; name: string; slug: string } };
}[]> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("motorcycle_variants")
    .select(`
      id, motorcycle_id, cc, color_name, color_hex, price, quantity, stock_status, is_active,
      motorcycle:motorcycles(id, name, slug, publication_status, brand:brands(id, name, slug))
    `)
    .eq("is_active", true)
    .eq("motorcycle.publication_status", "published")
    .eq("motorcycle.brand.is_active", true)
    .order("cc", { ascending: true });
  type Row = Record<string, unknown>;
  return (data ?? []).filter((r: Row) => !!r.motorcycle);
});

export const listMotorcycleVariantsForStock = cache(async (): Promise<readonly {
  id: string; motorcycle_id: string; cc: number; color_name: string; color_hex: string;
  price: number; quantity: number; stock_status: string;
  motorcycle: { id: string; name: string; slug: string; publication_status?: string; brand: { id: string; name: string; slug: string } };
}[]> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("motorcycle_variants")
    .select(`
      id, motorcycle_id, cc, color_name, color_hex, price, quantity, stock_status, is_active,
      motorcycle:motorcycles(id, name, slug, publication_status, brand:brands(id, name, slug, is_active))
    `)
    .eq("is_active", true)
    .order("cc", { ascending: true });
  type Row = {
    motorcycle?: { brand?: { is_active?: boolean | null } | null } | null;
  };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => !!r.motorcycle && r.motorcycle.brand?.is_active !== false) as unknown as {
      id: string; motorcycle_id: string; cc: number; color_name: string; color_hex: string;
      price: number; quantity: number; stock_status: string;
      motorcycle: { id: string; name: string; slug: string; publication_status?: string; brand: { id: string; name: string; slug: string } };
    }[];
});

export async function getMotorcycleVariantForApprentice(): Promise<readonly {
  id: string; cc: number; color_name: string; color_hex: string;
  in_stock: boolean;
  motorcycle: { name: string; brand: { name: string } };
}[]> {
  const all = await listMotorcycleVariantsForSale();
  return all.map(v => ({
    id: v.id, cc: v.cc, color_name: v.color_name, color_hex: v.color_hex,
    in_stock: (v.quantity ?? 0) > 0 && v.stock_status === "in_stock",
    motorcycle: v.motorcycle
  }));
}

// ==============================================
// SALES
// ==============================================

export const listSales = cache(async (): Promise<readonly SaleWithPayments[]> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("sales")
    .select(`
      *,
      payments:sale_payments(*),
      customer:customers(*),
      requestor:profiles!sales_requested_by_fkey(full_name),
      approver:profiles!sales_approved_by_fkey(full_name)
    `)
    .order("requested_at", { ascending: false });
  return (data as unknown as SaleWithPayments[]) ?? [];
});

export const listPendingSales = cache(async (): Promise<readonly SaleWithPayments[]> => {
  const all = await listSales();
  return all.filter(s => s.sale_status === "pending_approval");
});

export async function getSale(id: string): Promise<SaleWithPayments | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("sales")
    .select(`
      *,
      payments:sale_payments(*),
      customer:customers(*),
      requestor:profiles!sales_requested_by_fkey(full_name),
      approver:profiles!sales_approved_by_fkey(full_name)
    `)
    .eq("id", id)
    .maybeSingle();
  return data as unknown as SaleWithPayments | null;
}

export async function getSalePayments(saleId: string): Promise<readonly SalePayment[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("sale_payments").select("*").eq("sale_id", saleId).order("payment_date");
  return (data as SalePayment[]) ?? [];
}

// ==============================================
// RECEIPTS
// ==============================================

export const listReceipts = cache(async (): Promise<readonly (Receipt & { sale: SaleWithPayments | null })[]> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("receipts")
    .select(`
      *,
      sale:sales(*,
        payments:sale_payments(*),
        customer:customers(*),
        requestor:profiles!sales_requested_by_fkey(full_name),
        approver:profiles!sales_approved_by_fkey(full_name)
      )
    `)
    .order("generated_at", { ascending: false });
  return (data as unknown as (Receipt & { sale: SaleWithPayments | null })[]) ?? [];
});

export async function getReceipt(id: string): Promise<ReceiptPrintPayload | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("receipts")
    .select(`
      *,
      sale:sales(*, customer:customers(*), payments:sale_payments(*)),
      generatedBy:profiles!receipts_generated_by_fkey(full_name, role)
    `)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  type RowShape = {
    id: string;
    receipt_number: string;
    sale?: {
      id: string; receipt_number: string; total_amount?: number; requested_at: string; sale_status: string;
      brand_name_snapshot: string; motorcycle_name_snapshot: string; cc_snapshot: number;
      color_name_snapshot?: string; chasis_number: string;
      approved_at?: string | null; completed_at?: string | null;
      stock_deducted?: boolean; receipt_generated?: boolean;
      customer?: {
        id: string; full_name: string; cnic: string; phone_primary?: string | null;
        phone_secondary?: string | null; address?: string | null; city?: string | null;
      } | null;
      payments?: Array<{
        id: string; amount: number; payment_method: string; bank_id?: string | null;
        instrument_number?: string | null; transaction_ref?: string | null;
      }> | null;
    } | null;
    generatedBy?: { full_name: string; role: string } | null;
  };
  const r = data as unknown as RowShape;
  const sale = r.sale;
  if (!sale) return null;
  return {
    receipt: { ...r, sale: undefined, generated_by: "", sale_id: "", generated_at: "", format_version: "", printed_count: 0, last_printed_at: null, pdf_storage_path: null, qr_code_payload: "", created_at: "", updated_at: "" } as unknown as Receipt,
    sale: sale as unknown as Sale,
    customer: (sale.customer ?? { id: "", full_name: "", cnic: "", phone_primary: "", phone_secondary: null, email: null, address: null, city: null, chasis_numbers: [], notes: null, created_at: "", updated_at: "", created_by: null }) as Customer,
    payments: (sale.payments ?? []) as unknown as SalePayment[],
    generatedBy: r.generatedBy ?? { full_name: "", role: "" },
    approvedBy: null,
  } as ReceiptPrintPayload;
}

// ==============================================
// ACTIVITY LOGS (Admin+ view)
// ==============================================

export type ActivityActor = Readonly<{ id: string; full_name: string; role: string }>;

export type ActivityTargetContext = Readonly<{
  title: string;
  subtitle: string;
  reason?: string | null;
  amount?: number | null;
}>;

export type ActivityLogWithContext = ActivityLog & {
  actor_profile?: ActivityActor | null;
  resolved_actor?: ActivityActor | null;
  target_context?: ActivityTargetContext | null;
};

type ActivityLogRow = ActivityLog & {
  actor_role_snapshot?: string | null;
  actor_profile?: ActivityActor | null;
};

type SaleLogTarget = {
  id: string;
  receipt_number: string;
  brand_name_snapshot: string | null;
  motorcycle_name_snapshot: string | null;
  cc_snapshot: number | null;
  color_name_snapshot: string | null;
  chasis_number: string | null;
  total_amount: number | null;
  requested_by: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  customer?: { full_name?: string | null; cnic?: string | null } | null;
};

type ReceiptLogTarget = {
  id: string;
  receipt_number: string;
  sale_id: string | null;
  generated_by: string | null;
  sale?: SaleLogTarget | null;
};

function metadataTargetContext(metadata: unknown): ActivityTargetContext | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const context = (metadata as { target_context?: unknown }).target_context;
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  const row = context as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title : "";
  if (!title) return null;
  return {
    title,
    subtitle: typeof row.subtitle === "string" ? row.subtitle : "",
    reason: typeof row.reason === "string" ? row.reason : null,
    amount: typeof row.amount === "number" ? row.amount : null,
  };
}

function saleLabel(sale: SaleLogTarget | null | undefined): ActivityTargetContext | null {
  if (!sale) return null;
  const bike = [sale.brand_name_snapshot, sale.motorcycle_name_snapshot, sale.cc_snapshot ? `${sale.cc_snapshot}cc` : null]
    .filter(Boolean)
    .join(" ");
  const pieces = [
    bike,
    sale.color_name_snapshot ? `Color: ${sale.color_name_snapshot}` : null,
    sale.chasis_number ? `Chasis: ${sale.chasis_number}` : null,
    sale.customer?.full_name ? `Customer: ${sale.customer.full_name}` : null,
  ].filter(Boolean);
  return {
    title: sale.receipt_number,
    subtitle: pieces.join(" | "),
    reason: sale.rejection_reason,
    amount: sale.total_amount,
  };
}

function receiptLabel(receipt: ReceiptLogTarget | null | undefined): ActivityTargetContext | null {
  if (!receipt) return null;
  const sale = saleLabel(receipt.sale);
  return {
    title: `${receipt.receipt_number}${receipt.sale?.receipt_number ? ` for ${receipt.sale.receipt_number}` : ""}`,
    subtitle: sale?.subtitle ?? "Receipt record",
    amount: sale?.amount ?? null,
  };
}

export const listActivityLogs = cache(async (limit = 200): Promise<readonly ActivityLogWithContext[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select(`
      *,
      actor_profile:profiles(id, full_name, role)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[OW Motors activity logs query failed]", { code: error.code, message: error.message });
    return [];
  }
  const logs = ((data as unknown as ActivityLogRow[]) ?? []);
  const logsWithActor = new Set(
    logs
      .filter((log) => log.actor_id)
      .map((log) => `${log.action}:${log.target_table ?? ""}:${log.target_id ?? ""}`)
  );
  const visibleLogs = logs.filter((log) => {
    const metadata = log.metadata as { outcome?: unknown } | null;
    if (log.action === "sale_requested" && metadata?.outcome === "blocked") return false;
    if (log.actor_id) return true;
    return !logsWithActor.has(`${log.action}:${log.target_table ?? ""}:${log.target_id ?? ""}`);
  });
  const saleIds = visibleLogs
    .filter((log) => log.target_table === "sales" && log.target_id)
    .map((log) => log.target_id)
    .filter((id): id is string => typeof id === "string");
  const receiptIds = visibleLogs
    .filter((log) => log.target_table === "receipts" && log.target_id)
    .map((log) => log.target_id)
    .filter((id): id is string => typeof id === "string");

  const [salesResult, receiptsResult] = await Promise.all([
    saleIds.length
      ? supabase
          .from("sales")
          .select(`
            id, receipt_number, brand_name_snapshot, motorcycle_name_snapshot, cc_snapshot,
            color_name_snapshot, chasis_number, total_amount, requested_by, approved_by,
            rejected_by, rejection_reason,
            customer:customers(full_name, cnic)
          `)
          .in("id", saleIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    receiptIds.length
      ? supabase
          .from("receipts")
          .select(`
            id, receipt_number, sale_id, generated_by,
            sale:sales(
              id, receipt_number, brand_name_snapshot, motorcycle_name_snapshot, cc_snapshot,
              color_name_snapshot, chasis_number, total_amount, requested_by, approved_by,
              rejected_by, rejection_reason,
              customer:customers(full_name, cnic)
            )
          `)
          .in("id", receiptIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  if (salesResult.error) console.error("[OW Motors activity sale targets query failed]", { code: salesResult.error.code, message: salesResult.error.message });
  if (receiptsResult.error) console.error("[OW Motors activity receipt targets query failed]", { code: receiptsResult.error.code, message: receiptsResult.error.message });

  const sales = new Map((salesResult.data as unknown as SaleLogTarget[]).map((sale) => [sale.id, sale]));
  const receipts = new Map((receiptsResult.data as unknown as ReceiptLogTarget[]).map((receipt) => [receipt.id, receipt]));
  const receiptsBySale = new Map<string, ReceiptLogTarget>();
  for (const receipt of receipts.values()) {
    if (receipt.sale_id) receiptsBySale.set(receipt.sale_id, receipt);
  }

  const profileIds = new Set<string>();
  for (const log of visibleLogs) {
    if (log.actor_id) profileIds.add(log.actor_id);
    const sale = log.target_table === "sales" && log.target_id ? sales.get(log.target_id) : null;
    const receipt = log.target_table === "receipts" && log.target_id ? receipts.get(log.target_id) : null;
    for (const id of [sale?.requested_by, sale?.approved_by, sale?.rejected_by, receipt?.generated_by]) {
      if (id) profileIds.add(id);
    }
  }

  const profilesResult = profileIds.size
    ? await supabase.from("profiles").select("id, full_name, role").in("id", Array.from(profileIds))
    : { data: [] as unknown[], error: null };
  if (profilesResult.error) console.error("[OW Motors activity profile lookup failed]", { code: profilesResult.error.code, message: profilesResult.error.message });
  const profiles = new Map((profilesResult.data as unknown as ActivityActor[]).map((profile) => [profile.id, profile]));

  return visibleLogs.map((log) => {
    const sale = log.target_table === "sales" && log.target_id ? sales.get(log.target_id) : null;
    const receipt = log.target_table === "receipts" && log.target_id ? receipts.get(log.target_id) : null;
    const receiptForSale = sale?.id ? receiptsBySale.get(sale.id) : null;
    const metadataTarget = metadataTargetContext(log.metadata);
    const actorId =
      log.actor_id ??
      (log.action === "sale_requested" ? sale?.requested_by : null) ??
      (log.action === "sale_approved" ? sale?.approved_by : null) ??
      (log.action === "sale_rejected" ? sale?.rejected_by : null) ??
      (log.action === "payment_recorded" ? sale?.requested_by : null) ??
      (log.action === "receipt_generated" ? receipt?.generated_by : null) ??
      (log.action === "sale_completed" ? receiptForSale?.generated_by ?? sale?.approved_by : null);

    return {
      ...log,
      resolved_actor: actorId ? profiles.get(actorId) ?? null : log.actor_profile ?? null,
      target_context: (log.target_table === "receipts" ? receiptLabel(receipt) : saleLabel(sale)) ?? metadataTarget,
    };
  });
});

// ==============================================
// HELPER: current actor role
// ==============================================

export async function getMyRole(): Promise<StaffRole | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", userId).maybeSingle();
  return (profile?.role as StaffRole) ?? null;
}


