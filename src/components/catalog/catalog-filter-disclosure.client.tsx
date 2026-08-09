"use client";

import { useEffect, useRef, useState } from "react";

export function CatalogFilterDisclosure({ children }: Readonly<{ children: React.ReactNode }>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (detailsRef.current) detailsRef.current.open = false;
      setOpen(false);
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <details
      ref={detailsRef}
      className="catalog-filter-disclosure mb-5 border border-border bg-white lg:hidden"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        ref={summaryRef}
        aria-expanded={open}
        className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold focus-visible:!outline-none [&::-webkit-details-marker]:hidden"
      >
        <span className="catalog-filter-open-label">Filter motorcycles</span>
        <span className="catalog-filter-close-label hidden">Close filters</span>
        <span aria-hidden="true">&#9776;</span>
      </summary>
      <div className="catalog-filter-panel">{children}</div>
    </details>
  );
}
