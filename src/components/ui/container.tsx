type ContainerProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section";
}>;

export function Container({ children, className = "", as: Element = "div" }: ContainerProps) {
  return (
    <Element className={`mx-auto w-full max-w-[var(--container-width)] px-[var(--page-gutter)] ${className}`}>
      {children}
    </Element>
  );
}
