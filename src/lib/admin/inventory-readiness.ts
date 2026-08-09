import type { AdminMotorcycleInventoryItem } from "@/lib/admin/queries";

export type CompletionState = "complete" | "needs_attention" | "incomplete";
export type EditorSectionKey = "basic" | "categories" | "variants" | "images" | "specifications" | "features" | "seo" | "publishing";

export type EditorSectionStatus = {
  key: EditorSectionKey;
  label: string;
  state: CompletionState;
  detail: string;
};

function textPresent(value: string | null, minimum: number) {
  return Boolean(value?.trim() && value.trim().length >= minimum);
}

export function getMotorcycleEditorStatus(motorcycle: AdminMotorcycleInventoryItem): readonly EditorSectionStatus[] {
  const activeVariants = motorcycle.variants.filter((variant) => variant.is_active);
  const hasDefaultVariant = activeVariants.some((variant) => variant.is_default);
  const hasPrimaryImage = motorcycle.images.some((image) => image.is_primary);
  const seoComplete = textPresent(motorcycle.seo_title, 10) && textPresent(motorcycle.seo_description, 50);

  return [
    {
      key: "basic",
      label: "Basic Information",
      state: motorcycle.brand && textPresent(motorcycle.name, 2) && textPresent(motorcycle.short_description, 10) && textPresent(motorcycle.full_description, 20) ? "complete" : "incomplete",
      detail: "Identity, descriptions, brand, and starting price",
    },
    {
      key: "categories",
      label: "Categories",
      state: motorcycle.categoryLinks.length ? "complete" : "incomplete",
      detail: motorcycle.categoryLinks.length ? `${motorcycle.categoryLinks.length} assigned` : "No browsing category assigned",
    },
    {
      key: "variants",
      label: "Variants",
      state: !activeVariants.length ? "incomplete" : hasDefaultVariant ? "complete" : "needs_attention",
      detail: !activeVariants.length ? "Add a CC and color combination" : hasDefaultVariant ? `${activeVariants.length} active combination${activeVariants.length === 1 ? "" : "s"}` : "Choose an active default combination",
    },
    {
      key: "images",
      label: "Images",
      state: !motorcycle.images.length ? "incomplete" : hasPrimaryImage ? "complete" : "needs_attention",
      detail: !motorcycle.images.length ? "Upload at least one image" : hasPrimaryImage ? `${motorcycle.images.length} image${motorcycle.images.length === 1 ? "" : "s"}` : "Choose a primary image",
    },
    {
      key: "specifications",
      label: "Specifications",
      state: motorcycle.specifications.length ? "complete" : "incomplete",
      detail: motorcycle.specifications.length ? `${motorcycle.specifications.length} technical values` : "No technical values added",
    },
    {
      key: "features",
      label: "Features",
      state: motorcycle.features.length ? "complete" : "incomplete",
      detail: motorcycle.features.length ? `${motorcycle.features.length} feature${motorcycle.features.length === 1 ? "" : "s"}` : "No selling points added",
    },
    {
      key: "seo",
      label: "SEO",
      state: seoComplete ? "complete" : "needs_attention",
      detail: seoComplete ? "Search title and description ready" : "Using fallbacks; add optimized metadata",
    },
    {
      key: "publishing",
      label: "Preview & Publish",
      state: motorcycle.publication_status === "published" ? "complete" : motorcycle.publication_status === "archived" ? "incomplete" : "needs_attention",
      detail: motorcycle.publication_status === "published" ? "Visible on the website" : motorcycle.publication_status === "archived" ? "Archived from staff workflows" : "Draft is not public",
    },
  ];
}

export function getMotorcycleCompletion(motorcycle: AdminMotorcycleInventoryItem): CompletionState {
  const statuses = getMotorcycleEditorStatus(motorcycle);
  const publishingContent = statuses.filter((status) => status.key !== "publishing" && status.key !== "seo");
  if (publishingContent.some((status) => status.state === "incomplete")) return "incomplete";
  if (statuses.some((status) => status.state !== "complete")) return "needs_attention";
  return "complete";
}

export function getMotorcycleStockStatus(motorcycle: AdminMotorcycleInventoryItem) {
  const active = motorcycle.variants.filter((variant) => variant.is_active);
  if (active.some((variant) => variant.stock_status === "in_stock" && variant.quantity > 0)) return "in_stock" as const;
  if (active.some((variant) => variant.stock_status === "coming_soon")) return "coming_soon" as const;
  if (active.some((variant) => variant.stock_status === "discontinued")) return "discontinued" as const;
  return "out_of_stock" as const;
}

export function completionLabel(state: CompletionState) {
  return state === "complete" ? "Complete" : state === "needs_attention" ? "Needs Attention" : "Incomplete";
}
