alter table public.discovery_record_occurrences add column if not exists is_removed boolean not null default false;
create index if not exists discovery_occurrences_owner_visible_idx on public.discovery_record_occurrences(owner_id,is_removed,run_id,record_id);
