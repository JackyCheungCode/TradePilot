# Lead discovery channels

TradePilot keeps one fixed navigation entry per discovery channel. Search executions are records inside a channel, not sidebar entries.

## Current channel

- `map_local_businesses`: Google Maps and OpenStreetMap adapters.
- The selected providers are stored on each `discovery_runs` row.
- Task IDs use a readable channel/country/date/unique-suffix form (for example `MAP-DE-20261113-ABC123`); the UUID remains the relational primary key.

## Data model

- `discovery_runs`: one search execution, its keyword, target geography, providers, task code, progress and logs.
- `discovery_records`: one canonical discovered entity per owner + channel + dedupe key.
- `discovery_record_occurrences`: each task/provider/keyword occurrence, including external ID, source URL, attribution, license and raw provider metadata.
- `leads`: formal CRM records only when `is_formal = true`; `discovery_record_id` makes promotion idempotent.

A canonical record can be found by many tasks and providers. Do not overwrite occurrence evidence when merging records. Provider-specific payloads belong in JSONB and source occurrence rows.

## Result operations

- Remove in a task-specific result view sets `discovery_record_occurrences.is_removed` only for that task. It does not delete raw evidence or hide the same entity from other tasks.
- Remove in the cross-task aggregate hides the canonical record from that channel's result center by setting record status to `removed`.
- Discard marks the canonical record `discarded` for that channel.
- Promote creates one formal CRM lead and links it back to the discovery record. Repeated promotion returns the existing lead.

## API

- `POST /api/v1/discovery-runs`
- `GET /api/v1/discovery-runs`
- `GET /api/v1/discovery-runs/:id`
- `GET /api/v1/discovery-records?runId=:id` (omit runId for channel aggregate)
- `POST /api/v1/discovery-records/:id/action` with `remove | discard | promote`
- `GET /api/v1/leads`

## Adding a channel

A future channel should add its own search adapter and presentation workspace while reusing task lifecycle, occurrence storage, source evidence, canonical records and CRM promotion. Channel-specific fields stay in `raw_data` or a typed extension owned by that channel. Do not add per-task sidebar items or a separate CRM.
