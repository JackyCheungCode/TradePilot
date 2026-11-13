# Lead Discovery — Map & Local Businesses

## Approved scope
- Navigation: first-level 潜客发现, second-level 地图与本地商家.
- Run Google Maps and OpenStreetMap adapters concurrently.
- Normalize provider results, deduplicate, and create draft leads.
- Show country/territory selection with flags and an interactive vector map.
- Persist task progress and execution logs; the UI polls real task state.
- This page was explicitly approved by the product owner on 2026-11-13. No other pages are included in this approval.

## Provider and licensing boundary
- OpenStreetMap data is retained with OSM element identity, attribution, and ODbL provenance.
- Google Places content is not copied into durable lead fields. Retain permitted Place IDs and source references only; do not use Google content as a substitute for open-source business data or display Google-derived content on a non-Google map.
- Google Maps is queried in parallel as a discovery and cross-reference source. OSM supplies durable business fields for persistent lead creation. Google-only results are logged as non-persisted candidates until a compliant data-use basis is approved.
- API keys are server-side secrets only.

## Matching and deduplication
1. Normalize website host: lowercase, strip www, remove path and query.
2. Normalize phone to E.164 when a country calling code can be resolved.
3. Match exact OSM element ID / provider external ID first.
4. Then compare normalized website, phone, and name + country + proximity.
5. Preserve all source references; never discard source provenance.

## Task lifecycle
queued -> running -> completed | partial | failed | cancelled

Each provider has an independent outcome. A provider failure does not cancel the other provider. Progress is computed from completed country/provider units, not a timer. Writes are idempotent by source identity and normalized deduplication keys.

## Data ownership
- discovery_runs, discovery_run_logs, leads, lead_sources are owned by lead-discovery.
- Every table is RLS-protected and scoped to auth.uid().
- The worker uses service credentials only after validating the caller's Supabase JWT.

## Runtime and operations
- Discovery runs execute as a Cloudflare Workflow instance keyed by the Supabase discovery run UUID. The provider calls are parallel within each country; each provider result updates persisted progress and logs.
- Workflow retries wrap the provider orchestration step. Lead upserts are idempotent by owner and deduplication key; source upserts are idempotent by provider and external identity.
- Required Worker secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY. OVERPASS_API_URL is optional.
- Required browser build variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The browser only receives the publishable/anon key; service-role and Google keys remain server-side.
- Authentication UI is not part of this page approval. The discovery API requires an existing Supabase Auth session; the page reports a sign-in error when no session exists.
