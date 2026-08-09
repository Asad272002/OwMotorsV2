# Asset Inventory

## Method and policy

Inventory covers the 29 files directly under `figma-vite-reference/src/imports`. Sizes, dimensions, formats, color modes, alpha/transparency, hashes, and `App.tsx` imports were inspected. `src/imports/pasted_text` is excluded because it is design prompting, not a media asset. “Used” means referenced by `App.tsx`, not that content ownership or factual correctness is approved. All content images need database/editorial alt text; decorative duplicates should use empty alt instead.

| Asset filename | Current location | Type | Size | Use in reference | Retain? | Recommended production filename | Optimization | Transparency | Alt required? |
|---|---|---:|---:|---|---|---|---|---|---|
| `ChatGPT_Image_Jul_30__2026__05_52_04_PM.jpg` | `src/imports` | JPEG, 1672×941 | 221.1 KB | Taro campaign banner/showcase A | Review/likely | `taro-campaign-road-01.webp` | Verify rights/content; crop variants; WebP/AVIF responsive derivatives | No | Yes if content; no if decorative |
| `ChatGPT_Image_Jul_30__2026__05_52_11_PM.jpg` | `src/imports` | JPEG, 1672×941 | 331.6 KB | Taro campaign banner/showcase B | Review/likely | `taro-campaign-road-02.webp` | Same; target quality by visual test | No | Yes if content; no if decorative |
| `ChatGPT_Image_Jul_30__2026__05_52_16_PM.jpg` | `src/imports` | JPEG, 1672×941 | 350.0 KB | Taro campaign banner/showcase C | Review/likely | `taro-campaign-road-03.webp` | Same | No | Yes if content; no if decorative |
| `ChatGPT_Image_Jul_30__2026__05_52_55_PM.jpg` | `src/imports` | JPEG, 1672×941 | 289.9 KB | Taro campaign banner/showcase D | Review/likely | `taro-campaign-road-04.webp` | Same | No | Yes if content; no if decorative |
| `ChatGPT_Image_Jul_31__2026__02_40_08_AM.png` | `src/imports` | PNG RGBA, 1536×1024 | 2.09 MB | OW navbar/footer logo | Yes, replace from master | `ow-motors-logo.svg` (preferred) | Obtain/vectorize approved master; trim huge canvas; fallback transparent WebP/PNG sizes | Yes | No; logo link needs accessible name |
| `hispeed-removebg-preview.png` | `src/imports` | PNG RGBA, 447×447 | 66.3 KB | Hi-Speed logo/showcase | Yes, after brand approval | `hi-speed-logo.svg` (preferred) | Obtain official SVG; otherwise trim/compress transparent raster | Yes | Context-dependent; brand name if informative |
| `image-1.png` | `src/imports` | PNG RGBA, 514×532 | 110.1 KB | Unused | Quarantine pending visual review | `unidentified-transparent-02.png` until identified | Identify subject; discard if duplicate/obsolete; compress if retained | Yes | Required only if used as content |
| `image.png` | `src/imports` | PNG RGBA, 361×265 | 14.8 KB | Unused | Quarantine pending visual review | `unidentified-transparent-01.png` until identified | Identify and rename; discard if obsolete | Yes | Required only if used as content |
| `lif-removebg-preview.png` | `src/imports` | PNG RGBA, 447×447 | 101.8 KB | Lifan logo/showcase | Yes, after brand approval | `lifan-logo.svg` (preferred) | Obtain official SVG; otherwise trim/compress | Yes | Context-dependent |
| `lif1.png` | `src/imports` | PNG RGBA, 800×600 | 455.7 KB | Lifan motorcycle cutout, mega/showcase/gallery pool | Review/likely | `lifan-[model]-side-[color]-01.webp` | Identify exact model/color; lossless alpha WebP; trim canvas; responsive sizes | Yes | Yes: brand, model, color, view |
| `lif2.png` | `src/imports` | indexed PNG, 800×600 | 93.0 KB | Lifan motorcycle cutout | Review/likely | `lifan-[model]-side-[color]-02.webp` | Identify; alpha WebP/optimized PNG | Yes | Yes |
| `lif3.png` | `src/imports` | indexed PNG, 794×595 | 98.0 KB | Lifan motorcycle cutout | Review/likely | `lifan-[model]-side-[color]-03.webp` | Identify; alpha WebP/optimized PNG | Yes | Yes |
| `lifan_1.jpg` | `src/imports` | JPEG, 1672×941 | 259.0 KB | Lifan campaign banner/showcase 1 | Review/likely | `lifan-campaign-01.webp` | Correct model/rights check; AVIF/WebP responsive crops | No | Yes if content; no if decorative |
| `lifan_2.jpg` | `src/imports` | JPEG, 1672×941 | 196.1 KB | Lifan campaign banner/showcase 2 | Review/likely | `lifan-campaign-02.webp` | Same | No | Yes if content; no if decorative |
| `lifan_3.jpg` | `src/imports` | JPEG, 1448×1086 | 240.5 KB | Lifan campaign banner/showcase 3 | Review/likely | `lifan-campaign-03.webp` | Same; create landscape crop rather than CSS distortion | No | Yes if content; no if decorative |
| `lifan_5.jpg` | `src/imports` | JPEG, 1672×941 | 283.1 KB | Lifan campaign banner/showcase 4 | Review/likely | `lifan-campaign-04.webp` | AVIF/WebP responsive derivatives | No | Yes if content; no if decorative |
| `lifan_6.jpg` | `src/imports` | JPEG, 1672×941 | 245.2 KB | Lifan campaign banner/showcase 5 | Review/likely | `lifan-campaign-05.webp` | Same | No | Yes if content; no if decorative |
| `Logo_12-removebg-preview.png` | `src/imports` | PNG RGBA, 340×143 | 27.3 KB | Unused | Review; possible alternate logo | `ow-motors-logo-alternate.png` only if approved | Compare with official mark; prefer SVG; discard duplicate | Yes | No if redundant/decorative |
| `super-removebg-preview.png` | `src/imports` | PNG RGBA, 447×447 | 83.5 KB | Super Star logo/showcase | Yes, after brand approval | `super-star-logo.svg` (preferred) | Obtain official SVG; otherwise trim/compress | Yes | Context-dependent |
| `tar__-removebg-preview.png` | `src/imports` | PNG RGBA, 207×130 | 12.6 KB | Taro logo/showcase | Yes, after brand approval | `taro-logo.svg` (preferred) | Obtain official SVG; raster is small; preserve transparent fallback | Yes | Context-dependent |
| `taro1.png` | `src/imports` | PNG RGB, 1254×1254 | 2.12 MB | Unused | Review, not web-ready | `taro-[subject]-01.webp` after identification | Convert photo-like RGB PNG to AVIF/WebP; resize/crop | No | Yes if retained as content |
| `taro_2.png` | `src/imports` | PNG RGB, 1448×1086 | 2.37 MB | Unused | Review, not web-ready | `taro-[subject]-02.webp` | Convert to AVIF/WebP; responsive sizes | No | Yes if retained |
| `taro_3.png` | `src/imports` | PNG RGB, 1672×941 | 2.65 MB | Unused | Review, not web-ready | `taro-[subject]-03.webp` | Convert to AVIF/WebP; responsive sizes | No | Yes if retained |
| `taro_4.png` | `src/imports` | PNG RGB, 1672×941 | 2.30 MB | Unused | Review, not web-ready | `taro-[subject]-04.webp` | Convert to AVIF/WebP; responsive sizes | No | Yes if retained |
| `taro_5.png` | `src/imports` | PNG RGB, 1672×941 | 2.38 MB | Unused | Review, not web-ready | `taro-[subject]-05.webp` | Convert to AVIF/WebP; responsive sizes | No | Yes if retained |
| `tr1-removebg-preview.png` | `src/imports` | PNG RGBA, 500×500 | 237.6 KB | Taro cutout, mega/showcase/gallery pool | Review/likely | `taro-[model]-side-[color]-01.webp` | Identify model/color; trim; alpha WebP/optimized PNG | Yes | Yes |
| `tr2-removebg-preview.png` | `src/imports` | PNG RGBA, 503×496 | 247.7 KB | Taro cutout, mega/showcase/gallery pool | Review/likely | `taro-[model]-side-[color]-02.webp` | Same | Yes | Yes |
| `tr3-removebg-preview.png` | `src/imports` | PNG RGBA, 612×408 | 108.4 KB | Unused; naming conflicts with alias | Quarantine until identified | `taro-[model]-side-[color]-03.webp` if approved | Compare with `tr4`; identify; trim/compress | Yes | Yes if used |
| `tr4-removebg-preview.png` | `src/imports` | PNG RGBA, 500×500 | 157.7 KB | Imported under misleading alias `tr3`; used in mega/showcase/gallery pool | Review/likely | `taro-[model]-side-[color]-04.webp` | Correct identity; trim; alpha WebP/optimized PNG | Yes | Yes |

## External media inventory

`App.tsx` also references many `images.unsplash.com` motorcycle placeholders for banners, cards, catalog, galleries, overview, and related products; `img.youtube.com` for three thumbnails; `youtu.be` for videos; and the OW Motor Sports YouTube channel. Do not retain Unsplash as a production product catalog source. Record each approved replacement as a first-class media row with subject/model/variant, ownership/license, width/height, sort order, focal point, and alt text.

## Retention and storage decisions

- “Review/likely” is not launch approval. Brand/model identity and rights must be confirmed first.
- Keep immutable UI/brand assets in `public/images` only if deployments own them. Store editorial product/variant/campaign media in Supabase Storage with database metadata.
- Store master originals outside the optimized delivery set. Use immutable versioned filenames/paths rather than overwriting cached objects.
- Do not upscale small source files. Generate only sizes the layout uses and set correct `sizes`/aspect ratios in `next/image`.
- Logos embedded next to visible brand text can use empty alt; standalone logos need a useful accessible name. Motorcycle/product imagery always needs a descriptive, factually verified alt such as “Yellow Taro GP V3 250cc side view.”
