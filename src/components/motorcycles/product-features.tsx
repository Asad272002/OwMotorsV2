import type { ProductFeatureGroup } from "@/data/products";
import { Container } from "@/components/ui/container";

export function ProductFeatures({ features }: Readonly<{ features: readonly ProductFeatureGroup[] }>) {
  if (!features.length) return null;
  return <section aria-labelledby="product-features-title" className="border-t border-border bg-white py-16"><Container><p className="text-eyebrow mb-2">What You Get</p><h2 id="product-features-title" className="text-display-lg">Features</h2><p className="mt-3 text-sm text-cool-gray">Explore the performance, safety, comfort, design, and technology features of this motorcycle.</p><div className="mt-9 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">{features.map((group) => <article key={group.title} className="border border-border bg-soft-gray p-5"><h3 className="flex items-center gap-2 border-b border-border pb-4 font-display text-lg font-bold"><span className="text-brand">{group.icon}</span>{group.title}</h3><div className="space-y-4 pt-4">{group.items.map((feature) => <div key={feature.title}><h4 className="text-sm font-semibold">{feature.title}</h4><p className="mt-1 text-xs leading-5 text-cool-gray">{feature.description}</p></div>)}</div></article>)}</div></Container></section>;
}
