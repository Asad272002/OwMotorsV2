# Section CRUD Architecture

## Objective

OW Motors needs a constrained, page-oriented content system that lets authorized staff manage approved frontend sections without editing code. It must sit beside the existing inventory and lead models, preserve the current public routes and SEO architecture, and render primary content on the server.

This is not a general-purpose page builder. Editors may compose only registered OW Motors section types with validated fields. They may never enter arbitrary HTML, CSS, JavaScript, JSX, JSON-LD, canonical logic, sitemap logic, route code, environment variables, API keys, or database/RLS definitions.

## Architectural principles

1. **Pages first, tables second.** The main admin entry point is the public page being edited.
2. **Approved registry only.** A code-owned registry defines allowed section types, fields, renderer, page compatibility, cardinality, and validation.
3. **Server rendering remains authoritative.** Published section data is queried in Server Components and mapped to approved renderers.
4. **Existing entities remain authoritative.** Brands, categories, motorcycles, configurations, images, specifications, features, and leads are referenced—not copied into generic content payloads.
5. **Drafts never overwrite live content.** Draft and published page revisions are separate.
6. **Publication is atomic.** A page publication switches one complete validated revision into public use.
7. **Archive before delete.** Routine removal is reversible. Hard delete remains an exceptional admin-only operation.
8. **Human-facing controls only.** Technical identifiers are hidden behind media pickers, entity selectors, icon pickers, and previews.
9. **SEO is guarded by code.** Editors manage visible copy and existing SEO title/description fields; canonical, JSON-LD, sitemap, robots, and route generation remain implementation-owned.
10. **Accessibility is part of the section contract.** Heading levels, landmarks, media alt requirements, link semantics, and reduced-motion behavior are renderer responsibilities.

## Managed page catalog

### Home Page

Recommended initial composition:

1. Brand Campaign Showcase — one section per featured brand or a controlled multi-brand campaign set.
2. Motorcycle Row — one per approved brand/category/manual selection.
3. Feature Card Grid — current “Why Choose OW Motors.”
4. Text and Image — current About preview.
5. CTA Banner — current test-ride call to action.
6. Contact Block — current location/contact preview.
7. Optional Video Section or Category Showcase.

Existing compatibility: brand records, `display_order`, `brand_campaign_images`, and published motorcycle queries remain the data source while the section layer takes ownership of composition and presentation settings.

### Brands Page

Recommended initial composition:

1. Page Intro.
2. Brand Showcase sections referencing existing brands and campaign media.
3. Optional Feature Card Grid.
4. Optional Text and Image or Video Section.
5. Optional FAQ Section.
6. CTA Banner.

Brand copy, active state, logo, hero, SEO fields, and campaign records continue to come from the existing brand models. The page editor controls which approved presentations appear, their order, visibility, and section-specific display copy.

### Motorcycles Page

Recommended initial composition:

1. Page Intro.
2. Optional Category Showcase.
3. Optional Brand Showcase.
4. Catalog Results — system-backed section using the existing filter/query logic.
5. Optional Text and Image buyer guidance.
6. Optional FAQ Section.
7. CTA Banner.

Publishing validation requires exactly one visible Catalog Results section. Duplicating or archiving it is supported in draft, but a page revision cannot publish with zero or multiple visible catalog sections.

### About Page

Recommended initial composition:

1. Page Intro.
2. Text and Image sections.
3. Feature Card Grid.
4. Brand Showcase or Category Showcase.
5. Video Section.
6. FAQ Section.
7. CTA Banner.

This replaces the current hardcoded placeholder with reviewed content while retaining the canonical `/about` route and its code-owned metadata behavior.

### Contact Page

Recommended initial composition:

1. Page Intro.
2. Contact Block.
3. Contact Form — system-backed section using the current validated form and Server Action.
4. Optional Text and Image directions/service-area content.
5. Optional FAQ Section.
6. Optional CTA Banner or Video Section.

Publishing validation requires one visible Contact Form. A section payload cannot change database columns, submission recipients, secrets, spam controls, or Server Action code.

### Global Footer

Recommended initial composition:

1. Footer Identity — logo selection, approved description, and accessible home label.
2. Link Group — approved internal links selected from a route registry.
3. Brand Link Group — automatically resolves active brand routes.
4. Contact Block — verified business contact fields only.
5. Social Links — approved provider and URL pairs.
6. Legal Links — links to real published legal routes.

The footer is represented as the fixed page key `global-footer`; it is rendered by the site layout, not assigned a public route. Secrets and unverified placeholder contact information are prohibited.

### Product Detail Template

Recommended initial composition:

