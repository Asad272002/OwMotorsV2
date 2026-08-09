import Link from "next/link";
import {
  Bike, BadgeDollarSign, UserCheck, Users, PackageSearch, History, FileCheck, FilePenLine,
  AlertTriangle, ArrowRight, CheckCircle2, Clock, ShieldCheck
} from "lucide-react";
import { AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";
import { getAuthenticatedProfile } from "@/lib/supabase/auth";
import {
  listPendingSales, listPendingStockMovements, listSales, listCustomers,
  listStockMovements, listActivityLogs, listMotorcycleVariantsForSale
} from "@/lib/erp/queries";

export const metadata = { title: "Dashboard" };

function pkr(n: number): string {
  return "PKR " + (n || 0).toLocaleString("en-PK");
}

export default async function AdminDashboardPage() {
  const actor = await getAuthenticatedProfile();
  const role = actor?.profile.role ?? "apprentice";

  type Role = "developer" | "admin" | "manager" | "apprentice";
  const roleTyped = role as Role;
  const [
    pendingSales, pendingStock, sales, customers,
    movements, logs, variants
  ] = await Promise.all([
    listPendingSales(),
    listPendingStockMovements(),
    listSales(),
    roleTyped === "apprentice" ? Promise.resolve([] as Awaited<ReturnType<typeof listCustomers>>) : listCustomers(),
    listStockMovements(),
    roleTyped === "apprentice" || roleTyped === "manager" ? Promise.resolve([] as Awaited<ReturnType<typeof listActivityLogs>>) : listActivityLogs(20),
    listMotorcycleVariantsForSale(),
  ]);

  const totalSalesValue = sales.filter(s => s.sale_status === "completed" || s.sale_status === "approved")
    .reduce((t, s) => t + (s.total_amount ?? 0), 0);
  const totalStockQty = variants.reduce((t, v) => t + (v.quantity ?? 0), 0);
  const lowStockCount = variants.filter(v => (v.quantity ?? 0) <= 1 && v.stock_status !== "out_of_stock").length;

  const cards = [
    { label: "Pending Sale Approvals", value: pendingSales.length, icon: FileCheck, tone: pendingSales.length ? "text-[#D97706] bg-amber-50" : "text-[#15803D] bg-green-50", href: "/admin/sales/approvals", role: ["admin", "developer"] },
    { label: "Pending Stock Changes", value: pendingStock.length, icon: History, tone: pendingStock.length ? "text-[#D97706] bg-amber-50" : "text-[#15803D] bg-green-50", href: "/admin/stock/approvals", role: ["admin", "developer"] },
    { label: "Total Sales Approved", value: pkr(totalSalesValue), icon: BadgeDollarSign, tone: "text-[#C62828] bg-[#FEF2F2]", href: "/admin/sales/list", role: ["admin", "manager", "developer"] },
    { label: "Total Bikes In Stock", value: totalStockQty, icon: Bike, tone: "text-[#15803D] bg-green-50", href: "/admin/stock/availability", role: ["admin", "manager", "developer"] },
    { label: "Low Stock Alerts", value: lowStockCount, icon: AlertTriangle, tone: lowStockCount ? "text-[#C62828] bg-[#FEF2F2]" : "text-[#6B7280] bg-gray-100", href: "/admin/stock/availability", role: ["admin", "manager", "developer"] },
    { label: "Customer Records", value: customers.length, icon: Users, tone: "text-[#111111] bg-[#F7F7F8]", href: "/admin/customers", role: ["admin", "manager", "developer", "apprentice"] },
  ].filter(c => c.role.includes(roleTyped));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={`${role.toUpperCase()} Workspace`}
        title={`Welcome, ${actor?.profile.full_name.split(" ")[0] ?? "team"}`}
        description={
          role === "developer" ? "Developer access: complete inventory, SEO content, brands, and ERP controls." :
          role === "admin" ? "Approve pending sales and stock changes, manage users, and review the audit trail." :
          role === "manager" ? "Initiate new bike sales, record payments, manage customers, and request stock changes." :
          "Apprentice access: look up customers by CNIC/chasis and check whether bikes are in stock by color."
        }
      />

      <section aria-label="Summary cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, tone, href }) => (
          <Link key={label} href={href} className="group flex flex-col justify-between rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm transition-[border,transform] duration-200 hover:-translate-y-0.5 hover:border-[#C62828] hover:shadow-md">
            <div className="flex items-start justify-between">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${tone}`}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-[#D1D5DB] transition-colors group-hover:text-[#C62828]" />
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">{label}</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#111111]">{value}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {(role === "admin" || role === "developer") && (
          <AdminPanel
            title="Approvals required"
            description="Approve these before stock is deducted and receipts are generated."
            actions={<Link href="/admin/sales/approvals" className="text-xs font-semibold text-[#C62828] hover:underline">Open approvals →</Link>}
          >
            {pendingSales.length === 0 && pendingStock.length === 0 ? (
              <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-[#15803D]">
                <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0" />
                <div><strong className="font-semibold">All caught up.</strong><p className="mt-0.5 text-xs opacity-80">No pending approvals right now.</p></div>
              </div>
            ) : (
              <ul className="space-y-3">
                {pendingSales.map(s => (
                  <li key={s.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/60 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#D97706]"><Clock aria-hidden="true" className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111111]">Sale {s.receipt_number} — {s.brand_name_snapshot} {s.motorcycle_name_snapshot}</p>
                        <p className="mt-0.5 text-xs text-[#6B7280]">{s.cc_snapshot}cc · {s.color_name_snapshot} · {pkr(s.total_amount)}</p>
                      </div>
                    </div>
                    <StatusBadge value="new" label="Awaiting approval" />
                  </li>
                ))}
                {pendingStock.map(m => (
                  <li key={m.id} className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50/60 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-blue-700"><PackageSearch aria-hidden="true" className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111111]">Stock {m.movement_type.replaceAll("_", " ")} × {m.quantity}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#6B7280]">{m.reason}</p>
                      </div>
                    </div>
                    <StatusBadge value="new" label="Awaiting approval" />
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        )}

        {(role === "manager" || role === "admin" || role === "developer") ? (
          <AdminPanel
            title="Quick actions"
            description="Most used manager workflow shortcuts."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/admin/sales/new" className="inline-flex min-h-20 items-center gap-3 rounded-md bg-red-700 p-4 text-sm font-semibold text-white shadow-sm ring-1 ring-red-800 transition-colors hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                <BadgeDollarSign aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span>Record new bike sale</span>
                <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 opacity-80" />
              </Link>
              <Link
                href="/admin/customers"
                className="inline-flex min-h-20 items-center gap-3 rounded-md bg-black p-4 text-sm font-semibold shadow-sm ring-1 ring-black transition-colors hover:bg-[#111111] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                style={{ color: "#FFFFFF" }}
              >
                <UserCheck aria-hidden="true" className="h-5 w-5 shrink-0" style={{ color: "#FFFFFF" }} />
                <span style={{ color: "#FFFFFF" }}>Register customer</span>
                <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 opacity-80" style={{ color: "#FFFFFF" }} />
              </Link>
              <Link href="/admin/stock/movements" className="inline-flex min-h-20 items-center gap-3 rounded-md bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-300 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
                <FilePenLine aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span>Add / remove stock</span>
                <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 opacity-70" />
              </Link>
              <Link href="/admin/receipts" className="inline-flex min-h-20 items-center gap-3 rounded-md bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-300 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
                <FileCheck aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span>Find printed receipt</span>
                <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 opacity-70" />
              </Link>
            </div>

            <div className="mt-6 border-t border-[#E5E7EB] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Today&apos;s overview</p>
              <dl className="mt-3 divide-y divide-[#F3F4F6] text-sm">
                <div className="flex justify-between py-2"><dt className="text-[#6B7280]">Sales initiated</dt><dd className="font-semibold text-[#111111]">{sales.filter(s => new Date(s.requested_at).toDateString() === new Date().toDateString()).length}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-[#6B7280]">Stock changes</dt><dd className="font-semibold text-[#111111]">{movements.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString()).length}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-[#6B7280]">Active bike variants</dt><dd className="font-semibold text-[#111111]">{variants.length}</dd></div>
              </dl>
            </div>
          </AdminPanel>
        ) : (
          <AdminPanel
            title="Apprentice quick actions"
            description="Look up customers and bike availability."
          >
            <div className="grid grid-cols-1 gap-3">
              <Link href="/admin/customers" className="inline-flex min-h-16 items-center gap-3 rounded-md bg-[#C62828] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#A91F1F]"><UserCheck aria-hidden="true" className="h-5 w-5" />Lookup customer by CNIC or chasis number</Link>
              <Link href="/admin/stock/availability" className="inline-flex min-h-16 items-center gap-3 rounded-md border border-[#111111] px-4 text-sm font-semibold text-[#111111] hover:bg-[#F7F7F8]"><Bike aria-hidden="true" className="h-5 w-5" />Check if a bike / color is available in stock</Link>
            </div>
          </AdminPanel>
        )}
      </section>

      {(role === "admin" || role === "developer") && logs.length > 0 && (
        <AdminPanel
          title="Recent activity"
          description="Latest 10 events in the audit trail."
          actions={<Link href="/admin/activity" className="text-xs font-semibold text-[#C62828] hover:underline">View all activity →</Link>}
        >
          <ol className="divide-y divide-[#E5E7EB]">
            {logs.slice(0, 10).map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-3">
                <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${l.action.includes("approved") || l.action.includes("completed") ? "bg-green-100 text-green-700" : l.action.includes("reject") || l.action.includes("revoke") ? "bg-red-100 text-red-700" : l.action.includes("request") ? "bg-blue-100 text-blue-700" : l.action.includes("create") ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#111111]">{String(l.action).replaceAll("_", " ")}</p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    {String(l.actor_role_snapshot ?? "system").toUpperCase()} · {new Date(l.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </AdminPanel>
      )}
    </div>
  );
}
