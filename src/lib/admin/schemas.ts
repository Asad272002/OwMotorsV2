import { z } from "zod";

export const uuid = z.string().uuid("The selected record is invalid.");
const slug = z.string().trim().min(1, "Enter a slug.").max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens only.");
const optionalString = (schema: z.ZodString) => z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  return value;
}, schema.nullable());
const checkbox = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());
const nonNegativeInteger = z.coerce.number().int().min(0);
const money = z.coerce.number().min(0).max(1_000_000_000);
const seoTitle = optionalString(z.string().trim().min(10).max(70));
const seoDescription = optionalString(z.string().trim().min(50).max(180));
const chasisNumberList = z.preprocess((value) => {
  if (typeof value !== "string") return [];
  return value
    .split(/[\r\n,]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}, z.array(z.string().min(3).max(60).regex(/^[A-Z0-9][A-Z0-9 _/-]*$/, "Use alphanumeric chasis numbers only.")));

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Enter your password.").max(200),
});

export const brandSchema = z.object({
  id: uuid.optional(), name: z.string().trim().min(2).max(100), slug,
  logoPath: optionalString(z.string().trim().min(1).max(500).refine((value) => !value.startsWith("/") && !value.includes(".."), "Use a safe bucket-relative path.")),
  shortDescription: z.string().trim().min(10).max(320), fullDescription: z.string().trim().min(20).max(10_000),
  heroImagePath: optionalString(z.string().trim().min(1).max(500).refine((value) => !value.startsWith("/") && !value.includes(".."), "Use a safe bucket-relative path.")),
  seoTitle, seoDescription, isActive: checkbox, displayOrder: nonNegativeInteger,
});

export const brandBannerUploadSchema = z.object({
  brandId: uuid,
  altText: z.string().trim().min(3).max(240),
});

export const brandBannerMetadataSchema = z.object({
  id: uuid,
  brandId: uuid,
  altText: z.string().trim().min(3).max(240),
  isActive: checkbox,
});

export const brandBannerMoveSchema = z.object({
  id: uuid,
  brandId: uuid,
  direction: z.enum(["up", "down"]),
});

export const brandMoveSchema = z.object({
  id: uuid,
  direction: z.enum(["up", "down"]),
});

export const homepageDisplayMoveSchema = z.object({
  id: uuid,
  direction: z.enum(["up", "down"]),
});

export const homepageDisplayStatusSchema = z.object({
  id: uuid,
  status: z.enum(["visible", "hidden", "removed"]),
});

export const homepageLogoVisibilitySchema = z.object({
  id: uuid,
  visible: checkbox,
});

export const categorySchema = z.object({
  id: uuid.optional(), name: z.string().trim().min(2).max(100), slug,
  description: z.string().trim().min(20).max(5_000), seoTitle, seoDescription,
  isActive: checkbox, displayOrder: nonNegativeInteger,
});

export const motorcycleBasicSchema = z.object({
  id: uuid.optional(), brandId: uuid, name: z.string().trim().min(2).max(140), slug,
  shortDescription: z.string().trim().min(10).max(320), fullDescription: z.string().trim().min(20).max(20_000),
  basePrice: money, isFeatured: checkbox,
});

export const motorcycleSeoSchema = z.object({ id: uuid, seoTitle, seoDescription });
export const motorcyclePublishingSchema = z.object({ id: uuid, publicationStatus: z.enum(["draft", "published", "archived"]) });
export const motorcycleCategoriesSchema = z.object({ motorcycleId: uuid, categoryIds: z.array(uuid).max(30) });

export const variantSchema = z.object({
  id: uuid.optional(), motorcycleId: uuid, cc: z.coerce.number().int().min(25).max(2500),
  colorName: z.string().trim().min(2).max(80), colorHex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit HEX color."),
  price: money,
  stockStatus: z.enum(["in_stock", "out_of_stock", "coming_soon", "discontinued"]), quantity: nonNegativeInteger,
  isDefault: checkbox, isActive: checkbox,
});


