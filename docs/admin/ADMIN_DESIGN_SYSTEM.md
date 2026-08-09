# Admin Design System

## Purpose

The OW Motors admin interface should feel clear, calm, fast, and dependable. It is a working dealership tool, not a copy of the cinematic storefront. The system keeps OW Motors recognition through its logo, red accent, Rajdhani display type, and precise geometry while prioritizing dense information, accessible controls, and unmistakable feedback.

This design system applies only to authenticated administration. It does not redesign approved public pages.

## Design principles

1. **Recognition before decoration.** Status, owner, next action, and public impact are visible at a glance.
2. **Tasks before tables.** Labels use dealership/editor language, not schema names.
3. **One primary action.** Each view has a clear dominant next step.
4. **Draft is visibly different from live.** Save and publish are never ambiguous.
5. **Reversible by default.** Hide/archive/restore precede hard deletion.
6. **Progressive disclosure.** Technical/SEO address fields sit under clear Advanced areas.
7. **Accessible without motion, color, mouse, or wide screens.**

## Admin color palette

| Token | Value | Use |
| --- | --- | --- |
| `admin-brand` | `#C62828` | Primary action, selected navigation, OW Motors accent |
| `admin-brand-hover` | `#A91F1F` | Primary hover/pressed state |
| `admin-brand-soft` | `#FEF3F2` | Selected/red informational background |
| `admin-ink` | `#101828` | Main text and dark controls |
| `admin-ink-subtle` | `#344054` | Secondary labels and table text |
| `admin-muted` | `#667085` | Helper text and metadata, subject to contrast verification |
| `admin-border` | `#D0D5DD` | Default borders/dividers |
| `admin-border-strong` | `#98A2B3` | Active/hovered neutral border |
| `admin-canvas` | `#F5F6F8` | Application background |
| `admin-surface` | `#FFFFFF` | Cards, forms, drawers, modals |
| `admin-surface-muted` | `#F9FAFB` | Table headers, inset summaries, disabled regions |
| `admin-focus` | `#2563EB` | Universal high-visibility focus ring |
| `admin-success` | `#067647` | Saved, live, completed, in stock |
| `admin-success-soft` | `#ECFDF3` | Success chip/banner background |
| `admin-warning` | `#B54708` | Draft attention, new lead, coming soon |
| `admin-warning-soft` | `#FFFAEB` | Warning chip/banner background |
| `admin-info` | `#175CD3` | Saving, scheduled, informational state |
| `admin-info-soft` | `#EFF8FF` | Information chip/banner background |
| `admin-danger` | `#B42318` | Destructive/error state |
| `admin-danger-soft` | `#FEF3F2` | Destructive/error background |

Rules:

- Never use color alone; pair it with text and, where helpful, an icon.
- Normal text must meet WCAG AA 4.5:1; large text/UI boundaries must meet their applicable thresholds.
- White text is reserved for sufficiently dark filled controls.
- Disabled states retain readable labels and do not rely on low opacity alone.

## Typography

Use the existing `next/font` assets:

- **Inter** for all navigation, form labels, body text, tables, buttons, and statuses.
- **Rajdhani** for page titles, section titles, dashboard metrics, and motorcycle names only.

| Style | Font | Size/line height | Weight | Use |
| --- | --- | --- | --- | --- |
| Display | Rajdhani | 40/44 desktop, 32/36 mobile | 700 | Page title |
| Heading 1 | Rajdhani | 28/34 | 700 | Major panel/workspace heading |
| Heading 2 | Rajdhani | 22/28 | 700 | Card/panel heading |
| Body | Inter | 14/22 | 400 | Default UI copy |
| Body strong | Inter | 14/22 | 600 | Important labels/values |
| Small | Inter | 12/18 | 400/500 | Metadata/helper text |
| Label | Inter | 13/18 | 600 | Form and table labels |
| Metric | Rajdhani | 36/40 | 700 | Dashboard count |

Avoid all-uppercase body labels and excessive letter spacing. Uppercase is limited to short navigation-group labels or compact eyebrows. Use sentence case for fields and actions.

## Spacing

Use a 4 px base scale:

| Token | Value | Typical use |
| --- | --- | --- |
| `space-1` | 4 px | Icon/text micro-gap |
| `space-2` | 8 px | Closely related controls |
| `space-3` | 12 px | Label/helper grouping |
| `space-4` | 16 px | Default field/card internal gap |
| `space-5` | 20 px | Compact card padding |
| `space-6` | 24 px | Standard panel padding |
| `space-8` | 32 px | Section separation |
| `space-10` | 40 px | Desktop page-header separation |
| `space-12` | 48 px | Major workspace separation |

