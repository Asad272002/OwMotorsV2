"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavigationMotorcycle } from "@/data/catalog";
import { HEADER_LINKS } from "@/lib/constants/navigation";
import { MobileNavigation } from "@/components/layout/mobile-navigation.client";
import { HeaderMotorcycleSearch } from "@/components/layout/header-motorcycle-search.client";

type MenuName = "motorcycles" | "brands" | null;

type NavigationBrand = Readonly<{
  id: string;
  name: string;
  slug: string;
  logo: string;
  megaMenuLogo: string | null;
}>;

type PrimaryNavigationProps = Readonly<{
  categories: readonly Readonly<{ id: string; name: string; slug: string }>[];
  motorcycles: readonly NavigationMotorcycle[];
  brands: readonly NavigationBrand[];
}>;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MegaPagination({
  page,
  pages,
  label,
  onPageChange,
}: Readonly<{
  page: number;
  pages: number;
  label: string;
  onPageChange: (page: number) => void;
}>) {
  return (
    <div className="flex min-h-10 items-center justify-center gap-2 border-t border-border pt-3">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onPageChange(Math.max(0, page - 1))}
        aria-label={`Previous ${label} page`}
        className="flex h-11 w-11 items-center justify-center text-lg text-cool-gray transition-colors hover:text-brand disabled:opacity-25"
      >
        &lsaquo;
      </button>
      {Array.from({ length: pages }, (_, pageIndex) => (
        <button
          key={pageIndex}
          type="button"
          onClick={() => onPageChange(pageIndex)}
          aria-label={`${label} page ${pageIndex + 1}`}
          aria-current={page === pageIndex ? "page" : undefined}
          className={`flex h-11 w-11 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
            page === pageIndex
              ? "border-brand bg-brand text-white"
              : "border-border text-cool-gray hover:border-brand hover:text-brand"
          }`}
        >
          {pageIndex + 1}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= pages - 1}
        onClick={() => onPageChange(Math.min(pages - 1, page + 1))}
        aria-label={`Next ${label} page`}
        className="flex h-11 w-11 items-center justify-center text-lg text-cool-gray transition-colors hover:text-brand disabled:opacity-25"
      >
        &rsaquo;
      </button>
    </div>
  );
}

function MegaProductGrid({
  motorcycles,
  emptyMessage,
  onProductSelect,
}: Readonly<{
  motorcycles: readonly NavigationMotorcycle[];
  emptyMessage: string;
  onProductSelect: () => void;
}>) {
  if (!motorcycles.length) {
    return <div className="flex flex-1 items-center justify-center text-sm text-cool-gray">{emptyMessage}</div>;
  }

  return (
    <div className="grid flex-1 grid-cols-3 gap-3">
      {motorcycles.map((motorcycle) => (
        <Link
          key={motorcycle.id}
          href={`/motorcycles/${motorcycle.brand}/${motorcycle.slug}`}
          onClick={onProductSelect}
          aria-label={`View ${motorcycle.brandName} ${motorcycle.name}`}
          className="group flex min-w-0 flex-col items-center justify-center p-2 text-center"
        >
          <div className="relative h-[210px] w-full">
            <Image
              src={motorcycle.image}
              alt={motorcycle.imageAlt}
              fill
              sizes="30vw"
              className="object-contain p-3 transition-[transform,filter] duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-[1.06] group-hover:drop-shadow-[0_14px_14px_rgba(17,17,17,0.18)] group-focus-visible:-translate-y-1 group-focus-visible:scale-[1.06] group-focus-visible:drop-shadow-[0_14px_14px_rgba(17,17,17,0.18)] motion-reduce:transform-none motion-reduce:transition-none"
            />
          </div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-cool-gray">{motorcycle.brandName}</p>
          <h3 className="mt-1 font-display text-base font-bold text-near-black">
            {motorcycle.name}
          </h3>
          <span className="mt-1 min-h-4 text-xs font-semibold text-brand opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:-translate-y-0.5 group-focus-visible:opacity-100 motion-reduce:transform-none motion-reduce:transition-none">
            View Bike <span aria-hidden="true">&rarr;</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function PrimaryNavigation({ categories, motorcycles, brands }: PrimaryNavigationProps) {
  const pathname = usePathname();
  const [desktopMenu, setDesktopMenu] = useState<MenuName>(null);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? "");
  const [megaPage, setMegaPage] = useState(0);
  const [activeBrand, setActiveBrand] = useState(brands[0]?.slug ?? "");
  const [brandMegaPage, setBrandMegaPage] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<"motorcycles" | "brands", HTMLAnchorElement | null>>({ motorcycles: null, brands: null });

  const categoryLinks = categories.map((category) => ({
    label: category.name,
    href: `/motorcycles/category/${category.slug}`,
  }));
  const activeCategoryLink = categoryLinks.find((item) => item.href.endsWith(`/${activeCategory}`))
    ?? categoryLinks[0]
    ?? { label: "Motorcycles", href: "/motorcycles" };
  const categoryMotorcycles = motorcycles.filter((motorcycle) => motorcycle.categories.includes(activeCategory));
  const megaPages = Math.max(1, Math.ceil(categoryMotorcycles.length / 3));
  const megaMotorcycles = categoryMotorcycles.slice(megaPage * 3, megaPage * 3 + 3);

  const brandLinks = brands.map((brand) => ({
    ...brand,
    href: `/motorcycles/brand/${brand.slug}`,
    modelCount: motorcycles.filter((motorcycle) => motorcycle.brand === brand.slug).length,
  }));
  const activeBrandLink = brandLinks.find((brand) => brand.slug === activeBrand) ?? brandLinks[0];
  const brandMotorcycles = activeBrandLink
    ? motorcycles.filter((motorcycle) => motorcycle.brand === activeBrandLink.slug)
    : [];
  const brandMegaPages = Math.max(1, Math.ceil(brandMotorcycles.length / 3));
  const brandMegaMotorcycles = brandMotorcycles.slice(brandMegaPage * 3, brandMegaPage * 3 + 3);

  const selectCategory = (href: string) => {
    setActiveCategory(href.slice(href.lastIndexOf("/") + 1));
    setMegaPage(0);
  };

  const selectBrand = (slug: string) => {
    setActiveBrand(slug);
    setBrandMegaPage(0);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const openMenu = desktopMenu;
      setDesktopMenu(null);
      if (openMenu) window.requestAnimationFrame(() => triggerRefs.current[openMenu]?.focus());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [desktopMenu]);

  const openDesktopMenuFromKeyboard = (menu: Exclude<MenuName, null>, event: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setDesktopMenu(menu);
    window.requestAnimationFrame(() => {
      navRef.current
        ?.querySelector<HTMLElement>(`[data-mega-menu="${menu}"] a, [data-mega-menu="${menu}"] button:not([disabled])`)
        ?.focus();
    });
  };

  const closeDesktopMenuWhenFocusLeaves = () => {
    window.setTimeout(() => {
      if (!navRef.current?.contains(document.activeElement)) setDesktopMenu(null);
    }, 0);
  };

  return (
    <div
      ref={navRef}
      className="flex items-center lg:pointer-events-none lg:absolute lg:inset-0 lg:justify-center"
      onBlur={closeDesktopMenuWhenFocusLeaves}
    >
      <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">
        {HEADER_LINKS.map((link) => {
          const menu: MenuName = link.label === "Motorcycles"
            ? "motorcycles"
            : link.label === "Brands"
              ? "brands"
              : null;
          const active = isActivePath(pathname, link.href);
          const menuActive = menu !== null && desktopMenu === menu;

          return (
            <div
              key={link.href}
              className="pointer-events-auto flex h-16 items-center"
              onMouseEnter={() => setDesktopMenu(menu)}
            >
              {menu ? (
                <Link
                  ref={(element) => { triggerRefs.current[menu] = element; }}
                  href={link.href}
                  onClick={() => setDesktopMenu(null)}
                  onFocus={() => setDesktopMenu(menu)}
                  onKeyDown={(event) => openDesktopMenuFromKeyboard(menu, event)}
                  aria-current={active ? "page" : undefined}
                  aria-expanded={desktopMenu === menu}
                  aria-haspopup="true"
                  aria-controls={`${menu}-mega-menu`}
                  className={`group relative flex min-h-11 items-center gap-1 text-sm font-medium transition-colors focus-visible:!outline-none ${
                    active || menuActive ? "!text-brand" : "text-near-black hover:!text-brand"
                  }`}
                >
                  <span className={`border-b-2 pb-[3px] leading-none transition-colors ${
                    active || menuActive ? "border-brand" : "border-transparent group-hover:border-brand"
                  }`}>
                    {link.label}
                  </span>
                  <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className={`h-3 w-3 shrink-0 self-center transition-transform ${desktopMenu === menu ? "rotate-180" : ""}`}>
                    <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ) : (
                <Link
                  href={link.href}
                  onClick={() => setDesktopMenu(null)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex min-h-11 items-center text-sm font-medium transition-colors focus-visible:!outline-none ${
                    active ? "!text-brand" : "text-near-black hover:!text-brand"
                  }`}
                >
                  <span className={`border-b-2 pb-[3px] leading-none transition-colors ${
                    active ? "border-brand" : "border-transparent group-hover:border-brand"
                  }`}>
                    {link.label}
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      <div className="pointer-events-auto absolute right-0 hidden lg:block" onMouseEnter={() => setDesktopMenu(null)}>
        <HeaderMotorcycleSearch motorcycles={motorcycles} onOpen={() => setDesktopMenu(null)} />
      </div>

      <MobileNavigation pathname={pathname} categories={categoryLinks} brands={brandLinks} motorcycles={motorcycles} />

      {desktopMenu === "motorcycles" ? (
        <div
          id="motorcycles-mega-menu"
          data-mega-menu="motorcycles"
          className="pointer-events-auto fixed inset-x-4 top-16 hidden overflow-hidden rounded-b border border-t-0 border-border bg-white shadow-[0_20px_60px_rgba(0,0,0,.13)] lg:block"
          onMouseEnter={() => setDesktopMenu("motorcycles")}
          onMouseLeave={() => setDesktopMenu(null)}
        >
          <div className="grid min-h-[390px] grid-cols-[28%_72%]">
            <div className="border-r border-border bg-soft-gray px-5 py-7">
              <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.28em] text-brand">Shop by Category</p>
              <ul className="space-y-0.5">
                {categoryLinks.map((item) => (
                  <li key={item.href}>
                    <button
                      type="button"
                      onMouseEnter={() => selectCategory(item.href)}
                      onFocus={() => selectCategory(item.href)}
                      onClick={() => selectCategory(item.href)}
                      aria-pressed={activeCategoryLink.href === item.href}
                      className={`flex min-h-11 w-full items-center justify-between px-3 text-left text-xs font-medium transition-all ${
                        activeCategoryLink.href === item.href
                          ? "translate-x-1 bg-[#e8e8e8] text-brand"
                          : "text-near-black hover:translate-x-1 hover:bg-[#e8e8e8] hover:text-brand"
                      }`}
                    >
                      {item.label}
                      {activeCategoryLink.href === item.href ? <span aria-hidden="true" className="text-brand">&rarr;</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex min-w-0 flex-col px-6 pb-4 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-near-black">{activeCategoryLink.label}</h2>
                <Link href={activeCategoryLink.href} onClick={() => setDesktopMenu(null)} className="inline-flex min-h-11 items-center text-xs font-semibold !text-brand hover:underline">
                  View All <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              <MegaProductGrid
                motorcycles={megaMotorcycles}
                emptyMessage="Models in this category are coming soon."
                onProductSelect={() => setDesktopMenu(null)}
              />
              <MegaPagination page={megaPage} pages={megaPages} label="Motorcycle" onPageChange={setMegaPage} />
            </div>
          </div>
        </div>
      ) : null}

      {desktopMenu === "brands" ? (
        <div
          id="brands-mega-menu"
          data-mega-menu="brands"
          className="pointer-events-auto fixed inset-x-4 top-16 hidden overflow-hidden rounded-b border border-t-0 border-border bg-white shadow-[0_20px_60px_rgba(0,0,0,.13)] lg:block"
          onMouseEnter={() => setDesktopMenu("brands")}
          onMouseLeave={() => setDesktopMenu(null)}
        >
          <div className="grid min-h-[390px] grid-cols-[28%_72%]">
            <div className="border-r border-border bg-soft-gray px-5 py-7">
              <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.28em] text-brand">Our Brands</p>
              {brandLinks.length ? (
                <ul className="space-y-1">
                  {brandLinks.map((brand) => {
                    const isSelected = activeBrandLink?.slug === brand.slug;
                    return (
                      <li key={brand.id}>
                        <button
                          type="button"
                          onMouseEnter={() => selectBrand(brand.slug)}
                          onFocus={() => selectBrand(brand.slug)}
                          onClick={() => selectBrand(brand.slug)}
                          aria-pressed={isSelected}
                          className={`flex min-h-[58px] w-full items-center justify-between px-3 transition-all ${
                            isSelected
                              ? "translate-x-1 bg-[#e8e8e8]"
                              : "hover:translate-x-1 hover:bg-[#e8e8e8]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {brand.megaMenuLogo ? <span className="relative h-10 w-14 shrink-0">
                              <Image src={brand.megaMenuLogo} alt="" fill sizes="56px" className="object-contain" />
                            </span> : null}
                            <span className="min-w-0 text-left">
                              <strong className={`block truncate text-xs font-bold uppercase ${isSelected ? "text-brand" : "text-near-black"}`}>
                                {brand.name}
                              </strong>
                              <span className="mt-0.5 block text-[0.68rem] text-cool-gray">
                                {brand.modelCount} {brand.modelCount === 1 ? "model" : "models"}
                              </span>
                            </span>
                          </span>
                          {isSelected ? <span aria-hidden="true" className="text-brand">&rarr;</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-cool-gray">Brand information is coming soon.</p>
              )}
            </div>

            <div className="flex min-w-0 flex-col px-6 pb-4 pt-6">
              {activeBrandLink ? (
                <>
                  <div className="flex min-h-14 items-start justify-between">
                    <h2 className="sr-only">{activeBrandLink.name} motorcycles</h2>
                    {activeBrandLink.megaMenuLogo ? <div className="relative h-12 w-28">
                      <Image
                        src={activeBrandLink.megaMenuLogo}
                        alt={`${activeBrandLink.name} logo`}
                        fill
                        sizes="112px"
                        className="object-contain object-left"
                      />
                    </div> : <p className="font-display text-xl font-bold text-near-black">{activeBrandLink.name}</p>}
                    <Link href={activeBrandLink.href} onClick={() => setDesktopMenu(null)} className="inline-flex min-h-11 items-center text-xs font-semibold !text-brand hover:underline">
                      View All <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                  <MegaProductGrid
                    motorcycles={brandMegaMotorcycles}
                    emptyMessage={`${activeBrandLink.name} models are coming soon.`}
                    onProductSelect={() => setDesktopMenu(null)}
                  />
                  <MegaPagination
                    page={brandMegaPage}
                    pages={brandMegaPages}
                    label={`${activeBrandLink.name} motorcycle`}
                    onPageChange={setBrandMegaPage}
                  />
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-cool-gray">Brand information is coming soon.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
