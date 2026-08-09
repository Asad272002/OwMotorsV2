import { CheckCircle2, CircleAlert, Inbox, LoaderCircle, TriangleAlert, type LucideIcon } from "lucide-react";

export const adminInputClass = "mt-2 min-h-11 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-sm text-[#111111] shadow-[0_1px_2px_rgb(0_0_0/0.03)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#9CA3AF] hover:border-[#9CA3AF] focus:border-[#C62828] focus:ring-3 focus:ring-[#C62828]/10";
export const adminTextareaClass = `${adminInputClass} py-3 leading-6`;
export const adminLabelClass = "block text-sm font-semibold text-[#374151]";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}>) {
  return (
    <header className="mb-7 flex flex-col justify-between gap-5 border-b border-[#E5E7EB] pb-6 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C62828]">{eyebrow}</p>
        <h1 className="font-display text-[2.25rem] font-bold leading-[1.05] tracking-[-0.02em] text-[#111111] sm:text-[2.75rem]">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6B7280] sm:text-[15px]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">{actions}</div> : null}
    </header>
  );
}

export function AdminPanel({
  title,
  description,
  children,
  id,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
  actions?: React.ReactNode;
}>) {
  return (
    <section id={id} className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <header className="flex flex-col justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight text-[#111111]">{title}</h2>
          {description ? <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[#6B7280]">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

const statusStyles: Record<string, string> = {
  active: "border-green-200 bg-green-50 text-[#15803D]",
  complete: "border-green-200 bg-green-50 text-[#15803D]",
  published: "border-green-200 bg-green-50 text-[#15803D]",
  in_stock: "border-green-200 bg-green-50 text-[#15803D]",
  resolved: "border-green-200 bg-green-50 text-[#15803D]",
  completed: "border-green-200 bg-green-50 text-[#15803D]",
  draft: "border-amber-200 bg-amber-50 text-[#B45309]",
  needs_attention: "border-amber-200 bg-amber-50 text-[#B45309]",
  incomplete: "border-red-200 bg-red-50 text-[#C62828]",
  new: "border-blue-200 bg-blue-50 text-blue-700",
  in_progress: "border-amber-200 bg-amber-50 text-[#B45309]",
  contacted: "border-blue-200 bg-blue-50 text-blue-700",
  scheduled: "border-violet-200 bg-violet-50 text-violet-700",
  coming_soon: "border-amber-200 bg-amber-50 text-[#B45309]",
  archived: "border-gray-200 bg-gray-100 text-gray-600",
  inactive: "border-gray-200 bg-gray-100 text-gray-600",
  out_of_stock: "border-red-200 bg-red-50 text-[#C62828]",
  discontinued: "border-gray-300 bg-gray-100 text-gray-700",
  cancelled: "border-red-200 bg-red-50 text-[#C62828]",
  spam: "border-gray-300 bg-gray-100 text-gray-700",
};

export function StatusBadge({ value, label }: Readonly<{ value: string; label?: string }>) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize leading-none ${statusStyles[value] ?? "border-gray-200 bg-gray-100 text-gray-600"}`}>{label ?? value.replaceAll("_", " ")}</span>;
}

export function DraftPublishedStatus({ status }: Readonly<{ status: "draft" | "published" | "archived" }>) {
  return <StatusBadge value={status} label={status === "published" ? "Published" : status === "draft" ? "Draft" : "Archived"} />;
}

export function SaveStatus({ status, message }: Readonly<{ status: "idle" | "saving" | "saved" | "error"; message?: string }>) {
  const config = {
    idle: { icon: CircleAlert, text: message ?? "Ready to save", className: "text-[#6B7280]" },
    saving: { icon: LoaderCircle, text: message ?? "Saving changes…", className: "text-[#6B7280]" },
    saved: { icon: CheckCircle2, text: message ?? "Changes saved", className: "text-[#15803D]" },
    error: { icon: TriangleAlert, text: message ?? "Changes were not saved", className: "text-[#C62828]" },
  }[status];
  const Icon = config.icon;
  return <span role="status" aria-live="polite" className={`inline-flex min-h-8 items-center gap-2 text-xs font-semibold ${config.className}`}><Icon aria-hidden="true" className={`h-4 w-4 ${status === "saving" ? "animate-spin motion-reduce:animate-none" : ""}`} />{config.text}</span>;
}

export function AdminEmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: Readonly<{
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}>) {
  return (
    <section className="rounded-lg border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgb(0_0_0/0.03)] sm:py-16">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-[#C62828]"><Icon aria-hidden="true" className="h-6 w-6" /></span>
      <h2 className="mt-4 font-display text-2xl font-bold text-[#111111]">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#6B7280]">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}

export function AdminErrorState({ title, description, action }: Readonly<{ title: string; description: string; action?: React.ReactNode }>) {
  return (
    <section className="rounded-lg border border-red-200 bg-white p-7 text-center shadow-sm sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-[#C62828]"><TriangleAlert aria-hidden="true" className="h-6 w-6" /></span>
      <h1 className="mt-4 font-display text-3xl font-bold text-[#111111]">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6B7280]">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}

export function AdminSkeleton({ className = "h-24" }: Readonly<{ className?: string }>) {
  return <div aria-hidden="true" className={`admin-skeleton animate-pulse rounded-lg bg-[#E5E7EB] motion-reduce:animate-none ${className}`} />;
}
