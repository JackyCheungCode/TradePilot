create extension if not exists pgcrypto;

create table public.discovery_runs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 query text not null check (length(trim(query)) > 0),
 countries text[] not null check (cardinality(countries) > 0),
 limit_per_country integer not null check (limit_per_country between 1 and 500),
 status text not null default 'queued' check (status in ('queued','running','completed','partial','failed','cancelled')),
 progress integer not null default 0 check (progress between 0 and 100),
 discovered_count integer not null default 0 check (discovered_count >= 0),
 created_lead_count integer not null default 0 check (created_lead_count >= 0),
 message text not null default '任务已排队',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index discovery_runs_owner_created_idx on public.discovery_runs(owner_id, created_at desc);

create table public.discovery_run_logs (
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null references public.discovery_runs(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 level text not null check (level in ('info','success','warning','error')),
 message text not null,
 created_at timestamptz not null default now()
);
create index discovery_run_logs_run_created_idx on public.discovery_run_logs(run_id, created_at);

create table public.leads (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 country_code char(2) not null,
 address text,
 phone text,
 website text,
 latitude double precision,
 longitude double precision,
 status text not null default 'draft' check (status in ('draft','review','qualified','rejected')),
 dedupe_key text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id, dedupe_key),
 check (latitude is null or (latitude between -90 and 90)),
 check (longitude is null or (longitude between -180 and 180))
);
create index leads_owner_status_created_idx on public.leads(owner_id, status, created_at desc);
create index leads_owner_country_idx on public.leads(owner_id, country_code);

create table public.lead_sources (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.leads(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check (provider in ('google_maps','openstreetmap')),
 external_id text not null,
 source_url text,
 license text,
 attribution text,
 metadata jsonb not null default '{}'::jsonb,
 captured_at timestamptz not null default now(),
 unique(provider, external_id)
);
create index lead_sources_lead_idx on public.lead_sources(lead_id);

alter table public.discovery_runs enable row level security;
alter table public.discovery_run_logs enable row level security;
alter table public.leads enable row level security;
alter table public.lead_sources enable row level security;

create policy "owners manage discovery runs" on public.discovery_runs for all to authenticated
 using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners manage discovery logs" on public.discovery_run_logs for all to authenticated
 using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners manage leads" on public.leads for all to authenticated
 using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners manage lead sources" on public.lead_sources for all to authenticated
 using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.discovery_runs to authenticated;
grant select, insert, update, delete on public.discovery_run_logs to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.lead_sources to authenticated;
