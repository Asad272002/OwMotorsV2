"use server";

import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import { databaseAction, unauthorizedAction, validationAction } from "@/lib/admin/action-helpers";
import type { AdminActionState } from "@/lib/admin/action-state";
import { customerSchema, receiptGenerationSchema, receiptPrintSchema, saleApprovalSchema, saleInitiateSchema, salePaymentSchema } from "@/lib/admin/schemas";
import { revalidateERP, serviceRoleClient, writeActivity } from "@/lib/admin/erp-action-runtime";
import type { PaymentMethod, SaleStatus } from "@/lib/erp/types";
import type { Database, StockStatus } from "@/lib/supabase/database.types";

type SalesActor = {
  userId: string;
  profile: { full_name?: string | null; role: string };
};

function actorName(actor: SalesActor): string {
  return actor.profile.full_name?.trim() || actor.userId.slice(0, 8);
}

function saleBikeLabel(sale: {
  brand_name_snapshot?: string | null;
  motorcycle_name_snapshot?: string | null;
  cc_snapshot?: number | null;
  color_name_snapshot?: string | null;
}): string {
  return [
    sale.brand_name_snapshot,
    sale.motorcycle_name_snapshot,
    sale.cc_snapshot ? `${sale.cc_snapshot}cc` : null,
    sale.color_name_snapshot ? `(${sale.color_name_snapshot})` : null,
  ].filter(Boolean).join(" ");
}

function paymentSummary(payments: readonly { amount?: unknown; paymentMethod?: unknown; payment_method?: unknown }[]): { count: number; total: number; methods: string[] } {
  const methods = new Set<string>();
  let total = 0;
  for (const payment of payments) {
    total += Number(payment.amount) || 0;
    const method = String(payment.paymentMethod ?? payment.payment_method ?? "").trim();
    if (method) methods.add(method);
  }
  return { count: payments.length, total, methods: Array.from(methods) };
}

function salesTargetContext(sale: {
  receipt_number?: string | null;
  brand_name_snapshot?: string | null;
  motorcycle_name_snapshot?: string | null;
  cc_snapshot?: number | null;
  color_name_snapshot?: string | null;
  chasis_number?: string | null;
  total_amount?: number | null;
  customer?: { full_name?: string | null; cnic?: string | null } | null;
  customer_id?: string | null;
}, extra?: Record<string, unknown>): Record<string, unknown> {
  const title = sale.receipt_number ?? "Sale";
  const bike = saleBikeLabel(sale);
  const customer = sale.customer?.full_name ?? sale.customer_id ?? null;
  return {
    title,
    subtitle: [
      bike || null,
      sale.chasis_number ? `Chasis: ${sale.chasis_number}` : null,
      customer ? `Customer: ${customer}` : null,
    ].filter(Boolean).join(" | "),
    amount: Number(sale.total_amount ?? 0) || null,
    receipt_number: sale.receipt_number ?? null,
    chasis_number: sale.chasis_number ?? null,
    customer_name: sale.customer?.full_name ?? null,
    customer_cnic: sale.customer?.cnic ?? null,
    bike,
    ...extra,
  };
}

// CUSTOMERS (MANAGER CRUD, APPRENTICE read)
// ==============================================

export async function createOrUpdateCustomer(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());
  const values = {
    cnic: parsed.data.cnic, full_name: parsed.data.fullName,
    phone_primary: parsed.data.phonePrimary, phone_secondary: parsed.data.phoneSecondary,
    email: parsed.data.email, address: parsed.data.address, city: parsed.data.city,
    notes: parsed.data.notes, created_by: actor.userId
  };
  type DbErr = { code?: string; message?: string };
  let err: DbErr | null = null;
  if (parsed.data.id) {
    const { created_by, ...updateValues } = values;
    void created_by;
    ({ error: err } = await supabase.from("customers").update(updateValues).eq("id", parsed.data.id));
  } else {
    ({ error: err } = await supabase.from("customers").insert(values));
  }
  if (err) return databaseAction("createOrUpdateCustomer", err);
  revalidateERP();
  return { status: "success", message: parsed.data.id ? "Customer updated." : "Customer created." };
}

// ==============================================
// SALES WORKFLOW
// Manager initiates sale + records payments.
// Admin approves sale (triggers stock deduction + receipt generation unlock).
// ==============================================

