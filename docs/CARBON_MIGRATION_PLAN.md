# TradePilot — IBM Carbon Design System Migration

Status: Phase 0 audit baseline / Phase 1 foundation planning  
Target branch: `develop`  
Working branch: `ui/carbon-system-audit-foundation`

## Objective

Migrate every authenticated and unauthenticated TradePilot screen, shared shell, form, list, dialog, drawer, popover, menu, task panel, and dynamically rendered control to the official IBM Carbon Design System. Preserve product behavior and data contracts.

This is a visual-system migration, not a product redesign. Do not change routes, field semantics, API payloads, database schema, permissions, task orchestration, validation rules, or workflow transitions as part of component replacement.

## Current repository baseline

- React 19 + TypeScript + Vite 7.
- Tailwind CSS v4 and locally composed shadcn/Radix-style components/utilities.
- Current global stylesheet: `src/styles/globals.css`.
- Application entry: `src/main.tsx`.
- Route/page composition: `src/app/App.tsx`.
- Shared shell: `src/app/layouts/AppShell`.
- Existing UI uses Lucide icons and a mix of shared and page-local controls.
- Current typography is Inter/Noto Sans SC; this must be replaced with IBM Plex Sans and IBM Plex Mono, with Chinese fallback retained.
- No Carbon React dependency is present in the current package manifest.

## Route-level inventory (from App.tsx)

The following application destinations are present in the route type/map and must each receive an explicit migration/verification record:

### Agent workspace
- `/agent/workbench`
- `/agent/market`
- `/agent/orchestration`
- `/agent/connections`
- `/agent/runs`
- `/agent/approvals`
- `/agent/settings`

### Lead discovery
- `/lead-discovery/map-local-businesses`
- `/lead-discovery/tasks`
- `/lead-discovery/results`
- `/lead-discovery/search-engine`
- `/lead-discovery/facebook`
- `/lead-discovery/instagram`

### CRM and master data
- `/crm/leads`
- `/crm/accounts`
- `/crm/contacts`
- `/crm/opportunities`
- `/settings/enterprise`
- `/settings/products`
- `/products`

### Orders and documents
- `/orders`
- `/orders/quotations`
- `/orders/sales`
- `/orders/purchase`
- `/documents`
- `/documents/create`
- `/documents/records`
- `/settings/document-templates`

### Settings and authentication
- `/settings/integrations`
- `/settings/search-exclusions`
- `/settings/agent-appearance`
- `/login`

This is the route baseline, not yet the final control-level census. Nested dialogs, drawers, full-screen editors, conditional sections, empty/error/loading states, and controls rendered from data must also be discovered and tracked.

## Target implementation

Use the official Carbon React component system (`@carbon/react`) and its matching Carbon styles/icons. Pin compatible package versions and commit the package manager lockfile. Do not emulate Carbon by adding broad CSS overrides to the current component library.

### Design foundations
- Carbon theme tokens and semantic tokens are the only source of truth for color, spacing, typography, radius, layers, borders, and focus.
- IBM Plex Sans for UI text; IBM Plex Mono for code/technical identifiers; preserve a tested CJK fallback stack.
- Adopt Carbon grid/breakpoint and spacing conventions.
- Use Carbon icon assets consistently; remove mixed icon families where a Carbon equivalent exists.
- Define one application theme and documented exceptions only where required for accessible contrast.

### Control replacement inventory
Every instance must be mapped to an official Carbon component or a documented Carbon-compliant domain component:

- Buttons, icon buttons, button groups, links, toggles.
- Text inputs, password inputs, text areas, number inputs, search inputs.
- Selects, dropdowns, multiselects, comboboxes, filtering controls.
- Checkboxes, radio buttons, switches, sliders.
- Date pickers, time pickers, date/time range controls.
- Tabs (only where the current information architecture already uses tabs).
- Data tables, sortable headers, pagination, overflow menus, bulk actions.
- Tags, status indicators, badges, inline notifications, toasts.
- Modals, side panels, drawers, popovers, tooltips, menus.
- Breadcrumbs, side navigation, header, page titles, content switchers.
- Progress indicators, skeletons, loading states, empty states.
- File uploaders, avatar/logo uploaders, drag/drop areas.
- Form validation, helper text, error text, required indicators.
- Custom domain controls: social platform/account editor, task execution center, channel selectors, map controls, AI model selectors, workflow/approval controls, document/order line editors.

