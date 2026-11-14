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
