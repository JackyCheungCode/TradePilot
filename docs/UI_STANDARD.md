# TradePilot UI Standard

## Authority
This is the mandatory UI standard for every page and feature. See /AGENTS.md.

## Foundation
- IBM Carbon Design System v11 and the official `@carbon/react` package are the sole foundational UI system.
- Use official Carbon React components and Carbon Icons for interactive controls and standard interface patterns.
- Shared wrappers may adapt existing application contracts, but must render the corresponding Carbon component rather than recreate its appearance.
- Do not add shadcn/ui, Radix UI, or a competing visual component system.
- Tailwind CSS is permitted for layout utilities only; Carbon tokens and component styles remain authoritative.

## Component policy
| Need | Required foundation |
| --- | --- |
| Actions | Carbon Button |
| Text entry | Carbon TextInput, TextArea, NumberInput |
| Selection | Carbon Select, Dropdown, ComboBox, MultiSelect, Checkbox, RadioButtonGroup, Toggle |
| Forms | Form patterns composed from Carbon components |
| Dialogs | Carbon Modal, ComposedModal |
| Menus | Carbon OverflowMenu, Menu, MenuItem |
| Navigation | Carbon Header, SideNav, Breadcrumb, ContentSwitcher only for existing local view switching |
| Data | Carbon DataTable, Table, Pagination |
| Feedback | Carbon InlineNotification, ToastNotification, ProgressBar, SkeletonText |
| Dates | Carbon DatePicker, DatePickerInput |
| Overlays | Carbon Tooltip, Popover, Toggletip, SidePanel where available |
| Disclosure | Carbon Accordion, AccordionItem |
| Layout | Carbon Grid, Column, Tile, Layer, StructuredList |
| Status | Carbon Tag, InlineLoading |

Consult current official docs for exact component names and APIs.

## Style ownership
- `globals.css` is limited to Tailwind entry/theme configuration; it must not contain page, shell, form-control, or Carbon component selectors.
- Design tokens live in `src/styles/design-tokens.css`; global resets and font defaults live in `src/styles/reset.css`.
- App shell rules belong to `src/app/layouts/app-shell.css`; shared page-frame rules belong to `src/shared/ui/page-layout.css`; feature styles belong inside their owning feature directory.
- Feature styles must use feature-owned class namespaces. Do not style native elements or Carbon internal classes globally.
- Do not override Carbon control dimensions, typography, border, radius, focus, hover, or disabled states. Use Carbon tokens for surrounding layout and surfaces.

## Design consistency
- Centralize color, radius, typography, spacing, and elevation in design tokens / CSS variables.
- Prefer semantic tokens: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, and ring.
- Avoid arbitrary one-off colors and page-specific styling exceptions.
- Establish shared density, spacing, alignment, and responsive breakpoints.
- Support themes through shared tokens rather than per-page overrides.

## Accessibility and states
- Preserve keyboard navigation and visible focus.
- Provide accessible labels and descriptions.
- Use suitable semantics for destructive actions.
- Handle loading, empty, error, disabled, hover, and focus states where relevant.
- Never communicate status by color alone.

## Exceptions
Specialized chart, map, or editor libraries may be used when necessary. Their surrounding interface must remain shadcn/ui-based. Any other exception requires explicit project-owner approval and documentation.

## Definition of done
A UI change is complete only after component compliance, responsive behavior, keyboard accessibility, state handling, and visual consistency have been reviewed.
