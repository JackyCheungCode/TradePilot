create table if not exists public.agent_connections (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 2 and 120),
 protocol text not null check (protocol in ('rest_api','mcp','webhook')),
 endpoint_url text not null check (char_length(endpoint_url) between 8 and 2048),
 auth_mode text not null default 'none' check (auth_mode in ('none','bearer','header','oauth2','webhook_secret')),
 encrypted_credentials text, capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(capabilities) = 'array'),
 status text not null default 'pending' check (status in ('pending','active','error','disabled')),
 last_tested_at timestamptz, last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists agent_connections_owner_created_idx on public.agent_connections(owner_id,created_at desc);
create table if not exists public.agent_runs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 connection_id uuid references public.agent_connections(id) on delete set null,
 parent_run_id uuid references public.agent_runs(id) on delete set null,
 agent_key text not null check (char_length(agent_key) between 2 and 100),
 goal text not null check (char_length(goal) between 2 and 10000),
 status text not null default 'planned' check (status in ('planned','queued','running','awaiting_approval','succeeded','failed','cancelled')),
 plan jsonb not null default '{}'::jsonb, result jsonb, error_message text,
 estimated_cost_usd numeric(12,4), actual_cost_usd numeric(12,4), started_at timestamptz, completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists agent_runs_owner_created_idx on public.agent_runs(owner_id,created_at desc);
create index if not exists agent_runs_parent_idx on public.agent_runs(parent_run_id);
create table if not exists public.agent_run_events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 run_id uuid not null references public.agent_runs(id) on delete cascade,
 event_type text not null check (char_length(event_type) between 2 and 80),
 message text not null check (char_length(message) between 1 and 4000), payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists agent_run_events_run_created_idx on public.agent_run_events(run_id,created_at asc);
create table if not exists public.agent_approvals (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 run_id uuid not null references public.agent_runs(id) on delete cascade,
 action_type text not null check (action_type in ('send_email','bulk_import','bulk_update','delete_records','merge_records')),
 operation_snapshot jsonb not null, snapshot_sha256 text not null check (snapshot_sha256 ~ '^[a-f0-9]{64}$'),
 status text not null default 'pending' check (status in ('pending','approved','rejected','expired','executed','execution_failed')),
 decision_note text, decided_at timestamptz, expires_at timestamptz not null default (now()+interval '24 hours'),
 executed_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists agent_approvals_owner_status_idx on public.agent_approvals(owner_id,status,created_at desc);
create index if not exists agent_approvals_run_idx on public.agent_approvals(run_id);
alter table public.agent_connections enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_run_events enable row level security;
alter table public.agent_approvals enable row level security;
revoke all on public.agent_connections,public.agent_runs,public.agent_run_events,public.agent_approvals from anon,authenticated;
grant select,insert,update,delete on public.agent_connections,public.agent_runs,public.agent_run_events,public.agent_approvals to service_role;
