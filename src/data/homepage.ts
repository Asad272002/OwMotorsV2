export type HomepageMotorcycle = Readonly<{
  id: string;
  name: string;
  slug: string;
  image: string;
  imageAlt: string;
  tagline: string;
  engine: string;
  cooling: string;
  gearbox: string;
  colors: readonly Readonly<{
    id: string;
    name: string;
    hex: string;
    image: string;
    imageAlt: string;
  }>[];
  specification: string;
  priceLabel: string;
}>;

export type HomepageBrand = Readonly<{
  id: string;
  databaseId: string;
  name: string;
  displayName: string;
  href: string;
  ctaLabel?: string;
  tagline: string;
  description: string;
  fullDescription: string;
  background: string;
  logo: string;
  overlayLogo: string | null;
  campaignImages: readonly Readonly<{ id?: string; src: string; alt: string }>[];
  motorcycles: readonly HomepageMotorcycle[];
}>;

type BrandPresentation = Readonly<{
  tagline: string;
  background: string;
  localLogo: string;
}>;

const BRAND_PRESENTATION: Readonly<Record<string, BrandPresentation>> = {
  taro: {
    tagline: "Engineered for the Road Ahead",
    background: "#120808",
    localLogo: "/images/home/taro-logo.png",
  },
  lifan: {
    tagline: "Precision. Power. Performance.",
    background: "#080812",
    localLogo: "/images/home/lifan-logo.png",
  },
  "hi-speed": {
    tagline: "Built for Every Journey",
    background: "#081208",
    localLogo: "/images/home/hi-speed-logo.png",
  },
  "super-star": {
    tagline: "Ride Like a Legend",
    background: "#120d08",
    localLogo: "/images/home/super-star-logo.png",
  },
};

const DEFAULT_PRESENTATION: BrandPresentation = {
  tagline: "Explore the Road Ahead",
  background: "#111111",
  localLogo: "/images/ow-motors-logo.png",
};

export function getBrandPresentation(slug: string): BrandPresentation {
  return BRAND_PRESENTATION[slug] ?? DEFAULT_PRESENTATION;
}
