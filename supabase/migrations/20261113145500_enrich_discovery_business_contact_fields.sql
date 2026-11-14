alter table public.discovery_records add column if not exists email text;
alter table public.discovery_records add column if not exists business_type text;
alter table public.discovery_records add column if not exists confidence_score integer check(confidence_score is null or confidence_score between 0 and 100);
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists business_type text;
alter table public.leads add column if not exists confidence_score integer check(confidence_score is null or confidence_score between 0 and 100);
