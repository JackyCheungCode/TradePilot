create table if not exists public.trade_document_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  document_type text not null,
  locale text not null default 'en',
  description text not null default '',
  is_default boolean not null default false,
  is_active boolean not null default true,
  template_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_document_templates_name_length check (char_length(name) between 1 and 120),
  constraint trade_document_templates_document_type_length check (char_length(document_type) between 1 and 80)
);

create unique index if not exists trade_document_templates_owner_type_name_uidx
  on public.trade_document_templates(owner_id, document_type, lower(name));
create unique index if not exists trade_document_templates_one_default_uidx
  on public.trade_document_templates(owner_id, document_type)
  where is_default = true and is_active = true;
create index if not exists trade_document_templates_owner_updated_idx
  on public.trade_document_templates(owner_id, updated_at desc);

alter table public.trade_document_templates enable row level security;

alter table public.trade_documents
  add constraint trade_documents_template_id_fkey
  foreign key (template_id) references public.trade_document_templates(id) on delete set null;

create index if not exists trade_documents_template_id_idx
  on public.trade_documents(template_id)
  where template_id is not null;
