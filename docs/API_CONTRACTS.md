# API and Contract Standards

## Purpose
Define stable contracts between the browser application, Cloudflare Worker routes, application use cases, and Supabase adapters. Business features must not depend on transport or vendor-specific response shapes.

## Contract ownership
- Domain types describe business concepts and invariants; they do not import Zod, HTTP, Supabase, or Cloudflare types.
- Application DTOs describe use-case inputs and outputs.
- Boundary schemas validate untrusted input at runtime. Zod is the proposed schema library and must be used consistently if the documented stack is adopted.
- Worker route handlers translate HTTP requests into application commands and translate application results into HTTP responses.
- Infrastructure adapters map vendor data into domain/application types.

## HTTP conventions
- Use `/api/v1` for versioned application endpoints.
- Use resource-oriented nouns and standard HTTP methods.
- Use `GET` for reads; `POST` for commands or resource creation; `PATCH` for partial updates; `DELETE` for deletion.
- Never encode secrets or sensitive values in URLs.
- Validate path parameters, query parameters, headers, and request bodies at the boundary.
- Enforce request size limits and explicit timeouts for external calls.
- Use pagination for collections. Prefer cursor pagination for changing or large datasets.
- Use ISO 8601 UTC timestamps and explicit currency/measurement units.

## Response envelope
Successful responses should use a consistent envelope:
```json
{
  "data": {},
  "meta": {
    "requestId": "opaque-request-id"
  }
}
```

Errors should use a stable machine-readable shape:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [],
    "requestId": "opaque-request-id"
  }
}
```
Do not expose stack traces, SQL, provider credentials, internal hostnames, or raw upstream error bodies to clients.

## Error codes
- Use stable uppercase codes, not human-readable messages, for client branching.
- Distinguish validation, authentication, authorization, conflict, rate-limit, upstream, timeout, and internal errors.
- Keep user-facing messages safe and actionable.
- Preserve the original cause in server-side structured logs.

## Reliability
- Generate or propagate a request correlation ID for every request.
- Retry only transient failures and only when the operation is safe to retry.
- Commands with side effects must define idempotency behavior.
- Apply bounded retries with backoff and jitter; never retry indefinitely.
- External provider calls must have explicit timeouts and normalized errors.

## Contract change policy
- Treat API DTOs and persisted event shapes as versioned contracts.
- Prefer additive changes. Document breaking changes and migrate consumers deliberately.
- Add contract tests for every externally consumed route.
- Do not expose database table rows directly as public API responses.
