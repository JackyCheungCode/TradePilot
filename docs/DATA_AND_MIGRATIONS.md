# Data Ownership and Migration Standards

## Data ownership
- Supabase PostgreSQL is the system of record for durable application data.
- Domain and application layers own business meaning; database schemas are persistence details.
- Every table must have a documented owning feature/module.
- Cross-feature reads should go through an application query/use-case contract, not direct imports of another feature's infrastructure.
- Avoid duplicating authoritative data. Store external identifiers and provenance when integrating third-party sources.

## Schema design
- Use explicit primary keys, foreign keys, uniqueness constraints, and check constraints where they protect business invariants.
- Add indexes based on known query patterns and measured needs, not speculatively.
- Use UTC timestamps and consistent naming conventions.
- Model lifecycle state explicitly; do not overload nullable columns to represent multiple unrelated states.
- Store money as integer minor units plus an ISO currency code, or use a deliberate fixed-precision numeric representation. Never use floating-point for money.
- Store raw provider payloads only when justified by traceability or reprocessing needs; define retention and size limits.

## Migrations
- All schema changes must be committed as ordered SQL migrations under `supabase/migrations/`.
- Never make undocumented manual production schema changes.
- Migrations must be deterministic, reviewable, and safe to run in CI.
- Prefer expand-and-contract for changes that affect deployed code.
- Destructive changes require an explicit backup/recovery plan and owner approval.
- Seed data must be deterministic and must never contain real credentials or personal secrets.
- Test migrations against a clean database and, where practical, against a representative existing schema.

## Access and security
- Enable Row Level Security for tables exposed through Supabase APIs.
- Policies must be deny-by-default and scoped to the authenticated single-user model.
- Do not assume a frontend-hidden control is an authorization boundary.
- Service-role credentials must never reach browser code.
- Privileged writes and external-provider secrets belong in trusted server-side execution.
- Keep authorization checks in application use cases or trusted route middleware, not only in UI logic.

## Data lifecycle
- Define retention, deletion, and export behavior for user-generated and imported data.
- Preserve source, collection time, and transformation provenance for intelligence records.
- Make long-running collection jobs resumable and safe against duplicate execution.
