## Summary
Describe the change and the user-facing outcome.

## Module boundaries
- [ ] Change is contained within the appropriate feature/module.
- [ ] Cross-feature dependencies use public contracts; no deep imports.
- [ ] Domain/application logic does not depend on UI or vendor SDKs.

## UI compliance (when UI changes)
- [ ] Uses shadcn/ui or approved compositions of shadcn/ui.
- [ ] No competing UI framework or duplicate primitive introduced.
- [ ] Loading, empty, error, disabled, and responsive states are covered.
- [ ] Keyboard accessibility and visible focus are verified.

## Quality and security
- [ ] Tests, lint, and type checks were run; results are included below.
- [ ] No secrets or privileged keys are committed or exposed.
- [ ] Database changes include reviewed migrations and appropriate RLS.
- [ ] Relevant documentation and environment examples are updated.

## Verification
List commands run and their actual results.

## Exceptions
List any exception to the UI or architecture standards and link to explicit approval.
