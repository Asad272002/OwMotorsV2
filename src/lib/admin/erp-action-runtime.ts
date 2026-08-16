import "server-only";

import { revalidatePath } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const ACTIVITY_ACTION_VALUES: readonly string[] = [
  "login_success",
  "login_failure",
  "user_created",
  "user_updated",
  "user_revoked",
  "part_created",
  "part_updated",
  "part_sale_created",
  "part_receipt_generated",
  "part_sale_rejected",
  "part_sale_approved",
  "stock_requested",
  "stock_approved",
  "stock_rejected",
  "stock_applied",
  "sale_requested",
  "sale_approved",
  "sale_rejected",
  "sale_completed",
  "sale_cancelled",
  "payment_recorded",
  "receipt_generated",
  "receipt_printed",
  "inventory_adjusted",
];

type PostgrestErrorLike = { message: string; details: string; code?: string };
export type ServiceRoleClient = SupabaseClient<Database>;

let actionEnumEnsured = false;

export function serviceRoleClient(): ServiceRoleClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) throw new Error("ERP server error: service role unavailable");
  const { url } = getSupabaseConfig();

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  }) as ServiceRoleClient;
}

export function revalidateERP(): void {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/sales/new");
  revalidatePath("/admin/sales/list");
  revalidatePath("/admin/sales/approvals");
  revalidatePath("/admin/stock/availability");
  revalidatePath("/admin/stock/parts");
  revalidatePath("/admin/stock/part-sales");
  revalidatePath("/admin/stock/movements");
  revalidatePath("/admin/receipts");
  revalidatePath("/admin/activity");
}

async function ensureActivityActionsEnum(sb: SupabaseClient<Database>): Promise<void> {
  if (actionEnumEnsured) return;
  actionEnumEnsured = true;

  try {
    for (const value of ACTIVITY_ACTION_VALUES) {
      try {
        await (sb as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> }).rpc("alter_type_add_value_if_not_exists", {
          type_name: "ActivityAction",
          new_value: value,
        });
      } catch {
        // Some environments do not expose this helper RPC. The insert below is still best-effort.
      }
    }
  } catch {
    // Best effort only; activity writes should never block the ERP action itself.
  }
}

export async function writeActivity(params: {
  actorUserId: string;
  actorRole: string;
  action: string;
  summary: string;
  targetTable?: string | null;
  targetId?: string | null;
  metadata?: unknown;
}): Promise<void> {
  try {
    const now = new Date().toISOString();
    const sb = serviceRoleClient();
    await ensureActivityActionsEnum(sb);

    const safeActorId = String(params.actorUserId ?? "").trim() || "00000000-0000-0000-0000-000000000000";
    const safeRole = String(params.actorRole ?? "").trim() || "unknown";
    const safeAction = String(params.action || "unknown");
    const safeSummary = String(params.summary ?? "-") || "-";
    const baseMetadata = params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata)
      ? params.metadata as Record<string, unknown>
      : { value: params.metadata ?? null };

    const row: Record<string, unknown> = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined,
      action: safeAction,
      actor_id: safeActorId,
      actor_role_snapshot: safeRole,
      target_table: params.targetTable ?? null,
      target_id: params.targetId ?? null,
      metadata: { ...baseMetadata, summary: safeSummary },
      created_at: now,
    };

    type AnyInsert = { insert: (r: Record<string, unknown>) => Promise<{ error: PostgrestErrorLike | null }> };
    const result = await (sb.from("activity_logs") as unknown as AnyInsert).insert(row);
    if (result.error) {
      console.warn("[CRITICAL] activity_logs insert failed:", result.error.message, result.error.details, JSON.stringify(row));
    }
  } catch (e) {
    console.warn("activity_logs catch-all:", e instanceof Error ? e.message : String(e));
  }
}
