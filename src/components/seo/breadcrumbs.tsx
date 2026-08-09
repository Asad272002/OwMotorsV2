import Link from "next/link";

export type BreadcrumbItem = Readonly<{ label: string; href?: string }>;
export function Breadcrumbs({ items }: Readonly<{ items: readonly BreadcrumbItem[] }>) {
  return <nav aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-2 text-[11px] leading-5 text-brand">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index ? <span aria-hidden="true">›</span> : null}{item.href ? <Link href={item.href} className="font-medium hover:underline">{item.label}</Link> : <span aria-current="page" className="font-bold text-near-black">{item.label}</span>}</li>)}</ol></nav>;
}
