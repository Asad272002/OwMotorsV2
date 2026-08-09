import type { ProductFaq } from "@/data/products";
import { Section } from "@/components/ui/section";

export function ProductFaqs({ faqs }: Readonly<{ faqs: readonly ProductFaq[] }>) {
  if (!faqs.length) return null;
  return <Section labelledBy="product-faq-title" className="border-t border-border bg-white py-16" containerClassName="max-w-4xl"><p className="text-eyebrow mb-2">Questions</p><h2 id="product-faq-title" className="text-display-lg">Frequently Asked Questions</h2><div className="mt-8 border-t border-border">{faqs.map((faq) => <details key={faq.question} className="group border-b border-border"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-bold">{faq.question}<span aria-hidden="true" className="text-brand group-open:rotate-45">＋</span></summary><p className="pb-5 text-sm leading-7 text-cool-gray">{faq.answer}</p></details>)}</div></Section>;
}