### Compatibility rules
- Preserve component props/callback semantics and form state.
- Preserve all existing API request/response shapes and validation behavior.
- Preserve navigation hierarchy; Carbon Tabs must never replace primary side navigation.
- Replace native/browser-rendered selects with Carbon Select/Dropdown/ComboBox/MultiSelect.
- Keep mobile metrics in two columns and preserve existing mobile card layouts.
- Complex order/document data must remain usable on narrow screens; do not introduce horizontal overflow.
- Maintain keyboard navigation, visible focus, labels, accessible names, and contrast.
- Preserve current light/dark behavior only if both themes can meet Carbon accessibility requirements; do not silently ship an inconsistent hybrid theme.

## Migration sequence

1. **Inventory and baseline:** enumerate routes, shared components, raw HTML controls, Radix/shadcn controls, and dynamic/modal-only controls. Capture current behavior contracts and screenshots at 1440px, 1280px, 1024px, 390px, and 360px.
2. **Foundation:** add Carbon dependencies and lockfile; establish IBM Plex fonts, Carbon theme/tokens, global reset, app-level Carbon provider/theme, and icon policy.
3. **Application shell:** migrate header, side navigation, page frame, responsive grid, and shared page header.
4. **Shared controls:** create thin typed wrappers around Carbon components. Migrate shared buttons, inputs, selects, dialogs, notifications, tags, tables, and pagination first.
5. **Domain controls:** migrate task execution, discovery filters, social/contact channels, AI/API configuration, document/order editors, maps, and workflow controls.
6. **Page-by-page rollout:** migrate all routes in the inventory and all nested UI states; remove obsolete styles only after usage scans show they are unused.
7. **Verification:** static scans for native controls and legacy imports; typecheck, lint, unit tests, build, accessibility checks, visual regression, and authenticated manual checks at desktop/mobile breakpoints.
8. **Release:** merge to `develop` only after CI and migration checklist pass; deploy and verify Cloudflare production version/traffic.

## Required migration ledger

For every route and every shared/domain component, record:
- Source file and current component/control.
- Carbon target component or approved custom component.
- State: Not inventoried / Inventoried / Migrated / Tested / Accepted.
- Desktop and mobile verification.
- Keyboard/accessibility verification.
- Behavior contract verification.
- Remaining exceptions and owner.

No route may be marked complete while any nested dialog, drawer, popover, conditional form, or state-specific control remains on the legacy design system.

## Release gates

- No API, schema, route, permission, or business-rule changes.
- No legacy shadcn/Radix visual controls remain in migrated routes unless explicitly documented as a non-visual primitive.
- No native `<select>` remains in user-facing UI.
- No mixed font/icon systems in migrated surfaces.
- All routes and all interactive states have a ledger entry and verification evidence.
- Typecheck, lint, tests, frontend build, and Worker build pass.
- Authenticated desktop and mobile smoke tests pass before production rollout.

## Important implementation note

The first change must be the dependency/lockfile and theme foundation, not broad selector overrides. The lockfile must be generated by the repository's actual package manager and verified by CI. A repository contents-only edit must not fabricate lockfile integrity metadata.


## Implementation progress (2026-11-14)

