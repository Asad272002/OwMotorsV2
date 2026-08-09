"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Direction = "up" | "left" | "right";

export function BrandReveal({ children, direction, className = "" }: Readonly<{ children: ReactNode; direction: Direction; className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform = direction === "up" ? "translate-y-6" : direction === "left" ? "-translate-x-10" : "translate-x-10";

  return <div ref={ref} className={`brand-reveal transition-all duration-700 ease-out ${visible ? "translate-x-0 translate-y-0 opacity-100" : `${hiddenTransform} opacity-0`} ${className}`}>
    {children}
    <noscript><style>{`.brand-reveal{opacity:1!important;transform:none!important}`}</style></noscript>
  </div>;
}
