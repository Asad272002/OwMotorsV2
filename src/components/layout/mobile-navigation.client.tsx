"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavigationMotorcycle } from "@/data/catalog";
import { HeaderMotorcycleSearch } from "@/components/layout/header-motorcycle-search.client";

type MobileNavigationProps = Readonly<{
  pathname: string;
  categories: readonly Readonly<{ label: string; href: string }>[];
  brands: readonly Readonly<{ id: string; name: string; href: string; logo: string; megaMenuLogo: string | null }>[];
  motorcycles: readonly NavigationMotorcycle[];
}>;

function activePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavigation({ pathname, categories, brands, motorcycles }: MobileNavigationProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuRef.current) menuRef.current.open = false;
      setOpen(false);
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const rowClass = (active: boolean) => `flex min-h-12 touch-manipulation items-center px-6 text-sm font-medium transition-colors active:bg-soft-gray ${active ? "bg-soft-gray text-brand" : "text-near-black"}`;

  return (
    <details ref={menuRef} className="group/mobile lg:hidden" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        ref={summaryRef}
        aria-label="Toggle navigation menu"
        aria-controls="mobile-navigation"
        aria-expanded={open}
        className="relative flex h-11 w-11 cursor-pointer list-none touch-manipulation items-center justify-center rounded-sm transition-colors focus-visible:!outline-none [&::-webkit-details-marker]:hidden"
      >
        <span className="sr-only">Menu</span>
        <span className="absolute h-0.5 w-[18px] -translate-y-[6px] rounded bg-near-black transition-transform group-open/mobile:translate-y-0 group-open/mobile:rotate-45" />
        <span className="absolute h-0.5 w-[18px] rounded bg-near-black transition-opacity group-open/mobile:opacity-0" />
        <span className="absolute h-0.5 w-[18px] translate-y-[6px] rounded bg-near-black transition-transform group-open/mobile:translate-y-0 group-open/mobile:-rotate-45" />
      </summary>

      <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-nav-enter fixed inset-x-0 top-16 z-[100] max-h-[calc(100vh-4rem)] max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl">
        <ul>
          <li className="border-b border-border">
            <Link href="/" onClick={closeMenu} aria-current={pathname === "/" ? "page" : undefined} className={rowClass(pathname === "/")}>Home</Link>
          </li>
          <li className="border-b border-border">
            <Link href="/motorcycles" onClick={closeMenu} aria-current={activePath(pathname, "/motorcycles") ? "page" : undefined} className={rowClass(activePath(pathname, "/motorcycles"))}>Motorcycles</Link>
            {categories.length ? <details className="group/sub border-t border-border bg-soft-gray">
              <summary className="flex min-h-11 cursor-pointer list-none touch-manipulation items-center justify-between px-6 text-xs font-semibold uppercase tracking-[0.14em] text-cool-gray active:text-brand [&::-webkit-details-marker]:hidden">
                Browse categories
                <span aria-hidden="true" className="transition-transform group-open/sub:rotate-180">⌄</span>
              </summary>
              <ul className="mobile-submenu-enter border-t border-border px-6 py-1">
                {categories.map((category) => <li key={category.href}><Link href={category.href} onClick={closeMenu} className="flex min-h-11 touch-manipulation items-center text-sm text-cool-gray active:translate-x-1 active:text-brand">{category.label}</Link></li>)}
              </ul>
            </details> : null}
          </li>
          <li className="border-b border-border">
            <Link href="/brands" onClick={closeMenu} aria-current={activePath(pathname, "/brands") ? "page" : undefined} className={rowClass(activePath(pathname, "/brands"))}>Brands</Link>
            {brands.length ? <details className="group/sub border-t border-border bg-soft-gray">
              <summary className="flex min-h-11 cursor-pointer list-none touch-manipulation items-center justify-between px-6 text-xs font-semibold uppercase tracking-[0.14em] text-cool-gray active:text-brand [&::-webkit-details-marker]:hidden">
                Browse brands
                <span aria-hidden="true" className="transition-transform group-open/sub:rotate-180">⌄</span>
              </summary>
              <ul className="mobile-submenu-enter border-t border-border px-6 py-1">
                {brands.map((brand) => <li key={brand.id}><Link href={brand.href} onClick={closeMenu} className="flex min-h-12 touch-manipulation items-center gap-3 text-sm text-cool-gray active:translate-x-1 active:text-brand">{brand.megaMenuLogo ? <span className="relative h-8 w-12 shrink-0"><Image src={brand.megaMenuLogo} alt="" fill sizes="48px" className="object-contain" /></span> : null}{brand.name}</Link></li>)}
              </ul>
            </details> : null}
          </li>
          <li className="border-b border-border">
            <Link href="/blog" onClick={closeMenu} aria-current={activePath(pathname, "/blog") ? "page" : undefined} className={rowClass(activePath(pathname, "/blog"))}>Blog</Link>
          </li>
          <li className="border-b border-border">
            <Link href="/about" onClick={closeMenu} aria-current={activePath(pathname, "/about") ? "page" : undefined} className={rowClass(activePath(pathname, "/about"))}>About Us</Link>
          </li>
        </ul>
        <div className="p-5">
          <HeaderMotorcycleSearch motorcycles={motorcycles} variant="mobile" onNavigate={closeMenu} />
        </div>
      </nav>
    </details>
  );
}
