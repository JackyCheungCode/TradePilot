create table if not exists public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  agent_key text not null check (agent_key in ('buyer_development','market_research','company_research','lead_scoring','multilingual_sales','follow_up','trade_compliance')),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,agent_key)
);
create index if not exists agent_profiles_owner_idx on public.agent_profiles(owner_id);
alter table public.agent_profiles enable row level security;
revoke all on public.agent_profiles from anon,authenticated;
grant select,insert,update,delete on public.agent_profiles to service_role;
