import { AdminSkeleton } from "@/components/admin/admin-ui";

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard content" className="space-y-7">
      <div className="space-y-3 border-b border-[#E5E7EB] pb-6"><AdminSkeleton className="h-3 w-28" /><AdminSkeleton className="h-11 w-[min(24rem,80vw)]" /><AdminSkeleton className="h-4 w-[min(36rem,90vw)]" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <AdminSkeleton key={item} className="h-32" />)}</div>
      <div className="grid gap-6 xl:grid-cols-2"><AdminSkeleton className="h-72" /><AdminSkeleton className="h-72" /></div>
      <span className="sr-only">Loading admin content…</span>
    </div>
  );
}
