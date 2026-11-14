# TradePilot Engineering Rules

These rules are mandatory for every contributor and AI coding agent in this repository.

## Product and architecture
- Build TradePilot as a highly modular, single-user-first application. Do not add multi-tenancy unless the product owner explicitly requests it.
- Keep domain logic independent from UI, infrastructure providers, and transport details.
- Prefer small, reversible, reviewable changes. Do not make destructive changes or alter production resources without explicit approval.
- Never commit secrets, API keys, service-role keys, access tokens, or private credentials.
- Put environment-specific configuration in environment variables or platform secret stores.

## Mandatory UI system: IBM Carbon Design System
- IBM Carbon Design System v11 and the official `@carbon/react` package are the exclusive foundational visual component system.
- Every page, form, dialog, menu, navigation element, table, and interactive control MUST use official Carbon React components or a documented domain component composed from Carbon.
- Use Carbon React components and Carbon Icons; do not recreate Carbon controls with native HTML or custom CSS when a Carbon component exists.
- Do not add shadcn/ui, Radix UI, or another competing visual component system.
- Tailwind CSS may be used for layout utilities only; Carbon tokens, typography, component dimensions, states, and visual behavior remain authoritative.
- Shared wrappers may preserve application-specific prop contracts but must render the corresponding Carbon component.
- Customize surrounding layout through Carbon design tokens and feature-owned layout classes. Do not override Carbon internal component selectors for typography, dimensions, border, radius, focus, hover, or disabled states.
- Preserve keyboard behavior, accessibility semantics, focus states, and responsive behavior.
- Specialized charts, maps, and editors may use dedicated libraries; their surrounding interface must remain Carbon-based.
- Native semantic HTML is allowed only where no Carbon component is appropriate and must be documented when it creates a visible control.

## Modularity rules
- Organize code by business capability / feature, not by arbitrary technical file type alone.
- Each feature owns its UI, application use-cases, domain types/rules, and feature-specific data access adapters.
- Shared code must be genuinely cross-feature; do not turn shared folders into dumping grounds.
- Enforce dependency direction: UI -> application -> domain. Infrastructure implements ports defined inward; domain must not import UI, Supabase, Cloudflare, or framework modules.
- Features communicate through explicit contracts, typed events, or application services; avoid cross-feature deep imports.
- Keep provider-specific code behind adapters. Supabase and Cloudflare SDKs must not leak into domain logic.
- Keep modules cohesive and APIs small. Avoid giant components, giant service files, circular dependencies, and hidden global state.
- Prefer explicit dependency injection at composition boundaries.
- Validate external input at module boundaries and return typed errors / result objects.
- Every module should have a clear responsibility, public entry point, and tests for important behavior.

## Required UI review
Before completing UI work, verify component compliance, responsive behavior, keyboard accessibility, loading/empty/error/disabled states, and visual consistency. Document any explicitly approved exception.

## Change and delivery discipline
- Develop on feature branches; do not make routine development commits directly to main.
- Keep commits focused and descriptive.
- Do not claim a test passed unless it was actually run and inspected.
- Do not claim deployment succeeded unless deployment status or the live endpoint was verified.
- Update relevant architecture, environment, and workflow documentation when contracts change.
