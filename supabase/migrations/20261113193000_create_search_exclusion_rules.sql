create table if not exists public.search_exclusion_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category_key text not null check (category_key ~ '^[a-z][a-z0-9_]{1,48}$'),
  category_label text not null check (length(trim(category_label)) between 1 and 80),
  domains text[] not null default '{}'::text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, category_key)
);
create index if not exists search_exclusion_rules_owner_idx
  on public.search_exclusion_rules(owner_id, category_key);
alter table public.search_exclusion_rules enable row level security;
create policy "Owners can read own search exclusion rules"
  on public.search_exclusion_rules for select to authenticated
  using ((select auth.uid()) = owner_id);
grant select on public.search_exclusion_rules to authenticated;
grant select, insert, update, delete on public.search_exclusion_rules to service_role;
