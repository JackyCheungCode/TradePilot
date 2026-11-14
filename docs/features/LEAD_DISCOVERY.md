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

## Production deployment
- The **Deploy TradePilot** GitHub Actions workflow runs on pushes to this approved feature branch. After the three repository secrets below are configured, the next push will build, verify, upload Worker secrets, and deploy Worker + Static Assets.
- Required GitHub Actions secrets:
  - `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with Workers Scripts Edit (Editor access for the TradePilot Worker); keep it in GitHub Actions secrets.
  - `SUPABASE_SERVICE_ROLE_KEY`: the project's server-side service role key; never expose it to browser code.
  - `GOOGLE_MAPS_API_KEY`: a server-side Google Places API key with Places API (New) enabled and billing/quota configured.
- The workflow builds the SPA with the public Supabase URL/publishable key, uploads the two Worker secrets to Cloudflare, then deploys Worker + Static Assets and the Workflow binding.
- Supabase URL and publishable key are public client configuration and are declared in `wrangler.jsonc`; service role and Google keys are only set as Worker secrets.
- The deploy workflow does not run on every push and does not merge the feature branch into `develop` or `main`.


## Settings and integrations

The Settings → Integrations page manages three runtime credentials:
- `CLOUDFLARE_API_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_MAPS_API_KEY`

After the application is bootstrapped, an authenticated user can submit these values through the Worker settings API. The Worker validates the Cloudflare token and writes all three values to Cloudflare Worker Secrets using the bulk secret endpoint. Secret values are never returned to the browser; the page displays configuration state only. Subsequent rotations can leave unchanged fields blank.

### First deployment bootstrap

A one-time deployment is required before the browser settings page exists. Run the **Deploy TradePilot** GitHub Actions workflow manually after adding only `CLOUDFLARE_API_TOKEN` as a GitHub Actions repository secret. The initial deployment does not require the Supabase service role or Google Maps key in GitHub. Once deployed, enter all three runtime credentials in TradePilot → System Settings → Integrations. The Cloudflare token remains available in GitHub Actions for later code deployments and is also stored as a Worker secret so the application can rotate its own runtime configuration.
