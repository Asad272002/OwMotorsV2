"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductVariant } from "@/data/products";
import { ProductGallery } from "@/components/motorcycles/product-gallery.client";

const formatPrice = (price: number) => `PKR ${price.toLocaleString("en-PK")}`;
const availabilityLabel = (value: ProductVariant["availability"]) => ({
  "in-stock": "In Stock",
  "out-of-stock": "Out of Stock",
  "coming-soon": "Coming Soon",
  discontinued: "Discontinued",
})[value];

export function ProductConfigurator({ brandName, productName, description, variants }: Readonly<{ brandName: string; productName: string; description: string; variants: readonly ProductVariant[] }>) {
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0].id);
  const selected = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const capacities = [...new Set(variants.map((variant) => variant.cc))];
  const colors = [...new Map(variants.map((variant) => [variant.colorId, { id: variant.colorId, name: variant.colorName, hex: variant.colorHex }])).values()];
  const selectCapacity = (cc: number) => { const match = variants.find((variant) => variant.cc === cc && variant.colorId === selected.colorId) ?? variants.find((variant) => variant.cc === cc); if (match) setSelectedVariantId(match.id); };
  const selectColor = (colorId: string) => { const match = variants.find((variant) => variant.cc === selected.cc && variant.colorId === colorId); if (match) setSelectedVariantId(match.id); };
  return <>
    <div className="mx-auto grid max-w-7xl gap-8 px-[var(--page-gutter)] lg:grid-cols-[1.45fr_1fr] lg:gap-12">
      <ProductGallery key={selected.id} images={selected.images} productName={`${brandName} ${productName}`} />
      <div>
        <p className="text-eyebrow mb-2">{brandName}</p><h1 className="font-display text-[clamp(2.4rem,4vw,3.5rem)] font-bold leading-none">{productName}</h1><p className="mt-4 text-sm leading-6 text-cool-gray">{description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-border pb-5"><p className="font-display text-[clamp(1.8rem,3vw,2.5rem)] font-bold text-brand">{formatPrice(selected.price)}</p><span className={`border px-3 py-1.5 text-xs font-semibold ${selected.availability === "in-stock" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-brand"}`}>{availabilityLabel(selected.availability)}</span></div>
        <fieldset className="mt-5"><legend className="mb-3 text-sm">Engine Capacity: <strong>{selected.cc}cc</strong></legend><div className="flex flex-wrap gap-2">{capacities.map((cc) => <button key={cc} type="button" onClick={() => selectCapacity(cc)} aria-pressed={selected.cc === cc} className={`min-h-11 touch-manipulation border px-5 text-sm font-semibold transition-all hover:border-brand active:scale-[.97] active:border-brand ${selected.cc === cc ? "border-brand bg-brand/5 text-brand" : "border-border bg-white"}`}>{cc}cc</button>)}</div></fieldset>
        <fieldset className="mt-5"><legend className="mb-3 text-sm">Color: <strong>{selected.colorName}</strong></legend><div className="flex flex-wrap gap-2">{colors.map((color) => { const match = variants.find((variant) => variant.cc === selected.cc && variant.colorId === color.id); const isSelected = selected.colorId === color.id; return <label key={color.id} className={`relative flex min-h-12 touch-manipulation cursor-pointer select-none items-center border px-4 text-sm font-semibold transition-all hover:border-brand active:scale-[.97] active:border-brand focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ow-focus)] ${isSelected ? "border-brand bg-brand/5 text-brand" : "border-border bg-white"} ${match ? "" : "pointer-events-none cursor-not-allowed opacity-35 line-through"}`}><input type="radio" name="product-color" value={color.id} checked={isSelected} disabled={!match} onChange={() => selectColor(color.id)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /><span>{color.name}</span></label>; })}</div></fieldset>
        <div className="mt-6 border border-border bg-soft-gray p-5"><p className="text-eyebrow mb-3">Your Selection</p><dl className="space-y-2 text-sm">{[["Motorcycle", `${brandName} ${productName}`], ["Engine", `${selected.cc}cc`], ["Color", selected.colorName], ["Price", formatPrice(selected.price)], ["Availability", availabilityLabel(selected.availability)]].map(([label, value]) => <div key={label} className="flex justify-between gap-6"><dt className="text-cool-gray">{label}</dt><dd className={`text-right font-semibold ${label === "Price" ? "text-brand" : ""}`}>{value}</dd></div>)}</dl></div>
        <div className="mt-5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2"><Link href="/contact" className="flex min-h-11 touch-manipulation items-center justify-center border border-brand bg-brand text-sm font-semibold !text-white transition-colors hover:bg-white hover:!text-brand active:bg-white active:!text-brand">Contact Us</Link><Link href="/contact?channel=whatsapp" className="flex min-h-11 touch-manipulation items-center justify-center border border-[#0B7A34] bg-[#0B7A34] text-sm font-semibold !text-white transition-colors hover:bg-white hover:!text-[#0B7A34] active:bg-white active:!text-[#0B7A34]">WhatsApp</Link></div>
      </div>
    </div>
    <section aria-labelledby="selected-specifications" className="mt-14 bg-soft-gray py-12 sm:mt-20 sm:py-14"><div className="mx-auto max-w-7xl px-[var(--page-gutter)]"><p className="text-eyebrow mb-2">Technical</p><h2 id="selected-specifications" className="text-display-lg">Specifications</h2><p className="mt-3 text-sm text-cool-gray">Complete technical specifications for the selected configuration.</p><dl className="mt-7 border border-border sm:mt-8">{selected.specifications.map((specification, index) => <div key={specification.label} className={`grid grid-cols-[minmax(7rem,.8fr)_minmax(0,1.2fr)] gap-4 px-4 py-3 text-sm ${index % 2 ? "bg-white" : "bg-[#ededed]"}`}><dt className="font-semibold">{specification.label}</dt><dd className="break-words text-[#59616b]">{specification.value}</dd></div>)}</dl></div></section>
    <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border bg-white px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-3px_12px_rgba(0,0,0,.08)] sm:gap-4 sm:px-5 md:grid-cols-[1fr_1fr_1fr]"><div className="min-w-0"><p className="truncate font-display text-sm font-bold">{brandName} {productName}</p><p className="truncate text-[0.65rem] text-cool-gray">{selected.cc}cc · {selected.colorName}</p></div><p className="hidden text-center font-display text-xl font-bold text-brand md:block">{formatPrice(selected.price)}</p><div className="flex justify-end gap-2"><Link href="/contact" className="ow-button-primary whitespace-nowrap px-3 text-xs sm:px-5">Contact Us</Link><Link href="/contact?channel=whatsapp" className="hidden min-h-11 items-center border border-[#0B7A34] bg-[#0B7A34] px-4 text-xs font-semibold !text-white transition-colors hover:bg-white hover:!text-[#0B7A34] active:bg-white active:!text-[#0B7A34] sm:inline-flex">WhatsApp</Link></div></div>
  </>;
}
