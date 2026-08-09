import type { CatalogAvailability, CatalogMotorcycle } from "@/data/catalog";
import type { StockStatus } from "@/lib/supabase/database.types";

export type ProductImage = Readonly<{ src: string; alt: string }>;
export type ProductSpecification = Readonly<{ label: string; value: string }>;
export type ProductVariant = Readonly<{
  id: string;
  cc: number;
  colorId: string;
  colorName: string;
  colorHex: string;
  price: number;
  availability: CatalogAvailability;
  stockStatus: StockStatus;
  quantity: number;
  isDefault: boolean;
  images: readonly ProductImage[];
  specifications: readonly ProductSpecification[];
}>;

export type ProductFeature = Readonly<{ title: string; description: string }>;
export type ProductFeatureGroup = Readonly<{ title: string; icon: string; items: readonly ProductFeature[] }>;
export type TechnicalGroup = Readonly<{ title: string; items: readonly ProductSpecification[] }>;
export type ProductFaq = Readonly<{ question: string; answer: string }>;
export type ProductDetail = Readonly<{
  id: string;
  brand: string;
  brandName: string;
  name: string;
  slug: string;
  categories: readonly string[];
  description: string;
  fullDescription: string;
  seoTitle: string | null;
  seoDescription: string | null;
  overviewHeading: string;
  overview: readonly string[];
  overviewImage: ProductImage | null;
  variants: readonly ProductVariant[];
  features: readonly ProductFeatureGroup[];
  technicalGroups: readonly TechnicalGroup[];
  faqs: readonly ProductFaq[];
}>;

export type RelatedMotorcycle = CatalogMotorcycle;
