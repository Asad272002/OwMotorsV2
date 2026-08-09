export type CatalogAvailability =
  | "in-stock"
  | "out-of-stock"
  | "coming-soon"
  | "discontinued";

export type CatalogMotorcycle = Readonly<{
  id: string;
  brand: string;
  brandName: string;
  name: string;
  slug: string;
  categories: readonly string[];
  categoryLabels: readonly string[];
  engine: string;
  cooling: string;
  transmission: string;
  transmissionLabel: string;
  fuel: string;
  availability: CatalogAvailability;
  image: string;
  imageAlt: string;
  summary: string;
  shortDescription: string;
  colors: readonly Readonly<{
    id: string;
    name: string;
    hex: string;
    image: string;
    imageAlt: string;
  }>[];
  price: number;
  priceLabel: string;
  featuredOrder: number;
  updatedAt: string;
}>;

export type NavigationMotorcycle = Readonly<Pick<
  CatalogMotorcycle,
  "id" | "brand" | "brandName" | "name" | "slug" | "categories" | "categoryLabels" | "image" | "imageAlt" | "price" | "priceLabel"
>>;

export type CatalogFilterOption = Readonly<{ value: string; label: string }>;

export type CatalogFilterOptions = Readonly<{
  brand: readonly CatalogFilterOption[];
  category: readonly CatalogFilterOption[];
  engine: readonly CatalogFilterOption[];
  transmission: readonly CatalogFilterOption[];
  fuel: readonly CatalogFilterOption[];
  availability: readonly CatalogFilterOption[];
}>;
