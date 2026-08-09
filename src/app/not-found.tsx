import Link from "next/link";
import { Section } from "@/components/ui/section";

export default function NotFound() {
  return (
    <main>
      <title>Page Not Found | OW Motors</title>
      <meta name="description" content="The requested OW Motors page could not be found." />
      <Section className="min-h-screen bg-soft-gray" containerClassName="flex min-h-[70vh] max-w-3xl flex-col justify-center text-center">
        <p className="text-eyebrow">404 — Page not found</p>
        <h1 className="text-display-lg mt-5">This road ends here.</h1>
        <p className="text-body-lg mt-6">The page may have moved, or the address may be incorrect.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className="ow-button-primary">Return home</Link>
          <Link href="/motorcycles" className="flex min-h-11 items-center border-2 border-near-black px-5 text-sm font-semibold hover:bg-near-black hover:text-white">Browse motorcycles</Link>
        </div>
      </Section>
    </main>
  );
}
