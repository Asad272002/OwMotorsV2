"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, UserPlus, UserCheck, FileText, ChevronDown, ChevronUp, Bike, PackageOpen } from "lucide-react";
import { AdminPageHeader, AdminPanel, StatusBadge, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { AdminForm } from "@/components/admin/admin-form.client";
import { createOrUpdateCustomer } from "@/app/admin/erp-actions/sales";

type Sale = { id: string; receipt_number: string; sale_status: string; requested_at: string; total_amount: number; brand_name_snapshot: string; motorcycle_name_snapshot: string; cc_snapshot: number; color_name_snapshot: string | null; chasis_number: string; quantity: number };
type PartPurchase = { id: string; sale_number: string; sold_at: string; total_amount: number; items?: Array<{ id: string; sku_snapshot: string; name_snapshot: string; quantity: number }> | null };
type Customer = {
  id: string; full_name: string; cnic: string; phone_primary: string | null; phone_secondary: string | null;
  address: string | null; city: string | null; chasis_numbers: string[] | null; notes: string | null;
  created_at: string;
  purchases?: Sale[];
  sales?: Sale[];
  partPurchases?: PartPurchase[];
  part_sales?: PartPurchase[];
};
function getCustomerPurchases(c: Customer): Sale[] {
  if (Array.isArray(c.purchases)) return c.purchases;
  if (Array.isArray((c as unknown as { sales?: unknown }).sales)) return ((c as unknown as { sales: Sale[] }).sales);
  return [];
}

function getCustomerPartPurchases(c: Customer): PartPurchase[] {
  if (Array.isArray(c.partPurchases)) return c.partPurchases;
  if (Array.isArray(c.part_sales)) return c.part_sales;
  return [];
}
function pkr(n: number): string {
  return "PKR " + (n || 0).toLocaleString("en-PK");
}

const statusMeta: Record<string, { badge: string; label: string }> = {
  pending_approval: { badge: "new", label: "Pending" },
  approved: { badge: "completed", label: "Approved" },
  rejected: { badge: "out_of_stock", label: "Rejected" },
  completed: { badge: "in_stock", label: "Completed" },
  cancelled: { badge: "archived", label: "Cancelled" },
};

export default function CustomersPageClient(props: {
  customers: Customer[];
  canEdit: boolean;
}) {
  const { customers, canEdit } = props;
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(c =>
      c.cnic.replace(/[^0-9]/g, "").includes(needle.replace(/[^0-9]/g, "")) ||
      c.full_name.toLowerCase().includes(needle) ||
      (c.phone_primary ?? "").replace(/[^0-9]/g, "").includes(needle.replace(/[^0-9]/g, "")) ||
      (c.chasis_numbers ?? []).some(x => x.toLowerCase().includes(needle)) ||
      getCustomerPurchases(c).some(p => p.chasis_number.toLowerCase().includes(needle) || p.receipt_number.toLowerCase().includes(needle)) ||
      getCustomerPartPurchases(c).some(p => p.sale_number.toLowerCase().includes(needle) || (p.items ?? []).some(item => item.sku_snapshot.toLowerCase().includes(needle) || item.name_snapshot.toLowerCase().includes(needle)))
    );
  }, [customers, q]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales & Customers"
        title="Customer Directory"
        description={canEdit
          ? "Register new customers and look up buyers by CNIC, chasis number, or phone number. Apprentices can search and view full records; Managers and Admins also edit/create."
          : "Apprentice view: look up customers by CNIC or chasis. Full customer record and purchase history appears below."}
        actions={canEdit ? (
          <a href="#new-customer" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#C62828] bg-[#C62828] px-4 text-sm font-semibold text-white hover:bg-[#A91F1F]"><UserPlus aria-hidden="true" className="h-4 w-4" />Register new customer</a>
        ) : undefined}
      />

      <AdminPanel title="Customer lookup" description="Type CNIC (with or without dashes), chasis number, phone, or name. Matches any part.">
        <div className="max-w-xl">
          <label className={adminLabelClass}>Search customers</label>
          <div className="relative mt-2">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input value={q} onChange={e => setQ(e.target.value)} className={`${adminInputClass} pl-10 font-display text-lg`} placeholder="e.g. 3520212345671, or chasis number…" autoFocus />
          </div>
        </div>
        <p className="mt-3 text-xs text-[#6B7280]">Showing {filtered.length} of {customers.length} total customers.</p>
      </AdminPanel>

      <AdminPanel
        title="Results"
        description={canEdit ? "Expand a customer to view full history, edit details, or start a new sale against them." : "Expand a customer to see full record and purchase history."}
      >
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#D1D5DB] px-6 py-12 text-center text-[#6B7280]">
            <UserCheck aria-hidden="true" className="mx-auto h-10 w-10 text-[#C62828]/60" />
            <p className="mt-3 text-sm">{q ? "No customer matches that search." : "No customers registered yet."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {filtered.map(c => {
              const open = openId === c.id;
              const customerPurchases = getCustomerPurchases(c);
              const partPurchases = getCustomerPartPurchases(c);
              const bikesOwned = new Set([
                ...(c.chasis_numbers ?? []),
                ...customerPurchases.filter(p => p.sale_status === "approved" || p.sale_status === "completed").map(p => p.chasis_number)
              ]);
              return (
                <li key={c.id} className="py-3">
                  <button type="button" onClick={() => setOpenId(open ? null : c.id)} className="flex w-full items-start justify-between gap-4 rounded-md p-2 text-left transition-colors hover:bg-[#FAFAFA]">
                    <div className="flex items-start gap-4">
                      <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bikesOwned.size > 0 ? "bg-green-100 text-[#15803D]" : "bg-gray-100 text-[#6B7280]"}`}><UserCheck aria-hidden="true" className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[#111111]">{c.full_name} <span className="ml-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C62828]">{bikesOwned.size} bike{bikesOwned.size === 1 ? "" : "s"}</span></p>
                        <p className="mt-0.5 text-xs text-[#6B7280]">
                          <span className="font-mono">{c.cnic}</span>
                          {c.phone_primary ? <> · <span className="font-mono">{c.phone_primary}</span></> : null}
                          {c.city ? <> · {c.city}</> : null}
                        </p>
                      </div>
                    </div>
                    {open ? <ChevronUp aria-hidden="true" className="mt-3 h-5 w-5 shrink-0 text-[#6B7280]" /> : <ChevronDown aria-hidden="true" className="mt-3 h-5 w-5 shrink-0 text-[#6B7280]" />}
                  </button>
                  {open ? (
                    <div className="mt-4 grid grid-cols-1 gap-6 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-5 md:grid-cols-3 lg:grid-cols-4">
                      <div className="md:col-span-2">
                        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Identity & Contact</h3>
                        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
                          <div><dt className="text-[#6B7280]">Full name</dt><dd className="font-semibold">{c.full_name}</dd></div>
                          <div><dt className="text-[#6B7280]">CNIC</dt><dd className="font-mono">{c.cnic}</dd></div>
                          <div><dt className="text-[#6B7280]">Phone</dt><dd className="font-mono">{c.phone_primary ?? "-"}{c.phone_secondary ? <><br />{c.phone_secondary}</> : null}</dd></div>
                          <div><dt className="text-[#6B7280]">City</dt><dd>{c.city ?? "-"}</dd></div>
                          <div className="sm:col-span-2"><dt className="text-[#6B7280]">CNIC Address</dt><dd className="text-[#374151]">{c.address ?? "-"}</dd></div>
                          <div className="sm:col-span-2"><dt className="text-[#6B7280]">Notes</dt><dd className="text-[#374151]">{c.notes ?? "-"}</dd></div>
                        </dl>
                        {canEdit ? (
                          <details className="group mt-5">
                            <summary className="cursor-pointer rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F7F7F8]">Edit customer details</summary>
                            <div className="mt-3 rounded-md border border-[#E5E7EB] bg-white p-4">
                              <AdminForm action={createOrUpdateCustomer} submitLabel="Save customer" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <input type="hidden" name="id" value={c.id} />
                                <div><label className={adminLabelClass}>Full name</label><input name="fullName" defaultValue={c.full_name} required className={adminInputClass} /></div>
                                <div><label className={adminLabelClass}>CNIC</label><input name="cnic" defaultValue={c.cnic} required pattern="^([0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9]{1})$" className={adminInputClass} /></div>
                                <div><label className={adminLabelClass}>Phone primary</label><input name="phonePrimary" defaultValue={c.phone_primary ?? ""} className={adminInputClass} /></div>
                                <div><label className={adminLabelClass}>Phone secondary</label><input name="phoneSecondary" defaultValue={c.phone_secondary ?? ""} className={adminInputClass} /></div>
                                <div><label className={adminLabelClass}>City</label><input name="city" defaultValue={c.city ?? ""} className={adminInputClass} /></div>
                                <div className="md:col-span-2"><label className={adminLabelClass}>Address</label><input name="address" defaultValue={c.address ?? ""} className={adminInputClass} /></div>
                                <div className="md:col-span-2"><label className={adminLabelClass}>Notes</label><textarea name="notes" defaultValue={c.notes ?? ""} className={`${adminInputClass} min-h-[72px]`} /></div>
                              </AdminForm>
                            </div>
                          </details>
                        ) : null}
                      </div>

                      <div className="lg:col-span-2">
                        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Purchase history</h3>
                        <div className="mt-3 space-y-2">
                          {customerPurchases.length === 0 && partPurchases.length === 0 ? (
                            <div className="flex items-center gap-3 rounded-md border border-dashed border-[#D1D5DB] bg-white p-4 text-xs text-[#6B7280]">
                              <FileText aria-hidden="true" className="h-5 w-5 text-[#C62828]/60" />
                              No purchases on record yet.
                              {canEdit ? (
                                <Link href="/admin/sales/new" className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-[#C62828] bg-white px-2 text-[11px] font-semibold text-[#C62828]">+ New sale for this customer</Link>
                              ) : null}
                            </div>
                          ) : (<>
                            {customerPurchases.map(p => {
                            const meta = statusMeta[p.sale_status] ?? statusMeta.pending_approval;
                            return (
                              <div key={p.id} className="flex items-start gap-3 rounded-md border border-[#E5E7EB] bg-white p-3">
                                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#FEF2F2] text-[#C62828]"><Bike aria-hidden="true" className="h-4 w-4" /></span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-[#111111]">{p.brand_name_snapshot} {p.motorcycle_name_snapshot}</p>
                                    <StatusBadge value={meta.badge} label={meta.label} />
                                  </div>
                                  <p className="mt-0.5 text-xs text-[#6B7280]">{p.cc_snapshot}cc · {p.color_name_snapshot ?? "—"} · × {p.quantity} · <span className="font-mono">chasis {p.chasis_number}</span></p>
                                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                                    <p className="font-display text-lg font-bold text-[#C62828]">{pkr(p.total_amount)}</p>
                                    <div className="flex items-center gap-3 text-[11px] text-[#6B7280]">
                                      <span className="font-mono">{p.receipt_number}</span>
                                      <span>{new Date(p.requested_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                            {partPurchases.map(p => (
                              <div key={p.id} className="flex items-start gap-3 rounded-md border border-[#E5E7EB] bg-white p-3">
                                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-50 text-[#15803D]"><PackageOpen aria-hidden="true" className="h-4 w-4" /></span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#111111]">Spare parts</p><StatusBadge value="completed" label="Completed" /></div>
                                  <p className="mt-0.5 text-xs text-[#6B7280]">{(p.items ?? []).map(item => `${item.sku_snapshot} x ${item.quantity}`).join(" | ") || "Parts sale"}</p>
                                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="font-display text-lg font-bold text-[#C62828]">{pkr(p.total_amount)}</p><div className="flex items-center gap-3 text-[11px] text-[#6B7280]"><span className="font-mono">{p.sale_number}</span><span>{new Date(p.sold_at).toLocaleDateString()}</span><Link href={`/admin/stock/part-sales/${p.id}`} className="font-semibold text-[#C62828] hover:underline">Receipt</Link></div></div>
                                </div>
                              </div>
                            ))}
                          </>)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      {canEdit ? (
        <section id="new-customer">
          <AdminPanel title="Register a new customer" description="Save before starting a sale if you want the customer record linked. Or, create inline during sale creation.">
            <AdminForm action={createOrUpdateCustomer} submitLabel="Save new customer" className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div><label className={adminLabelClass}>Full name (required)</label><input name="fullName" required className={adminInputClass} placeholder="e.g. Rashid Mehmood" /></div>
              <div><label className={adminLabelClass}>CNIC (13 digits, required)</label><input name="cnic" required pattern="^([0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9]{1})$" className={adminInputClass} placeholder="3520212345671" /></div>
              <div><label className={adminLabelClass}>Phone primary</label><input name="phonePrimary" pattern="^\+?[0-9 -]{10,20}$" className={adminInputClass} placeholder="+92 300 1234567" /></div>
              <div><label className={adminLabelClass}>Phone secondary</label><input name="phoneSecondary" className={adminInputClass} /></div>
              <div><label className={adminLabelClass}>City</label><input name="city" className={adminInputClass} /></div>
              <div><label className={adminLabelClass}>Address (as per CNIC)</label><input name="address" className={adminInputClass} /></div>
              <div className="md:col-span-3"><label className={adminLabelClass}>Notes</label><textarea name="notes" className={`${adminInputClass} min-h-[72px]`} /></div>
            </AdminForm>
          </AdminPanel>
        </section>
      ) : null}
    </div>
  );
}

