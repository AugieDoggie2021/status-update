-- Migration: Add ADO sync mappings table for bidirectional entity linking
-- Run in Supabase SQL Editor
--
-- This table tracks bidirectional links between ADO work items and Status Tracker entities:
-- - Entity type (workstream, risk, action)
-- - Tracker entity ID (references workstreams.id, risks.id, or actions.id)
-- - ADO work item ID and type
-- - Last sync timestamp
-- - Sync direction (ado_to_tracker, tracker_to_ado, bidirectional)

-- Create ado_sync_mappings table
CREATE TABLE IF NOT EXISTS ado_sync_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES ado_connections(id) ON DELETE CASCADE,
  entity_type text NOT NULL,  -- 'workstream', 'risk', 'action'
  tracker_entity_id uuid NOT NULL,  -- References workstreams.id, risks.id, or actions.id
  ado_work_item_id int NOT NULL,  -- ADO work item ID
  ado_work_item_type text NOT NULL,  -- 'Epic', 'Feature', 'User Story', 'Task', 'Bug', 'Risk'
  last_synced_at timestamptz,
  sync_direction text NOT NULL DEFAULT 'bidirectional',  -- 'ado_to_tracker', 'tracker_to_ado', 'bidirectional'
  created_at timestamptz DEFAULT now(),
  UNIQUE(connection_id, ado_work_item_id),
  UNIQUE(connection_id, entity_type, tracker_entity_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ado_sync_mappings_connection_id ON ado_sync_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_ado_sync_mappings_tracker_entity ON ado_sync_mappings(entity_type, tracker_entity_id);
CREATE INDEX IF NOT EXISTS idx_ado_sync_mappings_ado_work_item ON ado_sync_mappings(connection_id, ado_work_item_id);
CREATE INDEX IF NOT EXISTS idx_ado_sync_mappings_last_synced ON ado_sync_mappings(last_synced_at DESC);

-- Enable RLS
ALTER TABLE ado_sync_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Members can read, OWNERs can manage
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Members can read ADO sync mappings" ON ado_sync_mappings;
DROP POLICY IF EXISTS "Owners can manage ADO sync mappings" ON ado_sync_mappings;

CREATE POLICY "Members can read ADO sync mappings"
  ON ado_sync_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ado_connections ac
      JOIN program_memberships pm ON pm.program_id = ac.program_id
      WHERE ac.id = ado_sync_mappings.connection_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage ADO sync mappings"
  ON ado_sync_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ado_connections ac
      JOIN program_memberships pm ON pm.program_id = ac.program_id
      WHERE ac.id = ado_sync_mappings.connection_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'OWNER'
    )
  );

-- Add comment to document the table
COMMENT ON TABLE ado_sync_mappings IS 'Tracks bidirectional links between Azure DevOps work items and Status Tracker entities for synchronization.';

