# Admin Redesign Plan

## Redesign goal

Turn the existing secure inventory dashboard into a satisfying, page-oriented dealership workspace without replacing its proven authentication, authorization, RLS, Server Actions, validation, Storage, publication safeguards, or frontend SEO implementation.

The redesign should answer three questions immediately:

1. What part of the website or dealership workflow am I managing?
2. What is live, draft, hidden, incomplete, or awaiting action?
3. What should I do next?

## New information architecture

### Today

The landing dashboard becomes an operational home, not only totals:

- leads requiring response;
- scheduled/upcoming test rides;
- motorcycles with low/out-of-stock configurations;
- drafts ready or blocked from publication;
- recently changed website pages;
- quick actions: Edit Home Page, Add Motorcycle, Review New Leads, Preview Website.

### Website

- Pages
  - Home Page
  - Brands Page
  - Motorcycles Page
  - About Page
  - Contact Page
- Product Detail Template
- Global Footer
- Media Library
- Archived Sections

### Inventory

- Motorcycles
- Brands
- Categories
- Inventory status view

### Customers

- All Leads overview
- Contact Inquiries
- Test-Ride Requests

### Administration

- Business Details (verified public contact/footer fields only)
- Team and Access (future, admin-only)
- Activity History

Implementation details—database tables, RLS policies, environment variables, APIs, JSON-LD, canonicals, sitemap, route code, and secrets—never appear in this structure.

## New sidebar structure

Desktop uses a collapsible but persistent sidebar with labeled groups, icons plus text, status counts, and one clear active state. It contains:

```text
OW Motors
Today

WEBSITE
  Pages
  Product Template
  Global Footer
  Media

INVENTORY
  Motorcycles
  Brands
  Categories

CUSTOMERS
  Inquiries             [new count]
  Test Rides            [active count]

ADMINISTRATION
  Business Details
  Activity

View Website
Profile / role / Sign out
```

Mobile uses a real menu button and full-height navigation drawer with focus trapping, Escape/backdrop close, focus return, and body-scroll lock. It must not use horizontal navigation as the primary discovery mechanism.

Existing routes remain valid. The first release changes labels/grouping and adds page-editor routes; it does not break bookmarks or action destinations. If a future route is renamed, keep a server redirect from the old admin URL.

## Page overview UX

`Website > Pages` shows one card/row per managed public page with:

- page name and public route;
- Live, Draft changes, Incomplete, or Never published state;
- visible/hidden section count;
- last saved actor/time;
- last published actor/time;
- actions: Edit, Preview draft, View live;
- warnings for missing required sections or content.

Global Footer and Product Detail Template appear as first-class editable surfaces even though they are not ordinary standalone routes.

## Page editor UX

### Desktop

Use a three-area workspace:

1. **Section outline** — ordered cards with drag handle, type/icon, internal label, visibility, validation state, duplicate, archive, and keyboard move actions.
2. **Preview/canvas** — the staff-only server-rendered draft with desktop/tablet/mobile viewport controls and click-to-select section mapping.
3. **Inspector** — the selected section's human-facing validated fields.

A persistent header contains breadcrumbs, page name, live/draft status, saved state, Preview, View live, and Publish. A validation drawer explains blockers in editor language and links directly to the affected section.

### Tablet

Preview remains central. Section outline and inspector become mutually exclusive drawers. Publish/save state remains sticky.

### Mobile

Use a task stack rather than compressing three panes:

- page summary and publish state;
- section list;
- dedicated full-screen section editor;
- preview opens as a separate protected screen with viewport set to mobile.

### Section card behavior

Each section card exposes:

- drag handle plus Move up/Move down menu actions;
- visible/hidden state;
- Draft changed/Live/Needs attention/Archived status;
- Edit, Preview, Duplicate, Archive;
- clear current position;
- contextual description such as “Shows published TARO motorcycles.”

Required singleton sections use the same controls. The editor may archive or duplicate them in draft, but publish validation explains when the page would have zero or multiple required sections.

### Adding a section

