import { ArrowRight, CheckCircle2, Clock3, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader, AdminPanel, StatusBadge } from "@/components/admin/admin-ui";

type WorkspaceAction = { href: string; label: string; description: string; icon: LucideIcon };

export function AdminWorkspaceOverview({
  eyebrow,
  title,
  description,
  availableNow,
  planned,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  availableNow: readonly WorkspaceAction[];
  planned: readonly string[];
}>) {
  return (
    <>
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} actions={<StatusBadge value="draft" label="Stage 1 workspace" />} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <AdminPanel title="Available now" description="Continue using the existing, secured workflows while this page-oriented workspace is introduced.">
          <ul className="grid gap-3 sm:grid-cols-2">
            {availableNow.map((action) => {
              const Icon = action.icon;
              return (
                <li key={`${action.href}-${action.label}`}>
                  <Link href={action.href} className="group flex min-h-28 h-full items-start gap-4 rounded-md border border-[#E5E7EB] p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-[#C62828] hover:bg-[#FEF2F2] hover:shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#FEF2F2] text-[#C62828]"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><strong className="block text-sm text-[#111111]">{action.label}</strong><span className="mt-1 block text-xs leading-5 text-[#6B7280]">{action.description}</span></span>
                    <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#C62828] motion-reduce:transform-none" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </AdminPanel>
        <AdminPanel title="Next in this workspace" description="These controls need the approved section-content foundation before they can safely publish to the website.">
          <ul className="space-y-3">
            {planned.map((item) => <li key={item} className="flex gap-3 text-sm leading-5 text-[#374151]"><Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" /><span>{item}</span></li>)}
          </ul>
          <div className="mt-5 flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3 text-xs leading-5 text-[#15803D]"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>Authentication, permissions, validation, and current publishing safeguards remain active.</p></div>
        </AdminPanel>
      </div>
    </>
  );
}
