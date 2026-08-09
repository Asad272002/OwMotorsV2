import type { TechnicalGroup } from "@/data/products";
import { Section } from "@/components/ui/section";

export function DetailedSpecifications({ groups }: Readonly<{ groups: readonly TechnicalGroup[] }>) {
  if (!groups.length) return null;
  return <Section labelledBy="detailed-specifications-title" className="border-t border-border bg-white py-16" containerClassName="max-w-5xl"><h2 id="detailed-specifications-title" className="text-display-lg">Detailed Technical Specifications</h2><p className="mt-3 text-sm text-cool-gray">Expand each section for in-depth technical information.</p><div className="mt-8 border-t border-border">{groups.map((group) => <details key={group.title} className="group border-x border-b border-border"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-sm font-semibold">{group.title}<span aria-hidden="true" className="transition-transform group-open:rotate-45">＋</span></summary><dl className="border-t border-border bg-soft-gray px-5 py-3">{group.items.map((item) => <div key={item.label} className="grid grid-cols-2 gap-4 border-b border-border py-2 text-sm last:border-0"><dt className="font-semibold">{item.label}</dt><dd className="text-cool-gray">{item.value}</dd></div>)}</dl></details>)}</div></Section>;
}
