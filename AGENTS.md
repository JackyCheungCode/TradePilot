# TradePilot Engineering Rules

These rules are mandatory for every contributor and AI coding agent in this repository.

## Product and architecture
- Build TradePilot as a highly modular, single-user-first application. Do not add multi-tenancy unless the product owner explicitly requests it.
- Keep domain logic independent from UI, infrastructure providers, and transport details.
- Prefer small, reversible, reviewable changes. Do not make destructive changes or alter production resources without explicit approval.
- Never commit secrets, API keys, service-role keys, access tokens, or private credentials.
- Put environment-specific configuration in environment variables or platform secret stores.

## Mandatory UI system: shadcn/ui
- shadcn/ui is the exclusive foundational UI component system.
- Every page, form, dialog, menu, navigation element, table, and interactive control MUST use shadcn/ui components or business components composed from them.
- Use the official shadcn MCP server for component discovery and usage guidance when it is available in the active development environment.
- Do not introduce competing UI frameworks, including Ant Design, MUI, Chakra UI, Mantine, or Element Plus.
- Do not recreate an existing shadcn primitive or substitute native browser controls for available shadcn components.
- Business components must compose shared shadcn primitives; no parallel component system is allowed.
- Customize through shared design tokens, CSS variables, variants, and composition.
- Preserve keyboard behavior, accessibility semantics, focus states, and responsive behavior.
- Specialized charts, maps, and editors may use dedicated libraries; their surrounding interface must remain shadcn/ui-based.
- Native semantic HTML is allowed inside component implementations when needed for correct semantics and accessibility.

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
