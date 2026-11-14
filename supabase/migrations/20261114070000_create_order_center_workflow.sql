alter table public.trade_orders
  add column if not exists validity_date date,
  add column if not exists customer_reference text,
  add column if not exists invoice_address jsonb not null default '{}'::jsonb,
  add column if not exists delivery_address jsonb not null default '{}'::jsonb,
  add column if not exists pricelist_name text,
  add column if not exists fiscal_position text,
  add column if not exists shipping_policy text,
  add column if not exists salesperson_name text,
  add column if not exists sales_team text,
  add column if not exists source_document text,
  add column if not exists campaign text,
  add column if not exists medium text,
  add column if not exists source text,
  add column if not exists signature_required boolean not null default false,
  add column if not exists payment_required boolean not null default false,
  add column if not exists prepayment_percent numeric(5,2),
  add column if not exists shipping_weight numeric(18,6),
  add column if not exists internal_notes text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists confirmed_from_document_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='trade_orders_confirmed_from_document_fkey') then
    alter table public.trade_orders add constraint trade_orders_confirmed_from_document_fkey
      foreign key (owner_id, confirmed_from_document_id) references public.trade_documents(owner_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname='trade_orders_prepayment_percent_check') then
    alter table public.trade_orders add constraint trade_orders_prepayment_percent_check
      check (prepayment_percent is null or prepayment_percent between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='trade_orders_invoice_address_object_check') then
    alter table public.trade_orders add constraint trade_orders_invoice_address_object_check check (jsonb_typeof(invoice_address)='object');
  end if;
  if not exists (select 1 from pg_constraint where conname='trade_orders_delivery_address_object_check') then
    alter table public.trade_orders add constraint trade_orders_delivery_address_object_check check (jsonb_typeof(delivery_address)='object');
  end if;
end $$;

create unique index if not exists trade_orders_confirmed_quote_unique
  on public.trade_orders(owner_id, confirmed_from_document_id)
  where confirmed_from_document_id is not null;

create or replace function public.confirm_trade_quotation(p_owner_id uuid, p_document_id uuid)
returns table(document_id uuid, order_id uuid, document_status text, order_status text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_doc public.trade_documents%rowtype; v_order public.trade_orders%rowtype;
begin
  if p_owner_id is null or p_document_id is null then raise exception 'OWNER_AND_DOCUMENT_REQUIRED'; end if;
  select * into v_doc from public.trade_documents where id=p_document_id and owner_id=p_owner_id for update;
  if not found then raise exception 'QUOTATION_NOT_FOUND'; end if;
  if v_doc.document_type not in ('quotation','request_for_quotation') then raise exception 'DOCUMENT_IS_NOT_A_QUOTATION'; end if;
  select * into v_order from public.trade_orders where id=v_doc.order_id and owner_id=p_owner_id for update;
  if not found then raise exception 'RELATED_ORDER_NOT_FOUND'; end if;
  if (v_doc.document_type='quotation' and v_order.order_type<>'sales') or (v_doc.document_type='request_for_quotation' and v_order.order_type<>'purchase') then raise exception 'QUOTATION_ORDER_TYPE_MISMATCH'; end if;
  if v_doc.status='issued' and v_order.status='active' and v_order.confirmed_from_document_id=v_doc.id then
    return query select v_doc.id,v_order.id,v_doc.status,v_order.status; return;
  end if;
  if v_doc.status not in ('draft','review','approved') then raise exception 'QUOTATION_STATUS_NOT_CONFIRMABLE'; end if;
  if v_order.status in ('cancelled','archived','completed') then raise exception 'ORDER_STATUS_NOT_CONFIRMABLE'; end if;
  if not exists(select 1 from public.trade_order_items where owner_id=p_owner_id and order_id=v_order.id) then raise exception 'ORDER_HAS_NO_LINES'; end if;
  update public.trade_documents set status='issued',issued_at=coalesce(issued_at,now()),updated_at=now() where id=v_doc.id and owner_id=p_owner_id;
  update public.trade_orders set status='active',confirmed_at=coalesce(confirmed_at,now()),confirmed_from_document_id=v_doc.id,updated_at=now() where id=v_order.id and owner_id=p_owner_id;
  insert into public.trade_document_events(owner_id,document_id,order_id,event_type,payload) values
    (p_owner_id,v_doc.id,v_order.id,'quotation.confirmed',jsonb_build_object('document_number',v_doc.document_number,'order_number',v_order.order_number)),
    (p_owner_id,v_doc.id,v_order.id,'order.confirmed',jsonb_build_object('order_number',v_order.order_number,'source_document_id',v_doc.id));
  return query select v_doc.id,v_order.id,'issued'::text,'active'::text;
end;
$$;
revoke all on function public.confirm_trade_quotation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.confirm_trade_quotation(uuid,uuid) to service_role;
