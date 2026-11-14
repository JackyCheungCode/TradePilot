alter table public.crm_accounts
  add column if not exists logo_url text,
  add column if not exists street text,
  add column if not exists postal_code text,
  add column if not exists job_title text,
  add column if not exists sales_person text,
  add column if not exists payment_method text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists tags text[] not null default '{}';

create index if not exists crm_accounts_owner_tags_idx
  on public.crm_accounts using gin (tags);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm-assets',
  'crm-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'crm_assets_owner_insert'
  ) then
    create policy crm_assets_owner_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'crm-assets' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'crm_assets_owner_update'
  ) then
    create policy crm_assets_owner_update on storage.objects
      for update to authenticated
      using (bucket_id = 'crm-assets' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'crm-assets' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'crm_assets_owner_delete'
  ) then
    create policy crm_assets_owner_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'crm-assets' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end
$$;
