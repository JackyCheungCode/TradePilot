alter table public.discovery_runs add constraint discovery_runs_id_owner_key unique (id, owner_id);
alter table public.leads add constraint leads_id_owner_key unique (id, owner_id);

alter table public.discovery_run_logs drop constraint discovery_run_logs_run_id_fkey;
alter table public.discovery_run_logs add constraint discovery_run_logs_run_owner_fkey foreign key (run_id, owner_id) references public.discovery_runs(id, owner_id) on delete cascade;

alter table public.lead_sources drop constraint lead_sources_lead_id_fkey;
alter table public.lead_sources add constraint lead_sources_lead_owner_fkey foreign key (lead_id, owner_id) references public.leads(id, owner_id) on delete cascade;

alter table public.lead_sources drop constraint lead_sources_provider_external_id_key;
alter table public.lead_sources add constraint lead_sources_owner_provider_external_id_key unique (owner_id, provider, external_id);

drop policy "owners manage discovery logs" on public.discovery_run_logs;
create policy "owners manage discovery logs" on public.discovery_run_logs for all to authenticated
 using ((select auth.uid()) = owner_id)
 with check ((select auth.uid()) = owner_id and exists (select 1 from public.discovery_runs r where r.id = run_id and r.owner_id = (select auth.uid())));

drop policy "owners manage lead sources" on public.lead_sources;
create policy "owners manage lead sources" on public.lead_sources for all to authenticated
 using ((select auth.uid()) = owner_id and exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = (select auth.uid())))
 with check ((select auth.uid()) = owner_id and exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = (select auth.uid())));

create index discovery_run_logs_run_owner_idx on public.discovery_run_logs(run_id, owner_id);
create index lead_sources_lead_owner_idx on public.lead_sources(lead_id, owner_id);
