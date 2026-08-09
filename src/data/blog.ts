export type BlogSection = Readonly<{ heading: string; body: string }>;

export type BlogCategory = Readonly<{
  id: string;
  name: string;
  slug: string;
  accentColor: string;
}>;

export type BlogPost = Readonly<{
  id: string;
  category: BlogCategory;
  title: string;
  slug: string;
  excerpt: string;
  brandLabel: string | null;
  heroImage: string;
  heroImageAlt: string;
  lead: string;
  sections: readonly BlogSection[];
  tags: readonly string[];
  authorName: string;
  authorInitials: string;
  authorBio: string;
  readingTimeMinutes: number;
  isFeatured: boolean;
  publishedAt: string;
  updatedAt: string;
  seoTitle: string | null;
  seoDescription: string | null;
}>;

export const FALLBACK_BLOG_CATEGORIES: readonly BlogCategory[] = [
  { id: "reviews", name: "Reviews", slug: "reviews", accentColor: "#C62828" },
  { id: "first-rides", name: "First Rides", slug: "first-rides", accentColor: "#2563EB" },
  { id: "comparisons", name: "Comparisons", slug: "comparisons", accentColor: "#15803D" },
  { id: "guides", name: "Guides", slug: "guides", accentColor: "#D97706" },
  { id: "news", name: "News", slug: "news", accentColor: "#7C3AED" },
  { id: "tips", name: "Tips", slug: "tips", accentColor: "#DB2777" },
] as const;

const categories = Object.fromEntries(FALLBACK_BLOG_CATEGORIES.map((category) => [category.slug, category]));
const authorBio = "The OW Motors editorial team shares practical motorcycle guides, product information, and dealership news.";