### Foundation and shared controls started
- [x] Added `@carbon/react@1.120.0` and `sass@1.108.2` to the project manifest.
- [x] Added Carbon Sass entry point and loaded it from the application entry.
- [x] Added a Carbon `Theme` scope using the white theme.
- [x] Updated global UI font stack to IBM Plex Sans with Noto Sans SC fallback.
- [x] Added IBM Plex Mono for code and technical identifiers.
- [x] Migrated shared Button wrapper to Carbon Button for normal button usage (primary/secondary/tertiary/ghost kinds).
- [x] Migrated shared Input and Textarea wrappers to Carbon TextInput and TextArea.
- [x] Migrated shared Badge wrapper to Carbon Tag.
- [x] Migrated shared searchable Combobox wrapper to Carbon ComboBox.
- [x] Shared Checkbox wrapper now uses Carbon Checkbox; wrapped-label call sites were converted to Carbon `labelText` to avoid nested labels.
- [x] No `asChild` call sites remain; removed the unused Radix Slot wrapper and dependency.
- [x] Card uses Carbon Tile; Progress uses Carbon ProgressBar; separators are structural token-based elements; former Radix Popover selectors were migrated to Carbon ComboBox/MultiSelect.
- [x] AppShell now uses Carbon Header, HeaderMenuButton, SideNav, SideNavMenu and SideNavLink; its navigation icons use Carbon Icons.
- [ ] No route is considered Carbon-complete yet.

### Validation
- CI run `43595857626` passed typecheck, all 21 tests, lint, frontend build and Worker build for commit `45e178fdcfb1604b5ae6b4aab96cf616fe3514c6`. The later ContentSwitcher commit is undergoing its own CI run. No production deployment has been performed.
- Package lockfile generation and review remain required; CI uses npm install and must produce a reproducible lockfile before release.


### Shared control migration update (latest)
- [x] Card wrapper now uses Carbon Tile.
- [x] Progress wrapper now uses Carbon ProgressBar with bounded 0–100 values.
- [x] Resolved the first CI TypeScript error by excluding the native numeric HTML input `size` attribute from Carbon TextInput props.
- [x] Card/ProgressBar changes and subsequent shared control changes passed CI in run `43595857626`.
- [x] Checkbox, DatePicker, ComboBox, MultiSelect and FileUploaderButton now use Carbon React components. Radio/Switch inputs were not found in the audited user-facing routes; Dialog/Modal and notification inventories remain outstanding.
- [x] Carbon SideNav/Header migration completed; AppShell navigation symbols now use Carbon Icons. Feature-page Lucide icon inventory and migration remain outstanding.


### CI feedback and typography validation
- The CI run for the Card/ProgressBar change passed TypeScript typecheck and all 21 tests.
- Lint found one unused compatibility variable for the native input `size` attribute; that variable is now explicitly consumed in the follow-up commit. A fresh CI run is required to verify lint and the remaining build stages.
- Carbon Sass is configured with `$use-per-family-plex: true`, which uses the Carbon/IBM Plex font assets locally instead of relying on an external font CDN, following Carbon's IBM Plex integration guidance.
- Added Noto Sans TC ahead of the existing Noto Sans SC fallback for Traditional Chinese UI text.


### Shared UI migration expansion
- [x] Shared semantic StatusBadge now renders Carbon Tag with Carbon semantic color types.
- [x] Shared search/clear icons now use Carbon Icons React.
- [x] Declared `@carbon/icons-react@11.92.0` as a direct dependency rather than relying on a transitive dependency.
- [x] Carbon Card wrapper now renders Carbon Tile.
- [x] Carbon ProgressBar wrapper now renders Carbon ProgressBar.
- [x] SearchControlPanel continues to use the Carbon-backed shared Button and TextInput wrappers.
- [x] StatusBadge and Carbon Icons changes passed CI.
- [x] User-facing page icons migrated to Carbon Icons; GitHub code search on the updated default branch found no remaining lucide-react imports.
- [x] Audited user-facing routes: no native `<select>` or native radio input remains; custom country/region, language, model, search-type and business-type pickers were migrated to Carbon ComboBox/MultiSelect. Date fields use Carbon DatePicker; customer logo upload uses Carbon FileUploaderButton.


### Current-head verification gate
- The completed CI run #1337 passed typecheck, 21 tests, lint, frontend build, and Worker build for the earlier shared-primitive snapshot.
- The latest fully completed verification run `43595857626` passed all CI stages for commit `45e178fdcfb1604b5ae6b4aab96cf616fe3514c6`. The later Carbon ContentSwitcher migration for AI/API settings requires a fresh CI result before merge readiness.