1. Product Core and Configurator — system-backed, exactly one visible section.
2. Feature Card Grid — bound to the current product's feature groups.
3. Text and Image — overview content/image binding.
4. Specification Groups — bound to shared/default-configuration specifications.
5. Available Colors — bound to active configurations.
6. Optional Video Section.
7. Related Motorcycles — uses the approved relationship strategy.
8. FAQ Section — auto-generated or explicitly managed product FAQs.
9. CTA Banner — test-ride/contact action.

The template controls the global product-page order and presentation. Motorcycle/configuration data remains in existing normalized tables. Per-product section overrides should be a later stage and must fall back cleanly to the template.

## Supported section registry

The registry is version-controlled and cannot be extended from the admin UI. Each entry owns a discriminated Zod schema, default payload, admin form, server renderer, preview renderer, page allow-list, cardinality rules, entity checks, and migration version.

| Registry key | Editor-facing name | Allowed pages | Validated content/configuration | Existing data binding |
| --- | --- | --- | --- | --- |
| `page_intro` | Page Intro | Home, Brands, Motorcycles, About, Contact | Eyebrow, title, summary, optional media, alignment | None; visible text only |
| `brand_campaign_showcase` | Brand Campaign Showcase | Home | Brand selector, campaign media selection/mode, approved tagline override, CTA label | `brands`, `brand_campaign_images` |
| `motorcycle_row` | Motorcycle Row | Home | Title/intro, source mode (brand/category/manual/featured), item limit, CTA label | Existing published motorcycle query |
| `feature_card_grid` | Feature Card Grid | Home, Brands, Motorcycles, About, Product template | Section title/intro and bounded cards; icon selected from registry | Static cards or current product features |
| `text_image` | Text and Image | Home, Brands, Motorcycles, About, Contact, Product template | Eyebrow, heading, structured paragraphs/lists, media ID, layout direction, CTA | Optional current product overview binding |
| `cta_banner` | CTA Banner | All content pages and Product template | Heading, summary, one/two approved links, theme | Internal route registry |
| `contact_block` | Contact Block | Home, Contact, Footer | Verified address, phone, email, hours, optional map label | Typed business settings, never secrets |
| `video_section` | Video Section | Home, Brands, Motorcycles, About, Contact, Product template | Approved provider/video ID, title, summary, transcript/caption link, poster media | No arbitrary embed code |
| `faq_section` | FAQ Section | Brands, Motorcycles, About, Contact, Product template | Bounded question/answer pairs or approved product-auto source | Product facts where selected |
| `category_showcase` | Category Showcase | Home, Brands, Motorcycles, About | Category IDs, title/intro, display limit/layout | Existing active categories and product counts |
| `brand_showcase` | Brand Showcase | Brands, Motorcycles, About | Brand IDs, display mode, title/intro | Existing active brands/campaign media |
| `catalog_results` | Motorcycle Catalog | Motorcycles | Intro/empty wording and approved filter visibility toggles | Existing catalog/filter/server query |
| `contact_form` | Contact Inquiry Form | Contact | Visible heading/helper/consent copy only | Existing form, Zod schema, Server Action |
| `product_core` | Product Overview and Configuration | Product template | Approved labels and CTA visibility only | Existing motorcycle/configuration/image data |
| `specification_groups` | Technical Specifications | Product template | Section labels and group visibility/order | Existing specifications |
| `available_colors` | Available Colors | Product template | Section heading and presentation mode | Existing active configurations/images |
| `related_motorcycles` | Related Motorcycles | Product template | Heading, source rule, result limit | Existing related-product query |
| `footer_identity` | Dealership Identity | Footer | Logo media, approved short description | Content media/business settings |
| `footer_link_group` | Footer Link Group | Footer | Group title and approved internal route references | Fixed public route registry |
| `footer_brand_links` | Footer Brand Links | Footer | Group title and optional limit | Active brands query |
| `footer_social_links` | Social Links | Footer | Supported network enum, verified URL, accessible label | Typed public settings |
| `footer_legal_links` | Legal Links | Footer | Approved legal route references | Published route registry |

New registry types require a code review, schema version, accessibility/SEO review, test coverage, and deployment. They are not created by entering a component name.

## Content-field safety contract

- Plain text fields are length-bounded and trimmed.
- Long-form copy uses a constrained structured document model: paragraph, heading text owned by the section renderer, unordered/ordered list, emphasis, and approved links. Raw HTML is never accepted or stored.
- Heading level is determined by page/section position; editors change heading text, not HTML tags.
- Internal links are selected from public-route/entity records. External links require `https`, approved protocols/domains where applicable, label text, and safe target/rel behavior.
- Images are selected from a media library and require alt intent: descriptive alt or explicitly decorative. Storage paths are not manually entered.
- Videos use a provider enum and video ID/URL parser; embed HTML and scripts are rejected.
- Icons come from an allow-listed icon registry.
- Entity references are UUIDs selected through human-readable search controls and revalidated at publish time.
- Payload schemas cap array lengths and nesting depth to protect rendering and usability.
- Unknown payload keys, unknown registry versions, and forbidden keys such as `html`, `script`, `javascript`, `jsx`, `schema`, and `jsonLd` fail validation.