export const simpleBikeStockSchema = z.object({
  brandId: uuid,
  modelName: z.string().trim().min(2, "Enter the bike model name.").max(140),
  cc: z.coerce.number().int().min(25).max(2500),
  colorName: z.string().trim().min(2, "Enter the color.").max(80),
  colorHex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid HEX color."),
  price: money,
  quantity: z.coerce.number().int().min(1, "Add at least one bike.").max(100000),
  chasisNumbers: chasisNumberList,
}).superRefine((value, ctx) => {
  const unique = new Set(value.chasisNumbers.map((item) => item.toUpperCase()));
  if (value.chasisNumbers.length !== value.quantity) {
    ctx.addIssue({ code: "custom", path: ["chasisNumbers"], message: `Enter exactly ${value.quantity} chasis number(s), one for each bike.` });
  }
  if (unique.size !== value.chasisNumbers.length) {
    ctx.addIssue({ code: "custom", path: ["chasisNumbers"], message: "Each chasis number must be unique." });
  }
});


export const simpleBikeVariantStockSchema = z.object({
  motorcycleId: uuid,
  cc: z.coerce.number().int().min(25).max(2500),
  colorName: z.string().trim().min(2, "Enter the color.").max(80),
  colorHex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid HEX color."),
  price: money,
  quantity: z.coerce.number().int().min(1, "Add at least one bike.").max(100000),
  chasisNumbers: chasisNumberList,
}).superRefine((value, ctx) => {
  const unique = new Set(value.chasisNumbers.map((item) => item.toUpperCase()));
  if (value.chasisNumbers.length !== value.quantity) {
    ctx.addIssue({ code: "custom", path: ["chasisNumbers"], message: `Enter exactly ${value.quantity} chasis number(s), one for each bike.` });
  }
  if (unique.size !== value.chasisNumbers.length) {
    ctx.addIssue({ code: "custom", path: ["chasisNumbers"], message: "Each chasis number must be unique." });
  }
});
export const simpleBikeStockEditSchema = z.object({
  variantId: uuid,
  brandId: uuid,
  modelName: z.string().trim().min(2, "Enter the bike model name.").max(140),
  cc: z.coerce.number().int().min(25).max(2500),
  colorName: z.string().trim().min(2, "Enter the color.").max(80),
  colorHex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid HEX color."),
  price: money,
});

export const bikeChasisBackfillSchema = z.object({
  variantId: uuid,
  chasisNumbers: chasisNumberList,
}).superRefine((value, ctx) => {
  const unique = new Set(value.chasisNumbers.map((item) => item.toUpperCase()));
  if (value.chasisNumbers.length < 1) {
    ctx.addIssue({ code: "custom", path: ["chasisNumbers"], message: "Enter at least one chasis number." });
  }
  if (unique.size !== value.chasisNumbers.length) {
    ctx.addIssue({ code: "custom", path: ["chasisNumbers"], message: "Each chasis number must be unique." });
  }
});
export const bikeChasisUpdateSchema = z.object({
  unitId: uuid,
  chasisNumber: z.string().trim().toUpperCase().min(3).max(60).regex(/^[A-Z0-9][A-Z0-9 _/-]*$/, "Use alphanumeric chasis numbers only."),
});
export const variantArchiveSchema = z.object({
  variantId: uuid,
  mode: z.enum(["archive", "restore"]),
});

export const imageMetadataSchema = z.object({
  id: uuid.optional(), motorcycleId: uuid, variantId: z.preprocess((value) => value === "" ? null : value, uuid.nullable()),
  altText: z.string().trim().min(3).max(240), imageType: z.enum(["gallery", "hero", "thumbnail", "color", "overview", "open_graph"]),
  sortOrder: nonNegativeInteger, isPrimary: checkbox,
});

export const specificationSchema = z.object({
  id: uuid.optional(), motorcycleId: uuid, variantId: z.preprocess((value) => value === "" ? null : value, uuid.nullable()),
  groupName: z.string().trim().min(2).max(100), label: z.string().trim().min(1).max(120), value: z.string().trim().min(1).max(500),
  unit: optionalString(z.string().trim().min(1).max(40)), sortOrder: nonNegativeInteger,
});

export const featureSchema = z.object({
  id: uuid.optional(), motorcycleId: uuid, groupName: z.string().trim().min(2).max(100), title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(10).max(1000), iconIdentifier: optionalString(z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)), sortOrder: nonNegativeInteger,
});

export const inquiryStatusSchema = z.object({ id: uuid, status: z.enum(["new", "in_progress", "resolved", "closed", "spam"]) });

