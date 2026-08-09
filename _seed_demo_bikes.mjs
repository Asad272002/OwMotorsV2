// ======================================================================
// OW MOTORS — Seed demo bike inventory (4 brands × sample bikes + variants)
// Run: node _seed_demo_bikes.mjs
// Safe to run repeatedly — won't duplicate (uses upsert by slug).
// After running, Manager dashboard will show real variants + prices.
// ======================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, ".env.local");
const envRaw = readFileSync(envPath, "utf-8").split(/\r?\n/);
const env = Object.fromEntries(
  envRaw.map(l => { const i = l.indexOf("="); return i > 0 ? [l.slice(0,i).trim(), l.slice(i+1).trim()] : null; }).filter(Boolean)
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY!"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const BRANDS = [
  {
    name: "TARO", slug: "taro",
    desc: "TARO is OW Motors flagship brand — premium heavy-budget commuter & sport bikes manufactured in partnership with Taiwan TARO Motors.",
    bikes: [
      { name: "TARO GP V3", slug: "taro-gp-v3",
        shortDesc: "250cc flagship sport bike with liquid cooling and modern LED headlight.",
        longDesc: "TARO GP V3 is the flagship sport bike in the OW Motors lineup. 250cc single-cylinder liquid-cooled engine, six-speed gearbox, LED projector headlight, full fairing, alloy wheels and digital instrument cluster with gear indicator.",
        variants: [
          { cc: 250, colorName: "Red",   colorHex: "#B91C1C", qty: 5, pricePKR: 465000 },
          { cc: 250, colorName: "Black", colorHex: "#111827", qty: 3, pricePKR: 465000 },
        ] },
      { name: "TARO Alpha", slug: "taro-alpha",
        shortDesc: "Entry 150cc commuter with excellent fuel economy (45 km/l).",
        longDesc: "Everyday rider 150cc commuter — built for showroom city commuting & touring with extra storage under seat.",
        variants: [
          { cc: 150, colorName: "Blue",  colorHex: "#1D4ED8", qty: 7, pricePKR: 285000 },
          { cc: 150, colorName: "Black", colorHex: "#111827", qty: 4, pricePKR: 285000 },
        ] },
    ]
  },
  {
    name: "Lifan", slug: "lifan",
    desc: "Lifan — established Chinese motorcycle manufacturer with strong touring & utility lineups in Pakistan.",
    bikes: [
      { name: "Lifan KPR 200", slug: "lifan-kpr-200",
        shortDesc: "200cc sport bike — water-cooled with balanced power.",
        longDesc: "Lifan KPR 200 sport variant with fairing, radial tires, LED signals, and front/rear disc brakes.",
        variants: [
          { cc: 200, colorName: "Blue",   colorHex: "#1E40AF", qty: 2, pricePKR: 390000 },
          { cc: 200, colorName: "White",  colorHex: "#F8FAFC", qty: 3, pricePKR: 390000 },
        ] },
      { name: "Lifan LF 150", slug: "lifan-lf-150",
        shortDesc: "150cc standard commuter motorcycle for city & rural.",
        longDesc: "Lifan LF 150 with kick + self-start dual option and 5-speed transmission.",
        variants: [
          { cc: 150, colorName: "Maroon", colorHex: "#7F1D1D", qty: 9, pricePKR: 255000 },
          { cc: 150, colorName: "Black",  colorHex: "#111827", qty: 6, pricePKR: 255000 },
        ] },
    ]
  },
  {
    name: "Hi-Speed", slug: "hi-speed",
    desc: "Hi-Speed is a popular Pakistani assembled motorcycle brand known for value-packed 70cc & 125cc daily riders.",
    bikes: [
      { name: "Hi-Speed SR 150", slug: "hi-speed-sr-150",
        shortDesc: "Stylish 150cc daily driver with modern graphics.",
        longDesc: "Hi-Speed SR 150 with 5-speed manual, alloy rims, sporty graphics package — showroom favorite youth model.",
        variants: [
          { cc: 150, colorName: "Grey",  colorHex: "#4B5563", qty: 8, pricePKR: 235000 },
          { cc: 150, colorName: "Green", colorHex: "#166534", qty: 5, pricePKR: 235000 },
        ] },
      { name: "Hi-Speed 70 Deluxe", slug: "hi-speed-70-deluxe",
        shortDesc: "Budget 70cc fuel-efficient daily commuter.",
        longDesc: "Hi-Speed 70 Deluxe with high mileage economy at 70cc displacement.",
        variants: [
          { cc: 70, colorName: "Red",    colorHex: "#DC2626", qty: 12, pricePKR: 115000 },
          { cc: 70, colorName: "Black",  colorHex: "#111827", qty: 10, pricePKR: 115000 },
        ] },
    ]
  },
  {
    name: "Super Star", slug: "super-star",
    desc: "Super Star — domestic market 125cc / 150cc touring range with robust spare-parts availability nationwide.",
    bikes: [
      { name: "Super Star 125", slug: "super-star-125",
        shortDesc: "Standard 125cc commuter. Pakistan bestseller.",
        longDesc: "Super Star 125 with 4-stroke single cylinder 125cc. Reliable everyday motorcycle with standard 125 with spare-parts ready everywhere in Punjab & interior regions.",
        variants: [
          { cc: 125, colorName: "Red",    colorHex: "#DC2626", qty: 14, pricePKR: 195000 },
          { cc: 125, colorName: "Black",  colorHex: "#111827", qty: 11, pricePKR: 195000 },
          { cc: 125, colorName: "Blue",   colorHex: "#1E3A8A", qty: 7, pricePKR: 195000 },
        ] },
      { name: "Super Star Thunder 150", slug: "super-star-thunder-150",
        shortDesc: "Premium 150cc Thunder commuter with extra torque.",
        longDesc: "Super Star Thunder 150cc premium variant.",
        variants: [
          { cc: 150, colorName: "Silver", colorHex: "#9CA3AF", qty: 4, pricePKR: 279000 },
          { cc: 150, colorName: "Black",  colorHex: "#111827", qty: 5, pricePKR: 279000 },
        ] },
    ]
  },
];

