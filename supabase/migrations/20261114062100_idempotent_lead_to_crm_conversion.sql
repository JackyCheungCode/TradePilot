create or replace function public.convert_lead_to_crm(
 p_owner_id uuid,p_lead_id uuid,p_account_id uuid default null,
 p_create_account boolean default true,p_contact jsonb default null,p_opportunity jsonb default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_lead public.leads%rowtype; v_account public.crm_accounts%rowtype;
 v_contact public.crm_contacts%rowtype; v_opportunity public.crm_opportunities%rowtype;
 v_existing public.crm_accounts%rowtype; v_full_name text; v_email text; v_opp_name text;
begin
 if p_owner_id is null or p_lead_id is null then raise exception 'OWNER_AND_LEAD_REQUIRED' using errcode='22023'; end if;
 select * into v_lead from public.leads where id=p_lead_id and owner_id=p_owner_id and is_formal=true for update;
 if not found then raise exception 'FORMAL_LEAD_NOT_FOUND' using errcode='P0002'; end if;
 select * into v_existing from public.crm_accounts where owner_id=p_owner_id and source_lead_id=p_lead_id limit 1;
 if found then
  if p_account_id is not null and p_account_id<>v_existing.id then raise exception 'LEAD_ALREADY_CONVERTED' using errcode='23505'; end if;
  v_account:=v_existing;
 elsif p_create_account then
  insert into public.crm_accounts(owner_id,account_name,legal_name,company_type,account_type,status,country_code,billing_address,shipping_address,phone,email,website,source_lead_id,notes)
  values(p_owner_id,v_lead.name,v_lead.name,'company','customer','qualified',v_lead.country_code,
   jsonb_build_object('street',coalesce(v_lead.address,''),'country_code',v_lead.country_code),
   jsonb_build_object('street',coalesce(v_lead.address,''),'country_code',v_lead.country_code),
   v_lead.phone,v_lead.email,v_lead.website,p_lead_id,'由潜客发现线索转入 CRM') returning * into v_account;
 else
  select * into v_account from public.crm_accounts where id=p_account_id and owner_id=p_owner_id and is_archived is not true for update;
  if not found then raise exception 'CRM_ACCOUNT_NOT_FOUND' using errcode='P0002'; end if;
  if v_account.source_lead_id is not null and v_account.source_lead_id<>p_lead_id then raise exception 'ACCOUNT_LINKED_TO_ANOTHER_LEAD' using errcode='23505'; end if;
  update public.crm_accounts set source_lead_id=p_lead_id,updated_at=now() where id=v_account.id returning * into v_account;
 end if;
 if p_contact is not null and jsonb_typeof(p_contact)='object' then
  v_full_name:=coalesce(nullif(trim(p_contact->>'full_name'),''),concat_ws(' ',p_contact->>'first_name',p_contact->>'last_name'));
  v_email:=nullif(lower(trim(p_contact->>'email')),'');
  if v_email is not null then
   select * into v_contact from public.crm_contacts where owner_id=p_owner_id and account_id=v_account.id and lower(email)=v_email and is_archived is not true limit 1;
  else
   select * into v_contact from public.crm_contacts where owner_id=p_owner_id and account_id=v_account.id and lower(full_name)=lower(v_full_name) and is_archived is not true limit 1;
  end if;
  if not found then
   insert into public.crm_contacts(owner_id,account_id,first_name,last_name,full_name,email,phone,is_primary,contact_type)
   values(p_owner_id,v_account.id,coalesce(nullif(trim(p_contact->>'first_name'),''),'Unknown'),coalesce(p_contact->>'last_name',''),v_full_name,v_email,nullif(p_contact->>'phone',''),false,coalesce(nullif(p_contact->>'contact_type',''),'business')) returning * into v_contact;
  end if;
 end if;
 if p_opportunity is not null and jsonb_typeof(p_opportunity)='object' then
  v_opp_name:=coalesce(nullif(p_opportunity->>'name',''),v_lead.name||' - 新商机');
  select * into v_opportunity from public.crm_opportunities where owner_id=p_owner_id and account_id=v_account.id and name=v_opp_name and source='lead_discovery' and is_archived is not true limit 1;
  if not found then
   insert into public.crm_opportunities(owner_id,account_id,primary_contact_id,name,stage,status,source,lead_source_detail,currency_code,probability,description)
   values(p_owner_id,v_account.id,v_contact.id,v_opp_name,'prospecting','open','lead_discovery',coalesce(nullif(p_opportunity->>'lead_source_detail',''),'discovery'),coalesce(nullif(p_opportunity->>'currency_code',''),'USD'),10,'由潜客发现线索转化建立') returning * into v_opportunity;
  end if;
 end if;
 update public.discovery_records set status='promoted',lead_id=p_lead_id,updated_at=now() where id=v_lead.discovery_record_id and owner_id=p_owner_id;
 return jsonb_build_object('lead_id',p_lead_id,'account',to_jsonb(v_account),'contact',case when v_contact.id is null then null else to_jsonb(v_contact) end,'opportunity',case when v_opportunity.id is null then null else to_jsonb(v_opportunity) end,'already_converted',v_existing.id is not null);
end; $$;
revoke all on function public.convert_lead_to_crm(uuid,uuid,uuid,boolean,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.convert_lead_to_crm(uuid,uuid,uuid,boolean,jsonb,jsonb) to service_role;
