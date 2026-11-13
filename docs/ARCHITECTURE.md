# TradePilot System Architecture

## 1. Goals
TradePilot is a modular market-intelligence and workflow platform. The architecture must support independent feature development, replaceable providers, testable business rules, and gradual expansion without coupling the whole system to one page, API, or vendor.

Initial product assumptions:
- Single-user application; no tenant abstraction until explicitly requested.
- GitHub is the source of truth for code and version history.
- Supabase provides PostgreSQL, authentication, and data services.
- Cloudflare Workers provides the application runtime, API boundary, and deployment surface.
- shadcn/ui is the mandatory foundational UI system.

## 2. Proposed technology baseline
- Frontend: React + TypeScript + Vite.
- UI: shadcn/ui, Tailwind CSS, Radix primitives as used by shadcn, Lucide icons.
- Validation / contracts: Zod and shared TypeScript types.
- Backend runtime: Cloudflare Workers with typed request handlers.
- Data and auth: Supabase PostgreSQL and Supabase Auth.
- Tests: Vitest for unit / integration tests; browser-level tests to be selected when app bootstrap is implemented.
- Package manager: npm with committed lockfile, unless the repository owner approves a change.

This is the proposed baseline; implementation must verify current platform compatibility and pin dependency versions before installation.

## 3. Logical layers
1. Presentation: routes, screens, feature components, shared shadcn primitives.
2. Application: use-cases, orchestration, input/output DTOs, authorization checks.
3. Domain: business entities, value objects, invariants, policies; framework/provider independent.
4. Ports: interfaces for persistence, search providers, AI providers, clock, and external services.
5. Adapters: Supabase repositories, Cloudflare bindings, external API clients, provider integrations.
6. Runtime composition: Worker entry point, dependency wiring, environment validation, request routing.

Dependency direction is inward: presentation -> application -> domain. Adapters implement ports and are wired at runtime. Domain must not import framework, UI, Supabase, Cloudflare SDKs, or vendor SDKs.

## 4. Deployment topology
- Browser assets are built as a static frontend and served through Cloudflare Workers Static Assets.
- Worker routes provide server-side API endpoints and keep privileged credentials off the browser.
- Supabase is accessed from the browser only with a publishable/anon key and appropriate RLS; privileged operations go through trusted server-side code.
- Secrets are configured in Cloudflare Worker secrets / environment settings, never committed.
- GitHub branches and CI are the change-control and build pipeline. Production deployment is not considered configured until verified.

## 5. Cross-cutting requirements
- Validate environment variables at startup.
- Validate and normalize all untrusted inputs at boundaries.
- Use structured logs with request / task correlation IDs; never log credentials or sensitive payloads.
- Use explicit timeouts, retries with bounded backoff, and idempotency for external provider calls where appropriate.
- Centralize error mapping and API response envelopes.
- Add observability and health endpoints before enabling long-running workflows.
- Apply least privilege and RLS to every exposed Supabase table.
- Keep migrations versioned in the repository.
