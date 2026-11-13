# TradePilot

TradePilot is a modular market-intelligence and workflow platform.

## Platform foundations
- **GitHub** — source code, version control, review, and CI.
- **Supabase** — PostgreSQL, authentication, and data services.
- **Cloudflare Workers** — application runtime, API boundary, and deployment.
- **shadcn/ui** — mandatory foundational UI component system.

## Engineering standards
The following documents are mandatory:
- [AI and contributor rules](AGENTS.md)
- [System architecture](docs/ARCHITECTURE.md)
- [Module boundaries](docs/MODULE_BOUNDARIES.md)
- [UI standard](docs/UI_STANDARD.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Data and migrations](docs/DATA_AND_MIGRATIONS.md)
- [Quality gates](docs/QUALITY_GATES.md)
- [Development workflow](docs/DEVELOPMENT_WORKFLOW.md)

## Modularity
TradePilot uses feature-first modules with explicit domain, application, infrastructure, and presentation boundaries. Domain rules must remain independent from React, Supabase, Cloudflare, and third-party provider SDKs.

## Page approval gate
No page, layout, navigation, form, dashboard, or user-facing business control may be created or changed without the project owner's explicit approval. A general instruction to continue development is not page approval.

## Current implementation status
The repository now contains the initial engineering scaffold. See [implementation status](docs/IMPLEMENTATION_STATUS.md) for completed and unverified items. No product page has been created.

## Branches
- `main`: production baseline.
- `develop`: integration branch.
- `feat/*`, `fix/*`, `chore/*`: short-lived work branches.
