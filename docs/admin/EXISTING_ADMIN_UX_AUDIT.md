# Existing Admin UX Audit

## Scope and audit method

This document records the current OW Motors administration implementation before any redesign. It is a preservation-first audit: working authentication, authorization, Row Level Security (RLS), queries, validated Server Actions, Storage behavior, publication safeguards, and public SEO behavior are treated as constraints, not disposable implementation details.

The audit covered:

- every file under `src/app/admin`, `src/components/admin`, and `src/lib/admin`;
- the Supabase SSR clients, session proxy, authenticated profile lookup, and generated database types;
- every migration in `supabase/migrations` and the documented policy model;
- current public page composition and the data/query paths it consumes;
- existing root-level admin and Supabase documentation;
- a read-only desktop and 375 px responsive inspection of the admin sign-in route.

`docs/admin` did not exist before this audit. The protected dashboard could not be visually entered without an administrator/editor credential, so protected views were audited from their complete rendered source structure and behavior. No login attempt, mutation, upload, or database write was performed. Live remote policy state was not re-verified; policy findings describe the migrations and application code in this repository.

## 1. Existing admin routes

| Route | Current purpose | Data and actions | Protection |
| --- | --- | --- | --- |
| `/admin/login` | Email/password staff sign-in | `loginAdmin`, Supabase Auth, active profile check | Redirects an already-authorized staff user to `/admin`; `noindex` |
| `/admin` | Summary dashboard | Counts, five recent inquiries, five recent test rides | Protected layout calls `requireStaffPage()` |
| `/admin/brands` | Brand content and homepage campaign management | Brand create/update/delete, active state, numeric order, brand move, banner upload/edit/show-hide/reorder/replace/delete | Staff reads/writes; destructive actions check admin role |
| `/admin/categories` | Category landing-page content | Category create/update/delete, active state, numeric order, SEO fields | Staff reads/writes; delete checks admin role |
| `/admin/motorcycles` | Inventory list | Latest 250 motorcycles with brand, base price, and publication status | Staff-only query |
| `/admin/motorcycles/new` | Draft motorcycle creation | Brand, name, slug, descriptions, base price, featured flag | Creates a draft and redirects to its editor |
| `/admin/motorcycles/[id]` | Eight-part motorcycle editor | Basic information, categories, variants, images, specifications, features, SEO, publishing | UUID validation, staff query, admin-only destructive controls |
| `/admin/inquiries` | Contact lead queue | Latest 200 inquiries and status updates | Private data under staff RLS; status-only database grant |
| `/admin/test-rides` | Test-ride lead queue | Latest 200 requests, selected motorcycle/configuration, contact details, status update | Private data under staff RLS; status-only database grant |

All protected routes are force-dynamic through the layout, inherit admin `noindex`, and use Server Components by default. Client Components are limited to navigation pathname state, form action state/confirmation, and the error boundary.

## 2. Existing navigation

The current navigation is a flat list:

1. Dashboard
2. Brands
3. Categories
4. Motorcycles
5. Inquiries
6. Test Rides

Desktop uses a fixed 250 px dark sidebar. Mobile converts the same list into a horizontally scrolling row inside the dark header area. The actor's full name and role are shown in the desktop sidebar footer and in a separate mobile bar. A small `View site` link and sign-out action are available.

What works:

- navigation uses real `next/link` destinations;
- the active route is exposed with `aria-current="page"`;
- nested motorcycle routes keep Motorcycles highlighted;
- targets meet the current 44 px minimum height;
- the layout remains server-authorized before rendering navigation or private content.

What does not work well:

- content, inventory, and customers are mixed without task groups;
- homepage banners are hidden inside Brands instead of under a Website/Home page workflow;
- there is no Pages area, Media area, Settings area, archive view, or editorial work queue;
- horizontal mobile navigation hides destinations off-screen and has no menu affordance;
- editor tabs create a second horizontal navigation strip with eight options;
- navigation labels describe database entities rather than common jobs such as “Edit homepage,” “Update stock,” or “Follow up with riders.”

## 3. Existing CRUD functionality