export async function checkChasisAvailability(chasisNumber: string): Promise<{ ok: boolean; status: "idle" | "available" | "duplicate" | "error"; message: string }> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) {
    return { ok: false, status: "error", message: "Not allowed." };
  }
  const chasisNorm = String(chasisNumber ?? "").trim().toUpperCase();
  if (chasisNorm.length < 3) return { ok: false, status: "idle", message: "Enter chasis number." };
  const sb = serviceRoleClient();
  const { data, error } = await sb.from("sales").select("id,sale_status,receipt_number").ilike("chasis_number", chasisNorm).limit(1);
  if (error) return { ok: false, status: "error", message: "Could not check chasis right now." };
  const found = data?.[0] as { sale_status?: string | null; receipt_number?: string | null } | undefined;
  if (!found) return { ok: true, status: "available", message: "Chasis is unique." };
  const label: Record<string, string> = {
    pending_approval: "pending approval",
    approved: "approved",
    completed: "completed",
    rejected: "rejected earlier",
    cancelled: "cancelled",
  };
  const status = String(found.sale_status ?? "existing").toLowerCase();
  return {
    ok: false,
    status: "duplicate",
    message: `Already used${found.receipt_number ? ` in ${found.receipt_number}` : ""}. Status: ${label[status] ?? status}.`,
  };
}
export async function initiateSale(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = saleInitiateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();

  const stockUnitRes = await sb
    .from("motorcycle_stock_units")
    .select("id, motorcycle_variant_id, chasis_number, status, sale_id")
    .eq("id", parsed.data.motorcycleStockUnitId)
    .maybeSingle();
  if (stockUnitRes.error) return databaseAction("initiateSale load chasis unit", stockUnitRes.error);
  if (!stockUnitRes.data) return { status: "error", message: "Select an available chasis number from stock.", errors: { chasisNumber: ["Pick a chasis number from the stock list."] } };
  const stockUnit = stockUnitRes.data as { id: string; motorcycle_variant_id: string; chasis_number: string; status: string; sale_id?: string | null };
  const saleChasisNumber = String(stockUnit.chasis_number ?? "").trim().toUpperCase();
  if (stockUnit.motorcycle_variant_id !== parsed.data.motorcycleVariantId) {
    return { status: "error", message: "Selected chasis does not belong to this bike variant.", errors: { chasisNumber: ["Pick a chasis listed under the selected bike."] } };
  }
  if (stockUnit.status !== "available") {
    return { status: "error", message: `Chasis ${saleChasisNumber} is already ${stockUnit.status}.`, errors: { chasisNumber: ["Pick another available chasis number."] } };
  }

  // 1. Determine customer (create new inline if needed)
  let customerId = "";
  if (parsed.data.useExistingCustomer) {
    customerId = parsed.data.customerId || "";
    if (!customerId) return { status: "error", message: "Select existing customer." };
    const existCheck = await sb.from("customers").select("id").eq("id", customerId).maybeSingle();
    if (existCheck.error || !existCheck.data) return { status: "error", message: "Selected customer not found." };
  } else {
    // New customer inline. Handle CNIC dup: SELECT existing if CNIC already present, else INSERT.
    const cnic = String(parsed.data.newCustomer_cnic ?? "").replace(/[^0-9]/g, "");
    const phoneP = String(parsed.data.newCustomer_phonePrimary ?? "").trim();
    const phoneS = String(parsed.data.newCustomer_phoneSecondary ?? "").trim();
    const city = String(parsed.data.newCustomer_city ?? "").trim() || null;
    const address = String(parsed.data.newCustomer_address ?? "").trim() || null;

    let existingCust: { id: string } | null = null;
    if (cnic.length >= 13) {
      const checkCnic = await sb.from("customers").select("id").eq("cnic", cnic).maybeSingle();
      if (!checkCnic.error && checkCnic.data) existingCust = checkCnic.data;
    }
    if (existingCust) {
      customerId = existingCust.id;
    } else {
      const { data: newCust, error: custErr } = await sb
        .from("customers")
        .insert({
          full_name: String(parsed.data.newCustomer_fullName ?? "").trim(),
          cnic,
          phone_primary: phoneP,
          phone_secondary: (phoneS && phoneS !== phoneP) ? phoneS : null,
          city,
          address,
        })
        .select("id")
        .maybeSingle();
      if (custErr || !newCust) return databaseAction("create customer inline", custErr ?? new Error("Failed to create new customer."));
      customerId = newCust.id;
    }
  }

  // 1b. Chasis number uniqueness remains strict across all sale history.
  const chasisDup = await sb.from("sales").select("id,sale_status,receipt_number").ilike("chasis_number", saleChasisNumber).limit(3);
  if (!chasisDup.error && chasisDup.data && chasisDup.data.length > 0) {
    const firstRow = chasisDup.data[0] as unknown as { id: string; sale_status: string; receipt_number?: string | null };
    const statusLabel: Record<string, string> = {
      pending_approval: "pending approval",
      approved: "approved (stock deducted)",
      completed: "completed / receipt generated",
      rejected: "rejected earlier",
      cancelled: "cancelled",
    };
    return {
      status: "error",
      message: `Chasis already exists${firstRow.receipt_number ? ` in ${firstRow.receipt_number}` : ""}.`,
      errors: {
        chasisNumber: [
          `Already used${firstRow.receipt_number ? ` in ${firstRow.receipt_number}` : ""}. Status: ${statusLabel[String(firstRow.sale_status).toLowerCase()] ?? firstRow.sale_status}.`,
        ],
      },
    };
  }

  // 2. Lookup variant snapshot
  const { data: variant, error: vErr } = await sb
    .from("motorcycle_variants")
    .select("*, motorcycle:motorcycles(name, brand:brands(name))")
    .eq("id", parsed.data.motorcycleVariantId)
    .maybeSingle();
  if (vErr || !variant) return { status: "error", message: "Variant not found.", errors: { motorcycleVariantId: ["Pick a valid bike from the grid above."] } };

  const variantPrice = Number((variant as unknown as { price?: unknown }).price ?? 0) || 0;
  const unitPrice = variantPrice > 0 ? variantPrice : (parsed.data.unitPrice || 0);
  const qty = parsed.data.quantitySold || 1;
  const availableQty = Number((variant as unknown as { quantity?: unknown }).quantity ?? 0) || 0;
  if (qty <= 0) {
    return { status: "error", message: "Sale quantity is invalid.", errors: { quantitySold: ["Quantity must be at least 1."] } };
  }
  if (availableQty < qty) {
    return {
      status: "error",
      message: availableQty <= 0 ? "This bike is out of stock." : `Only ${availableQty} unit(s) are available for this bike.`,
      errors: { motorcycleVariantId: [availableQty <= 0 ? "Pick a bike that is in stock." : `Reduce quantity to ${availableQty} or add stock first.`] },
    };
  }
  const discount = parsed.data.discountAmount || 0;
  const total = Math.max(0, unitPrice * qty - discount);

  const paymentsRawAll = parsed.data.paymentsJson ?? [];
  const payments = paymentsRawAll.filter(p => Number(p.amount) > 0);
  const totalPaidSubmitted = payments.reduce((t, p) => t + (Number(p.amount) || 0), 0);
  if (payments.length === 0 || totalPaidSubmitted <= 0) {
    return {
      status: "error",
      message: "Add at least one payment before submitting.",
      errors: {
        paymentsJson: ["Add a payment amount greater than 0."],
      },
    };
  }
  if (totalPaidSubmitted < Number(total ?? 0)) {
    return {
      status: "error",
      message: `Payment is short by PKR ${Math.max(0, Number(total) - totalPaidSubmitted).toLocaleString("en-PK")}.`,
      errors: {
        paymentsJson: [
          `Add PKR ${Math.max(0, Number(total) - totalPaidSubmitted).toLocaleString("en-PK")} more to match the sale total.`,
        ],
      },
    };
  }

  // 3. Generate SALE reference number: OWM-SALE-YYMMDDHHMMSSmmmRRR (all digits after prefix, ≥6 required)
  function generateSaleRef(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const yymmdd = String(now.getFullYear() - 2000).padStart(2, "0") + pad(now.getMonth() + 1) + pad(now.getDate());
    const hhmmssmmm = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + pad(now.getMilliseconds(), 3);
    const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return "OWM-SALE-" + yymmdd + hhmmssmmm + rnd;
  }
  const receiptNumber = generateSaleRef();

  type VariantWithJoins = {
    motorcycle?: { name?: string; brand?: { name?: string } | null } | null;
  };
  const v = variant as unknown as VariantWithJoins;
  const { data: insertedSale, error } = await sb.from("sales").insert({
    receipt_number: receiptNumber,
    customer_id: customerId,
    motorcycle_variant_id: parsed.data.motorcycleVariantId,
    motorcycle_name_snapshot: v.motorcycle?.name ?? "Unknown",
    brand_name_snapshot: v.motorcycle?.brand?.name ?? "Unknown",
    color_name_snapshot: variant.color_name ?? null,
    color_hex_snapshot: variant.color_hex ?? null,
    cc_snapshot: variant.cc ?? null,
    chasis_number: saleChasisNumber,
    motorcycle_stock_unit_id: stockUnit.id,
    engine_number: parsed.data.engineNumber ?? null,
    quantity_sold: qty,
    unit_price: unitPrice,
    discount_amount: discount,
    total_amount: total,
    requested_by: actor.userId,
    sale_status: "pending_approval" satisfies SaleStatus,
    notes: parsed.data.notes ?? null,
  }).select("id").maybeSingle();
  if (error) return databaseAction("initiateSale", error);
  const saleId = insertedSale?.id;
  if (!saleId) return { status: "error", message: "Sale creation failed (no id returned)." };
  const reserveUnit = await sb
    .from("motorcycle_stock_units")
    .update({ status: "reserved", sale_id: saleId, updated_at: new Date().toISOString() })
    .eq("id", stockUnit.id)
    .eq("status", "available")
    .select("id")
    .maybeSingle();
  if (reserveUnit.error || !reserveUnit.data) {
    await sb.from("sales").delete().eq("id", saleId);
    return { status: "error", message: `Chasis ${saleChasisNumber} was just reserved or sold. Pick another chasis number.`, errors: { chasisNumber: ["Pick another available chasis number."] } };
  }
  let recordedPayments = 0;
  let paymentInsertFailed = false;
  const BANK_REQUIRED_METHODS: readonly PaymentMethod[] = ["bank_transfer", "cheque", "demand_draft", "pay_order", "card"];
  function serverTxnRef(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const ts = String(now.getFullYear() - 2000).padStart(2, "0")
      + pad(now.getMonth() + 1) + pad(now.getDate())
      + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + pad(now.getMilliseconds(), 3);
    const rnd = String(Math.floor(Math.random() * 900) + 100);
    return "OWM-TXN-" + ts + "-" + rnd;
  }
  if (payments.length > 0) {
    for (const p of payments) {
      let bankNameSnapshot: string | null = null;
      if (p.bankId && p.bankId.length > 5) {
        const b = await sb.from("banks").select("name").eq("id", p.bankId).maybeSingle();
        bankNameSnapshot = (b.data as { name?: string } | null)?.name ?? null;
      }
      const method = (["cash","bank_transfer","cheque","demand_draft","pay_order","easypaisa","jazzcash","sadapay","card","other"].includes(p.paymentMethod)
        ? p.paymentMethod
        : "other") as PaymentMethod;
      const bankRequired = BANK_REQUIRED_METHODS.includes(method);
      const finalTxnRef: string | null = (p.transactionReference && p.transactionReference.trim() ? p.transactionReference.trim() : (!bankRequired ? serverTxnRef() : null));
      const insErr = (await sb.from("sale_payments").insert({
        sale_id: saleId,
        payment_method: method,
        bank_id: (p.bankId && p.bankId.length > 5) ? p.bankId : null,
        bank_name_snapshot: bankNameSnapshot,
        transaction_reference: finalTxnRef,
        instrument_number: p.instrumentNumber ?? null,
        amount: Number(p.amount) || 0,
        payment_date: (p.paymentDate ?? new Date()).toISOString(),
        depositor_name: p.depositorName ?? null,
        account_number_used: p.accountNumberUsed ?? null,
        notes: p.notes ?? null,
        recorded_by: actor.userId,
      })).error;
      if (!insErr) recordedPayments += 1;
      if (insErr) paymentInsertFailed = true;
    }
  }

  if (paymentInsertFailed || recordedPayments !== payments.length) {
    try {
      await sb.from("sale_payments").delete().eq("sale_id", saleId);
      await sb.from("motorcycle_stock_units").update({ status: "available", sale_id: null }).eq("id", stockUnit.id);
      await sb.from("sales").delete().eq("id", saleId);
    } catch { /* noop */ }
    return {
      status: "error",
      message: "Payment details could not be saved. Please check the payment split and submit again.",
      errors: { paymentsJson: ["Payment details could not be saved."] },
    };
  }

  const customerRow = await sb.from("customers").select("id, full_name, cnic").eq("id", customerId).maybeSingle();
  const customer = (customerRow.data as { id: string; full_name?: string | null; cnic?: string | null } | null) ?? null;
  const submittedSaleContext = {
    receipt_number: receiptNumber,
    brand_name_snapshot: v.motorcycle?.brand?.name ?? "Unknown",
    motorcycle_name_snapshot: v.motorcycle?.name ?? "Unknown",
    cc_snapshot: (variant as unknown as { cc?: number | null }).cc ?? null,
    color_name_snapshot: (variant as unknown as { color_name?: string | null }).color_name ?? null,
    chasis_number: saleChasisNumber,
    motorcycle_stock_unit_id: stockUnit.id,
    total_amount: total,
    customer,
    customer_id: customerId,
  };
  const pay = paymentSummary(payments);

  await writeActivity({
    actorUserId: actor.userId,
    actorRole: actor.profile.role,
    action: "sale_requested",
    summary: `${actorName(actor)} submitted sale ${receiptNumber} for approval. ${saleBikeLabel(submittedSaleContext)} chasis ${saleChasisNumber}; customer ${customer?.full_name ?? customerId}; total PKR ${total.toLocaleString("en-PK")}; paid PKR ${pay.total.toLocaleString("en-PK")} across ${pay.count} payment split(s). Stock not deducted yet.`,
    targetTable: "sales",
    targetId: saleId,
    metadata: {
      event: "sale_submitted_for_approval",
      outcome: "pending_admin_approval",
      actor: { id: actor.userId, name: actorName(actor), role: actor.profile.role },
      target_context: salesTargetContext(submittedSaleContext, { stock_effect: "none_until_approval" }),
      sale: { id: saleId, receipt_number: receiptNumber, chasis_number: saleChasisNumber, motorcycle_variant_id: parsed.data.motorcycleVariantId, customer_id: customerId },
      payment: { total_due: total, total_paid: pay.total, count: recordedPayments, methods: pay.methods },
      payments,
    },
  });

  revalidateERP();
  return { status: "success", message: `Sale ${receiptNumber} submitted for approval. ${recordedPayments} payment split(s) attached.` };
}