Layout rules:

- Desktop page padding: 32–40 px.
- Tablet page padding: 24 px.
- Mobile page padding: 16 px.
- Form fields: 20–24 px vertical group separation.
- Related controls stay visually grouped; unrelated concerns receive a divider or larger spacing.

## Shape, borders, and elevation

- Cards/panels: 8 px radius, 1 px border.
- Inputs/buttons: 6 px radius unless a square media/grid control requires 4 px.
- Chips: full pill radius.
- Drawers/modals: 12 px radius on desktop; mobile full-screen surfaces have no unnecessary outer radius.
- Default cards use borders rather than shadows.
- Floating menus/drawers/modals use restrained layered shadows.
- Avoid combining strong border, strong shadow, and tinted background on one element.

## Cards

### Standard card

- Surface background, default border, 20–24 px padding.
- Header includes title, optional status, metadata, and a compact action menu.
- Whole cards are not clickable when they contain independent actions; use a clear Edit link/button.
- Hover may strengthen border and shadow only when the card is interactive.

### Summary card

- One clear metric, label, short trend/context, and destination.
- Status counts use meaningful labels such as “Needs response,” not database status names.
- Keyboard focus gets the same recognition as hover.

### Section card

- Drag handle, type icon/name, internal label, visibility, draft/live validation state, and menu.
- Selected state uses brand-soft background plus a brand border and explicit “Selected” accessibility state.
- Hidden state uses an eye-off icon and “Hidden” text; it is not simply faded.
- Archived cards live in a separate restore view.

### Lead card/list item

- Emphasize customer name, subject/model, received/preferred date, next action, and workflow state.
- New/unread state uses both weight and status text.
- Contact information is visible in the detail view and treated as private.

## Forms

### Structure

- Labels sit above controls in sentence case.
- Required fields show a text/icon indicator explained once at form start.
- Helper text explains customer impact, not database implementation.
- Group related fields under descriptive headings such as Customer-facing details, Availability, Media, Search preview, and Advanced.
- Slug/page address, raw ordering fallback, and other sensitive fields belong under Advanced.
- Storage paths, UUIDs, RLS terms, JSON, enum codes, and icon identifiers are replaced by pickers and formatted labels.

### Controls

- Minimum interactive height: 44 px; 48 px is preferred on mobile.
- Inputs have default, hover, focus, valid, error, disabled, and read-only states.
- Focus uses a 3 px `admin-focus` outline with adequate offset.
- Textareas resize vertically and show useful recommended/maximum length.
- Character counts become warnings near limits, not errors before limits.
- Checkboxes/switches include a full clickable label and explanatory text for public impact.
- Color selection shows name and visible swatch; HEX may appear only in Advanced.
- File upload shows size/type guidance, local filename, upload progress, preview, alt requirement, and safe error state.

### Validation

- Keep server-side Zod validation authoritative.
- Associate field errors with `aria-describedby`; set `aria-invalid`.
- Focus the error summary or first invalid field after failure.
- Error summaries link to affected fields.
- Preserve entered values after failure where technically safe.
- Database conflicts translate to specific human language without exposing codes.

### Save controls

- Explicit-save legacy forms keep a visible Save changes action.
- Autosaved section inspectors show persistent save state; they do not need a misleading primary Save button.
- Publish, archive, restore, delete, uploads, and relationship changes remain explicit.

## Tables and lists

- Sticky header on long desktop tables.
- Search, filters, result count, sort, and clear controls sit above the list.
- Rows use 48–56 px minimum height and visible focus/hover state.
- First column contains the recognizable object: thumbnail, motorcycle/customer name, and supporting label.
- Status and next action stay visible without opening a row.
- Row actions use a labeled primary action or accessible overflow menu; never icon-only without an accessible name/tooltip.
- Pagination/cursor controls use real buttons/links and announce current range.
- Empty filtered results offer Clear filters; true empty states offer the next creation action.
- At narrow widths, switch to semantic cards or definition lists instead of forcing the entire desktop table to scroll horizontally.
- Bulk actions appear only after selection and require validated batch Server Actions.

## Buttons

### Primary

- Filled OW red, white text.
- One primary action per view/region: Publish, Add motorcycle, Save explicit form.
- Hover/pressed uses darker red; never invert into a low-clarity state.

