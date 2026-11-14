create table if not exists public.instagram_discovery_settings (
  id boolean primary key default true check (id = true),
  config jsonb not null default '{
    "hashtagActor":"apify~instagram-hashtag-scraper",
    "searchActor":"apify~instagram-search-scraper",
    "profilePrimaryActor":"transparent_meteorite~instagram-public-profile-scraper",
    "profileFallbackActor":"dami_studio~instagram-profile-scraper",
    
    "discoveryCostPer1000":0,
    "profileCostPer1000":0,
    "actorVersion":"latest"
  }'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.instagram_discovery_settings enable row level security;
revoke all on public.instagram_discovery_settings from anon, authenticated;
grant all on public.instagram_discovery_settings to service_role;
