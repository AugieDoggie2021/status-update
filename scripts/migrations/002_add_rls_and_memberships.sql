-- Advisory Status Tracker - RLS and Membership Schema
-- Run this SQL in your Supabase SQL Editor AFTER enabling Supabase Auth
-- This assumes auth.uid() is available from Supabase Auth

-- ============================================================================
-- IMPORTANT: Enable Supabase Auth first!
-- 1. Go to Authentication > Providers in Supabase dashboard
-- 2. Enable Email provider (magic links)
-- 3. Optionally enable Google OAuth
-- ============================================================================

-- Create role enum for program memberships
DO $$ BEGIN
    CREATE TYPE role_enum AS ENUM ('OWNER','CONTRIBUTOR','VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create program_memberships table
CREATE TABLE IF NOT EXISTS program_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role role_enum NOT NULL DEFAULT 'VIEWER',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, user_id)
);

-- Add created_by to programs if it doesn't exist (for tracking program creator)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE programs ADD COLUMN created_by uuid;
    END IF;
END $$;

-- Create indexes for faster membership lookups (only if table exists)
CREATE INDEX IF NOT EXISTS idx_program_memberships_user_id ON program_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_program_memberships_program_id ON program_memberships(program_id);

-- Enable RLS on all tables
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper view: users_public (optional, for displaying user names)
-- ============================================================================
CREATE OR REPLACE VIEW users_public AS
SELECT 
  id AS user_id, 
  email, 
  raw_user_meta_data->>'full_name' AS full_name
FROM auth.users;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "pmembers_self_read" ON program_memberships;
DROP POLICY IF EXISTS "pmembers_owner_manage" ON program_memberships;
DROP POLICY IF EXISTS "programs_read_if_member" ON programs;
DROP POLICY IF EXISTS "workstreams_read_if_member" ON workstreams;
DROP POLICY IF EXISTS "workstreams_write_if_editor" ON workstreams;
DROP POLICY IF EXISTS "workstreams_update_if_editor" ON workstreams;
DROP POLICY IF EXISTS "workstreams_insert_if_editor" ON workstreams;
DROP POLICY IF EXISTS "workstreams_delete_if_editor" ON workstreams;
DROP POLICY IF EXISTS "risks_read_if_member" ON risks;
DROP POLICY IF EXISTS "risks_write_if_editor" ON risks;
DROP POLICY IF EXISTS "risks_update_if_editor" ON risks;
DROP POLICY IF EXISTS "risks_insert_if_editor" ON risks;
DROP POLICY IF EXISTS "risks_delete_if_editor" ON risks;
DROP POLICY IF EXISTS "actions_read_if_member" ON actions;
DROP POLICY IF EXISTS "actions_write_if_editor" ON actions;
DROP POLICY IF EXISTS "actions_update_if_editor" ON actions;
DROP POLICY IF EXISTS "actions_insert_if_editor" ON actions;
DROP POLICY IF EXISTS "actions_delete_if_editor" ON actions;
DROP POLICY IF EXISTS "updates_read_if_member" ON updates;
DROP POLICY IF EXISTS "updates_insert_if_editor" ON updates;
DROP POLICY IF EXISTS "updates_update_if_editor" ON updates;
DROP POLICY IF EXISTS "updates_delete_if_editor" ON updates;

-- 1) Membership policies: users can read their own memberships
CREATE POLICY "pmembers_self_read"
ON program_memberships
FOR SELECT 
USING (auth.uid() = user_id);

-- 2) Programs: readable if you're a member
CREATE POLICY "programs_read_if_member"
ON programs
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = programs.id AND pm.user_id = auth.uid()
  )
);

-- 3) Workstreams: readable if member, writable if OWNER or CONTRIBUTOR
CREATE POLICY "workstreams_read_if_member"
ON workstreams
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = workstreams.program_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "workstreams_insert_if_editor"
ON workstreams
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = workstreams.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

CREATE POLICY "workstreams_update_if_editor"
ON workstreams
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = workstreams.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = workstreams.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

CREATE POLICY "workstreams_delete_if_editor"
ON workstreams
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = workstreams.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

-- 4) Risks: readable if member, writable if OWNER or CONTRIBUTOR
CREATE POLICY "risks_read_if_member"
ON risks
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = risks.program_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "risks_insert_if_editor"
ON risks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = risks.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

CREATE POLICY "risks_update_if_editor"
ON risks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = risks.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = risks.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

CREATE POLICY "risks_delete_if_editor"
ON risks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = risks.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

-- 5) Actions: readable if member, writable if OWNER or CONTRIBUTOR
CREATE POLICY "actions_read_if_member"
ON actions
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = actions.program_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "actions_insert_if_editor"
ON actions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = actions.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

CREATE POLICY "actions_update_if_editor"
ON actions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = actions.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = actions.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

CREATE POLICY "actions_delete_if_editor"
ON actions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = actions.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

-- 6) Updates: readable if member, writable if OWNER or CONTRIBUTOR
CREATE POLICY "updates_read_if_member"
ON updates
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = updates.program_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "updates_insert_if_editor"
ON updates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = updates.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

-- Updates table typically only has INSERT operations, but adding others for completeness
CREATE POLICY "updates_update_if_editor"
ON updates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = updates.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = updates.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

CREATE POLICY "updates_delete_if_editor"
ON updates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = updates.program_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER','CONTRIBUTOR')
  )
);

-- 7) Membership admin: only OWNER can manage memberships
CREATE POLICY "pmembers_owner_insert"
ON program_memberships
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = program_memberships.program_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'OWNER'
  )
);

CREATE POLICY "pmembers_owner_update"
ON program_memberships
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = program_memberships.program_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'OWNER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = program_memberships.program_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'OWNER'
  )
);

CREATE POLICY "pmembers_owner_delete"
ON program_memberships
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = program_memberships.program_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'OWNER'
  )
);

-- ============================================================================
-- Post-migration: Create initial membership for existing programs
-- ============================================================================
-- Note: After running this migration, you'll need to manually create memberships
-- for existing users. You can do this via:
-- 1. The admin UI (once authenticated as OWNER)
-- 2. Direct SQL (for initial setup):
--
-- INSERT INTO program_memberships (program_id, user_id, role)
-- VALUES ('YOUR-PROGRAM-ID', 'USER-UUID-FROM-AUTH', 'OWNER');
--
-- To find your user UUID:
-- SELECT id, email FROM auth.users;

