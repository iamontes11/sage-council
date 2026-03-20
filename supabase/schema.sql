-- ================================================================
-- SAGE COUNCIL — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Creators ───────────────────────────────────────────────────
create table if not exists creators (
  id          text primary key,          -- e.g. 'mark-manson'
  name        text not null,
  emoji       text,
  color       text,
  tagline     text,
  created_at  timestamptz default now()
);

-- Pre-seed creators
insert into creators (id, name, emoji, color, tagline) values
  ('mark-manson',    'Mark Manson',    '🎯', '#E74C3C', 'Choose your struggles wisely'),
  ('derek-sivers',   'Derek Sivers',   '🔄', '#3498DB', 'If it''s not hell yes, it''s no'),
  ('steven-bartlett','Steven Bartlett','🚀', '#9B59B6', 'Self-awareness is the ultimate edge'),
  ('the-mit-monk',   'theMITmonk',     '🧘', '#1ABC9C', 'Engineering the examined life'),
  ('professor-jiang','Professor Jiang','🔬', '#F39C12', 'Truth lives in first principles'),
  ('jwt-franzen',   'Jett Franzen',    '🎨', '#E67E22', 'Creativity is the most honest path'),
  ('jason-pargin',   'Jason Pargin',   '😈', '#C0392B', 'The uncomfortable truth is the useful one'),
  ('Jay-shetty',     'Jay Shetty',     '☮️', '#2ECC71', 'Purpose transforms pressure into power'),
  ('sabrina-ramonov','Sabrina Ramonov','⚡', '#8E44AD', 'Systems beat motivation every time')
on conflict (id) do nothing;

-- ── Transcript Chunks ────────────────────────────────────────
create table if not exists transcript_chunks (
  id           uuid default uuid_generate_v4() primary key,
  creator_id    text references creators(id) on delete cascade,
  video_id      text not null,
  video_title   text,
  chunk_text    text not null,
  chunk_index   int  default 0,
  -- Full-text search vector (auto-generated, no extra API needed)
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(chunk_text, ''))
  ) stored,
  created_at    timestamptz default now()
);

create index if not exists idx_transcript_chunks_creator
  on transcript_chunks (creator_id);

create index if not exists idx_transcript_chunks_fts
  on transcript_chunks using gin(search_vector);

create index if not exists idx_transcript_chunks_video
  on transcript_chunks (video_id);

-- ── Chats ───────────────────────────────────────
create table if not exists chats (
  id          uuid default uuid_generate_v4() primary key,
  user_id     text not null,             -- NextAuth user email or sub
  title       text default 'New Conversation',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  archived    boolean default false
);

create index if not exists idy_chats_user
  on chats (user_id, archived, updated_at desc);

-- ── Messages ───────────────────────────────────────────────
create table if not exists messages (
  id          uuid default uuid_generate_v4() primary key,
  chat_id     uuid references chats(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  -- For user messages: plain string
  -- For assistant messages: JSON CouncilResponse {choices:[...]}
  CONTENT      jsonb not null,
  created_at  timestamptz default now()
);

create index if not exists idx_messages_chat
  on 8 chats (chat_id, created_at asc);

-- ── Auto-update chats.updated_at ────────────────────────────
create or replace function update_chat_updated_at()
returns trigger language plpgsql as $$
begin
  update chats set updated_at = now() where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists trg_update_chat_timestamp on messages;
create trigger trg_update_chat_timestamp
  after insert on messages
  for each row execute function update_chat_updated_at();

-- ── Row Level Security ───────────────────────────────────────
-- Enable RLS
alter table chats    enable row level security;
alter table messages enable row level security;

-- Chats: users can only see their own
create policy "Users see own chats" on chats
  for all using (user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Messages: users can only see messages in their chats
create policy "Users see own messages" on messages
  for all using (
    exists (
      select 1 from chats
      where chats.id = messages.chat_id
        and chats.user_id = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Transcript chunks & creators: public read, service-role write
create policy "Public read transcripts" on transcript_chunks
  for select using (true);

create policy "Public read creators" on creators
  for select using (true);

alter table transcript_chunks enable row level security;
alter table creators           enable row level security;
