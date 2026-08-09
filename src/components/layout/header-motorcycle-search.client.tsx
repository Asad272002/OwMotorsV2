"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigationMotorcycle } from "@/data/catalog";

type Props = Readonly<{
  motorcycles: readonly NavigationMotorcycle[];
  variant?: "desktop" | "mobile";
  onOpen?: () => void;
  onNavigate?: () => void;
}>;

const resultLimit = 6;

export function HeaderMotorcycleSearch({ motorcycles, variant = "desktop", onOpen, onNavigate }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return motorcycles.filter((motorcycle) => [
      motorcycle.name,
      motorcycle.brandName,
      ...motorcycle.categoryLabels,
    ].some((value) => value.toLocaleLowerCase("en").includes(normalizedQuery))).slice(0, resultLimit);
  }, [motorcycles, normalizedQuery]);
  const listId = `header-motorcycle-search-${variant}`;
  const showResults = open && Boolean(normalizedQuery);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const openSearch = () => {
    setOpen(true);
    onOpen?.();
  };

  const clearSearch = () => {
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  };

  const navigateToResult = (index: number) => {
    const motorcycle = results[index];
    if (!motorcycle) return;
    clearSearch();
    onNavigate?.();
    router.push(`/motorcycles/${motorcycle.brand}/${motorcycle.slug}`);
  };

  return <div ref={rootRef} className={`pointer-events-auto relative ${variant === "desktop" ? "hidden w-[170px] transition-[width] duration-200 ease-out focus-within:w-[230px] lg:block xl:w-[190px] xl:focus-within:w-[250px] motion-reduce:transition-none" : "w-full"}`}>
    <div className={`group/search relative flex h-9 items-center rounded-[8px] border bg-[#f5f5f5] transition-colors focus-within:border-brand focus-within:bg-white ${open ? "border-brand bg-white" : "border-[#d9dce1]"}`}>
      <Search aria-hidden="true" className={`pointer-events-none absolute left-3 h-4 w-4 transition-colors ${open ? "text-brand" : "text-[#6b7280] group-focus-within/search:text-brand"}`} strokeWidth={1.75} />
      <label htmlFor={`${listId}-input`} className="sr-only">Search motorcycles</label>
      <input
        id={`${listId}-input`}
        type="search"
        value={query}
        placeholder="Search bikes..."
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showResults}
        aria-controls={listId}
        aria-activedescendant={showResults && results[activeIndex] ? `${listId}-option-${results[activeIndex].id}` : undefined}
        autoComplete="off"
        className="h-full w-full appearance-none bg-transparent pl-9 pr-9 text-[13px] text-near-black outline-none focus-visible:!outline-none placeholder:text-[13px] placeholder:text-[#858b95] [&::-webkit-search-cancel-button]:hidden"
        onFocus={openSearch}
        onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); openSearch(); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); return; }
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((current) => Math.min(results.length - 1, current + 1)); return; }
          if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((current) => Math.max(0, current - 1)); return; }
          if (event.key === "Enter" && showResults && results.length) { event.preventDefault(); navigateToResult(activeIndex); }
        }}
      />
      {query ? <button type="button" onClick={clearSearch} aria-label="Clear motorcycle search" className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full text-[#6b7280] transition-colors hover:bg-soft-gray hover:text-brand"><X aria-hidden="true" className="h-3.5 w-3.5" /></button> : null}
    </div>

    {showResults ? <div id={listId} role="listbox" aria-label="Motorcycle search results" className={`${variant === "desktop" ? "absolute right-0 top-[calc(100%+8px)] w-[240px]" : "mt-2 w-full"} z-[120] max-h-[338px] overflow-y-auto rounded-[10px] border border-border bg-white p-1.5 shadow-[0_18px_42px_rgba(0,0,0,.18)]`}>
      {results.length ? results.map((motorcycle, index) => <Link
        key={motorcycle.id}
        id={`${listId}-option-${motorcycle.id}`}
        role="option"
        aria-selected={activeIndex === index}
        href={`/motorcycles/${motorcycle.brand}/${motorcycle.slug}`}
        onMouseEnter={() => setActiveIndex(index)}
        onFocus={() => setActiveIndex(index)}
        onClick={() => { clearSearch(); onNavigate?.(); }}
        className={`grid min-h-[59px] grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] px-2 py-1.5 transition-colors ${activeIndex === index ? "bg-soft-gray" : "hover:bg-soft-gray"}`}
      >
        <span className="relative h-9 w-[38px] overflow-hidden rounded-[4px] bg-soft-gray">
          <Image src={motorcycle.image} alt="" fill sizes="38px" className="object-contain p-0.5" />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-semibold text-near-black">{motorcycle.name}</strong>
          <span className="mt-0.5 block text-[11px] leading-[1.25] text-cool-gray">{motorcycle.brandName} · {motorcycle.categoryLabels[0] ?? "Motorcycle"}</span>
        </span>
        <span className="whitespace-nowrap text-[11px] font-semibold text-brand">{motorcycle.priceLabel}</span>
      </Link>) : <p className="px-3 py-5 text-center text-xs text-cool-gray">No motorcycles match “{query.trim()}”.</p>}
    </div> : null}
  </div>;
}