export async function recordSalePayment(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["manager", "admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = salePaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());

  let bankSnapshot: string | null = null;
  if (parsed.data.bankId) {
    const { data } = await supabase.from("banks").select("name").eq("id", parsed.data.bankId).maybeSingle();
    bankSnapshot = (data as { name?: string } | null)?.name ?? null;
  }

  const { error } = await supabase.from("sale_payments").insert({
    sale_id: parsed.data.saleId,
    payment_method: parsed.data.paymentMethod as PaymentMethod,
    bank_id: parsed.data.bankId || null,
    bank_name_snapshot: bankSnapshot,
    transaction_reference: parsed.data.transactionReference,
    instrument_number: parsed.data.instrumentNumber,
    amount: parsed.data.amount,
    payment_date: parsed.data.paymentDate.toISOString(),
    depositor_name: parsed.data.depositorName,
    account_number_used: parsed.data.accountNumberUsed,
    notes: parsed.data.notes,
    recorded_by: actor.userId,
  });
  if (error) return databaseAction("recordSalePayment", error);

  try {
    const saleRow = await supabase
      .from("sales")
      .select("id, receipt_number, total_amount, brand_name_snapshot, motorcycle_name_snapshot, cc_snapshot, color_name_snapshot, chasis_number, customer_id, customer:customers(full_name, cnic)")
      .eq("id", parsed.data.saleId)
      .maybeSingle();
    const sale = saleRow.data as unknown as {
      id: string;
      receipt_number?: string | null;
      total_amount?: number | null;
      brand_name_snapshot?: string | null;
      motorcycle_name_snapshot?: string | null;
      cc_snapshot?: number | null;
      color_name_snapshot?: string | null;
      chasis_number?: string | null;
      customer_id?: string | null;
      customer?: { full_name?: string | null; cnic?: string | null } | null;
    } | null;
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "payment_recorded",
      summary: `${actorName(actor)} recorded PKR ${Number(parsed.data.amount).toLocaleString("en-PK")} payment on sale ${sale?.receipt_number ?? parsed.data.saleId} by ${parsed.data.paymentMethod}${bankSnapshot ? ` via ${bankSnapshot}` : ""}.`,
      targetTable: "sales",
      targetId: parsed.data.saleId,
      metadata: {
        event: "sale_payment_recorded",
        actor: { id: actor.userId, name: actorName(actor), role: actor.profile.role },
        target_context: sale ? salesTargetContext(sale) : { title: parsed.data.saleId },
        payment: {
          amount: parsed.data.amount,
          method: parsed.data.paymentMethod,
          bank: bankSnapshot,
          transaction_reference: parsed.data.transactionReference,
          instrument_number: parsed.data.instrumentNumber,
        },
      },
    });
  } catch { /* activity is best effort */ }

  revalidateERP();
  return { status: "success", message: "Payment recorded." };
}

