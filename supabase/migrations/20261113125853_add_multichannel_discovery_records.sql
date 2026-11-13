alter table public.discovery_runs
  add column if not exists task_code text,
  add column if not exists channel text not null default 'map_local_businesses',
  add column if not exists state text,
  add column if not exists city text,
  add column if not exists providers text[] not null default array['google_maps','openstreetmap']::text[];
update public.discovery_runs set task_code = 'MAP-' || coalesce(countries[1], 'XX') || '-' || to_char(created_at at time zone 'UTC', 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 6)) where task_code is null;
alter table public.discovery_runs alter column task_code set not null;
create unique index if not exists discovery_runs_owner_task_code_uidx on public.discovery_runs(owner_id, task_code);
create index if not exists discovery_runs_owner_created_idx on public.discovery_runs(owner_id, created_at desc);
create table if not exists public.discovery_records (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 channel text not null default 'map_local_businesses', record_type text not null default 'business', name text not null,
 country_code char(2), address text, phone text, website text, latitude double precision check(latitude is null or latitude between -90 and 90),
 longitude double precision check(longitude is null or longitude between -180 and 180), dedupe_key text not null,
 status text not null default 'new' check(status in ('new','removed','discarded','promoted')), raw_data jsonb not null default '{}'::jsonb,
 lead_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,channel,dedupe_key), unique(owner_id,id), foreign key(lead_id,owner_id) references public.leads(id,owner_id)
);
create table if not exists public.discovery_record_occurrences (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 record_id uuid not null, run_id uuid not null, provider text not null, keyword text not null, external_id text,
 source_url text, license text, attribution text, raw_data jsonb not null default '{}'::jsonb, captured_at timestamptz not null default now(),
 foreign key(record_id,owner_id) references public.discovery_records(id,owner_id) on delete cascade,
 foreign key(run_id,owner_id) references public.discovery_runs(id,owner_id) on delete cascade,
 unique(owner_id,run_id,provider,external_id)
);
create index if not exists discovery_records_owner_channel_created_idx on public.discovery_records(owner_id,channel,created_at desc);
create index if not exists discovery_records_owner_status_idx on public.discovery_records(owner_id,status);
create index if not exists discovery_occurrences_record_idx on public.discovery_record_occurrences(owner_id,record_id);
create index if not exists discovery_occurrences_run_idx on public.discovery_record_occurrences(owner_id,run_id,captured_at desc);
alter table public.discovery_records enable row level security;
alter table public.discovery_record_occurrences enable row level security;
create policy "Users can read own discovery records" on public.discovery_records for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users can read own discovery occurrences" on public.discovery_record_occurrences for select to authenticated using ((select auth.uid()) = owner_id);
grant select on public.discovery_records,public.discovery_record_occurrences to authenticated;
grant select,insert,update,delete on public.discovery_records,public.discovery_record_occurrences to service_role;
alter table public.leads add column if not exists is_formal boolean not null default false;
alter table public.leads add column if not exists discovery_record_id uuid;
create unique index if not exists leads_owner_discovery_record_uidx on public.leads(owner_id,discovery_record_id) where discovery_record_id is not null;