export const blogPostSchema = z.object({
  id: uuid.optional(),
  categoryId: uuid,
  title: z.string().trim().min(10).max(180),
  slug,
  excerpt: z.string().trim().min(30).max(420),
  brandLabel: optionalString(z.string().trim().min(2).max(60)),
  heroImagePath: z.string().trim().max(500).refine((value) => value.startsWith("/images/") || (!value.startsWith("/") && !value.includes("..")), "Use an existing site image or a safe uploaded image path."),
  heroImageAlt: z.string().trim().min(8).max(240),
  lead: z.string().trim().min(30).max(1000),
  tags: z.string().trim().max(500),
  authorName: z.string().trim().min(2).max(100),
  authorInitials: z.string().trim().min(1).max(5),
  authorBio: z.string().trim().min(20).max(700),
  readingTimeMinutes: z.coerce.number().int().min(1).max(90),
  publicationStatus: z.enum(["draft", "published", "archived"]),
  isFeatured: checkbox,
  seoTitle,
  seoDescription,
});

// =========================================
// ERP: USER MANAGEMENT
// =========================================

export const staffUserSchema = z.object({
  id: uuid.optional(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  role: z.enum(["admin", "manager", "apprentice"]),
});

export const staffUserUpdateSchema = z.object({
  id: uuid,
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(["admin", "manager", "apprentice"]).optional(),
  isActive: checkbox.optional(),
  newPassword: z.string().min(8).max(200).optional().or(z.literal("")),
});

export const revokeUserSchema = z.object({ id: uuid });

// =========================================
// ERP: PARTS & SPARE PARTS
// =========================================

export const partSchema = z.object({
  id: uuid.optional(),
  sku: z.string().trim().min(2).max(60).regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Use uppercase letters, numbers, underscores, and hyphens only."),
  name: z.string().trim().min(2).max(200),
  description: optionalString(z.string().trim().min(3).max(2000)),
  category: z.preprocess(v => (v === "" || v === null || v === undefined) ? "general" : v, z.string().trim().min(2).max(80).default("general")),
  unit: z.preprocess(v => (v === "" || v === null || v === undefined) ? "each" : v, z.string().trim().min(1).max(40).default("each")),
  currentStock: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return 0;
    const n = Number(String(val).replace(/[^0-9]/g, "") || "0");
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }, z.coerce.number().int().min(0)),
  reorderLevel: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return 0;
    const n = Number(String(val).replace(/[^0-9]/g, "") || "0");
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }, z.coerce.number().int().min(0)),
  unitCost: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return 0;
    const n = Number(String(val).replace(/[^0-9.]/g, "") || "0");
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, z.coerce.number().min(0).max(1_000_000_000)),
  compatibleBrandId: uuid.optional().or(z.literal("")),
  compatibleMotorcycleId: uuid.optional().or(z.literal("")),
  compatibleCc: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return null;
    const n = Number(String(val).replace(/[^0-9]/g, "") || "0");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }, z.number().int().positive().nullable()),
  cartonNumber: optionalString(z.string().trim().min(1).max(80)),
  location: optionalString(z.string().trim().min(2).max(120)),
  isActive: checkbox,
});

// =========================================
// ERP: STOCK MOVEMENTS (MANAGER REQUESTS)
// =========================================

export const stockMovementSchema = z.object({
  id: uuid.optional(),
  movementType: z.enum(["motorcycle_add", "motorcycle_subtract", "part_add", "part_subtract", "adjustment"]),
  motorcycleVariantId: uuid.optional(),
  partId: uuid.optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  unitCostAtTime: money.optional(),
  chasisNumbers: chasisNumberList.optional().default([]),
  reason: z.string().trim().min(3, "Explain the reason for this stock change (at least 3 characters).").max(500),
  notes: optionalString(z.string().max(2000)),
}).superRefine((val, ctx) => {
  const hasVariant = !!val.motorcycleVariantId && val.motorcycleVariantId.length > 0;
  const hasPart = !!val.partId && val.partId.length > 0;
  if (val.movementType.includes("motorcycle") && !hasVariant) {
    ctx.addIssue({ code: "custom", message: "Select a motorcycle variant for this movement type.", path: ["motorcycleVariantId"] });
  }
  if (val.movementType.includes("part") && !hasPart) {
    ctx.addIssue({ code: "custom", message: "Select a spare part for this movement type.", path: ["partId"] });
  }
  if (val.movementType === "adjustment" && !hasVariant && !hasPart) {
    ctx.addIssue({ code: "custom", message: "Select either a variant or a part.", path: ["motorcycleVariantId"] });
  }
  if (hasVariant && hasPart) {
    ctx.addIssue({ code: "custom", message: "Select only one target, not both.", path: ["motorcycleVariantId"] });
  }
  if (val.movementType === "motorcycle_add") {
    const chasisNumbers = val.chasisNumbers ?? [];
    const unique = new Set(chasisNumbers.map((item) => item.toUpperCase()));
    if (chasisNumbers.length !== val.quantity) {
      ctx.addIssue({ code: "custom", message: `Enter exactly ${val.quantity} chasis number(s), one for each added bike.`, path: ["chasisNumbers"] });
    }
    if (unique.size !== chasisNumbers.length) {
      ctx.addIssue({ code: "custom", message: "Each chasis number must be unique.", path: ["chasisNumbers"] });
    }
  }
});

