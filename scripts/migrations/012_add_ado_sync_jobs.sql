-- Migration: Add ADO sync jobs table for tracking sync execution history
-- Run in Supabase SQL Editor
--
-- This table tracks sync job execution history:
-- - Job type (full_sync, incremental_sync, manual_sync)
-- - Status (pending, running, completed, failed)
-- - Execution timestamps
-- - Items synced count
-- - Error tracking

-- Create ado_sync_jobs table
CREATE TABLE IF NOT EXISTS ado_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES ado_connections(id) ON DELETE CASCADE,
  job_type text NOT NULL,  -- 'full_sync', 'incremental_sync', 'manual_sync'
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
  started_at timestamptz,
  completed_at timestamptz,
  items_synced int DEFAULT 0,
  errors jsonb,  -- Array of error objects
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ado_sync_jobs_connection_id ON ado_sync_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_ado_sync_jobs_status ON ado_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ado_sync_jobs_created_at ON ado_sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ado_sync_jobs_created_by ON ado_sync_jobs(created_by);

-- Enable RLS
ALTER TABLE ado_sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Members can read, OWNERs can manage
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Members can read ADO sync jobs" ON ado_sync_jobs;
DROP POLICY IF EXISTS "Owners can manage ADO sync jobs" ON ado_sync_jobs;

CREATE POLICY "Members can read ADO sync jobs"
  ON ado_sync_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ado_connections ac
      JOIN program_memberships pm ON pm.program_id = ac.program_id
      WHERE ac.id = ado_sync_jobs.connection_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage ADO sync jobs"
  ON ado_sync_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ado_connections ac
      JOIN program_memberships pm ON pm.program_id = ac.program_id
      WHERE ac.id = ado_sync_jobs.connection_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'OWNER'
    )
  );

-- Add comment to document the table
COMMENT ON TABLE ado_sync_jobs IS 'Tracks sync job execution history for Azure DevOps integrations.';

