create table if not exists public.crm_contact_methods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  method_type text not null check (method_type in ('email','phone','mobile','messaging','social','website','other')),
  platform text not null default '',
  value text not null,
  label text,
  is_primary boolean not null default false,
  is_verified boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contact_methods_owner_contact_idx
  on public.crm_contact_methods(owner_id, contact_id, sort_order, created_at);
create index if not exists crm_contact_methods_owner_value_idx
  on public.crm_contact_methods(owner_id, lower(value));
create unique index if not exists crm_contact_methods_primary_idx
  on public.crm_contact_methods(contact_id, method_type, platform)
  where is_primary = true;

alter table public.crm_contact_methods enable row level security;
drop policy if exists crm_contact_methods_select_own on public.crm_contact_methods;
create policy crm_contact_methods_select_own on public.crm_contact_methods
  for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists crm_contact_methods_insert_own on public.crm_contact_methods;
create policy crm_contact_methods_insert_own on public.crm_contact_methods
  for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists crm_contact_methods_update_own on public.crm_contact_methods;
create policy crm_contact_methods_update_own on public.crm_contact_methods
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
drop policy if exists crm_contact_methods_delete_own on public.crm_contact_methods;
create policy crm_contact_methods_delete_own on public.crm_contact_methods
  for delete to authenticated using ((select auth.uid()) = owner_id);
grant select, insert, update, delete on public.crm_contact_methods to authenticated;

insert into public.crm_contact_methods
  (owner_id, contact_id, method_type, platform, value, label, is_primary)
select c.owner_id, c.id, v.method_type, v.platform, v.value, v.label, true
from public.crm_contacts c
cross join lateral (values
  ('email','email',nullif(trim(c.email),''),'工作邮箱'),
  ('phone','phone',nullif(trim(c.phone),''),'办公电话'),
  ('mobile','mobile',nullif(trim(c.mobile),''),'手机'),
  ('messaging','whatsapp',nullif(trim(c.whatsapp),''),'WhatsApp'),
  ('social','linkedin',nullif(trim(c.linkedin_url),''),'LinkedIn')
) as v(method_type, platform, value, label)
where v.value is not null
  and not exists (
    select 1 from public.crm_contact_methods m
    where m.owner_id = c.owner_id and m.contact_id = c.id
      and m.method_type = v.method_type and m.platform = v.platform and m.value = v.value
  );
