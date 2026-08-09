"use client";

import { AdminErrorState } from "@/components/admin/admin-ui";

export default function AdminError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <AdminErrorState title="This dashboard view is unavailable" description="Your data was not changed. Check your connection, then try loading this workspace again." action={<button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#C62828] bg-[#C62828] px-5 text-sm font-semibold text-white transition-colors hover:border-[#A91F1F] hover:bg-[#A91F1F]">Try again</button>} />;
}
