create table if not exists public.ai_provider_settings (
  id boolean primary key default true check (id = true),
  config jsonb not null default '{"defaultModel":"@cf/google/gemma-4-26b-a4b-it","taskModels":{},"providers":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ai_provider_settings enable row level security;
revoke all on public.ai_provider_settings from anon, authenticated;
grant all on public.ai_provider_settings to service_role;
