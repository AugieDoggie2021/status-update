-- Migration: Add ADO connections table for Azure DevOps OAuth integration
-- Run in Supabase SQL Editor
--
-- This table stores OAuth tokens and connection metadata per program:
-- - Organization URL and project name
-- - Encrypted OAuth access and refresh tokens
-- - Token expiration tracking
-- - Created by tracking

-- Create ado_connections table
CREATE TABLE IF NOT EXISTS ado_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  organization_url text NOT NULL,  -- e.g., "https://dev.azure.com/myorg"
  project_name text NOT NULL,
  access_token_encrypted text NOT NULL,  -- Encrypted OAuth token
  refresh_token_encrypted text,  -- Encrypted refresh token
  token_expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, organization_url, project_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ado_connections_program_id ON ado_connections(program_id);
CREATE INDEX IF NOT EXISTS idx_ado_connections_created_by ON ado_connections(created_by);

-- Enable RLS
ALTER TABLE ado_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only OWNERs can manage connections
-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Owners can manage ADO connections" ON ado_connections;

CREATE POLICY "Owners can manage ADO connections"
  ON ado_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM program_memberships
      WHERE program_id = ado_connections.program_id
      AND user_id = auth.uid()
      AND role = 'OWNER'
    )
  );

-- Add comment to document the table
COMMENT ON TABLE ado_connections IS 'Stores Azure DevOps OAuth connections per program. Tokens are encrypted at rest.';

