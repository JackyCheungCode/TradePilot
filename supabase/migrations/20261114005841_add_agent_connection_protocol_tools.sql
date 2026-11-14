alter table public.agent_connections add column if not exists protocol_tools jsonb not null default '[]'::jsonb check (jsonb_typeof(protocol_tools) = 'array');
alter table public.agent_connections add column if not exists protocol_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(protocol_metadata) = 'object');
