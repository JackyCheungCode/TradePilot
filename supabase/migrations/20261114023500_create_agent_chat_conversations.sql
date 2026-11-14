create table if not exists public.agent_conversations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null default '小雅对话' check (char_length(title) between 1 and 120),
 last_message_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index if not exists agent_conversations_owner_recent_idx on public.agent_conversations(owner_id,last_message_at desc);
create table if not exists public.agent_chat_messages (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
 role text not null check (role in ('user','assistant')),
 content text not null check (char_length(content) between 1 and 5000),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists agent_chat_messages_conversation_idx on public.agent_chat_messages(owner_id,conversation_id,created_at desc);
alter table public.agent_conversations enable row level security;
alter table public.agent_chat_messages enable row level security;
revoke all on public.agent_conversations,public.agent_chat_messages from anon,authenticated;
grant select,insert,update,delete on public.agent_conversations,public.agent_chat_messages to service_role;