## Required section operations

Every registered section supports the following workflow. Required singleton sections use the same operations, but page-level validation prevents an invalid revision from being published.

| Operation | Required behavior |
| --- | --- |
| Create | Add an approved section type to the current draft with registry defaults; validate page allow-list and cardinality. |
| Edit | Create/update a draft section revision through a validated Server Action; never mutate the published revision. |
| Duplicate | Copy the selected draft/published section payload into a new hidden draft section immediately after the source; remove unique identity values. |
| Reorder | Update draft order atomically. Provide drag-and-drop, keyboard move controls, and undo. |
| Show | Set the section visible in the draft. Public output changes only after publish. |
| Hide | Set the section hidden in the draft while retaining its content. Public output changes only after publish. |
| Preview | Render the draft revision through the same registered Server Components under a staff-only, no-store, noindex preview route. |
| Publish | Validate payloads, entity state, page rules, headings, links, and media; then atomically promote a complete page revision or the selected section within a complete revision. |
| Archive | Remove the section from the active draft workspace while retaining all revisions. The current live page remains unchanged until a new page revision is published. |
| Restore | Return an archived section as a hidden draft at a selected position; require review before publication. |

Hard delete is not routine CRUD. It remains admin-only, requires a retention/history check, and should usually be unavailable while an audit/publication reference exists.

## Proposed additive data model

### `content_pages`

Stable OW Motors page definitions:

- UUID primary key;
- constrained `page_key`: `home`, `brands`, `motorcycles`, `about`, `contact`, `global-footer`, `product-detail-template`;
- human name and fixed public path/pattern;
- active state;
- current draft revision ID;
- current published revision ID;
- created/updated timestamps.

Page keys and paths are seeded by migration and not editable as arbitrary routes.

### `content_page_revisions`

Immutable or append-only page snapshots:

- page relationship and monotonically increasing revision number;
- state: `draft`, `published`, `superseded`;
- optional change note;
- created/updated/published timestamps and actor IDs;
- optimistic concurrency version;
- validation/registry version.

Only one mutable draft per page is recommended. A publish operation freezes that revision, marks the prior publication superseded, and creates the next editable draft from the new live snapshot.

### `content_sections`

Stable section identity:

- page relationship;
- constrained registry key;
- editor-facing internal label;
- created/updated actor and timestamps;
- archived timestamp/actor;
- optional source legacy identifier used for migration reconciliation.

This table stores identity and history linkage, not arbitrary component code.

### `content_section_revisions`

Versioned validated section data:

- section relationship and revision number;
- registry key/version;
- JSONB payload constrained to be an object and validated by the corresponding Zod schema;
- checksum for change detection;
- actor/timestamps;
- optional migration/source metadata.

JSONB is used only for registry-owned typed payloads. Existing inventory data remains relational.

### `content_page_revision_sections`

The ordered composition of one page revision:

- page revision relationship;
- section and section-revision relationships;
- stable sortable position/rank;
- visible state;
- primary key preventing duplicate section placement;
- unique order constraint scoped to a page revision.

This snapshot table makes publish and rollback deterministic.

### `content_media`

Page-level media library metadata, separate from product image semantics:

- Storage path, MIME, width, height, byte size, checksum;
- alt text/caption and decorative flag;
- focal point/crop metadata where approved;
- rights/source note;
- lifecycle state and audit timestamps.

Existing `motorcycle_images` and `brand_campaign_images` remain in place. A media adapter may expose them to selectors without duplicating files.

### `content_audit_events`

Append-only actions for page/section create, edit, duplicate, reorder, visibility, preview, publish, archive, restore, and hard delete. Store actor ID, target, action, timestamp, revision IDs, and safe change metadata—not secrets or full customer payloads.

## Database functions and constraints

Use transaction-safe, security-invoker functions for:

- create section with default revision;
- duplicate section;
- normalize/reorder sections;
- archive/restore section;
- publish a complete page revision;
- restore a prior published revision as a new draft;
- compare-and-swap autosave using the expected revision number.

Database constraints should enforce page keys, lifecycle states, non-negative revision numbers, unique page revisions, unique placements, registry-key format, JSON object payloads, and foreign-key ownership. Full payload semantics remain in versioned Zod schemas and publish validation. Direct authenticated table writes should be narrowed where necessary so staff cannot bypass publication invariants through PostgREST.