“Add section” opens a searchable registry picker grouped by purpose: Showcase, Products, Editorial, Conversion, Contact, and System. Each option includes a thumbnail, plain-language purpose, compatible pages, and any maximum count. There is no component-name field or custom-code option.

## Inventory editor UX

### Motorcycle list

Preserve the existing query/action logic while adding:

- search by motorcycle or brand;
- filters for brand, Live/Draft/Archived, featured, stock state, and readiness;
- meaningful columns/cards: motorcycle, main image, configurations, price range, stock summary, page status, updated time;
- saved views such as Needs images, Needs default configuration, Out of stock, Drafts, Live;
- pagination/cursor strategy rather than the silent 250-record cap;
- quick stock/status actions only where a dedicated validated action exists;
- responsive card layout instead of mandatory horizontal table scrolling.

### Motorcycle editor

Keep every current field and action, but reorganize around dealership tasks:

1. Overview — brand, model, descriptions, base price, categories.
2. Configurations & Stock — current variant CRUD with CC, color, price, stock, quantity, default/customer availability.
3. Media — product/configuration images and alt text.
4. Product Details — specifications and features with group/order tools.
5. Search & Sharing — SEO title/description and read-only preview; no canonical/schema controls.
6. Publish — readiness, draft/live/archive, preview, view live, and admin-only danger area.

The eight existing editor tab URLs/actions can remain during transition. A redesigned shell may group them visually without changing their underlying Server Actions until parity is proven.

### Readiness summary

Display throughout the editor:

- default configuration;
- at least one image;
- active brand;
- price/stock consistency;
- description/category/SEO completion guidance;
- Live/Draft/Archived state.

Only the existing hard publish prerequisites block publishing at first. Additional editorial guidance should begin as warnings until formally approved.

### Brand and category editors

- Use searchable list/detail views instead of keeping a large create form above every list.
- Put page address under Advanced with a change-impact warning.
- Replace raw Storage paths with a media picker/upload.
- Replace numeric order with accessible reorder controls.
- Keep active state, current descriptions, SEO fields, role checks, and actions.
- Move homepage campaign composition into Home Page; retain a link from a brand detail to its campaign usages.

## Lead-management UX

Use a scannable split-list/detail workspace:

- filter/search by status, date, name, motorcycle, and contact detail;
- unread/new emphasis and visible next action;
- list item shows name, subject/model, received/preferred date, and status;
- detail panel shows message, configuration, direct contact actions, and status control;
- dashboard deep links to the specific lead;
- cursor pagination replaces the fixed 200-record ceiling;
- later additions may include owner, internal notes, priority, and follow-up date, but require new validated models and privacy policy.

The first redesign release preserves status-only mutations. It must not add browser-direct customer-data queries or weaken current RLS.

## Live preview architecture

### Route and authorization

- Add a protected preview route such as `/admin/preview/[pageKey]`.
- Product template preview requires a selected existing motorcycle.
- Route calls the same staff authorization as protected admin pages.
- Response is `noindex`, `no-store`, and excluded from sitemap/robots discovery.
- Do not expose a public `?preview=true` bypass.

### Rendering

- Load the draft page revision server-side through the authenticated staff client.
- Render through the same supported section registry and Server Components used by the public page.
- Use current inventory/domain queries for referenced entities.
- Show a persistent non-public Draft Preview banner outside the page canvas.
- Keep public metadata/canonical/schema generators code-owned; preview may show a human-readable search/social preview separately.

### Editor integration

- Desktop embeds the preview in a same-origin controlled frame or preview pane.
- Selecting an outline item scrolls/highlights its preview section.
- Preview viewport toggles use fixed accessible controls for desktop, tablet, and mobile.
- Refresh only after a confirmed autosave revision; never imply unsaved local input is live.
- Mobile opens preview in a separate view rather than a cramped split screen.

## Draft and publish model

- Every managed page has one current published revision and one working draft revision.
- Published revisions are immutable snapshots.
- Editing a live page affects only its draft.
- “Publish page” validates and atomically promotes the complete draft.
- “Publish section” is shorthand for publishing a complete page revision containing that section's latest draft; it must not create an incoherent mixed state.
- After publication, create a new draft copied from live.
- Record actor, time, revision, and safe change note.
- “Restore previous version” copies a historical publication into a new draft; it does not rewrite history automatically.
- Public Server Components read only the current published revision.

