create index trade_orders_owner_seller_party_idx on public.trade_orders(owner_id,seller_party_id) where seller_party_id is not null;
create index trade_orders_owner_buyer_party_idx on public.trade_orders(owner_id,buyer_party_id) where buyer_party_id is not null;
create index trade_orders_owner_supplier_party_idx on public.trade_orders(owner_id,supplier_party_id) where supplier_party_id is not null;
create index trade_order_items_owner_product_idx on public.trade_order_items(owner_id,product_id) where product_id is not null;
create index trade_documents_owner_source_document_idx on public.trade_documents(owner_id,source_document_id) where source_document_id is not null;
create index trade_document_versions_created_by_idx on public.trade_document_versions(created_by) where created_by is not null;