-- Migration: Add reports table for saving weekly summaries
-- Run in Supabase SQL Editor

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_program_id on reports(program_id);
create index if not exists idx_reports_created_at on reports(created_at desc);

-- Enable later if using Supabase Auth with RLS:
-- alter table reports enable row level security;
-- create policy "program-read" on reports for select using (true);