export async function decideSale(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = saleApprovalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();
  const now = new Date().toISOString();
  const saleFull = await sb.from("sales").select(`
    id, receipt_number, sale_status, total_amount, requested_at, motorcycle_variant_id, motorcycle_stock_unit_id, quantity_sold,
    motorcycle_name_snapshot, brand_name_snapshot, cc_snapshot, color_name_snapshot, chasis_number,
    customer:customers(id, full_name, cnic),
    payments:sale_payments(id, amount, payment_method)
  `).eq("id", parsed.data.id).maybeSingle();
  if (saleFull.error || !saleFull.data) return { status: "error", message: "Sale not found." };
  const sale = saleFull.data as unknown as {
    id: string; receipt_number: string; sale_status: string; total_amount: number; motorcycle_variant_id: string; motorcycle_stock_unit_id?: string | null;
    quantity_sold: number; motorcycle_name_snapshot: string; brand_name_snapshot: string; cc_snapshot: number;
    color_name_snapshot?: string | null; chasis_number: string;
    customer?: { id: string; full_name: string; cnic: string } | null;
    payments?: Array<{ id: string; amount: number; payment_method: string }> | null;
  };
  if (sale.sale_status !== "pending_approval") {
    return { status: "error", message: `Sale already ${sale.sale_status}.` };
  }
  const paymentsArr = Array.isArray(sale.payments) ? sale.payments : [];
  const paidTotal = paymentsArr.reduce((t, p) => t + (Number(p.amount) || 0), 0);
  if (parsed.data.decision === "approved") {
    if (paidTotal <= 0) return { status: "error", message: "Cannot approve: no payments recorded yet.", errors: { rejectionReason: ["Sale has PKR 0 paid. Require manager to record payments first before approving."] } };
    if (paidTotal < Number(sale.total_amount ?? 0)) {
      return {
        status: "error",
        message: `Cannot approve sale. Paid PKR ${paidTotal.toLocaleString("en-PK")} / Total PKR ${(Number(sale.total_amount) || 0).toLocaleString("en-PK")}.`,
        errors: {
          rejectionReason: [
            `Sale is underpaid: PKR ${paidTotal.toLocaleString("en-PK")} paid vs PKR ${(Number(sale.total_amount) || 0).toLocaleString("en-PK")} total.`,
            "Ask manager to record the remaining payment splits first, then approve; OR reject this sale and create a new one.",
          ],
        },
      };
    }
  }

  let stockDeducted: { before: number; after: number } | null = null;
  if (parsed.data.decision === "approved") {
    const beforeQty = await sb.from("motorcycle_variants").select("quantity, stock_status").eq("id", sale.motorcycle_variant_id).maybeSingle();
    if (beforeQty.error) return databaseAction("load variant stock before approval", beforeQty.error);
    if (!beforeQty.data) {
      return {
        status: "error",
        message: "Cannot approve: the selected bike variant no longer exists.",
        errors: { rejectionReason: ["Pick another sale or restore the missing variant before approval."] },
      };
    }
    const currentQty = Number((beforeQty.data as unknown as { quantity: number | null })?.quantity ?? 0);
    const qtySold = Number(sale.quantity_sold ?? 1);
    if (qtySold <= 0) {
      return {
        status: "error",
        message: "Cannot approve: sale quantity is invalid.",
        errors: { rejectionReason: ["Sale quantity must be at least 1."] },
      };
    }
    if (currentQty < qtySold) {
      return {
        status: "error",
        message: `Cannot approve: only ${currentQty} unit(s) are in stock, but this sale needs ${qtySold}.`,
        errors: { rejectionReason: ["Update stock first, then approve this sale."] },
      };
    }
    if (sale.motorcycle_stock_unit_id) {
      const unitCheck = await sb
        .from("motorcycle_stock_units")
        .select("id, status, sale_id, chasis_number")
        .eq("id", sale.motorcycle_stock_unit_id)
        .maybeSingle();
      if (unitCheck.error || !unitCheck.data) return databaseAction("decideSale load chasis unit", unitCheck.error ?? new Error("Chasis stock unit not found."));
      const unit = unitCheck.data as { id: string; status?: string | null; sale_id?: string | null; chasis_number?: string | null };
      if (unit.status !== "reserved" || unit.sale_id !== sale.id) {
        return { status: "error", message: `Cannot approve: chasis ${unit.chasis_number ?? sale.chasis_number} is ${unit.status ?? "not reserved"}.`, errors: { rejectionReason: ["This chasis is not reserved for this sale."] } };
      }
    }
    const newQty = currentQty - qtySold;
    const prevStatus = ((beforeQty.data as unknown as { stock_status?: StockStatus | null }).stock_status ?? "in_stock") as StockStatus;
    const newStatus: StockStatus = (newQty <= 0 ? "out_of_stock" : (prevStatus === "out_of_stock" ? "in_stock" : prevStatus)) as StockStatus;
    const upd = await sb.from("motorcycle_variants").update({ quantity: newQty, stock_status: newStatus }).eq("id", sale.motorcycle_variant_id);
    if (upd.error) return databaseAction("deduct sale stock", upd.error);
    if (sale.motorcycle_stock_unit_id) {
      const unitSold = await sb
        .from("motorcycle_stock_units")
        .update({ status: "sold", sold_at: now, updated_at: now })
        .eq("id", sale.motorcycle_stock_unit_id)
        .eq("sale_id", sale.id);
      if (unitSold.error) return databaseAction("mark chasis unit sold", unitSold.error);
    }
    stockDeducted = { before: currentQty, after: newQty };
    if (sale.customer?.id && sale.chasis_number) {
      const custRow = await sb.from("customers").select("chasis_numbers").eq("id", sale.customer.id).maybeSingle();
      if (!custRow.error && custRow.data) {
        const existing: string[] = Array.isArray((custRow.data as { chasis_numbers?: unknown[] | null }).chasis_numbers)
          ? (custRow.data as { chasis_numbers: string[] }).chasis_numbers.map(x => String(x ?? ""))
          : [];
        const normalizedChasis = String(sale.chasis_number).trim().toUpperCase();
        if (normalizedChasis && !existing.some(x => x.toUpperCase() === normalizedChasis)) {
          const next = [...existing, normalizedChasis];
          await sb.from("customers").update({ chasis_numbers: next }).eq("id", sale.customer.id);
        }
      }
    }
  }

  if (parsed.data.decision === "rejected" && sale.motorcycle_stock_unit_id) {
    const release = await sb
      .from("motorcycle_stock_units")
      .update({ status: "available", sale_id: null, updated_at: now })
      .eq("id", sale.motorcycle_stock_unit_id)
      .eq("sale_id", sale.id);
    if (release.error) return databaseAction("release rejected chasis unit", release.error);
  }

  const update = (parsed.data.decision === "approved"
    ? { sale_status: "approved" satisfies SaleStatus, approved_by: actor.userId, approved_at: now }
    : { sale_status: "rejected" satisfies SaleStatus, rejected_by: actor.userId, rejected_at: now, rejection_reason: (parsed.data.rejectionReason && parsed.data.rejectionReason.length >= 3) ? parsed.data.rejectionReason : null }
  ) as unknown as Database["public"]["Tables"]["sales"]["Update"];
  const { error } = await sb.from("sales").update(update).eq("id", parsed.data.id);
  if (error) return databaseAction("decideSale", error);

  if (parsed.data.decision === "approved") {
    if (!stockDeducted) {
      return { status: "error", message: "Cannot approve: stock deduction was not confirmed." };
    }
    const stockMovementAppliedUpdate = {
      applied: true,
      applied_at: now,
      approved_by: actor.userId,
      approved_at: now,
    } as unknown as Database["public"]["Tables"]["stock_movements"]["Update"];
    await sb
      .from("stock_movements")
      .update(stockMovementAppliedUpdate)
      .eq("motorcycle_variant_id", sale.motorcycle_variant_id)
      .eq("movement_type", "sale_deduction")
      .eq("reason", `Sale auto-deduction for receipt ${sale.receipt_number}`);

    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "sale_approved",
      summary: `${actorName(actor)} approved sale ${sale.receipt_number}. ${saleBikeLabel(sale)} chasis ${sale.chasis_number}; customer ${sale.customer?.full_name ?? sale.customer?.id ?? "unknown"}; paid PKR ${paidTotal.toLocaleString("en-PK")} of PKR ${(Number(sale.total_amount) || 0).toLocaleString("en-PK")}. Stock deducted ${stockDeducted.before} -> ${stockDeducted.after}.`,
      targetTable: "sales",
      targetId: sale.id,
      metadata: {
        event: "sale_approved_stock_deducted",
        outcome: "approved",
        actor: { id: actor.userId, name: actorName(actor), role: actor.profile.role },
        target_context: salesTargetContext(sale, { stock_effect: "deducted", stock_before: stockDeducted.before, stock_after: stockDeducted.after }),
        sale: { id: sale.id, receipt_number: sale.receipt_number, chasis_number: sale.chasis_number, customer: sale.customer },
        stockDelta: stockDeducted,
        payment: { total_due: Number(sale.total_amount) || 0, total_paid: paidTotal, count: paymentsArr.length, methods: paymentSummary(paymentsArr).methods },
      },
    });
  } else {
    const reason = parsed.data.rejectionReason ?? "(no reason provided)";
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "sale_rejected",
      summary: `${actorName(actor)} rejected sale ${sale.receipt_number}. ${saleBikeLabel(sale)} chasis ${sale.chasis_number}; customer ${sale.customer?.full_name ?? sale.customer?.id ?? "unknown"}. Reason: ${reason}.`,
      targetTable: "sales",
      targetId: sale.id,
      metadata: {
        event: "sale_rejected",
        outcome: "rejected",
        actor: { id: actor.userId, name: actorName(actor), role: actor.profile.role },
        target_context: salesTargetContext(sale, { reason }),
        sale: { id: sale.id, receipt_number: sale.receipt_number, chasis_number: sale.chasis_number, customer: sale.customer },
        rejectionReason: parsed.data.rejectionReason ?? null,
        payment: { total_due: Number(sale.total_amount) || 0, total_paid: paidTotal, count: paymentsArr.length, methods: paymentSummary(paymentsArr).methods },
      },
    });
  }

  const decisionMessage = parsed.data.decision === "approved" && stockDeducted
    ? `Sale ${sale.receipt_number} approved. Stock deducted (qty ${stockDeducted.before} -> ${stockDeducted.after}). Receipt is ready to generate.`
    : `Sale ${sale.receipt_number} rejected.`;

  revalidateERP();
  return {
    status: "success",
    message: decisionMessage,
  };
}

