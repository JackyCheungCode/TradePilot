create table public.discovery_entities (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 entity_type text not null default 'business',
 display_name text not null,
 dedupe_key text not null,
 attributes jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,id),
 unique(owner_id,dedupe_key)
);
alter table public.discovery_entities enable row level security;
create policy "Users can read own discovery entities" on public.discovery_entities for select to authenticated using ((select auth.uid())=owner_id);
grant select on public.discovery_entities to authenticated;
grant select,insert,update,delete on public.discovery_entities to service_role;
alter table public.discovery_records add column entity_id uuid;
alter table public.discovery_records add constraint discovery_records_entity_owner_fkey foreign key(entity_id,owner_id) references public.discovery_entities(id,owner_id);
alter table public.leads add column entity_id uuid;
alter table public.leads add constraint leads_entity_owner_fkey foreign key(entity_id,owner_id) references public.discovery_entities(id,owner_id);
