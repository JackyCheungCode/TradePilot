create table if not exists public.agent_workflows (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 2 and 120),
 description text not null default '',
 enabled boolean not null default false,
 definition jsonb not null default '{"steps":[]}'::jsonb check (jsonb_typeof(definition)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists agent_workflows_owner_updated_idx on public.agent_workflows(owner_id,updated_at desc);
alter table public.agent_workflows enable row level security;
revoke all on public.agent_workflows from anon,authenticated;
grant select,insert,update,delete on public.agent_workflows to service_role;