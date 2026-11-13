# Engineering Quality Gates

A change is complete only when all applicable gates pass. Report skipped checks explicitly; never imply they passed.

## Required gates
1. **Scope** — change maps to an approved requirement and does not introduce unapproved UI/page work.
2. **Architecture** — module ownership and dependency direction comply with `ARCHITECTURE.md` and `MODULE_BOUNDARIES.md`.
3. **Types and validation** — public boundaries are typed and untrusted input is validated at runtime.
4. **Static checks** — formatting, linting, and type checking pass.
5. **Tests** — unit tests cover domain policies and use cases; integration tests cover adapters and route boundaries where applicable.
6. **Security** — no secrets in source; authorization and RLS are reviewed; errors do not leak internal details.
7. **Build** — production build succeeds using the committed lockfile.
8. **Documentation** — update contracts, module ownership, configuration examples, and operational notes when behavior changes.
9. **Deployment** — deployment status is reported only after checking the actual target environment and deployed revision.

## Test boundaries
- Domain tests must not require network access or vendor SDKs.
- Application tests should use in-memory or fake ports.
- Adapter tests should verify mapping, failure normalization, and retry behavior.
- Worker route tests should cover validation, authentication/authorization, status codes, and response envelopes.
- End-to-end tests are reserved for critical user workflows and require explicit page/UI approval before building those workflows.

## Pull request evidence
Every pull request should state:
- What changed and why.
- Which modules and contracts are affected.
- Tests and commands executed, with results.
- Security and migration impact.
- Whether UI/page work is included and, if so, the owner's explicit approval reference.
- Deployment status, or state that deployment was not performed.

## Release discipline
- Keep changes small and reviewable.
- Do not combine broad refactors with unrelated feature work.
- Do not merge to `main` without owner approval.
- Preserve a rollback path for schema and runtime changes.
