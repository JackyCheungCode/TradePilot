alter table public.discovery_runs add column if not exists search_config jsonb not null default '{}'::jsonb;
