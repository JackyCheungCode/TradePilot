# TradePilot Module Boundaries

## 1. Organization principle
Organize by business capability (feature-first), with clear internal layers. A feature is independently understandable and testable. Shared modules contain only stable cross-feature capabilities.

## 2. Target repository layout
\`\`\`text
src/
  app/
    bootstrap/
    providers/
    router/
    layouts/
  features/
    <feature>/
      domain/
        entities/
        value-objects/
        policies/
        errors/
      application/
        use-cases/
        ports/
        dto/
      infrastructure/
        adapters/
        mappers/
      presentation/
        pages/
        components/
        hooks/
      index.ts
  shared/
    ui/                 # shadcn primitives only
    components/         # reusable compositions, not business features
    lib/
    validation/
    types/
    config/
  styles/
    globals.css

worker/
  src/
    routes/
    middleware/
    bindings/
    composition/
    index.ts

supabase/
  migrations/
  seed/

tests/
  architecture/
  integration/
  e2e/

docs/
\`\`\`

## 3. Initial feature domains (provisional)
- market-discovery: query setup, source selection, discovery runs, result review.
- source-connectors: external search / commerce / social / data provider adapters.
- intelligence: normalization, enrichment, deduplication, scoring, evidence.
- workspaces: user preferences and saved work context (single-user scope initially).
- task-orchestration: task lifecycle, queue / scheduling abstractions, progress events.
- reports: result views, exports, and analytical summaries.
- settings: provider configuration, credentials metadata, and system preferences.

These are bounded contexts, not a mandate to build all features immediately. Start with the smallest vertical slice and split a module only when it has a distinct domain responsibility.

## 4. Import rules
- Cross-feature imports must use the feature's public index.ts exports.
- No deep imports into another feature's internal folders.
- Domain imports only domain-level shared types/utilities and must remain vendor-independent.
- Application code depends on domain and declared ports, not concrete adapters.
- Infrastructure adapters may depend on vendor SDKs and implement application ports.
- Presentation may call application use-cases through feature facades/hooks; it must not issue raw database queries.
- Worker routes call application services; they must not embed business rules.
- Shared UI primitives are presentation-only and must not import feature modules.

## 5. Module contract
Every feature documents responsibility, explicit non-responsibilities, public API and data contracts, owned tables / migrations, external provider dependencies, authorization and data-access policy, error model and observability, and unit / integration tests.

## 6. Anti-patterns
- Giant utils, services, components, or api folders.
- Circular dependencies and cross-feature deep imports.
- Direct Supabase queries from UI components.
- Provider SDK imports in domain or application business rules.
- Hidden singleton state shared across unrelated features.
- One endpoint or page coordinating unrelated business capabilities.