export async function markSaleCompleted(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer"].includes(actor.profile.role)) return unauthorizedAction;
  const id = formData.get("id")?.toString();
  if (!id) return { status: "error", message: "Sale ID missing." };

  const sb = serviceRoleClient();
  const completeUpdate = { sale_status: "completed" satisfies SaleStatus, completed_at: new Date().toISOString() } as unknown as Database["public"]["Tables"]["sales"]["Update"];
  const { error } = await sb
    .from("sales")
    .update(completeUpdate)
    .eq("id", id)
    .eq("sale_status", "approved");
  if (error) return databaseAction("markSaleCompleted", error);
  try {
    const sRaw = await sb.from("sales").select("id, receipt_number, total_amount, motorcycle_name_snapshot, brand_name_snapshot, cc_snapshot, color_name_snapshot, chasis_number, customer_id, customer:customers(full_name, cnic)").eq("id", id).maybeSingle();
    const s = sRaw.data as unknown as { id: string; receipt_number: string; total_amount?: number | null; motorcycle_name_snapshot?: string | null; brand_name_snapshot?: string | null; cc_snapshot?: number | null; color_name_snapshot?: string | null; chasis_number?: string | null; customer_id?: string | null; customer?: { full_name?: string | null; cnic?: string | null } | null } | null;
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "sale_completed",
      summary: `${actorName(actor)} manually marked sale ${s?.receipt_number ?? id} as completed. ${s ? saleBikeLabel(s) : "Bike"} chasis ${s?.chasis_number ?? "-"}.`,
      targetTable: "sales",
      targetId: id,
      metadata: {
        event: "sale_manually_completed",
        actor: { id: actor.userId, name: actorName(actor), role: actor.profile.role },
        target_context: s ? salesTargetContext(s) : { title: id },
        saleId: id,
        receipt_number: s?.receipt_number ?? null,
        chasis: s?.chasis_number ?? null,
        customer_id: s?.customer_id ?? null,
      },
    });
  } catch { /* noop */ }
  revalidateERP();
  return { status: "success", message: "Sale marked completed." };
}

