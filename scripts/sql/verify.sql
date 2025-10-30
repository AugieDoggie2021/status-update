-- Quick verification queries for seeded data
-- Replace :program_id with your actual program ID from seed.sql
-- Run in Supabase SQL Editor

-- Verify workstreams exist
select count(*) as workstreams 
from workstreams 
where program_id = :program_id;

-- Verify open risks
select count(*) as open_risks 
from risks 
where program_id = :program_id 
  and status != 'CLOSED';

-- Verify open actions
select count(*) as open_actions 
from actions 
where program_id = :program_id 
  and status != 'DONE';

-- Optional: Show recent workstreams with status
select 
  name,
  status,
  percent_complete,
  updated_at
from workstreams
where program_id = :program_id
order by updated_at desc
limit 10;

