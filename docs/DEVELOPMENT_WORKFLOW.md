# TradePilot Development Workflow

## Branch policy
- main is the production baseline.
- develop is the integration branch.
- Feature work uses short-lived branches from develop, named feat/<area>-<short-description>, fix/<area>-<short-description>, or chore/<short-description>.
- Merge feature branches into develop via pull request after checks pass.
- Promote develop to main only after explicit release review.

## Definition of done
- Requirements and affected module boundaries are clear.
- Code is typed, formatted, linted, and tested.
- UI changes comply with shadcn/ui and docs/UI_STANDARD.md.
- No secrets or unsafe privileged credentials are exposed.
- Database changes include reviewed migrations and appropriate RLS.
- Docs and environment variable examples are updated.
- Deployment claims are backed by a verified build / deployment / endpoint result.

## Commit discipline
Use focused conventional-style messages, for example:
- chore(architecture): define module boundaries
- feat(discovery): add query configuration
- fix(tasks): handle failed provider responses

## Review checklist
- Does the change belong to one bounded feature?
- Are dependencies pointing in the correct direction?
- Are public contracts explicit and typed?
- Are provider integrations hidden behind adapters?
- Are loading, empty, error, and success states covered?
- Are tests meaningful and reproducible?
