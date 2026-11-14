create index if not exists crm_accounts_source_lead_idx on public.crm_accounts(source_lead_id);
create index if not exists crm_opportunities_account_idx on public.crm_opportunities(account_id);
create index if not exists crm_opportunities_primary_contact_idx on public.crm_opportunities(primary_contact_id);
create index if not exists enterprise_bank_accounts_enterprise_fk_idx on public.enterprise_bank_accounts(enterprise_id);
