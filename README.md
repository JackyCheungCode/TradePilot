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
- [Development workflow](docs/DEVELOPMENT_WORKFLOW.md)

## Modularity
TradePilot uses feature-first modules with explicit domain, application, infrastructure, and presentation boundaries. Domain rules must remain independent from React, Supabase, Cloudflare, and third-party provider SDKs.

## Current implementation status
The repository is establishing its architecture and engineering standards. Application scaffolding, database schema, authentication, and automated deployment will be introduced incrementally after the foundation is reviewed and verified.

## Branches
- `main`: production baseline.
- `develop`: integration branch.
- `feat/*`, `fix/*`, `chore/*`: short-lived work branches.
