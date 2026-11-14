alter table public.trade_order_items
  add column if not exists product_variant_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trade_order_items_product_variant_id_fkey'
      and conrelid = 'public.trade_order_items'::regclass
  ) then
    alter table public.trade_order_items
      add constraint trade_order_items_product_variant_id_fkey
      foreign key (product_variant_id)
      references public.trade_product_variants(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_trade_order_items_product_variant
  on public.trade_order_items(product_variant_id);