const NOW = new Date().toISOString();
let totalBrandsInserted = 0, totalBikes = 0, totalVariants = 0;

for (const brand of BRANDS) {
  console.log(`\nBrand: ${brand.name} (slug: ${brand.slug})`);
  const baseBrandPayload = {
    name: brand.name, slug: brand.slug,
    short_description: brand.desc,
    full_description: brand.desc + " " + brand.desc,
    is_active: true, display_order: 0, logo_path: null, hero_image_path: null,
    seo_title: `${brand.name} Bikes Prices in Pakistan 2026 | OW Motors`,
    seo_description: `Browse latest ${brand.name} bikes prices in Pakistan 2026 at OW Motors showroom. Full range, specs, colors, stock availability.`,
    updated_at: NOW, created_at: NOW,
  };
  let brandId = "";
  // Find existing brand by slug first
  const exist = await sb.from("brands").select("id, slug").eq("slug", brand.slug).maybeSingle();
  if (!exist.error && exist.data) {
    brandId = exist.data.id;
    const up = await sb.from("brands").update({...baseBrandPayload, created_at: undefined }).eq("id", brandId);
    console.log(`  → Updated existing brand id=${brandId.slice(0,8)}…`);
  } else {
    const ins = await sb.from("brands").insert({ ...baseBrandPayload, display_order: totalBrandsInserted }).select("id").maybeSingle();
    if (ins.error) { console.log(`  ❌ Brand insert error: ${ins.error.message}`); continue; }
    brandId = ins.data?.id ?? "";
    console.log(`  → Inserted NEW brand id=${brandId.slice(0,8)}…`);
    totalBrandsInserted += 1;
  }

  for (const bike of brand.bikes) {
    totalBikes++;
    const basePayload = {
      brand_id: brandId,
      name: bike.name, slug: bike.slug,
      short_description: bike.shortDesc, full_description: bike.longDesc,
      base_price: Math.min(...bike.variants.map(v => v.pricePKR)),
      is_featured: bike.slug.includes("gp-v3") || bike.slug.includes("kpr"),
      publication_status: "published",
      seo_title: null, seo_description: null,
      created_at: NOW, updated_at: NOW,
    };
    let bikeId = "";
    const ex2 = await sb.from("motorcycles").select("id").eq("slug", bike.slug).maybeSingle();
    if (!ex2.error && ex2.data) {
      bikeId = ex2.data.id;
      await sb.from("motorcycles").update({ ...basePayload, created_at: undefined }).eq("id", bikeId);
      console.log(`    🛵 Updated bike ${bike.name}`);
    } else {
      const ins2 = await sb.from("motorcycles").insert(basePayload).select("id").maybeSingle();
      if (ins2.error) { console.log(`    ❌ Bike insert error: ${ins2.error.message}`); continue; }
      bikeId = ins2.data?.id ?? "";
      console.log(`    🆕 New bike ${bike.name}`);
    }

    // VARIANTS - upsert by (motorcycle_id, cc, color_name, color_hex) unique-ish combo
    for (let vIndex = 0; vIndex < bike.variants.length; vIndex++) {
      const v = bike.variants[vIndex];
      totalVariants++;
      const color3 = (v.colorName || "NON").toUpperCase().slice(0, 3);
      const slugPart = (bike.slug.split("-").slice(-2).join("") || bike.slug).toUpperCase().slice(0, 6);
      const sku = brand.slug.toUpperCase() + "-" + slugPart + "-" + v.cc + "-" + color3 + "-" + (vIndex + 1);
      const variantData = {
        motorcycle_id: bikeId,
        cc: v.cc,
        color_name: v.colorName,
        color_hex: v.colorHex,
        quantity: v.qty,
        price: v.pricePKR,
        stock_status: v.qty > 0 ? "in_stock" : "out_of_stock",
        created_at: NOW, updated_at: NOW,
      };
      const ex3 = await sb.from("motorcycle_variants").select("id")
        .eq("motorcycle_id", bikeId)
        .eq("cc", v.cc)
        .eq("color_name", v.colorName ?? "").maybeSingle();
      if (!ex3.error && ex3.data) {
        await sb.from("motorcycle_variants").update({ ...variantData, created_at: undefined }).eq("id", ex3.data.id);
      } else {
        const ins3 = await sb.from("motorcycle_variants").insert(variantData);
        if (ins3.error) console.log(`      ❌ variant error: ${ins3.error.message}`);
      }
      console.log(`       ⚙️  ${v.cc}cc ${v.colorName} qty=${v.qty} price=${v.pricePKR}`);
    }
  }
}

// Summary
console.log(`\n\n=======================================================`);
console.log(`  SEED COMPLETE`);
console.log(`=======================================================`);
console.log(`  Brands touched: ${totalBrandsInserted} inserted, ${BRANDS.length - totalBrandsInserted} updated`);
console.log(`  Bikes: ${totalBikes}`);
console.log(`  Variants: ${totalVariants}`);
console.log(`\nRefresh manager dashboard. You should see those active bike variants count = 14 variants now!`);
process.exit(0);