## RLS model

### Public

- Read only the revision referenced by `content_pages.current_published_revision_id`.
- Read only section revisions placed in that publication and marked visible.
- Never read drafts, superseded revisions, archive metadata, audit events, internal labels, or preview state.
- Continue to rely on existing active/published policies for referenced brands, categories, motorcycles, configurations, images, specifications, and features.

### Editor

- Read published and draft page content.
- Create/edit/duplicate/reorder/show/hide/preview/publish/archive/restore sections through validated actions/RPCs.
- Cannot hard-delete history, change roles, alter registry keys outside allowed actions, or access secrets/implementation settings.

### Admin

- All editor operations.
- Exceptional hard delete after reference checks and confirmation.
- Recovery/history administration and future staff management.

All admin queries continue to use the authenticated staff session. Preview does not use the service role. UI permissions supplement, but never replace, Server Action authorization and RLS.

## Draft, preview, and publish flow

1. Opening a page editor loads its draft revision and live publication timestamp.
2. Field edits autosave to a new/current draft section revision with an expected-version check.
3. Section order/visibility changes update the draft page snapshot atomically.
4. Preview opens `/admin/preview/[pageKey]` or a protected equivalent. Product template preview requires a selected real motorcycle ID.
5. Preview queries the authenticated draft and renders the same registry components used by production, with `noindex`, `no-store`, and a persistent Draft indicator.
6. Publish runs complete registry, relationship, link, media, accessibility, and page-cardinality validation.
7. One transaction freezes/promotes the page revision, records the actor/event, and creates the next draft.
8. Existing cache revalidation refreshes the affected public route tree and sitemap where entity visibility changes.

Do not put a `preview=true` bypass on anonymous public queries. Preview access must remain staff-authorized server-side.

## Autosave contract

- Debounce ordinary text/config edits approximately 1.5 seconds after typing stops.
- Show `Saving`, `Saved at HH:MM`, `Offline/Retrying`, and `Save failed` states persistently.
- Use an expected revision/version to prevent last-write-wins overwrites.
- On conflict, stop autosave and offer compare/reload/copy options; never silently discard either editor's work.
- File uploads, entity relationship changes, archive, restore, reorder, and publish remain explicit actions.
- Leaving with unsent local changes triggers a clear warning.
- Autosave never publishes.

## SEO and frontend safeguards

- Current route paths remain code-owned.
- Canonicals remain generated by `src/lib/seo/metadata.ts` and route code.
- JSON-LD remains generated from visible, verified domain data.
- Sitemap and robots implementation remain inaccessible to editors.
- The page editor may show a read-only search/social preview and manage already-approved title/description fields where applicable.
- A hidden section is excluded from visible HTML and related structured data only after its page revision publishes.
- FAQ structured data is emitted only for visible published FAQ content.
- Page publication fails when required sections, one H1 strategy, valid links, media alt intent, or entity availability rules are not satisfied.

## Compatibility with current content

- `brands`, `categories`, `motorcycles`, configurations, images, specifications, and features remain canonical domain tables.
- `brand_campaign_images` remains the campaign asset/ordering source during migration.
- `brands.display_order` continues to drive the existing paired homepage order until the Home Page revision becomes authoritative.
- Existing public queries remain available behind an adapter/fallback.
- Current `WHY_CHOOSE_ITEMS`, `ABOUT_POINTS`, CTA copy, contact preview, Brands intro, About placeholder, Contact intro, and Footer copy become seeded draft sections with reconciliation records.
- Product template sections bind to existing product data; they do not copy price, stock, images, or specifications into JSON.
- Current Server Actions stay active until each redesigned workflow passes role/RLS/validation parity tests.

## Required database changes

Required, additive changes are:

1. `content_pages`.
2. `content_page_revisions`.
3. `content_sections`.
4. `content_section_revisions`.
5. `content_page_revision_sections`.
6. `content_media` for non-product page assets, or a reviewed adapter if an existing media model is extended.
7. `content_audit_events`.
8. Staff/public grants and forced RLS policies for the new tables.
9. Atomic create/duplicate/reorder/archive/restore/publish/rollback functions.
10. Updated-at/audit triggers and indexes for page key, revision lookup, published lookup, section placement, archive state, and actor/time history.
11. Optional `product_faqs` if product FAQs must become factually authored rather than generated; this should remain relational and visible-content-backed.

No existing table or column needs to be removed for the first implementation. `site_settings` may remain for typed global values, but its raw key/value structure must not be exposed directly; a validated business-settings action or dedicated typed table should mediate footer/contact values.