Entity lifecycle remains independent: a section cannot make an inactive brand or unpublished motorcycle publicly visible. Publish validation explains and blocks invalid references.

## Autosave behavior

- Debounce ordinary text/configuration edits after approximately 1.5 seconds of inactivity.
- Save through authenticated, Zod-validated Server Actions or narrowly scoped RPCs.
- Send an expected revision number and reject stale writes.
- Display persistent states: Unsaved, Saving, Saved at time, Save failed—retry, Conflict—review required.
- Preserve unsent input locally during recoverable network failure.
- Warn before navigation with unsent changes.
- File upload, entity relationship change, reorder, duplicate, archive, restore, and publish remain explicit actions.
- Autosave never publishes, changes URLs, or alters SEO implementation.

## Section ordering

- Store order in the draft page revision, not in component code.
- Use drag-and-drop as an enhancement, not the only method.
- Provide keyboard-accessible Move up/down/to top/to bottom controls.
- Normalize positions atomically in a database function.
- Announce the new position through a live region and offer Undo.
- Reordering live content changes the public page only after publish.
- During migration, current `brands.display_order` and campaign RPCs remain authoritative until the Home Page cutover.

## Section visibility

- Visible/hidden is stored per page revision.
- Hide keeps content editable and previewable with a visible Hidden indicator.
- Show/hide is a draft change and requires publication.
- Renderers omit hidden sections completely from public HTML, internal links, and relevant visible-content structured data.
- Required-page rules prevent publishing an unusable page.

## Archive and restore

- Archive removes a section from the active editing sequence and records actor/time.
- The current public page is unchanged until a valid replacement revision publishes.
- Archived Sections is searchable by page, type, actor, and date.
- Restore creates/reuses a hidden draft version at a selected position.
- Restore never auto-publishes.
- Admin-only permanent delete is available only after retention/reference checks and a strong confirmation dialog.
- Motorcycles retain their existing `archived` publication status; other existing entities keep active/inactive behavior until an additive lifecycle design is approved.

## Migration from existing content

### Inventory/domain data

Do not copy brands, categories, motorcycles, configurations, motorcycle images, specifications, or features into section JSON. Sections reference existing records.

### Home and Brands

- Seed page definitions and draft revisions.
- Create Brand Campaign Showcase sections referencing existing brands/campaign images.
- Create Motorcycle Row sections referencing each current brand.
- Preserve existing `display_order`/campaign order during reconciliation.
- Seed Feature Card Grid, Text and Image, CTA Banner, and Contact Block drafts from current constants/components.

### Motorcycles

- Seed Page Intro and exactly one Catalog Results section.
- Keep current catalog/filter/query implementation as the renderer.

### About and Contact

- Seed current visible copy as drafts, mark placeholder/unverified content as requiring review.
- Bind Contact Form to the existing form/action; do not migrate submission logic into section payloads.

### Footer

- Seed link groups and identity copy.
- Do not publish placeholder NAP/social/legal data as verified content.
- Use typed business settings or dedicated fields rather than exposing `site_settings` JSON.

### Product Detail Template

- Seed the current order: core/configurator, features, overview, specifications, colors, related motorcycles, FAQs.
- Bind each section to current product queries.
- Preserve current Product/Offer/Breadcrumb/FAQ structured-data conditions.

Every migration produces a reconciliation report: source, target section, payload checksum, media/entity references, review status, and difference from current server-rendered output.

## Compatibility with current Supabase data

- Add new tables and policies; do not remove or rename current domain tables.
- Keep current generated database types until additive migrations are applied, then regenerate/review them.
- Continue to use the publishable-key staff session for admin CRUD.
- Continue service-role use only for the existing validated public submission boundary.
- Keep current RLS helpers and role semantics; extend them to content tables.
- Keep current Storage bucket/policies and image limits while adding page-level media metadata.
- Preserve current Server Actions as compatibility adapters.
- Keep current public queries behind a feature flag/fallback until page revisions are approved and published.
- Reuse current `revalidateAdminContent()` behavior, then narrow/add route tags as the section layer matures.
- Ensure direct Data API privileges cannot bypass page publication/version invariants.

