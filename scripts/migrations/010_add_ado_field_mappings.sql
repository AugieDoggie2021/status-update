-- Migration: Add ADO field mappings table for configurable field mapping
-- Run in Supabase SQL Editor
--
-- This table stores configurable field mappings between ADO and Status Tracker:
-- - Entity type (workstream, risk, action)
-- - ADO field name (e.g., "System.Title", "System.State")
-- - Tracker field name (e.g., "name", "status")
-- - Mapping type (direct, transform, custom)
-- - Optional transform function for complex mappings

-- Create ado_field_mappings table
CREATE TABLE IF NOT EXISTS ado_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES ado_connections(id) ON DELETE CASCADE,
  entity_type text NOT NULL,  -- 'workstream', 'risk', 'action'
  ado_field_name text NOT NULL,  -- e.g., "System.Title", "System.State"
  tracker_field_name text NOT NULL,  -- e.g., "name", "status"
  mapping_type text NOT NULL DEFAULT 'direct',  -- 'direct', 'transform', 'custom'
  transform_function text,  -- JSON function for transformations
  created_at timestamptz DEFAULT now(),
  UNIQUE(connection_id, entity_type, ado_field_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ado_field_mappings_connection_id ON ado_field_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_ado_field_mappings_entity_type ON ado_field_mappings(entity_type);

-- Enable RLS
ALTER TABLE ado_field_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only OWNERs can manage mappings
-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Owners can manage ADO field mappings" ON ado_field_mappings;

CREATE POLICY "Owners can manage ADO field mappings"
  ON ado_field_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ado_connections ac
      JOIN program_memberships pm ON pm.program_id = ac.program_id
      WHERE ac.id = ado_field_mappings.connection_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'OWNER'
    )
  );

-- Add comment to document the table
COMMENT ON TABLE ado_field_mappings IS 'Stores configurable field mappings between Azure DevOps work items and Status Tracker entities.';

