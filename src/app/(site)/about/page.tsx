import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/ui/route-placeholder";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "About OW Motors",
  description: "Learn about OW Motors and its multi-brand motorcycle range from Taro, Lifan, Hi-Speed, and Super Star.",
  path: "/about",
});

export default function AboutPage() {
  return <RoutePlaceholder eyebrow="About OW Motors" title="Driven by the ride" description="OW Motors brings motorcycles from Taro, Lifan, Hi-Speed, and Super Star together in one multi-brand range." />;
}