export const stockMovementApprovalSchema = z.object({
  id: uuid,
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().min(3).max(1000).optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if (v.decision === "rejected" && (!v.rejectionReason || v.rejectionReason.length < 3)) {
    ctx.addIssue({ code: "custom", message: "Provide a reason when rejecting a stock change.", path: ["rejectionReason"] });
  }
});

const partSaleItemSchema = z.object({
  partId: uuid,
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(10_000),
  unitPrice: money,
});

export const partSaleSchema = z.object({
  customerMode: z.enum(["existing", "new"]),
  customerId: uuid.optional().or(z.literal("")),
  newCustomer_fullName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  newCustomer_cnic: z.string().trim().regex(/^([0-9]{5}-[0-9]{7}-[0-9]{1}|[0-9]{13})$/, "Enter a valid CNIC.").optional().or(z.literal("")),
  newCustomer_phonePrimary: z.string().trim().regex(/^[+]?[0-9][0-9 ()-]{6,24}$/, "Enter a valid phone number.").optional().or(z.literal("")),
  newCustomer_phoneSecondary: z.string().trim().max(30).optional().or(z.literal("")),
  newCustomer_city: z.string().trim().max(80).optional().or(z.literal("")),
  newCustomer_address: z.string().trim().max(500).optional().or(z.literal("")),
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "demand_draft", "pay_order", "easypaisa", "jazzcash", "sadapay", "card", "other"]),
  bankId: uuid.optional().or(z.literal("")),
  transactionReference: optionalString(z.string().trim().min(3).max(120)),
  notes: optionalString(z.string().trim().max(1000)),
  itemsJson: z.preprocess((value) => {
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, z.array(partSaleItemSchema).min(1, "Add at least one spare part to sell.").max(25)),
}).superRefine((value, ctx) => {
  if (value.customerMode === "existing" && !value.customerId) {
    ctx.addIssue({ code: "custom", path: ["customerId"], message: "Select an existing customer." });
  }
  if (value.customerMode === "new") {
    if (!value.newCustomer_fullName) ctx.addIssue({ code: "custom", path: ["newCustomer_fullName"], message: "Enter customer name." });
    if (!value.newCustomer_cnic) ctx.addIssue({ code: "custom", path: ["newCustomer_cnic"], message: "Enter CNIC." });
    if (!value.newCustomer_phonePrimary) ctx.addIssue({ code: "custom", path: ["newCustomer_phonePrimary"], message: "Enter phone number." });
  }
  if (["bank_transfer", "cheque", "demand_draft", "pay_order"].includes(value.paymentMethod) && !value.bankId) {
    ctx.addIssue({ code: "custom", path: ["bankId"], message: "Select a bank for this payment method." });
  }
});

export const partSaleApprovalSchema = z.object({
  id: uuid,
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().min(3).max(1000).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.decision === "rejected" && (!value.rejectionReason || value.rejectionReason.length < 3)) {
    ctx.addIssue({ code: "custom", path: ["rejectionReason"], message: "Provide a rejection reason." });
  }
});

export const partReceiptGenerationSchema = z.object({ id: uuid });

// =========================================
// ERP: CUSTOMERS
// =========================================

export const customerSchema = z.object({
  id: uuid.optional(),
  cnic: z.string().trim().regex(/^([0-9]{5}-[0-9]{7}-[0-9]{1}|[0-9]{13})$/, "Enter a valid 13-digit CNIC or 17-digit with hyphens (XXXXX-XXXXXXX-X)."),
  fullName: z.string().trim().min(2).max(120),
  phonePrimary: z.string().trim().regex(/^[+]?[0-9][0-9 ()-]{6,24}$/, "Enter a valid phone number."),
  phoneSecondary: optionalString(z.string().trim().regex(/^[+]?[0-9][0-9 ()-]{6,24}$/, "Enter a valid phone number.")),
  email: optionalString(z.string().trim().email("Enter a valid email address.")),
  address: optionalString(z.string().trim().min(5).max(500)),
  city: optionalString(z.string().trim().min(2).max(80)),
  notes: optionalString(z.string().max(2000)),
});