// ==============================================
// RECEIPT GENERATION
// ==============================================

export async function generateReceipt(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor || !["admin", "developer", "manager"].includes(actor.profile.role)) return unauthorizedAction;
  const parsed = receiptGenerationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const sb = serviceRoleClient();
  const { data: saleRaw, error: sErr } = await sb
    .from("sales")
    .select("id, sale_status, receipt_number, receipt_generated, total_amount, motorcycle_name_snapshot, brand_name_snapshot, cc_snapshot, chasis_number, customer_id, customer:customers(full_name, cnic)")
    .eq("id", parsed.data.saleId)
    .maybeSingle();
  if (sErr || !saleRaw) return { status: "error", message: "Sale not found." };
  type SaleRowGen = {
    id: string; sale_status: string; receipt_number: string; receipt_generated: boolean | null;
    total_amount?: number | null; motorcycle_name_snapshot?: string | null; brand_name_snapshot?: string | null;
    cc_snapshot?: number | null; chasis_number?: string | null; customer_id?: string | null;
    customer?: { full_name?: string | null; cnic?: string | null } | null;
  };
  const sale = saleRaw as unknown as SaleRowGen;
  if (sale.sale_status !== "approved" && sale.sale_status !== "completed") return { status: "error", message: "Receipt can only be generated after admin approval." };
  if (sale.receipt_generated) return { status: "error", message: "A receipt already exists for this sale." };

  function generateRcptRef(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const yymmdd = String(now.getFullYear() - 2000).padStart(2, "0") + pad(now.getMonth() + 1) + pad(now.getDate());
    const hhmmssmmm = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + pad(now.getMilliseconds(), 3);
    const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return "OWM-RCPT-" + yymmdd + hhmmssmmm + rnd;
  }
  let receiptNumber: string;
  try {
    const { data, error: rpcErr } = await sb.rpc("generate_receipt_number", { p_prefix: "OWM-RCPT-" });
    if (!rpcErr && typeof data === "string" && /^OWM-RCPT-[0-9]{6,}$/.test(data)) {
      receiptNumber = data;
    } else {
      receiptNumber = generateRcptRef();
    }
  } catch {
    receiptNumber = generateRcptRef();
  }

  const qr = JSON.stringify({
    r: receiptNumber, s: sale.receipt_number, a: actor.userId.slice(0, 8) });

  const sb2 = serviceRoleClient();
  const receiptIns = await sb2.from("receipts").insert({
    sale_id: parsed.data.saleId,
    receipt_number: receiptNumber,
    generated_by: actor.userId,
    qr_code_payload: qr,
  }).select("id").maybeSingle();
  if (receiptIns.error) return databaseAction("generateReceipt", receiptIns.error);
  const receiptId = receiptIns.data?.id;
  const { error: updErr } = await sb2.from("sales").update({ receipt_generated: true, sale_status: "completed" satisfies SaleStatus }).eq("id", parsed.data.saleId);
  if (updErr) return databaseAction("mark sale completed after receipt", updErr);
  try {
    const bikeLabel = saleBikeLabel(sale);
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "receipt_generated",
      summary: `${actorName(actor)} generated receipt ${receiptNumber} for sale ${sale.receipt_number}. ${bikeLabel || "Bike"} chasis ${sale.chasis_number ?? "-"}; customer ${sale.customer?.full_name ?? sale.customer_id ?? "unknown"}; total PKR ${(Number(sale.total_amount ?? 0)).toLocaleString("en-PK")}.`,
      targetTable: "receipts",
      targetId: receiptId ?? sale.id,
      metadata: {
        event: "receipt_generated",
        actor: { id: actor.userId, name: actorName(actor), role: actor.profile.role },
        target_context: {
          title: receiptNumber,
          subtitle: `Sale ${sale.receipt_number} | ${bikeLabel || "Bike"} | Chasis: ${sale.chasis_number ?? "-"}`,
          amount: Number(sale.total_amount ?? 0) || null,
          receipt_number: receiptNumber,
          sale_receipt_number: sale.receipt_number,
          customer_name: sale.customer?.full_name ?? null,
          customer_cnic: sale.customer?.cnic ?? null,
        },
        receipt: { id: receiptId ?? null, receipt_number: receiptNumber },
        sale: {
          id: sale.id,
          receipt_number: sale.receipt_number,
          chasis: sale.chasis_number ?? null,
          customer_id: sale.customer_id ?? null,
          customer_cnic: sale.customer?.cnic ?? null,
          total_amount: sale.total_amount ?? null,
        },
      },
    });
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "sale_completed",
      summary: `Sale ${sale.receipt_number} moved to COMPLETED upon receipt generation. ${bikeLabel || "Bike"} chasis ${sale.chasis_number ?? "-"}. PKR ${(Number(sale.total_amount ?? 0)).toLocaleString("en-PK")} received.`,
      targetTable: "sales",
      targetId: sale.id,
      metadata: {
        event: "sale_completed_by_receipt",
        actor: { id: actor.userId, name: actorName(actor), role: actor.profile.role },
        target_context: salesTargetContext(sale),
        saleId: sale.id,
        receipt_number: sale.receipt_number,
        receiptId: receiptId ?? null,
        chasis: sale.chasis_number ?? null,
        total_amount: sale.total_amount ?? null,
      },
    });
  } catch { /* noop */ }
  revalidateERP();
  return { status: "success", message: `Receipt ${receiptNumber} generated.`, data: { receiptNumber } };
}

