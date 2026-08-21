import type { Json, ProfileRole } from "@/lib/supabase/database.types";

// ============================================================
// OW MOTORS ERP - Type definitions
// These correspond to the tables created in migration:
// supabase/migrations/20260809030000_erp_role_system_and_sales_inventory.sql
// NOTE: Relaxed with index signatures because database.types.ts will be
// regenerated from the live database after the SQL migration runs. At that
// point these interfaces can be replaced with strict generated Database[].
// ============================================================

export type StaffRole = "developer" | "admin" | "manager" | "apprentice" | "editor";

// Extended profile with user management audit columns
export interface StaffProfile {
  readonly id: string;
  readonly full_name: string;
  readonly role: StaffRole;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly created_by?: string | null;
  readonly created_password?: string | null;
  readonly revoked_at?: string | null;
  readonly revoked_by?: string | null;
  [key: string]: unknown;
}

// --------------------
// PARTS / INVENTORY
// --------------------

export interface Part {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string;
  readonly unit: string;
  readonly current_stock: number;
  readonly reorder_level: number;
  readonly unit_cost: number;
  readonly compatible_brand_id?: string | null;
  readonly compatible_motorcycle_id?: string | null;
  readonly compatible_cc?: number | null;
  readonly carton_number?: string | null;
  readonly compatible_brand?: { readonly id: string; readonly name: string; readonly slug?: string | null } | null;
  readonly compatible_motorcycle?: { readonly id: string; readonly name: string; readonly slug?: string | null; readonly brand?: { readonly id: string; readonly name: string; readonly slug?: string | null } | null } | null;
  readonly location: string | null;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly created_by: string | null;
  readonly in_stock?: boolean;
  [key: string]: unknown;
}

export interface PartSaleItem {
  readonly id: string;
  readonly part_sale_id: string;
  readonly part_id: string;
  readonly sku_snapshot: string;
  readonly name_snapshot: string;
  readonly quantity: number;
  readonly unit_price: number;
  readonly line_total: number;
  readonly created_at: string;
  readonly part?: Part | null;
  [key: string]: unknown;
}

export interface PartSale {
  readonly id: string;
  readonly sale_number: string;
  readonly customer_id: string | null;
  readonly customer_name: string | null;
  readonly customer_phone: string | null;
  readonly total_amount: number;
  readonly paid_amount?: number;
  readonly payment_method?: PaymentMethod | null;
  readonly bank_id?: string | null;
  readonly bank_name_snapshot?: string | null;
  readonly transaction_reference?: string | null;
  readonly notes: string | null;
  readonly sale_status?: SaleStatus;
  readonly approved_by?: string | null;
  readonly approved_at?: string | null;
  readonly rejected_by?: string | null;
  readonly rejected_at?: string | null;
  readonly rejection_reason?: string | null;
  readonly stock_deducted?: boolean;
  readonly receipt_generated?: boolean;
  readonly receipt_generated_at?: string | null;
  readonly sold_by: string | null;
  readonly sold_at: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly customer?: Customer | null;
  readonly seller?: { readonly full_name: string; readonly role: string } | null;
  readonly items?: readonly PartSaleItem[] | null;
  [key: string]: unknown;
}

export type StockMovementType =
  | "motorcycle_add"
  | "motorcycle_subtract"
  | "part_add"
  | "part_subtract"
  | "sale_deduction"
  | "adjustment"
  | "addition"
  | "subtraction"
  | "returned";

export type StockApprovalStatus = "pending" | "pending_approval" | "approved" | "rejected";

export interface StockMovement {
  readonly id: string;
  readonly movement_type: StockMovementType;
  readonly reference: string | null;
  readonly motorcycle_variant_id: string | null;
  readonly part_id: string | null;
  readonly quantity: number;
  readonly requested_chasis_numbers?: readonly string[];
  readonly unit_cost_at_time: number | null;
  readonly reason: string;
  readonly notes: string | null;
  readonly approval_status: StockApprovalStatus;
  readonly requested_by: string;
  readonly approved_by: string | null;
  readonly approved_at: string | null;
  readonly rejected_by: string | null;
  readonly rejected_at: string | null;
  readonly rejection_reason: string | null;
  readonly applied: boolean;
  readonly applied_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly unit_cost?: number | null;
  [key: string]: unknown;
}

export interface MotorcycleStockUnit {
  readonly id: string;
  readonly motorcycle_variant_id: string;
  readonly chasis_number: string;
  readonly status: "available" | "reserved" | "sold" | "archived";
  readonly sale_id: string | null;
  readonly added_by: string | null;
  readonly sold_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  [key: string]: unknown;
}
// --------------------
// CUSTOMERS
// --------------------

export interface Customer {
  readonly id: string;
  readonly cnic: string;
  readonly full_name: string;
  readonly phone_primary: string;
  readonly phone_secondary: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly chasis_numbers: readonly string[];
  readonly notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly created_by: string | null;
  [key: string]: unknown;
}

// --------------------
// BANKS
// --------------------

export interface Bank {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly short_name: string | null;
  readonly sort_order: number;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  [key: string]: unknown;
}

// --------------------
// SALES & PAYMENTS
// --------------------

export type SaleStatus =
  | "pending"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed";