### AppShell and selector migration (2026-11-14)
- [x] Replaced the application shell navigation with Carbon Header and SideNav components while preserving the existing route destinations, group expansion rules, desktop collapse control, mobile drawer and sign-out action.
- [x] Replaced AppShell Material Symbols with Carbon Icons.
- [x] Migrated the AI/API settings tab switcher to Carbon ContentSwitcher (current-head CI pending).
- [x] Migrated Facebook discovery object selection, Instagram multi-pickers, search-engine vertical/business/exclusion selectors, map-local business selectors, country selector, region/city selectors and AI model picker to Carbon MultiSelect/ComboBox.
- [x] Removed Radix Popover, Progress, Separator and Slot dependencies; no Radix UI dependency remains in package.json.
- [x] Migrated customer logo upload to Carbon FileUploaderButton.
- [x] Migrated date inputs through the shared Carbon DatePicker adapter while preserving the existing `onChange(event.target.value)` contract.
- [x] Feature-page icon imports migrated to Carbon Icons and unused Lucide dependency removed. Visual consistency review remains outstanding.
- [x] Migrated all identified page-local tables to Carbon Table components and native archive/delete confirmations to Carbon Modal. Remaining notification surfaces and visual verification are still outstanding.
- [ ] Add route-by-route authenticated desktop/mobile visual smoke evidence for every nested and conditional state.
- [ ] Review reproducible dependency lockfile strategy before release.


### Data table and confirmation migration (2026-11-14)
- [x] Migrated the native table structures on Leads, Document Center, Order Center, Discovery Results, Discovery Tasks and Master Data pages to official Carbon Table, TableHead, TableBody, TableRow, TableHeader and TableCell components. Existing columns, row actions, mobile cards, pagination and data behavior remain intact.
- [x] Replaced native `window.confirm` archive/delete prompts in Contacts and Master Data with Carbon Modal confirmation flows.
- [x] Corrected the shared Carbon Checkbox adapter to preserve the previous React ChangeEvent contract for existing `event.target.checked` call sites.
- [x] The table migration and Carbon Modal changes passed CI runs `43597066406` and `43597006249` respectively (typecheck, tests, lint, frontend build and Worker build).
- [x] Shared Carbon Checkbox event adapter now matches Carbon v11 event-first callback signature and preserves the legacy React ChangeEvent contract; follow-up CI run passed.
- [x] Customer Account Form internal tab panel now uses Carbon ContentSwitcher. Full-screen contact-management layout still needs visual review.
- [ ] Continue auditing all page-local conditional controls, inline actions, responsive states, and the remaining Carbon Table variants; the presence of Carbon primitives does not by itself constitute a completed visual acceptance pass.


### Carbon component coverage update (2026-11-14)
- [x] Carbon Table migration includes the Agent Chat result table in addition to Leads, Document Center, Order Center, Discovery Results, Discovery Tasks and Master Data.
- [x] AI/API settings and Customer Account Form use Carbon ContentSwitcher.
- [x] AI provider selector, lead/order sort controls, chat history items, chip/tag removal actions, sidebar actions and document preview close action use Carbon Buttons or HeaderGlobalAction.
- [x] Mobile navigation backdrop uses Carbon Button while preserving backdrop dismissal behavior.
- [x] No remaining lucide-react imports were found by repository code search; removed the unused direct dependency.
- [ ] The document-template brand-color input remains a specialized native color control because Carbon React has no directly equivalent color picker component in this pinned version. Revisit only if a Carbon-compatible replacement can preserve arbitrary color selection.
- [ ] Browser-based desktop/mobile visual acceptance, keyboard/focus review, screen-reader review, and nested/conditional-state smoke tests remain required before calling the migration fully complete.
- [ ] PR #18 was merged to develop at 679a27597f6bbe42600080f5862f00fd1a42fed7. A provider-selector JSX fix was then pushed to develop at 4dd5687127b7e0ed5cd3d29000be17d001c2e6a2; the separate draft PR #19 carries that fix plus the Carbon mobile-backdrop refinement. Do not merge PR #19 or deploy without explicit approval.
