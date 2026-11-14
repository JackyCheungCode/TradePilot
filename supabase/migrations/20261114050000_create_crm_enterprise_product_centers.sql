create table if not exists public.crm_accounts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 account_number text, account_name text not null, legal_name text, account_type text not null default 'customer' check(account_type in ('customer','prospect','supplier','partner','competitor','other')),
 status text not null default 'active' check(status in ('active','inactive','blocked','qualified','unqualified')),
 industry text, website text, email text, phone text, fax text, country_code text, region text, city text,
 registration_number text, tax_number text, vat_number text, duns_number text,
 billing_address jsonb not null default '{}'::jsonb, shipping_address jsonb not null default '{}'::jsonb,
 currency_code text not null default 'USD', payment_terms text, incoterms_code text, incoterms_version text default '2020',
 credit_limit numeric(20,6), credit_days integer, source_lead_id uuid references public.leads(id) on delete set null,
 notes text, custom_fields jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,account_number)
);
create table if not exists public.crm_contacts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.crm_accounts(id) on delete cascade,
 first_name text not null, last_name text, full_name text, job_title text, department text,
 email text, phone text, mobile text, whatsapp text, linkedin_url text, preferred_language text,
 contact_type text default 'business', decision_role text, is_primary boolean not null default false,
 is_active boolean not null default true, notes text, custom_fields jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.crm_opportunities (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 opportunity_number text, account_id uuid not null references public.crm_accounts(id) on delete cascade,
 primary_contact_id uuid references public.crm_contacts(id) on delete set null,
 name text not null, stage text not null default 'qualification' check(stage in ('prospecting','qualification','needs_analysis','proposal','negotiation','won','lost')),
 status text not null default 'open' check(status in ('open','won','lost','cancelled')),
 amount numeric(20,6), currency_code text not null default 'USD', probability integer not null default 10 check(probability between 0 and 100),
 expected_close_date date, source text, competitor text, next_step text, description text, lost_reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.enterprise_profiles (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 legal_name text not null, trade_name text, short_name text, former_names text[] not null default '{}',
 registration_number text, tax_number text, vat_number text, eori_number text, duns_number text,
 country_code text, registration_country text, registration_authority text, established_on date, business_status text,
 industry text, business_scope text, website text, email text, phone text, fax text,
 registered_address jsonb not null default '{}'::jsonb, headquarters_address jsonb not null default '{}'::jsonb,
 mailing_address jsonb not null default '{}'::jsonb, contact_name text, contact_title text,
 default_currency text not null default 'USD', default_payment_terms text, default_incoterms text,
 logo_url text, company_size text, employee_count integer, annual_revenue numeric(20,2),
 export_license_number text, customs_registration_number text, notes text, custom_fields jsonb not null default '{}'::jsonb,
 is_default boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.enterprise_bank_accounts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 enterprise_id uuid not null references public.enterprise_profiles(id) on delete cascade,
 bank_name text not null, bank_branch text, account_name text not null, account_number text not null,
 iban text, swift_bic text, routing_number text, sort_code text, bank_code text, branch_code text,
 currency_code text, country_code text, bank_address jsonb not null default '{}'::jsonb,
 intermediary_bank jsonb not null default '{}'::jsonb, is_default boolean not null default false,
 is_active boolean not null default true, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.trade_orders add column if not exists crm_account_id uuid references public.crm_accounts(id) on delete set null;
alter table public.trade_orders add column if not exists crm_contact_id uuid references public.crm_contacts(id) on delete set null;
alter table public.trade_orders add column if not exists enterprise_profile_id uuid references public.enterprise_profiles(id) on delete set null;
alter table public.trade_orders add column if not exists opportunity_id uuid references public.crm_opportunities(id) on delete set null;
alter table public.trade_products add column if not exists category text;
alter table public.trade_products add column if not exists brand text;
alter table public.trade_products add column if not exists model_number text;
alter table public.trade_products add column if not exists barcode text;
alter table public.trade_products add column if not exists manufacturer text;
alter table public.trade_products add column if not exists purchase_unit text;
alter table public.trade_products add column if not exists sales_unit text;
alter table public.trade_products add column if not exists moq numeric(20,6);
alter table public.trade_products add column if not exists lead_time_days integer;
alter table public.trade_products add column if not exists warranty_period text;
alter table public.trade_products add column if not exists dimensions jsonb not null default '{}'::jsonb;
alter table public.trade_products add column if not exists packaging jsonb not null default '{}'::jsonb;
alter table public.trade_products add column if not exists customs_description text;
alter table public.trade_products add column if not exists notes text;
create index if not exists crm_accounts_owner_name_idx on public.crm_accounts(owner_id,account_name);
create index if not exists crm_contacts_owner_account_idx on public.crm_contacts(owner_id,account_id);
create index if not exists crm_opportunities_owner_stage_idx on public.crm_opportunities(owner_id,stage);
create index if not exists enterprise_profiles_owner_default_idx on public.enterprise_profiles(owner_id,is_default);
create index if not exists enterprise_bank_accounts_owner_enterprise_idx on public.enterprise_bank_accounts(owner_id,enterprise_id);
create index if not exists trade_orders_crm_account_idx on public.trade_orders(crm_account_id);
create index if not exists trade_orders_crm_contact_idx on public.trade_orders(crm_contact_id);
create index if not exists trade_orders_enterprise_profile_idx on public.trade_orders(enterprise_profile_id);
create index if not exists trade_orders_opportunity_idx on public.trade_orders(opportunity_id);
alter table public.crm_accounts enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_opportunities enable row level security;
alter table public.enterprise_profiles enable row level security;
alter table public.enterprise_bank_accounts enable row level security;
