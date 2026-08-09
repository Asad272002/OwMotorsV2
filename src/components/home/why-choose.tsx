import { Headphones, Shield, Star, Tag, Zap } from "lucide-react";
import { Section } from "@/components/ui/section";
import type { WhyChooseContent } from "@/lib/storefront/content";

const icons = { shield: Shield, star: Star, tag: Tag, headphones: Headphones, zap: Zap } as const;

export function WhyChoose({ content }: Readonly<{ content: WhyChooseContent }>) {
  if (!content.visible) return null;
  const cards = [...content.cards].filter((item) => item.visible).sort((a, b) => a.order - b.order);
  return (
    <Section labelledBy="why-choose-title" className="border-t border-border bg-white py-14 sm:py-20">
      <div className="mb-10 text-center sm:mb-14"><p className="text-eyebrow mb-3">{content.eyebrow}</p><h2 id="why-choose-title" className="text-display-lg">{content.heading}</h2></div>
      <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${cards.length >= 5 ? "lg:grid-cols-5" : cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {cards.map((item) => { const Icon = icons[item.icon]; return (
          <article key={item.title} className="group min-h-[220px] rounded-[22px] border border-border bg-white p-6 shadow-sm transition-all hover:-translate-y-1.5 hover:border-brand/45 hover:shadow-xl active:scale-[.99] active:border-brand/45 sm:min-h-[260px] motion-reduce:hover:translate-y-0">
            <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-brand/10"><Icon aria-hidden="true" className="h-[18px] w-[18px] text-brand" /></div>
            <h3 className="font-display text-lg font-bold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-cool-gray">{item.description}</p>
          </article>
        ); })}
      </div>
    </Section>
  );
}
