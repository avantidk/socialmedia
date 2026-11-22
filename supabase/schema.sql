-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);
insert into companies (name) values ('Hariom Ashram'), ('Vedika Wellness'), ('UnkganIT')
on conflict (name) do nothing;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  platform text not null check (platform in ('facebook','instagram','youtube','x')),
  external_id text not null,
  display_name text,
  username text,
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique (company_id, platform, external_id)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  body text not null default '',
  title text,
  media jsonb not null default '[]',   -- [{url,type:'image'|'video',path,mime}]
  scheduled_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create table if not exists post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','posting','posted','failed')),
  external_id text,
  external_url text,
  error text,
  attempts int not null default 0,
  posted_at timestamptz,
  unique (post_id, account_id)
);
create index if not exists post_targets_status_idx on post_targets (status);

create table if not exists items (            -- recent posts/videos pulled from each platform
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  external_id text not null,
  title text,
  url text,
  published_at timestamptz,
  likes int default 0,
  comments int default 0,
  views int default 0,
  shares int default 0,
  synced_at timestamptz default now(),
  unique (account_id, external_id)
);

create table if not exists account_stats (    -- one follower snapshot per account per day
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  day date not null default current_date,
  followers int,
  unique (account_id, day)
);

-- Lock everything: only the server (service role key) can touch the tables.
alter table companies enable row level security;
alter table accounts enable row level security;
alter table posts enable row level security;
alter table post_targets enable row level security;
alter table items enable row level security;
alter table account_stats enable row level security;

-- Public bucket for uploaded media (Instagram needs a public URL to fetch from).
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;
