create index discovery_run_logs_owner_created_idx on public.discovery_run_logs(owner_id, created_at desc);
create index lead_sources_owner_idx on public.lead_sources(owner_id);
