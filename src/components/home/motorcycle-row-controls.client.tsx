"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { HomepageBrand, HomepageMotorcycle } from "@/data/homepage";

function specificationValue(value: string) {
  return value.trim() || "Not specified";
}

function MotorcycleSlide({
  brand,
  motorcycle,
  active,
  selectedColorId,
  onSelectColor,
}: Readonly<{
  brand: HomepageBrand;
  motorcycle: HomepageMotorcycle;
  active: boolean;
  selectedColorId?: string;
  onSelectColor: (colorId: string) => void;
}>) {
  const selectedColor = motorcycle.colors.find((color) => color.id === selectedColorId) ?? motorcycle.colors[0];
  const image = selectedColor?.image ?? motorcycle.image;
  const imageAlt = selectedColor?.imageAlt ?? motorcycle.imageAlt;
  const href = `/motorcycles/${brand.id}/${motorcycle.slug}`;
  const specs = [
    { value: specificationValue(motorcycle.engine), label: "Engine" },
    { value: specificationValue(motorcycle.cooling), label: "Cooling" },
    { value: specificationValue(motorcycle.gearbox), label: "Gearbox" },
  ];

  return (
    <article
      aria-hidden={!active}
      inert={!active}
      className={`relative min-w-full px-[var(--page-gutter)] pb-2 transition-[visibility] ${active ? "visible" : "invisible"}`}
    >
      <header className="relative z-10 text-center">
        <h3 id={`home-model-${motorcycle.id}`} className="font-display text-[clamp(2rem,4vw,2.5rem)] font-bold uppercase leading-none tracking-[-0.02em] text-near-black">
          <Link href={href} className="transition-colors hover:text-brand focus-visible:text-brand">{motorcycle.name}</Link>
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-[11px] font-medium tracking-[0.12em] text-cool-gray sm:text-xs">{motorcycle.tagline}</p>
      </header>

      <div className="relative mx-auto mt-4 min-h-[310px] max-w-6xl sm:min-h-[350px] lg:min-h-[350px]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex -translate-y-15 items-center justify-center overflow-hidden font-display text-[clamp(6rem,19vw,14rem)] font-bold uppercase leading-none tracking-[-0.055em] text-[#F3F3F3]">
          {brand.displayName}
        </div>

        <Link href={href} aria-label={`View ${brand.name} ${motorcycle.name}`} className="group absolute inset-x-[12%] inset-y-0 z-10 flex items-center justify-center mix-blend-multiply sm:inset-x-[20%] lg:inset-x-[28%]">
          <Image
            key={image}
            src={image}
            alt={imageAlt}
            width={1000}
            height={720}
            sizes="(max-width: 640px) 76vw, (max-width: 1024px) 60vw, 520px"
            className="h-[240px] w-full object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:scale-[1.025] group-focus-visible:scale-[1.025] sm:h-[290px] lg:h-[315px] motion-reduce:transition-none"
          />
        </Link>

        {motorcycle.colors.length ? (
          <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 lg:bottom-auto lg:left-auto lg:right-[12%] lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0 lg:flex-col xl:right-[12.5%]">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-cool-gray lg:[writing-mode:vertical-rl] lg:rotate-180">Colors</span>
            <div className="flex items-center gap-3 lg:flex-col">
              {motorcycle.colors.map((color) => {
                const selected = color.id === selectedColor?.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => onSelectColor(color.id)}
                    aria-label={`Show ${motorcycle.name} in ${color.name}`}
                    aria-pressed={selected}
                    className={`rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.16)] transition-[width,height,transform,border-color] hover:scale-110 focus-visible:scale-110 motion-reduce:transition-none ${selected ? "h-9 w-9 border-2 border-[#D3222A] bg-white p-[2px]" : "h-6 w-6 border border-black/10 p-0"}`}
                  >
                    <span aria-hidden="true" className="block h-full w-full rounded-full" style={{ backgroundColor: color.hex }} />
                  </button>
                );
              })}
            </div>
            <span className="max-w-24 text-center text-[11px] leading-4 text-cool-gray">{selectedColor?.name}</span>
          </div>
        ) : null}
      </div>

      <dl className="mx-auto mt-3 grid max-w-[520px] grid-cols-3 border-y border-border sm:mt-3">
        {specs.map((spec, index) => (
          <div key={spec.label} className={`px-2 py-6 text-center sm:px-5 ${index ? "border-l border-border" : ""}`}>
            <dd className="font-display text-sm font-bold text-near-black sm:text-base">{spec.value}</dd>
            <dt className="mt-2 text-[8px] font-medium uppercase tracking-[0.16em] text-cool-gray sm:text-[9px]">{spec.label}</dt>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function MotorcycleRowControls({ brand }: Readonly<{ brand: HomepageBrand }>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const count = brand.motorcycles.length;
  const goTo = (index: number) => setActiveIndex((index + count) % count);

  return (
    <div className="relative overflow-hidden" aria-roledescription="carousel" aria-label={`${brand.name} motorcycles`}>
      <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {brand.motorcycles.map((motorcycle, index) => (
          <MotorcycleSlide
            key={motorcycle.id}
            brand={brand}
            motorcycle={motorcycle}
            active={index === activeIndex}
            selectedColorId={selectedColors[motorcycle.id]}
            onSelectColor={(colorId) => setSelectedColors((current) => ({ ...current, [motorcycle.id]: colorId }))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo(activeIndex - 1)}
        disabled={count < 2}
        aria-label={`Previous ${brand.name} motorcycle`}
        className="group absolute left-[var(--page-gutter)] top-[45%] z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center disabled:cursor-default disabled:opacity-35 sm:left-[max(var(--page-gutter),3rem)] lg:left-[max(var(--page-gutter),calc(50%_-_32.25rem))] motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D3D6DA] bg-white text-black shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_5px_15px_rgba(0,0,0,0.17)] transition-colors group-hover:border-[#B71920] group-hover:text-[#B71920]"><ChevronLeft className="h-5 w-5" strokeWidth={3} /></span>
      </button>
      <button
        type="button"
        onClick={() => goTo(activeIndex + 1)}
        disabled={count < 2}
        aria-label={`Next ${brand.name} motorcycle`}
        className="group absolute right-[var(--page-gutter)] top-[45%] z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center disabled:cursor-default disabled:opacity-35 sm:right-[max(var(--page-gutter),3rem)] lg:right-[max(var(--page-gutter),calc(50%_-_32.75rem))] motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#BF171E] bg-[#C91D24] text-white shadow-[0_0_0_1px_rgba(158,14,21,0.28),0_7px_19px_rgba(158,14,21,0.36)] transition-colors group-hover:bg-white group-hover:text-[#B71920]"><ChevronRight className="h-5 w-5" strokeWidth={3} /></span>
      </button>

      <div className="mt-3 flex min-h-8 items-center justify-center gap-1.5" role="group" aria-label={`${brand.name} motorcycle slides`}>
        {brand.motorcycles.map((motorcycle, index) => (
          <button
            key={motorcycle.id}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Show ${motorcycle.name}`}
            aria-current={index === activeIndex ? "true" : undefined}
            className={`h-2 rounded-full transition-all motion-reduce:transition-none ${index === activeIndex ? "w-6 bg-brand" : "w-2 bg-[#E3E6EA] hover:bg-[#AEB4BC]"}`}
          />
        ))}
      </div>
    </div>
  );
}
