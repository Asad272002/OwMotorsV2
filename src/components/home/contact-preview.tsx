import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Section } from "@/components/ui/section";
import type { ContactPreviewContent } from "@/lib/storefront/content";

export function ContactPreview({ content }: Readonly<{ content: ContactPreviewContent }>) {
  if (!content.visible) return null;
  const items = [
    { Icon: MapPin, label: "Location", text: content.location },
    { Icon: Phone, label: "Phone", text: content.phone },
    { Icon: Mail, label: "Email", text: content.email },
    { Icon: Clock, label: "Opening Hours", text: content.openingHours },
  ] as const;
  return (
    <Section labelledBy="contact-preview-title" className="border-t border-border bg-white py-14 sm:py-20">
      <p className="text-eyebrow mb-3">{content.eyebrow}</p><h2 id="contact-preview-title" className="text-display-lg">{content.heading}</h2>
      <div className="mt-9 grid items-start gap-10 md:mt-12 md:grid-cols-2 md:gap-12">
        <div className="space-y-8">{items.map(({ Icon, label, text }) => <div key={label} className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center bg-soft-gray"><Icon aria-hidden="true" className="h-[17px] w-[17px] text-brand" /></div><div><h3 className="text-sm font-semibold">{label}</h3><p className="mt-1 text-sm text-cool-gray">{text}</p></div></div>)}</div>
        <div className="flex min-h-[380px] flex-col items-center justify-center border border-border bg-soft-gray px-6 text-center"><MapPin aria-hidden="true" className="mb-3 h-11 w-11 text-border" /><p className="text-sm text-cool-gray">{content.mapMessage}</p><Link href={content.ctaHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand">{content.ctaLabel} <span aria-hidden="true">→</span></Link></div>
      </div>
    </Section>
  );
}
