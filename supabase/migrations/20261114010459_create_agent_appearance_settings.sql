create table if not exists public.agent_appearance_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb not null default '{"default":{"shape":"mochi","color":"cream","styleId":"vector","variant":"soft","face":"cute"},"agents":{}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.agent_appearance_settings enable row level security;
revoke all on table public.agent_appearance_settings from anon, authenticated;
grant select, insert, update, delete on table public.agent_appearance_settings to service_role;
