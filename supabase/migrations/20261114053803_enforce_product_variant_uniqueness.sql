create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.canonical_uuid_array(p_values uuid[])
returns uuid[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(value order by value), '{}'::uuid[])
  from pg_catalog.unnest(coalesce(p_values, '{}'::uuid[])) as value;
$$;

revoke all on function private.canonical_uuid_array(uuid[]) from public, anon, authenticated;
grant execute on function private.canonical_uuid_array(uuid[]) to service_role;

create unique index if not exists uq_trade_product_variants_attribute_combo
  on public.trade_product_variants(owner_id, product_id, private.canonical_uuid_array(attribute_value_ids))
  where is_archived = false;

create unique index if not exists uq_trade_product_variants_owner_sku
  on public.trade_product_variants(owner_id, sku)
  where is_archived = false and sku is not null and btrim(sku) <> '';