## Progressive implementation stages

### Stage 0 — Contract and safety baseline

- Capture current route, role, Server Action, RLS, query, and rendered-output tests.
- Record current public-page screenshots/content snapshots.
- Define parity criteria and feature flags.
- Verify live migration/RLS state in staging.

Exit: the current dashboard and storefront can be regression-tested before UI replacement.

### Stage 1 — Admin shell and design system

- Implement the new grouped sidebar/mobile drawer, page header, status chips, forms, dialogs, empty/loading states, and feedback primitives.
- Add a read-only Website Pages overview using current code/data.
- Re-skin existing routes without changing action/query contracts.
- Add skip link, field-error accessibility, and responsive table/card patterns.

Exit: navigation and recognition improve with zero database migration and no public-page behavior change. This is the recommended first redesign stage.

### Stage 2 — Section database foundation

- Add page, revision, section, placement, media, and audit tables.
- Add RLS, constraints, indexes, and atomic functions.
- Implement the registry schemas and authenticated draft queries/actions.
- Keep public rendering on current code paths.

Exit: staff can create and edit test drafts in staging; nothing public consumes them.

### Stage 3 — Home Page and Footer editor pilot

- Build outline, inspector, autosave, reorder, visibility, archive/restore, preview, and publication.
- Migrate/reconcile current homepage constants, brands/campaigns, product rows, and footer content.
- Use a server feature flag for dual-read/cutover.

Exit: approved draft preview matches the existing visual identity and can be rolled back instantly.

### Stage 4 — Brands, Motorcycles, About, and Contact pages

- Add their registry allow-lists and required-section validation.
- Preserve catalog and contact-form system renderers.
- Complete editorial migration and acceptance testing.

### Stage 5 — Product Detail Template

- Add template preview with real products.
- Bind sections to existing product/configuration/specification/feature/image data.
- Add product FAQ authoring only if an approved factual data model exists.
- Validate SEO structured-data parity.

### Stage 6 — Inventory UX modernization

- Add inventory search/filter/pagination/readiness.
- Reorganize the product editor around dealership tasks.
- Replace raw path/order/icon controls with media/reorder/icon primitives.
- Preserve existing actions until replacements pass parity tests.

### Stage 7 — Lead workspace and operational maturity

- Add queue filters/pagination and focused details.
- Add assignment/notes/follow-up only after schema, privacy, retention, RLS, and validation approval.
- Add activity/history and operational monitoring.

### Stage 8 — Consolidation

- Remove compatibility UI/components only after usage, role, RLS, rollback, and rendered-output verification.
- Keep historical revisions and migrations.
- Narrow redundant grants/actions rather than deleting data prematurely.

## Rollback plan

### Application rollback

- Deploy each stage independently behind server-side feature flags.
- Keep the current admin routes and action modules available until final consolidation.
- Keep public rendering on the legacy/current composition until a page is explicitly migrated and approved.
- A single feature-flag change returns a migrated public page to the current query/component composition.
- Keep the prior Vercel deployment available.

### Database rollback

- Use additive expand/migrate/contract migrations.
- Do not drop existing tables/columns during page-editor launch.
- New page/section tables can remain unused if the application rolls back.
- Back up database and Storage manifests before migration/import.
- Migration/import jobs are idempotent and record source reconciliation IDs.
- Rollback of a publication selects the prior immutable revision; it does not reconstruct content manually.

### Operational rollback triggers

- unauthorized draft/public visibility;
- role/RLS regression;
- failed or partial publication;
- current CRUD action regression;
- incorrect canonical/structured-data/sitemap output;
- broken public page composition or material visual regression;
- autosave data loss/conflict overwrite;
- Storage/media loss;
- elevated admin/public errors.

After rollback, verify staff login, both roles, representative CRUD operations, public page HTML/SEO, form submissions, sitemap, and prior published content before closing the incident.