export const customerLookupSchema = z.object({
  query: z.string().trim().min(3, "Type at least 3 characters to search.").max(50),
  lookupType: z.enum(["cnic", "chasis"]),
});

// =========================================
// ERP: SALES WORKFLOW
// =========================================

export const saleInitiateSchema = z.object({
  useExistingCustomer: z.preprocess(v => v === "true" || v === true, z.boolean()).default(false),
  customerId: uuid.optional().or(z.literal("")),
  newCustomer_fullName: z.string().trim().min(3).max(140).optional().or(z.literal("")),
  newCustomer_cnic: z.string().trim().min(13).max(15).optional().or(z.literal("")),
  newCustomer_phonePrimary: z.string().trim().min(10).max(30).optional().or(z.literal("")),
  newCustomer_phoneSecondary: z.string().trim().max(30).optional().or(z.literal("")).default(""),
  newCustomer_city: z.string().trim().min(2).max(80).optional().or(z.literal("")).default(""),
  newCustomer_address: z.string().trim().min(3).max(500).optional().or(z.literal("")).default(""),
  motorcycleVariantId: uuid,
  motorcycleStockUnitId: uuid,
  chasisNumber: z.string().trim().min(3).max(60).regex(/^[A-Za-z0-9][A-Za-z0-9 _/-]*$/, "Use alphanumeric chasis number only."),
  engineNumber: optionalString(z.string().trim().min(3).max(60)),
  quantitySold: z.preprocess(
    (val) => {
      const n = typeof val === "string" ? Number(val.replace(/[^0-9]/g, "")) : Number(val ?? 0);
      return Number.isFinite(n) && n >= 1 ? n : 1;
    },
    z.number().int().min(1).default(1)
  ),
  unitPrice: z.preprocess(
    (val) => {
      const n = typeof val === "string" ? Number(val.replace(/[^0-9.]/g, "")) : Number(val ?? 0);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    },
    money
  ),
  discountAmount: z.preprocess(
    (val) => {
      const s = val === null || val === undefined ? "0" : String(val);
      const n = Number(s.replace(/[^0-9.]/g, "") || "0");
      return Number.isFinite(n) && n >= 0 ? n : 0;
    },
    money.default(0)
  ),
  notes: optionalString(z.string().max(2000)),
  paymentsJson: z.preprocess(
    (val) => {
      try {
        const str = typeof val === "string" ? val : JSON.stringify(val ?? []);
        const parsed = JSON.parse(str || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed.map((p) => ({
          id: typeof p?.id === "string" ? p.id : undefined,
          paymentMethod: (["cash","bank_transfer","cheque","demand_draft","pay_order","easypaisa","jazzcash","sadapay","card","other"].includes(String(p?.paymentMethod ?? "").trim().toLowerCase())
            ? String(p.paymentMethod).trim().toLowerCase()
            : "cash"),
          bankId: (p?.bankId && p.bankId !== "") ? String(p.bankId) : "",
          transactionReference: (p?.transactionReference && String(p.transactionReference).trim().length >= 3)
            ? String(p.transactionReference).trim()
            : null,
          instrumentNumber: (p?.instrumentNumber && String(p.instrumentNumber).trim().length >= 3)
            ? String(p.instrumentNumber).trim()
            : null,
          amount: Number.isFinite(Number(p?.amount)) ? Math.max(0, Number(p.amount)) : 0,
          paymentDate: (p?.paymentDate && !isNaN(Date.parse(String(p.paymentDate))))
            ? new Date(String(p.paymentDate))
            : new Date(),
          depositorName: (p?.depositorName && String(p.depositorName).trim().length >= 2)
            ? String(p.depositorName).trim()
            : null,
          accountNumberUsed: (p?.accountNumberUsed && String(p.accountNumberUsed).trim().length >= 3)
            ? String(p.accountNumberUsed).trim()
            : null,
          notes: (p?.notes && String(p.notes).trim().length > 0)
            ? String(p.notes).trim()
            : null,
        }));
      } catch {
        return [];
      }
    },
    z.array(z.object({
      id: z.string().optional(),
      paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "demand_draft", "pay_order", "easypaisa", "jazzcash", "sadapay", "card", "other"]),
      bankId: uuid.optional().or(z.literal("")),
      transactionReference: optionalString(z.string().trim().min(3).max(120)),
      instrumentNumber: optionalString(z.string().trim().min(3).max(120)),
      amount: z.coerce.number().min(0).default(0),
      paymentDate: z.coerce.date().default(() => new Date()),
      depositorName: optionalString(z.string().trim().min(2).max(120)),
      accountNumberUsed: optionalString(z.string().trim().min(3).max(60)),
      notes: optionalString(z.string().max(1000)),
    })).default([])
  ),
}).superRefine((v, ctx) => {
  if (v.useExistingCustomer) {
    if (!v.customerId || v.customerId.length < 5) {
      ctx.addIssue({ code: "custom", message: "Select an existing customer.", path: ["customerId"] });
    }
  } else {
    if (!v.newCustomer_fullName || v.newCustomer_fullName.length < 3)
      ctx.addIssue({ code: "custom", message: "Enter new customer full name (at least 3 letters).", path: ["newCustomer_fullName"] });
    if (!v.newCustomer_cnic || v.newCustomer_cnic.replace(/[^0-9]/g, "").length < 13)
      ctx.addIssue({ code: "custom", message: "CNIC must be 13 digits (e.g. 3520212345678).", path: ["newCustomer_cnic"] });
    if (!v.newCustomer_phonePrimary || v.newCustomer_phonePrimary.replace(/[^0-9]/g, "").length < 10)
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number (at least 10 digits).", path: ["newCustomer_phonePrimary"] });
    if (!v.newCustomer_city || v.newCustomer_city.length < 2)
      ctx.addIssue({ code: "custom", message: "Enter customer city.", path: ["newCustomer_city"] });
    if (!v.newCustomer_address || v.newCustomer_address.length < 3)
      ctx.addIssue({ code: "custom", message: "Enter customer address.", path: ["newCustomer_address"] });
  }
  const totalPositive = (v.paymentsJson ?? []).some(p => Number(p.amount) > 0);
  if (!totalPositive)
    ctx.addIssue({ code: "custom", message: "At least one payment split must have an amount greater than 0.", path: ["paymentsJson"] });
}).superRefine((v, ctx) => {
  const needsBank = (method: string) => ["bank_transfer", "cheque", "demand_draft", "pay_order"].includes(method);
  for (let i = 0; i < (v.paymentsJson ?? []).length; i++) {
    const p = v.paymentsJson[i];
    if (needsBank(p.paymentMethod) && !p.bankId) {
      ctx.addIssue({ code: "custom", message: `Payment #${i + 1} requires a bank.`, path: ["paymentsJson", i, "bankId"] });
    }
  }
});


