import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { PrimaryNavigation } from "@/components/layout/primary-navigation.client";
import { getNavigationMotorcycles, getPublicBrands, getPublicCategories } from "@/lib/supabase/public-queries";

async function NavigationData() {
  const [categories, motorcycles, brands] = await Promise.all([
    getPublicCategories(),
    getNavigationMotorcycles(),
    getPublicBrands(),
  ]).catch(() => [[], [], []] as const);

  return <PrimaryNavigation categories={categories} motorcycles={motorcycles} brands={brands} />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <Container className="relative flex h-16 max-w-7xl items-center justify-between">
        <Link href="/" aria-label="OW Motors home" className="relative z-10 flex shrink-0 items-center">
          <Image
            src="/images/ow-motors-logo.png"
            alt="OW Motors"
            width={1536}
            height={1024}
            className="h-9 w-auto object-contain mix-blend-multiply sm:h-11"
            sizes="76px"
            loading="eager"
          />
        </Link>
        <Suspense fallback={<PrimaryNavigation categories={[]} motorcycles={[]} brands={[]} />}>
          <NavigationData />
        </Suspense>
      </Container>
    </header>
  );
}