### Secondary

- White surface, ink border/text.
- Hover uses muted surface and stronger border.
- Typical actions: Preview, View live, Cancel, Back.

### Tertiary

- Text/icon treatment with no persistent border.
- Hover uses muted background.
- Typical actions: Duplicate, Move, More.

### Destructive

- Danger text/border by default; filled danger only in the final confirmation.
- Use precise verbs: Archive section, Remove image, Permanently delete motorcycle.
- Never use the same visual weight as the routine primary action.

### Icon buttons

- Minimum 44×44 px target.
- Always have an accessible name and tooltip for unfamiliar icons.
- Disabled ordering buttons explain why where necessary.

All buttons expose pending/disabled state without changing width unexpectedly.

## Status chips

Chips contain a label and optional icon. Raw underscore enums are mapped to editor language.

| Meaning | Examples | Treatment |
| --- | --- | --- |
| Live/success | Live, Saved, In stock, Resolved, Completed | Success |
| Draft/attention | Draft, New, Needs review, Coming soon | Warning |
| Active workflow | Saving, Scheduled, Contacted | Info |
| Hidden/inactive | Hidden, Inactive, Closed, Cancelled | Neutral |
| Blocked/error | Publish blocked, Save failed, Out of stock | Danger or neutral depending on urgency |
| Archived | Archived | Neutral with archive icon |

Do not label a content section “active” when “Visible in draft” or “Live” is more accurate.

## Modals

Use modals only for short decisions that must interrupt the current task:

- publish confirmation/summary;
- archive/restore confirmation where impact matters;
- permanent deletion;
- conflict resolution;
- small registry/media selection where a drawer is not better.

Requirements:

- semantic dialog with name/description;
- initial focus on the safest meaningful control;
- focus trap, Escape close where safe, backdrop close only for non-destructive dialogs;
- return focus to trigger;
- no background interaction/scroll;
- destructive confirmation states exact object and consequence;
- permanent deletion may require typing the object name;
- mobile becomes an accessible full-screen or bottom-sheet pattern as appropriate.

Replace `window.confirm` only after this primitive passes keyboard, screen-reader, and mobile testing.

## Drawers

Drawers support navigation, section inspection, filters, and media selection:

- clear header, title, close button, and optional sticky footer actions;
- desktop width approximately 360–480 px depending on content;
- tablet/mobile may occupy the full viewport;
- focus trap, Escape/back behavior, backdrop, scroll lock, and focus return;
- URL-backed selection when deep linking/recovery is valuable;
- do not place an entire complex motorcycle editor in a narrow drawer.

## Page headers

Every admin page header includes:

- optional breadcrumb;
- page title;
- concise task-oriented description;
- current Live/Draft/Archived or queue status when applicable;
- last saved/published context;
- one primary action and up to two secondary actions;
- overflow for rare/advanced actions.

On mobile, title/status remain first; actions move to a sticky bottom bar or ordered vertical group. Page headers never rely on hidden horizontal scrolling.

## Empty states

An empty state explains:

1. what is absent;
2. why that matters;
3. the safe next action.

Types:

- First-use: illustration/icon, short explanation, Create action.
- Filtered-empty: active-filter summary and Clear filters.
- Permission-empty: explain capability without revealing security details.
- Blocked-empty: explain dependency, e.g. Create a brand before adding a motorcycle.
- Archived-empty: explain that archived items can be restored.

Do not use vague “Nothing here” copy.

## Loading states

- Preserve the current server-rendered route loading approach.
- Skeletons approximate the destination shape to reduce layout shift.
- Use `aria-busy` on the affected region and one concise screen-reader label.
- Disable skeleton animation under reduced motion.
- Pending buttons keep label context: Saving…, Uploading…, Publishing….
- Long uploads show progress if available; otherwise show indeterminate status and prevent duplicate submission.
- Do not block the entire dashboard when only one panel is refreshing.

## Hover, focus, and pressed effects

- Hover changes color/border/shadow within 120–160 ms; it does not move essential controls unexpectedly.
- Focus-visible is at least as strong as hover and never removed.
- Pressed state may use a subtle color/value change; avoid scale where it could shift dense layouts.
- Row/card hover applies only to the actual interactive target, not nested unrelated buttons.
- Touch devices receive clear active state without depending on hover.
- Reduced-motion mode removes transform/animated travel while retaining immediate state changes.

## Drag-and-drop effects