export interface Sale {
  readonly id: string;
  readonly receipt_number: string;
  readonly customer_id: string;
  readonly motorcycle_variant_id: string;
  readonly motorcycle_name_snapshot: string;
  readonly brand_name_snapshot: string;
  readonly color_name_snapshot: string;
  readonly color_hex_snapshot: string;
  readonly cc_snapshot: number;
  readonly chasis_number: string;
  readonly engine_number: string | null;
  readonly quantity_sold: number;
  readonly quantity?: number;
  readonly unit_price: number;
  readonly discount_amount: number;
  readonly total_amount: number;
  readonly sale_status: SaleStatus;
  readonly requested_by: string;
  readonly requested_at: string;
  readonly approved_by: string | null;
  readonly approved_at: string | null;
  readonly rejected_by: string | null;
  readonly rejected_at: string | null;
  readonly rejection_reason: string | null;
  readonly completed_at: string | null;
  readonly stock_deducted: boolean;
  readonly receipt_generated: boolean;
  readonly receipt_generated_at: string | null;
  readonly notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly customer?: Customer | null;
  readonly sale_payments?: readonly SalePayment[] | null;
  readonly payments?: readonly SalePayment[] | null;
  [key: string]: unknown;
}

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "cheque"
  | "demand_draft"
  | "pay_order"
  | "easypaisa"
  | "jazzcash"
  | "sadapay"
  | "card"
  | "other";

export interface SalePayment {
  readonly id: string;
  readonly sale_id: string;
  readonly payment_method: PaymentMethod;
  readonly bank_id: string | null;
  readonly bank_name_snapshot: string | null;
  readonly transaction_reference: string | null;
  readonly instrument_number: string | null;
  readonly amount: number;
  readonly payment_date: string;
  readonly depositor_name: string | null;
  readonly account_number_used: string | null;
  readonly notes: string | null;
  readonly attachment_path: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly recorded_by: string | null;
  readonly bank?: { readonly id: string; readonly name: string } | null;
  readonly transaction_ref?: string | null;
  [key: string]: unknown;
}

// --------------------
// RECEIPTS
// --------------------

export interface Receipt {
  readonly id: string;
  readonly sale_id: string;
  readonly receipt_number: string;
  readonly generated_by: string;
  readonly generated_at: string;
  readonly format_version: string;
  readonly qr_code_payload: string | null;
  readonly printed_count: number;
  readonly last_printed_at: string | null;
  readonly pdf_storage_path: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly sale?: Sale | null;
  readonly generated_by_profile?: { readonly full_name: string; readonly role: string } | null;
  [key: string]: unknown;
}

// --------------------
// ACTIVITY LOGS
// --------------------

export type ActivityAction =
  | "user_created"
  | "user_revoked"
  | "user_role_changed"
  | "sale_requested"
  | "sale_approved"
  | "sale_rejected"
  | "sale_completed"
  | "payment_recorded"
  | "receipt_generated"
  | "receipt_printed"
  | "stock_requested"
  | "stock_approved"
  | "stock_rejected"
  | "stock_applied"
  | "part_created"
  | "part_updated"
  | "part_sale_created"
  | "part_receipt_generated"
  | "part_sale_rejected"
  | "part_sale_approved"
  | "customer_created"
  | "customer_updated"
  | "seo_content_updated"
  | "login_success"
  | "login_failure"
  | "password_set_by_admin";

export interface ActivityLog {
  readonly id: string;
  readonly action: ActivityAction;
  readonly actor_id: string;
  readonly actor_role: ProfileRole | null;
  readonly target_table: string | null;
  readonly target_id: string | null;
  readonly summary: string;
  readonly metadata: Json | null;
  readonly created_at: string;
  readonly actor?: { readonly full_name: string; readonly role: string } | null;
  [key: string]: unknown;
}

// --------------------
// DERIVED / JOINED TYPES
// --------------------

export interface StockMovementWithDetails extends StockMovement {
  readonly variant?: {
    readonly id: string;
    readonly cc: number;
    readonly color_name: string;
    readonly quantity?: number;
    readonly current_stock?: number;
    readonly motorcycle: { readonly name: string; readonly brand: { readonly name: string } };
    [key: string]: unknown;
  } | null;
  readonly part?: {
    readonly name: string;
    readonly sku: string;
    readonly current_stock?: number;
    readonly unit_cost?: number;
    [key: string]: unknown;
  } | null;
  readonly requestor?: { readonly full_name: string; readonly role: string } | null;
  readonly approver?: { readonly full_name: string; readonly role: string } | null;
  readonly requested_by_profile?: { readonly full_name: string; readonly role: string } | null;
  readonly approved_by_profile?: { readonly full_name: string; readonly role: string } | null;
  readonly motorcycle_variant?: StockMovementWithDetails["variant"] | null;
  readonly part_info?: StockMovementWithDetails["part"] | null;
}

export interface SaleWithPayments extends Sale {
  readonly payments: readonly SalePayment[];
  readonly sale_payments?: readonly SalePayment[] | null;
  readonly customer?: Customer | null;
  readonly requestor?: { readonly full_name: string } | null;
  readonly approver?: { readonly full_name: string } | null;
}

export interface CustomerPurchaseHistory extends Customer {
  readonly sales: readonly SaleWithPayments[];
}

export interface ReceiptPrintPayload {
  readonly receipt: Receipt;
  readonly sale: Sale;
  readonly customer: Customer;
  readonly payments: readonly SalePayment[];
  readonly generatedBy: { readonly full_name: string; readonly role: string };
  readonly approvedBy?: { readonly full_name: string } | null;
  readonly receipt_number?: string;
  readonly generated_at?: string;
  [key: string]: unknown;
}
