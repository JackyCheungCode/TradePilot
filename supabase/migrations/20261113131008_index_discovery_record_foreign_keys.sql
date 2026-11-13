create index if not exists discovery_occurrences_record_owner_fkey_idx on public.discovery_record_occurrences(record_id, owner_id);
create index if not exists discovery_occurrences_run_owner_fkey_idx on public.discovery_record_occurrences(run_id, owner_id);
create index if not exists discovery_records_lead_owner_fkey_idx on public.discovery_records(lead_id, owner_id) where lead_id is not null;
create index if not exists leads_discovery_record_owner_fkey_idx on public.leads(discovery_record_id, owner_id) where discovery_record_id is not null;
