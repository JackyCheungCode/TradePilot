create table if not exists public.discovery_contact_enrichment_runs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 record_ids uuid[] not null check(cardinality(record_ids) between 1 and 50),
 status text not null default 'queued' check(status in ('queued','running','completed','partial','failed')),
 progress integer not null default 0 check(progress between 0 and 100),
 completed_count integer not null default 0 check(completed_count>=0),
 failed_count integer not null default 0 check(failed_count>=0),
 message text not null default '联系方式采集任务已排队',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists discovery_contact_enrichment_owner_created_idx on public.discovery_contact_enrichment_runs(owner_id,created_at desc);
alter table public.discovery_contact_enrichment_runs enable row level security;
create policy "Owners read contact enrichment runs" on public.discovery_contact_enrichment_runs for select to authenticated using ((select auth.uid())=owner_id);
grant select on public.discovery_contact_enrichment_runs to authenticated;
grant select,insert,update,delete on public.discovery_contact_enrichment_runs to service_role;
