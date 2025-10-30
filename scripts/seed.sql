-- Advisory Status Tracker - Database Schema and Seed Data
-- Run this SQL in your Supabase SQL Editor

-- ENUMS
create type status_enum as enum ('GREEN','YELLOW','RED');
create type severity_enum as enum ('LOW','MEDIUM','HIGH');
create type risk_status_enum as enum ('OPEN','MITIGATED','CLOSED');
create type action_status_enum as enum ('OPEN','IN_PROGRESS','DONE');

-- TABLES

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sponsor text,
  start_date date,
  end_date date
);

create table if not exists workstreams (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade,
  name text not null,
  lead text,
  status status_enum not null default 'GREEN',
  percent_complete int not null default 0,
  summary text not null default '',
  next_milestone text,
  next_milestone_due date,
  updated_at timestamptz not null default now()
);

create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade,
  workstream_id uuid references workstreams(id) on delete set null,
  title text not null,
  severity severity_enum not null,
  status risk_status_enum not null default 'OPEN',
  owner text,
  due_date date,
  notes text
);

create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade,
  workstream_id uuid references workstreams(id) on delete set null,
  title text not null,
  owner text,
  due_date date,
  status action_status_enum not null default 'OPEN',
  notes text
);

create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade,
  raw_text text not null,
  parsed_json jsonb,
  applied_by text,
  created_at timestamptz not null default now()
);

-- INDEXES for performance
create index if not exists idx_workstreams_program_id on workstreams(program_id);
create index if not exists idx_workstreams_name_lower on workstreams(lower(name));
create index if not exists idx_risks_program_id on risks(program_id);
create index if not exists idx_risks_title_lower on risks(lower(title));
create index if not exists idx_actions_program_id on actions(program_id);
create index if not exists idx_actions_title_lower on actions(lower(title));
create index if not exists idx_updates_program_id on updates(program_id);

-- SEED DATA (returns id for PROGRAM_ID env var)
-- After running, copy the returned id into .env.local as PROGRAM_ID
insert into programs (name,sponsor,start_date,end_date)
values ('Regulatory Reporting Modernization (Q4)','EVP, Ops','2025-10-01','2025-12-31')
returning id;

