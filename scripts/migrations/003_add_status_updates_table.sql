-- Migration: Add status_updates table for weekly status tracking
-- Run in Supabase SQL Editor

-- Create status_updates table
CREATE TABLE IF NOT EXISTS status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workstream_id uuid NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  week_start date NOT NULL, -- ISO Monday date
  rag status_enum NOT NULL DEFAULT 'GREEN',
  progress_percent int NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  accomplishments text NOT NULL DEFAULT '',
  blockers text NOT NULL DEFAULT '',
  plan_next text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workstream_id, week_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_status_updates_workstream_id ON status_updates(workstream_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_week_start ON status_updates(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_status_updates_created_at ON status_updates(created_at DESC);

-- Enable RLS
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: readable if member, writable if OWNER or CONTRIBUTOR
CREATE POLICY "status_updates_read_if_member"
ON status_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = status_updates.workstream_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "status_updates_insert_if_editor"
ON status_updates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = status_updates.workstream_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'CONTRIBUTOR')
  )
);

CREATE POLICY "status_updates_update_if_editor"
ON status_updates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = status_updates.workstream_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'CONTRIBUTOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = status_updates.workstream_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'CONTRIBUTOR')
  )
);

CREATE POLICY "status_updates_delete_if_editor"
ON status_updates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = status_updates.workstream_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'CONTRIBUTOR')
  )
);
