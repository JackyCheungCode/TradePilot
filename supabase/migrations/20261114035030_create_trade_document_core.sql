create table public.trade_parties (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 party_type text not null check (party_type in ('company','customer','supplier','carrier','bank','other')),
 legal_name text not null check (char_length(trim(legal_name)) between 1 and 240), display_name text, country_code text,
 registration_number text, tax_number text, email text, phone text, website text,
 address jsonb not null default '{}'::jsonb check (jsonb_typeof(address)='object'),
 contact_person jsonb not null default '{}'::jsonb check (jsonb_typeof(contact_person)='object'),
 notes text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,id)
);
create index trade_parties_owner_type_idx on public.trade_parties(owner_id,party_type,updated_at desc);
create index trade_parties_owner_name_idx on public.trade_parties(owner_id,legal_name);

create table public.trade_products (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 sku text, name text not null check (char_length(trim(name)) between 1 and 240), description text,
 specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications)='object'),
 hs_code text, origin_country_code text, unit text not null default 'pcs', default_currency text,
 default_unit_price numeric(20,6) check (default_unit_price is null or default_unit_price >= 0),
 net_weight numeric(18,6) check (net_weight is null or net_weight >= 0), gross_weight numeric(18,6) check (gross_weight is null or gross_weight >= 0),
 weight_unit text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,id)
);
create unique index trade_products_owner_sku_unique on public.trade_products(owner_id,lower(sku)) where sku is not null and trim(sku)<>'';
create index trade_products_owner_name_idx on public.trade_products(owner_id,name);

create table public.trade_orders (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 order_number text not null, order_type text not null check (order_type in ('sales','purchase')),
 title text not null check (char_length(trim(title)) between 1 and 240),
 status text not null default 'draft' check (status in ('draft','active','completed','cancelled','archived')),
 seller_party_id uuid, buyer_party_id uuid, supplier_party_id uuid, currency_code text not null default 'USD',
 payment_terms text, incoterms_code text, incoterms_version text default '2020', named_place text, trade_date date, delivery_date date,
 origin_location text, destination_location text, shipping jsonb not null default '{}'::jsonb check (jsonb_typeof(shipping)='object'),
 packaging jsonb not null default '{}'::jsonb check (jsonb_typeof(packaging)='object'), notes text,
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,id), unique(owner_id,order_number),
 foreign key(owner_id,seller_party_id) references public.trade_parties(owner_id,id),
 foreign key(owner_id,buyer_party_id) references public.trade_parties(owner_id,id),
 foreign key(owner_id,supplier_party_id) references public.trade_parties(owner_id,id)
);
create index trade_orders_owner_updated_idx on public.trade_orders(owner_id,updated_at desc);
create index trade_orders_owner_type_status_idx on public.trade_orders(owner_id,order_type,status);

create table public.trade_order_items (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid not null, product_id uuid, line_number integer not null check (line_number > 0), sku text,
 product_name text not null, description text, hs_code text, origin_country_code text,
 quantity numeric(20,6) not null check (quantity > 0), unit text not null default 'pcs',
 unit_price numeric(20,6) not null default 0 check (unit_price >= 0),
 discount_amount numeric(20,6) not null default 0 check (discount_amount >= 0),
 tax_rate numeric(9,6) not null default 0 check (tax_rate >= 0), net_weight numeric(18,6), gross_weight numeric(18,6), weight_unit text,
 amount numeric(20,6) generated always as (round(quantity * unit_price - discount_amount,6)) stored,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(owner_id,order_id) references public.trade_orders(owner_id,id) on delete cascade,
 foreign key(owner_id,product_id) references public.trade_products(owner_id,id),
 unique(owner_id,order_id,line_number), check (discount_amount <= quantity * unit_price)
);
create index trade_order_items_owner_order_idx on public.trade_order_items(owner_id,order_id,line_number);

create table public.trade_documents (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid not null,
 document_type text not null check (document_type in ('quotation','proforma_invoice','sales_contract','sales_confirmation','request_for_quotation','purchase_order','purchase_confirmation','commercial_invoice','tax_invoice','credit_note','debit_note','packing_list','shipping_instructions','shipper_letter_instruction','vgm_declaration','packing_declaration','origin_declaration','origin_certificate_application','non_asbestos_declaration','bill_of_exchange')),
 document_number text not null, title text not null,
 status text not null default 'draft' check (status in ('draft','review','approved','issued','void','archived')),
 locale text not null default 'en', currency_code text not null default 'USD', source_document_id uuid, template_id uuid,
 current_version integer not null default 1 check (current_version > 0),
 content jsonb not null default '{}'::jsonb check (jsonb_typeof(content)='object'),
 totals jsonb not null default '{}'::jsonb check (jsonb_typeof(totals)='object'),
 issued_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,id), unique(owner_id,document_number),
 foreign key(owner_id,order_id) references public.trade_orders(owner_id,id) on delete cascade,
 foreign key(owner_id,source_document_id) references public.trade_documents(owner_id,id)
);
create index trade_documents_owner_order_idx on public.trade_documents(owner_id,order_id,created_at desc);
create index trade_documents_owner_type_status_idx on public.trade_documents(owner_id,document_type,status);

create table public.trade_document_versions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid not null, version_number integer not null check (version_number > 0),
 content_snapshot jsonb not null check (jsonb_typeof(content_snapshot)='object'),
 totals_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(totals_snapshot)='object'),
 template_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(template_snapshot)='object'),
 locale text not null, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 foreign key(owner_id,document_id) references public.trade_documents(owner_id,id) on delete cascade,
 unique(owner_id,document_id,version_number)
);
create index trade_document_versions_document_idx on public.trade_document_versions(owner_id,document_id,version_number desc);

create table public.trade_document_events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid, order_id uuid, event_type text not null check (char_length(event_type) between 2 and 80),
 payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'), created_at timestamptz not null default now(),
 foreign key(owner_id,document_id) references public.trade_documents(owner_id,id) on delete cascade,
 foreign key(owner_id,order_id) references public.trade_orders(owner_id,id) on delete cascade,
 check (document_id is not null or order_id is not null)
);
create index trade_document_events_order_idx on public.trade_document_events(owner_id,order_id,created_at desc);
create index trade_document_events_document_idx on public.trade_document_events(owner_id,document_id,created_at desc);

create table public.trade_document_number_sequences (
 owner_id uuid not null references auth.users(id) on delete cascade, sequence_key text not null,
 sequence_year integer not null, next_value bigint not null default 1 check (next_value > 0),
 updated_at timestamptz not null default now(), primary key(owner_id,sequence_key,sequence_year)
);
create or replace function public.next_trade_document_number(p_owner_id uuid,p_sequence_key text,p_sequence_year integer)
returns bigint language plpgsql security invoker set search_path=public as $$
declare v_value bigint;
begin
 insert into public.trade_document_number_sequences(owner_id,sequence_key,sequence_year,next_value)
 values(p_owner_id,p_sequence_key,p_sequence_year,2)
 on conflict(owner_id,sequence_key,sequence_year)
 do update set next_value=public.trade_document_number_sequences.next_value+1,updated_at=now()
 returning next_value-1 into v_value;
 return v_value;
end; $$;

do $$
declare t text;
begin
 foreach t in array array['trade_parties','trade_products','trade_orders','trade_order_items','trade_documents','trade_document_versions','trade_document_events','trade_document_number_sequences']
 loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;
revoke all on function public.next_trade_document_number(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.next_trade_document_number(uuid,text,integer) to service_role;