| Managed item | Create | Edit | Duplicate | Reorder | Show/hide | Publish/archive | Restore | Hard delete |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brands | Yes | Yes | No | Move up/down and raw display order | Active checkbox | Active/inactive only | By reactivating | Admin only |
| Brand campaign images | Upload creates | Alt text, visibility; admin image replacement | No | Atomic move up/down RPC | Active checkbox | No separate draft/publish/archive | By reactivating | Admin only; attempts Storage cleanup |
| Categories | Yes | Yes | No | Raw display order only | Active checkbox | Active/inactive only | By reactivating | Admin only |
| Motorcycles | Draft creation | Yes | No | No product-list ordering | Featured checkbox | Draft/published/archived | Change archived back to draft/published | Admin only |
| Category assignments | Add | Replace selected set | No | Not applicable | Not applicable | Not applicable | Re-add | Removal is admin only |
| Variants/configurations | Yes | Yes | No | Sorted automatically by default/CC/color | Active checkbox | Stock state plus active flag | By reactivating/changing state | Admin only |
| Motorcycle images | Upload creates | Metadata and variant relationship | No | Raw numeric sort order | No independent hidden state | No archive | No | Admin only; attempts Storage cleanup |
| Specifications | Yes | Yes | No | Raw numeric sort order | No | No archive | No | Admin only |
| Features | Yes | Yes | No | Raw numeric sort order | No | No archive | No | Admin only |
| Inquiries | Public form creates through a server-only boundary | Workflow status only | No | Newest first | Status-based | Closed/spam states | Status can be changed | Policy permits admin delete; no delete UI |
| Test rides | Public form creates through a server-only boundary | Workflow status only | No | Newest first | Status-based | Completed/cancelled/spam states | Status can be changed | Policy permits admin delete; no delete UI |
| Site settings | Database/RLS capability only | Database/RLS capability only | No UI | No UI | No UI | No UI | No UI | No UI |

The current dashboard is a capable inventory CRUD application, but it is not a page or section CMS.

## 4. Existing forms

### Shared behavior

`AdminForm` wraps React `useActionState`, disables the submit button while pending, renders a generic error list, announces success text with `role="status"`, and can call `window.confirm` before destructive or sensitive submissions. Server Actions re-check the actor and validate payloads with Zod.

### Forms present

- Staff sign-in: email and password.
- Brand: name, slug, short/full description, raw logo/hero Storage paths, SEO title/description, numeric display order, active state.
- Brand campaign image: file, alt description, visibility, move, replacement, and removal.
- Category: name, slug, description, SEO title/description, numeric display order, active state.
- Motorcycle basic information: brand, model name, slug, short/full description, base price, featured state.
- Motorcycle categories: checkbox assignment list.
- Configuration/variant: engine CC, color name/HEX, price, quantity, stock status, default and active state.
- Image: file, configuration relationship, alt text, type, numeric sort order, primary state.
- Specification: group, label, value, unit, configuration relationship, numeric sort order.
- Feature: group, title, description, icon identifier, numeric sort order.
- Product SEO: title and description overrides.
- Publishing: draft/published/archived selection plus publish readiness checks.
- Inquiry/test ride: workflow-status selection.

Strengths are server validation, safe generic database errors, explicit confirmation for hard deletion, and constrained enums. Weaknesses are long dense forms, generic top-level errors rather than field-linked feedback, raw technical fields, no autosave, no dirty-state warning, no preview, no character counters, and no workflow-level completion guidance outside the publishing tab.

## 5. Existing Supabase integration

- `@supabase/ssr` creates cookie-aware server clients and the browser client.
- `src/proxy.ts` refreshes/propagates Supabase sessions for application requests.
- `getAuthenticatedProfile()` validates the Auth user with `auth.getUser()` and fetches the active profile row.
- Protected pages and queries use the user's publishable-key session; they do not bypass RLS.
- Admin queries are server-only and call `requireStaffPage()` before selecting data.
- Admin mutations use the same staff session through `getAuthorizedAdminClient()`.
- Public contact and test-ride inserts use a separate server-only service-role client only after application validation; the admin dashboard does not use the service role.
- Motorcycle and campaign uploads use the authenticated staff session against the public `motorcycles` bucket and its Storage RLS.
- Content mutations revalidate the admin layout, public layout, and sitemap. Lead status mutations revalidate their queue and dashboard.
- Public storefront queries read active/published records anonymously and continue to render essential content on the server.

The generated database contract includes profiles, brands, campaign images, categories, motorcycles, category relationships, configurations, images, specifications, features, leads, and site settings. `model_code` and `sku` were removed by the latest schema migration and are not present in the current admin UI contract.

### Current integrity caveats

- Setting a default configuration first unsets the previous default and then saves the requested record in a separate operation. A failed second operation can temporarily leave no default.
- Setting a main image follows the same multi-operation pattern. Upload, metadata insert, main-image reset, and Storage cleanup are not one transaction.
- Category assignment additions and removals are separate calls, so a later failure can leave a partial requested set.
- Publish prerequisites are checked before the publication update rather than enforced by one database transaction/constraint, leaving a concurrency window.
- Database records and Storage objects cannot be changed atomically. Existing actions report/console-log cleanup failures, but orphan reconciliation is manual.
- There is no optimistic concurrency/version check; two staff members can overwrite the same record using last-write-wins updates.

