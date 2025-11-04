-- Migration: Add milestones table for milestone tracking
-- Run in Supabase SQL Editor

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workstream_id uuid NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date NOT NULL,
  completed_at date NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_milestones_workstream_id ON milestones(workstream_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_completed_at ON milestones(completed_at);

-- Enable RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies: readable if member, writable if OWNER or CONTRIBUTOR
CREATE POLICY "milestones_read_if_member"
ON milestones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = milestones.workstream_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "milestones_insert_if_editor"
ON milestones
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = milestones.workstream_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'CONTRIBUTOR')
  )
);

CREATE POLICY "milestones_update_if_editor"
ON milestones
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = milestones.workstream_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'CONTRIBUTOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = milestones.workstream_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'CONTRIBUTOR')
  )
);

CREATE POLICY "milestones_delete_if_editor"
ON milestones
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workstreams ws
    JOIN program_memberships pm ON pm.program_id = ws.program_id
    WHERE ws.id = milestones.workstream_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'CONTRIBUTOR')
  )
);