- Drag handle is explicit, 44 px, and not the entire card.
- Lifted item uses modest shadow and border; surrounding items show a clear insertion line.
- Original position remains understandable.
- Auto-scroll is controlled and stops at boundaries.
- Dropping announces new position through `aria-live` and offers Undo.
- Keyboard controls support pick up/move/drop or simpler Move up/down/to top/to bottom actions.
- Touch drag requires a deliberate handle press and must not prevent ordinary page scrolling.
- Reduced motion removes animated reflow; items move immediately.
- Database order changes only after the server confirms the atomic reorder.

## Save feedback

Persistent editor feedback uses these states:

- **Unsaved changes** — neutral/warning, visible before autosave begins.
- **Saving…** — info indicator, no false completion.
- **Saved at 14:32** — success with timestamp.
- **Save failed — Retry** — danger and actionable; preserve local input.
- **Conflict detected** — blocking message with compare/reload/copy choices.

Success toasts may reinforce a result but never replace the persistent saved state. Screen readers receive concise polite announcements without repeating on every keystroke.

## Publish feedback

Before publish:

- show validation summary and affected public page;
- distinguish blockers from recommendations;
- show section visibility and any changed URL/public entity references;
- require an explicit Publish action.

During publish:

- lock duplicate publish attempts;
- show Publishing… without dismissing the editor.

After publish:

- show “Published” with actor/time;
- provide View live and Copy link;
- record activity history;
- explain if cache refresh is still propagating;
- create the next draft automatically.

On failure, live content remains unchanged and the draft remains recoverable.

## Responsive behavior

### Breakpoints

- Mobile: below 768 px.
- Tablet: 768–1023 px.
- Desktop: 1024 px and above.
- Wide editor workspace: 1280 px and above.

### Mobile

- Sidebar becomes a full-height navigation drawer.
- Minimum 16 px page gutters and 48 px preferred touch controls.
- Tables become cards/definition lists.
- Page-editor outline and inspector become separate screens/drawers.
- Primary page action may use a sticky bottom action bar with safe-area padding.
- No workflow depends on horizontal tabs or hover.

### Tablet

- Collapsible navigation rail/drawer.
- Two-pane page editor with one auxiliary drawer at a time.
- Tables retain only essential columns; secondary data moves into row detail.

### Desktop

- Persistent grouped sidebar.
- Three-area page-editor workspace on wide screens.
- Sticky contextual save/publish controls where useful.

All layouts support 200% zoom without loss and 400% reflow for core tasks.

## Accessibility requirements

- Target WCAG 2.2 AA.
- One H1 per view and logical headings/landmarks.
- Skip link on protected layouts.
- Keyboard access for every operation, including reorder and menus.
- Visible 3 px focus treatment.
- 44×44 px minimum interactive targets; 48 px preferred on mobile.
- Form labels, instructions, autocomplete, field-linked errors, and retained values.
- Status never communicated by color alone.
- Dialog/drawer focus trap, Escape behavior, scroll lock, and focus return.
- `aria-current` for navigation/tabs and selected page/section state.
- Polite live regions for save/reorder; assertive alerts for blocking errors.
- Semantic tables or responsive definition lists; headers remain associated.
- Images require alt intent; decorative images are explicitly marked.
- Color controls include text names; icons have accessible labels where interactive.
- Screen-reader testing for sign-in, navigation, page editing, publish, product editing, lead status, archive/restore, and conflict handling.

## Reduced-motion behavior

When `prefers-reduced-motion: reduce` is active:

- disable smooth scrolling and animated panel travel;
- open drawers/modals immediately or with opacity-only minimal transition;
- remove card lift, button scale, skeleton shimmer, and animated reorder reflow;
- keep progress/state changes visible through text, color, and icons;
- never delay content or action completion for animation;
- video never autoplays solely for decoration.

Motion is progressive enhancement. Every workflow remains complete with animation disabled.

## Content-language guidelines

- Use “Live” instead of `published` in primary UI; retain “Published” where precision is useful.
- Use “Configuration” instead of variant.
- Use “Page address” instead of slug; explain changes affect customer links/search.
- Use “Shown on website” instead of active where public visibility is the real effect.
- Use “Move” instead of sort order.
- Use “Main image” and “Where image is used” instead of primary/image type.
- Use “Visible only to authorized staff” instead of mentioning RLS.
- Never display secrets, database policies, table/column names, API terminology, structured-data code, canonical implementation, sitemap implementation, or route source code.
