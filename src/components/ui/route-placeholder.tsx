import Link from "next/link";
import { Section } from "@/components/ui/section";

type RoutePlaceholderProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function RoutePlaceholder({ eyebrow, title, description }: RoutePlaceholderProps) {
  return (
    <Section className="min-h-[58vh] bg-soft-gray" containerClassName="max-w-4xl">
      <p className="text-eyebrow mb-5">{eyebrow}</p>
      <h1 className="text-display-lg max-w-3xl">{title}</h1>
      <p className="text-body-lg mt-6 max-w-2xl">{description}</p>
      <Link href="/motorcycles" className="ow-button-primary mt-9">
        Explore motorcycles
      </Link>
    </Section>
  );
}
