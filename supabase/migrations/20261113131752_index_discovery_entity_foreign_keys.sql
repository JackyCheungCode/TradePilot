create index if not exists discovery_records_entity_owner_fkey_idx on public.discovery_records(entity_id,owner_id) where entity_id is not null;
create index if not exists leads_entity_owner_fkey_idx on public.leads(entity_id,owner_id) where entity_id is not null;