export async function incrementReceiptPrint(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await getAuthenticatedProfile();
  if (!actor) return unauthorizedAction;
  const parsed = receiptPrintSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationAction(parsed.error);

  const supabase = await import("@/lib/supabase/server").then(m => m.createServerSupabaseClient());
  const now = new Date().toISOString();
  const { error } = await supabase.rpc("increment_receipt_print_count", { p_receipt_id: parsed.data.receiptId, p_printed_at: now });
  if (error) {
    const { error: updateErr } = await supabase
      .from("receipts")
      .update({ last_printed_at: now })
      .eq("id", parsed.data.receiptId);
    if (updateErr) return databaseAction("incrementReceiptPrint", updateErr);
  }

  try {
    const rRow = await supabase
      .from("receipts")
      .select("id, receipt_number, sale_id, printed_count")
      .eq("id", parsed.data.receiptId)
      .maybeSingle();
    const r = rRow.data as unknown as { id: string; receipt_number: string; sale_id?: string | null; printed_count?: number | null } | null;
    await writeActivity({
      actorUserId: actor.userId,
      actorRole: actor.profile.role,
      action: "receipt_printed",
      summary: `${actorName(actor)} printed receipt ${r?.receipt_number ?? parsed.data.receiptId}. Count after print: ${r?.printed_count ?? 1}.`,
      targetTable: "receipts",
      targetId: parsed.data.receiptId,
      metadata: {
        event: "receipt_printed",
        actor: { id: actor.userId, name: actorName(actor), role: actor.profile.role },
        target_context: {
          title: r?.receipt_number ?? parsed.data.receiptId,
          subtitle: r?.sale_id ? `Sale ID: ${r.sale_id}` : "Receipt print",
        },
        receiptId: parsed.data.receiptId,
        receipt_number: r?.receipt_number ?? null,
        sale_id: r?.sale_id ?? null,
        printed_count: r?.printed_count ?? null,
        print_count_source: error ? "timestamp_fallback" : "rpc_increment",
      },
    });
  } catch { /* noop */ }
  return { status: "success", message: "Print recorded." };
}




