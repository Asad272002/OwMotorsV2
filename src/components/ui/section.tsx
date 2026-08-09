import { Container } from "@/components/ui/container";

type SectionProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  labelledBy?: string;
}>;

export function Section({ children, className = "", containerClassName = "", labelledBy }: SectionProps) {
  return (
    <section aria-labelledby={labelledBy} className={`py-[var(--section-space)] ${className}`}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
