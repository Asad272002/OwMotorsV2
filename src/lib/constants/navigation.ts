export const PRIMARY_LINKS = [
  { label: "Home", href: "/" },
  { label: "Motorcycles", href: "/motorcycles" },
  { label: "Brands", href: "/brands" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const HEADER_LINKS = PRIMARY_LINKS.filter((link) => link.href !== "/contact");

export const BRAND_LINKS = [
  { label: "Taro Motorcycles", href: "/motorcycles/brand/taro" },
  { label: "Lifan Motorcycles", href: "/motorcycles/brand/lifan" },
  { label: "Hi-Speed Motorcycles", href: "/motorcycles/brand/hi-speed" },
  { label: "Super Star Motorcycles", href: "/motorcycles/brand/super-star" },
] as const;

export const CATEGORY_LINKS = [
  { label: "Naked Bikes", href: "/motorcycles/category/naked-bikes" },
  { label: "Sport Bikes", href: "/motorcycles/category/sport-bikes" },
  { label: "Dual Sport", href: "/motorcycles/category/dual-sport" },
  { label: "Cruisers", href: "/motorcycles/category/cruisers" },
  { label: "Touring", href: "/motorcycles/category/touring" },
  { label: "Adventure", href: "/motorcycles/category/adventure" },
  { label: "Scooters", href: "/motorcycles/category/scooters" },
  { label: "Electric Bikes", href: "/motorcycles/category/electric-bikes" },
] as const;
