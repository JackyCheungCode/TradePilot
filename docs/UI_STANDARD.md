# TradePilot UI Standard

## Authority
This is the mandatory UI standard for every page and feature. See /AGENTS.md.

## Foundation
- shadcn/ui is the only foundational component system.
- Install and maintain components with the shadcn CLI; keep generated primitives in the configured shared UI directory.
- Use the official shadcn MCP server for discovery and current component guidance when available.
- Do not introduce a competing UI framework or duplicate primitives.

## Component policy
| Need | Required foundation |
| --- | --- |
| Actions | Button |
| Text entry | Input, Textarea |
| Selection | Select, Combobox, Checkbox, Radio Group, Switch |
| Forms | Form patterns composed from shadcn components |
| Dialogs | Dialog, Alert Dialog |
| Menus | Dropdown Menu, Context Menu |
| Navigation | Sidebar, Navigation Menu, Breadcrumb, Menubar |
| Data | Table; compose Data Table patterns for advanced workflows |
| Feedback | Sonner, Alert, Progress, Skeleton |
| Dates | Calendar, Date Picker |
| Overlays | Popover, Tooltip, Sheet |
| Disclosure | Collapsible, Accordion |
| Layout | Card, Separator, Scroll Area, Resizable |
| Status | Badge |

Consult current official docs for exact component names and APIs.

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