export const salePaymentSchema = z.object({
  saleId: uuid,
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "demand_draft", "pay_order", "easypaisa", "jazzcash", "sadapay", "card", "other"]),
  bankId: uuid.optional().or(z.literal("")),
  transactionReference: optionalString(z.string().trim().min(3).max(120)),
  instrumentNumber: optionalString(z.string().trim().min(3).max(120)),
  amount: z.coerce.number().min(1, "Payment amount must be greater than zero."),
  paymentDate: z.coerce.date(),
  depositorName: optionalString(z.string().trim().min(2).max(120)),
  accountNumberUsed: optionalString(z.string().trim().min(3).max(60)),
  notes: optionalString(z.string().max(1000)),
}).superRefine((v, ctx) => {
  const needsBank = ["bank_transfer", "cheque", "demand_draft", "pay_order"].includes(v.paymentMethod);
  if (needsBank && !v.bankId) {
    ctx.addIssue({ code: "custom", message: "Select a bank for this payment method.", path: ["bankId"] });
  }
});

export const saleApprovalSchema = z.object({
  id: uuid,
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().min(3).max(1000).optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if (v.decision === "rejected" && (!v.rejectionReason || v.rejectionReason.length < 3)) {
    ctx.addIssue({ code: "custom", message: "Provide a rejection reason.", path: ["rejectionReason"] });
  }
});

export const receiptGenerationSchema = z.object({ saleId: uuid });
export const receiptPrintSchema = z.object({ receiptId: uuid });
