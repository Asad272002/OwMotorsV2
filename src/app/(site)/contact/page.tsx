import type { Metadata } from "next";
import { ContactInquiryForm } from "@/components/forms/contact-inquiry-form.client";
import { Container } from "@/components/ui/container";
import { createPageMetadata, hasAnySearchParameters } from "@/lib/seo/metadata";

export async function generateMetadata({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>): Promise<Metadata> {
  return createPageMetadata({
    title: "Contact OW Motors",
    description: "Contact OW Motors about motorcycle availability, purchasing, and dealership services.",
    path: "/contact",
    noIndex: hasAnySearchParameters(await searchParams),
  });
}

export default function ContactPage() {
  return <>
    <header className="border-b border-border bg-soft-gray py-14 sm:py-16"><Container className="max-w-5xl"><p className="text-eyebrow mb-3">Contact</p><h1 className="text-display-xl">Talk to OW Motors</h1><p className="mt-5 max-w-2xl text-cool-gray">Ask about a motorcycle, availability, or dealership services. Our team will follow up using the details you provide.</p></Container></header>
    <section className="bg-white py-12 sm:py-16"><Container className="max-w-3xl"><h2 className="sr-only">Contact inquiry form</h2><ContactInquiryForm /></Container></section>
  </>;
}
