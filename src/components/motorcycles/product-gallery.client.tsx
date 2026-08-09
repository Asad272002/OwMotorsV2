"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/data/products";

export function ProductGallery({ images, productName }: Readonly<{ images: readonly ProductImage[]; productName: string }>) {
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const image = images[selected] ?? images[0];
  const previous = () => setSelected((current) => (current - 1 + images.length) % images.length);
  const next = () => setSelected((current) => (current + 1) % images.length);

  useEffect(() => {
    if (!zoomed) return;
    const zoomTrigger = zoomTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
      if (event.key === "ArrowLeft" && images.length > 1) setSelected((current) => (current - 1 + images.length) % images.length);
      if (event.key === "ArrowRight" && images.length > 1) setSelected((current) => (current + 1) % images.length);
      if (event.key === "Tab") {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])") ?? []);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      zoomTrigger?.focus();
    };
  }, [zoomed, images.length]);

  return <>
    <div className="grid gap-3 sm:grid-cols-[58px_1fr]">
      {images.length > 1 ? <div className="ow-horizontal-scroll order-2 flex snap-x gap-2 overflow-x-auto overscroll-x-contain sm:order-1 sm:flex-col" role="group" aria-label={`${productName} image gallery`}>{images.map((item, index) => <button key={`${item.src}-${index}`} type="button" onClick={() => setSelected(index)} aria-label={`Show ${productName} image ${index + 1}`} aria-pressed={selected === index} className={`relative h-14 w-[58px] shrink-0 snap-start overflow-hidden border-2 bg-soft-gray transition-all hover:border-brand active:scale-95 ${selected === index ? "border-brand" : "border-border"}`}><Image src={item.src} alt="" fill sizes="58px" className="object-contain p-1" /></button>)}</div> : <div />}

      <div className="relative order-1 aspect-[4/3] overflow-hidden bg-soft-gray sm:order-2">
        <button ref={zoomTriggerRef} type="button" onClick={() => setZoomed(true)} aria-label={`Zoom ${productName} image ${selected + 1}`} className="group absolute inset-0 cursor-zoom-in">
          <Image src={image.src} alt={image.alt} fill loading="eager" fetchPriority="high" sizes="(max-width: 1024px) 100vw, 46vw" className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none" />
        </button>
        {images.length > 1 ? <><button type="button" onClick={previous} aria-label="Previous image" className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center border border-transparent bg-white/90 text-xl shadow transition-all hover:scale-105 hover:border-brand hover:text-brand active:scale-95 active:border-brand active:text-brand sm:left-3 motion-reduce:hover:scale-100">‹</button><button type="button" onClick={next} aria-label="Next image" className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center border border-transparent bg-white/90 text-xl shadow transition-all hover:scale-105 hover:border-brand hover:text-brand active:scale-95 active:border-brand active:text-brand sm:right-3 motion-reduce:hover:scale-100">›</button></> : null}
        <span className="absolute bottom-3 right-3 z-10 bg-black/65 px-2 py-1 text-xs text-white">{selected + 1} / {images.length}</span>
      </div>
    </div>

    {zoomed ? <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${productName} enlarged image gallery`} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) setZoomed(false); }}>
      <div className="relative h-[min(82dvh,800px)] w-[min(94vw,1200px)] bg-black/20">
        <Image src={image.src} alt={image.alt} fill sizes="92vw" className="object-contain" />
        <button type="button" autoFocus onClick={() => setZoomed(false)} aria-label="Close enlarged image" className="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center border border-transparent bg-white text-2xl text-near-black transition-all hover:scale-105 hover:border-brand hover:bg-brand hover:text-white motion-reduce:hover:scale-100">×</button>
        {images.length > 1 ? <><button type="button" onClick={previous} aria-label="Previous enlarged image" className="absolute left-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-transparent bg-white/90 text-3xl text-near-black transition-all hover:scale-105 hover:border-brand hover:bg-brand hover:text-white motion-reduce:hover:scale-100">‹</button><button type="button" onClick={next} aria-label="Next enlarged image" className="absolute right-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-transparent bg-white/90 text-3xl text-near-black transition-all hover:scale-105 hover:border-brand hover:bg-brand hover:text-white motion-reduce:hover:scale-100">›</button></> : null}
        <span className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 bg-black/70 px-3 py-2 text-xs text-white">{selected + 1} / {images.length}</span>
      </div>
    </div> : null}
  </>;
}