These are existing technical risks to harden progressively. They are not justification for bypassing the current validated actions with direct browser writes.

## 6. Existing permissions

### Editor

- Read private and unpublished managed content.
- Create/update brands, campaign images, categories, motorcycles, configurations, images, specifications, and features.
- Add category assignments.
- Publish, unpublish, and archive motorcycles.
- Reorder homepage brands and campaign images.
- Update inquiry and test-ride status.
- Cannot permanently delete managed records through current actions.
- Cannot remove existing category assignments.
- Cannot replace/remove campaign artwork or delete Storage objects.

### Admin

- All editor operations.
- Permanent deletes across managed content where foreign keys permit them.
- Remove category assignments.
- Replace/remove campaign artwork and delete uploaded objects.
- Database policies permit profile management, although there is no user-management UI.

### Defense in depth

- Route/layout authorization blocks inactive or unrecognized profiles.
- Every Server Action re-authorizes.
- Zod validates form payloads.
- RLS is enabled and forced on public tables.
- Database constraints enforce slugs, states, ranges, relationships, one default configuration, and one primary image scope.
- Storage policies allow staff write and admin delete.
- Inquiry/test-ride column grants restrict authenticated users to `status` updates.

The redesign must retain all of these layers. UI role hiding is not a substitute for Server Action checks or RLS.

## 7. Existing page-content management

| Public area | Database-managed today | Code-managed today | Current admin capability |
| --- | --- | --- | --- |
| Home page | Active brands, brand descriptions, brand order, campaign images/order/visibility, published motorcycle rows | H1, brand taglines/background colors/local logo fallback, section sequence, Why Choose cards, About preview, CTA, contact preview | Partial: brand/campaign and paired row order only |
| Brands page | Active brand content and campaign images | Page intro, alternating layout, section sequence, CTA wording/styles | Brand entity editing only; no page editor |
| Motorcycles page | Published inventory, brands, categories, configurations | Page intro, catalog layout, filter groups, result/empty wording | Inventory/category management only; no page editor |
| Brand/category landing pages | Brand/category copy and product relationships | Landing layout and surrounding sections | Entity edit, not section composition |
| About page | None | A hardcoded placeholder component and copy | No management |
| Contact page | Submitted inquiries only | Intro, form placement, supporting copy | No frontend content management |
| Global footer | Active brand list | Dealership description, quick links, social placeholders, contact placeholders, legal labels | No management; `site_settings` is unused |
| Product detail template | Motorcycle descriptions, configurations, images, specifications, features, categories | Template section order/headings, overview heading derivation, generated FAQs, related-product rule, CTA/configurator placement | Product data editing, no template editor or FAQ editor |

There is no general page model, supported section registry, section draft, page preview, page publication, section duplication, section archive, restoration, or content version history.

## 8. Existing inventory management

Inventory is the strongest current area and must be preserved:

- list of up to 250 motorcycles ordered by last update;
- draft-first creation;
- brand relationship and brand-scoped slug constraints;
- eight editor tabs matching the Stage 7 requirement;
- category assignments with stricter removal permission;
- explicit CC/color configuration records with price, quantity, stock, default, and active states;
- product/configuration images with alt text, semantic type, primary state, ordering, and Storage integration;
- shared or configuration-specific specifications;
- grouped features with icon identifiers;
- SEO overrides with fallbacks;
- publication validation requiring an active brand, active default configuration, and at least one image;
- published product link and archive status;
- admin-only hard deletion.

Missing operational capabilities include search, filters, pagination, bulk stock updates, duplication, import/export, activity history, last-editor attribution, completion scoring, image drag ordering, and a customer-facing preview of drafts.

## 9. Existing lead management

Contact inquiries and test rides are private, server-rendered queues. They provide direct `mailto:`/`tel:` actions, received timestamps, visible message content, status chips, and status changes. Test rides also show the selected motorcycle/configuration and preferred date/time.

Current limitations:

- fixed newest-200 limits with no pagination;
- no search, status filter, date filter, unread state, assignment, owner, priority, internal note, follow-up date, or activity timeline;
- one full card and one Server Action form per lead makes scanning slow at volume;
- summary links open the queue, not a focused lead;
- no bulk status workflow;
- raw workflow terms are displayed without next-action guidance;
- no retention/deletion interface despite private customer data.

