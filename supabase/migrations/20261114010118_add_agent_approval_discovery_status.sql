alter table public.discovery_runs drop constraint if exists discovery_runs_status_check;
alter table public.discovery_runs add constraint discovery_runs_status_check
  check (status in ('planned','queued','running','awaiting_approval','completed','partial','failed','cancelled'));
