alter table public.leads add constraint leads_discovery_record_owner_fkey foreign key (discovery_record_id, owner_id) references public.discovery_records(id, owner_id);