## 10. UX problems

1. The dashboard reflects tables—Brands, Categories, Motorcycles—rather than editor goals and public pages.
2. Homepage management is buried inside expandable brand records.
3. The editor cannot see a page's section sequence or understand which content is code-managed.
4. Create forms occupy prominent list-page space even when the common task is finding/editing an existing record.
5. Dense accordions hide status, completeness, image quality, and public impact.
6. Numeric `display_order` and `sort_order` fields require editors to reason about implementation state.
7. Save feedback is local to each form; there is no page-level saved state, timestamp, or unsaved-change protection.
8. “View product” is available only after publication; drafts cannot be reviewed safely.
9. Publishing readiness is isolated in the last tab instead of remaining visible throughout the editor.
10. No search/filter/bulk tools exist for inventory or customer queues.
11. No archive center or restore workflow exists for most content.
12. No content history, actor attribution, or rollback exists.
13. Workflows do not distinguish routine editing from sensitive SEO, URL, visibility, and destructive changes.
14. Empty states are technically present but do not consistently offer a guided next step.

## 11. UI inconsistencies

- Primary actions mix `.ow-button-primary`, black admin buttons, red hover buttons, plain red text links, and custom border links.
- Some panels use a gray inset create card; brands/categories use a full top panel; inventory uses tables; leads use large articles.
- Page-specific controls are spread between headers, panels, tabs, accordions, and inline forms.
- Status chip semantics are inferred from raw strings; several states share generic gray treatment.
- Labels use uppercase tracking while lead details, tabs, and card metadata use different casing and sizes.
- Destructive actions sometimes appear as a separate “danger zone” and sometimes directly beneath an edit form.
- Move controls do not disable at list boundaries and provide no visible current/total position outside campaign images.
- Slugs appear as fragments in some list summaries and as a full public route in the product editor.
- The public site's visual button primitive is reused in the admin even though admin actions need more state variants.

## 12. Accessibility problems

Confirmed strengths include semantic headings, labeled navigation, real links, native forms, 44 px primary controls, global focus outlines, text inside status chips, native `details`, reduced-motion loading skeletons, and Server Component content.

Problems to address:

- protected admin pages have no skip link;
- field errors are collected into an unlinked list; fields do not receive `aria-invalid`, `aria-describedby`, or focus after failure;
- error feedback is not consistently an assertive alert when submission fails;
- `window.confirm` provides inconsistent, non-designed destructive confirmation and weak contextual detail;
- horizontal mobile navigation and editor tabs rely on overflow discovery;
- disclosure plus icons rotate without an explicit reduced-motion treatment;
- icon identifiers and color HEX controls expose technical concepts without examples/previews usable by all editors;
- no keyboard reorder interaction or announcement exists; only separate move buttons are available;
- save/publish status is not persistent enough for assistive-technology users navigating among multiple forms;
- no focus-management contract exists for future drawers/modals because those primitives do not yet exist.

## 13. Mobile problems

The sign-in route fits a 375 px viewport without horizontal overflow and retains 44 px inputs/buttons. Protected source structure is responsive at a basic layout level, but the workflow is not mobile-oriented:

- the sidebar becomes a wide horizontal navigation strip rather than a menu/drawer;
- user/sign-out information consumes a second top bar;
- page headers and multiple action groups wrap without a priority hierarchy;
- eight motorcycle editor tabs require horizontal scrolling;
- desktop tables force horizontal scrolling rather than switching to task-focused cards;
- lead cards remain long and repeat full forms;
- two- and three-column form groups collapse, but their total vertical length becomes excessive;
- preview, sticky save state, bottom actions, and mobile reorder affordances do not exist;
- file/image management cards are large and difficult to compare in a single-column layout.

## 14. Duplicate components and patterns

No exact duplicate route component should be removed blindly, but the following repeated patterns should become stable admin primitives during the redesign:

- Brand and category entity forms share identity, slug, content, SEO, visibility, order, save, and danger patterns.
- Variant, specification, and feature managers repeat “add card + disclosure list + edit form + admin delete.”
- Banner and motorcycle-image upload actions duplicate MIME/extension/size validation and Storage cleanup patterns.
- Move-up/move-down forms are repeated for brand and banner ordering.
- Inquiry and test-ride cards duplicate contact, timestamp, status, and status-form presentation.
- Empty states, bordered data cards, section headers, action links, and destructive areas are authored inline across pages.
- Storage/image metadata controls are repeated without a shared media picker.

Consolidation must preserve the underlying action contracts until each replacement is parity-tested.