export const FALLBACK_BLOG_POSTS: readonly BlogPost[] = [
  {
    id: "lifan-review", category: categories.reviews, title: "LIFAN KPS 250 Review: Is This the Best Value Sport Bike in Pakistan?", slug: "lifan-kps-250-review-best-value-sport-bike-pakistan",
    excerpt: "A focused look at the LIFAN KPS 250, its everyday usability, key equipment, and the questions riders should ask before buying.", brandLabel: "LIFAN",
    heroImage: "/images/home/lifan-campaign-04.webp", heroImageAlt: "LIFAN motorcycle displayed in a dark urban campaign setting",
    lead: "Choosing a sport motorcycle is easier when the decision is based on verified specifications, fit, intended use, and current availability.",
    sections: [{ heading: "Start with the published specification", body: "Compare the engine, braking, suspension, and dimensions listed for the exact available variant. Ask the dealership to confirm any specification that affects your decision." }, { heading: "Consider everyday usability", body: "Riding position, seat height, fuel capacity, and service access can matter as much as headline performance. Match the motorcycle to the roads and distances you ride most often." }, { heading: "Confirm price and availability", body: "Prices and stock can change. Use the OW Motors contact route to confirm the selected configuration before making a purchase decision." }],
    tags: ["LIFAN", "Sport Bike", "Buying Guide"], authorName: "Hamza Malik", authorInitials: "HM", authorBio, readingTimeMinutes: 8, isFeatured: true, publishedAt: "2026-07-28T09:00:00+05:00", updatedAt: "2026-07-28T09:00:00+05:00", seoTitle: "LIFAN KPS 250 Review and Buying Guide", seoDescription: "Review the LIFAN KPS 250 specifications, everyday usability, availability questions, and buying considerations from OW Motors.",
  },
  {
    id: "taro-first-ride", category: categories["first-rides"], title: "First Ride: TARO Hawk 200 Impresses on the Lahore-Islamabad Motorway", slug: "first-ride-taro-hawk-200-lahore-islamabad-motorway",
    excerpt: "A practical first-look format covering the TARO Hawk 200 equipment, riding position, and questions for longer-distance riders.", brandLabel: "TARO", heroImage: "/images/home/taro-campaign-02.webp", heroImageAlt: "Red TARO touring motorcycle shown from the side",
    lead: "A useful first-ride report begins with the exact motorcycle configuration and separates verified facts from rider impressions.", sections: [{ heading: "Check the exact configuration", body: "Engine capacity, available equipment, and stock status can vary by configuration. Confirm the selected variant before comparing motorcycles." }, { heading: "Fit matters on longer rides", body: "Consider seat height, handlebar reach, wind protection, luggage requirements, and the type of roads you expect to use." }],
    tags: ["TARO", "First Ride", "Touring"], authorName: "Sara Ahmed", authorInitials: "SA", authorBio, readingTimeMinutes: 6, isFeatured: false, publishedAt: "2026-07-22T09:00:00+05:00", updatedAt: "2026-07-22T09:00:00+05:00", seoTitle: null, seoDescription: "Explore the TARO Hawk 200 through a practical first-ride checklist covering configuration, comfort, equipment, and availability.",
  },
  {
    id: "beginner-guide", category: categories.guides, title: "The Complete Beginner’s Guide to Buying Your First Motorcycle in Pakistan", slug: "beginners-guide-buying-first-motorcycle-pakistan",
    excerpt: "Engine size, budget, paperwork, riding gear, and dealer checks—everything a first-time buyer needs in one practical guide.", brandLabel: null, heroImage: "/images/home/taro-campaign-01.webp", heroImageAlt: "Red sport motorcycle parked on a mountain road",
    lead: "Buying your first motorcycle in Pakistan can feel overwhelming—engine sizes, brand choices, licence requirements, and paperwork all pile up before you have even sat on a bike. This guide cuts through the noise.",
    sections: [{ heading: "Step 1: Pick the Right Engine Size", body: "Choose an engine capacity that matches your experience, daily distance, road conditions, and maintenance expectations. Compare the published specification for each exact variant." }, { heading: "Step 2: Set a Realistic Budget", body: "Plan beyond the motorcycle price. Include registration, insurance where applicable, quality riding gear, routine maintenance, fuel, and a sensible contingency." }, { heading: "Step 3: Get Your Learner’s Licence", body: "Check the latest requirements with your local licensing authority before riding. Keep valid documentation and follow the applicable learner and testing rules." }, { heading: "Step 4: Buy from an Authorised Dealer", body: "Ask for proper sales documentation, confirm the frame and engine identification details, and verify the manufacturer or dealer warranty before completing the purchase." }, { heading: "Step 5: Essential First Gear", body: "Start with a certified helmet, suitable gloves, ankle-covering footwear, and visible protective clothing. Choose equipment that fits correctly and is appropriate for local conditions." }],
    tags: ["Beginner", "Buying Guide", "Pakistan", "Licence", "First Motorcycle"], authorName: "OW Motors Team", authorInitials: "OW", authorBio, readingTimeMinutes: 12, isFeatured: false, publishedAt: "2026-07-18T09:00:00+05:00", updatedAt: "2026-07-18T09:00:00+05:00", seoTitle: "Beginner’s Guide to Buying a Motorcycle in Pakistan", seoDescription: "A practical first-motorcycle buying guide for Pakistan covering engine size, budget, licensing, dealer checks, and essential riding gear.",
  },
  {
    id: "comparison", category: categories.comparisons, title: "HI-SPEED Viper 250 vs LIFAN KP200: Which Naked Bike Fits You?", slug: "hi-speed-viper-250-vs-lifan-kp200-comparison", excerpt: "A decision-focused comparison framework covering fit, published specifications, availability, and ownership priorities.", brandLabel: null, heroImage: "/images/home/lifan-campaign-03.webp", heroImageAlt: "Dark naked motorcycle shown in an urban street campaign", lead: "A useful comparison starts with the exact available variants and the needs of the rider—not a single headline number.", sections: [{ heading: "Compare like-for-like variants", body: "Confirm engine capacity, braking equipment, price, and availability for the exact variants under consideration." }, { heading: "Prioritise rider fit", body: "Seat height, control reach, weight, and intended use can change which motorcycle is the better match for a particular rider." }], tags: ["Comparison", "HI-SPEED", "LIFAN", "Naked Bikes"], authorName: "Bilal Rauf", authorInitials: "BR", authorBio, readingTimeMinutes: 10, isFeatured: false, publishedAt: "2026-07-14T09:00:00+05:00", updatedAt: "2026-07-14T09:00:00+05:00", seoTitle: null, seoDescription: "Compare the HI-SPEED Viper 250 and LIFAN KP200 using verified specifications, rider fit, price, and availability considerations.",
  },
  {
    id: "launch-news", category: categories.news, title: "SUPER STAR Titan 250 Officially Launches—Here’s What Riders Should Check", slug: "super-star-titan-250-launch-rider-checklist", excerpt: "A clear launch checklist covering published equipment, available variants, ownership information, and what to verify.", brandLabel: "SUPER STAR", heroImage: "/images/home/taro-motorcycle-02.png", heroImageAlt: "Touring motorcycle photographed in profile on a light background", lead: "New-model announcements are most useful when buyers can connect them to verified configuration, pricing, and availability information.", sections: [{ heading: "Review the available variants", body: "Confirm the engine capacity, colour, price, stock status, and images for the exact configuration you want." }, { heading: "Ask about ownership support", body: "Verify warranty terms, recommended service intervals, parts support, and the documentation supplied with the motorcycle." }], tags: ["SUPER STAR", "News", "Launch"], authorName: "OW Motors Team", authorInitials: "OW", authorBio, readingTimeMinutes: 5, isFeatured: false, publishedAt: "2026-07-10T09:00:00+05:00", updatedAt: "2026-07-10T09:00:00+05:00", seoTitle: null, seoDescription: "A practical checklist for reviewing a new motorcycle launch, including configuration, ownership support, documentation, price, and availability.",
  },
  {
    id: "maintenance", category: categories.tips, title: "5 Maintenance Habits That Can Help Your Motorcycle Last Longer", slug: "five-motorcycle-maintenance-habits", excerpt: "Five simple ownership habits that support reliability, safety checks, and informed maintenance conversations with qualified technicians.", brandLabel: null, heroImage: "/images/home/taro-campaign-03.webp", heroImageAlt: "Close view of a red motorcycle fuel tank and bodywork", lead: "Consistent checks and timely professional servicing help owners notice changes early and keep maintenance records organised.", sections: [{ heading: "Follow the manufacturer schedule", body: "Use the service intervals and fluid specifications published for your exact motorcycle model and variant." }, { heading: "Check tyres and controls", body: "Before riding, inspect tyre condition and pressure, lights, brakes, and the free movement of key controls." }, { heading: "Keep maintenance records", body: "Record dates, mileage, parts, and service work so future maintenance decisions are based on a clear history." }], tags: ["Maintenance", "Tips", "Ownership"], authorName: "Adnan Qureshi", authorInitials: "AQ", authorBio, readingTimeMinutes: 7, isFeatured: false, publishedAt: "2026-07-05T09:00:00+05:00", updatedAt: "2026-07-05T09:00:00+05:00", seoTitle: null, seoDescription: "Five practical motorcycle maintenance habits covering service schedules, pre-ride checks, record keeping, and professional maintenance support.",
  },
] as const;