## 15. Database terminology exposed to users

The current UI directly exposes:

- slug;
- Storage path and bucket-relative path examples;
- display order and sort order;
- SEO metadata fields without a search-preview workflow;
- variant, variant relationship, default variant, and active variant;
- color HEX;
- image-type enum values such as `open_graph`;
- primary image;
- icon identifier;
- publication status enum;
- RLS in customer and publishing descriptions;
- raw route fragments and internal UUID-based editor URLs.

Recommended dealership language:

| Current term | Editor-facing term |
| --- | --- |
| Slug | Page address (advanced) |
| Storage path | Choose/upload media |
| Display/sort order | Drag to reorder / position |
| Variant | Configuration |
| Default variant | Default configuration shown to customers |
| Active | Available for use / shown where published |
| Image type | Where this image is used |
| Primary image | Main customer-facing image |
| Icon identifier | Choose an icon |
| Publication status | Draft / Live / Archived |
| RLS | Omit; say “visible only to authorized staff” |
| JSON-LD/canonical/sitemap | Never expose implementation; show only human-facing SEO previews when needed |

## 16. Features that already work and must be preserved

- Supabase Auth email/password sign-in and session refresh.
- Active profile enforcement and admin/editor roles.
- Server-side route authorization and Server Action re-authorization.
- RLS/forced RLS and Storage policy enforcement.
- User-session Supabase clients for admin reads/writes.
- Zod schemas, database constraints, and safe database error mapping.
- Draft-first motorcycle creation and eight-part motorcycle editing.
- Brand/category/motorcycle/configuration/image/specification/feature CRUD rights.
- Admin-only destructive operations and explicit confirmation.
- Category-removal restriction for editors.
- Campaign upload, alt editing, visibility, replacement, deletion, and atomic ordering.
- Atomic paired homepage brand/product-row ordering.
- Image upload limits/types, alt requirements, Storage-path uniqueness, and cleanup attempts.
- Publish readiness checks and public RLS visibility rules.
- Inquiry/test-ride privacy and status-only staff updates.
- Server-rendered public content, current routes, metadata, canonicals, JSON-LD, sitemap, robots, and revalidation behavior.
- Admin error/loading/empty states and admin `noindex` behavior.

## 17. Features that may safely be removed

No business capability should be removed in the first redesign stage. The following presentation mechanisms may be retired only after their replacement reaches functional, role, RLS, validation, and accessibility parity:

- flat ungrouped sidebar;
- horizontally scrolling mobile admin navigation;
- raw Storage-path text inputs after a media library/picker exists;
- numeric ordering fields after accessible drag/reorder plus keyboard controls exists;
- raw icon-identifier input after a constrained icon picker exists;
- direct RLS/database wording in helper text;
- `window.confirm` after an accessible confirmation dialog exists;
- always-visible create panels after a clear create action/drawer or route exists;
- repeated manager/form shells after shared primitives are proven;
- hard delete as a routine visible action; retain the admin-only capability in an advanced recovery-aware area.

The existing tables, actions, policies, routes, and frontend SEO code are not safe-removal candidates during the redesign.

## 18. Risks of redesigning the dashboard

1. Replacing current forms could accidentally bypass Zod validation or role checks.
2. A browser-side CRUD client could weaken the current Server Action and SSR security boundaries.
3. Generic section JSON could permit arbitrary HTML/script or unvalidated broken layouts.
4. Draft preview could leak unpublished inventory or customer information if it reuses public anonymous queries.
5. Moving published content without versioning could create partially updated public pages.
6. Replacing brand/banner ordering could desynchronize current homepage showcases and product rows.
7. New section visibility could conflict with brand/category active flags and motorcycle publication status.
8. New editor terminology could obscure important inventory rules if field mapping is incomplete.
9. Autosave could overwrite a colleague's work without optimistic concurrency/version checks.
10. Drag-and-drop alone would regress keyboard/mobile accessibility.
11. Changing slugs without redirect governance could damage the approved SEO architecture.
12. Generic page metadata controls could create duplicate titles, invalid canonicals, or schema/content mismatch.
13. Removing current actions before data migration is reconciled could strand content or Storage objects.
14. Broad authenticated table grants mean new direct-client editing would rely heavily on RLS and could bypass workflow invariants; new writes should remain validated Server Actions/RPCs.
15. A destructive migration would make rapid rollback unsafe.

The safe approach is an additive page/section layer, dual-read migration, role/RLS parity tests, protected server-rendered preview, and progressive replacement of presentation—not a dashboard rewrite.
