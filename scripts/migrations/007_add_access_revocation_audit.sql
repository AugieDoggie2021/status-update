-- Migration: Add access_revocations table for tracking member access revocations
-- Run in Supabase SQL Editor
--
-- This table tracks when members are removed from programs, including:
-- - Who was revoked
-- - Who performed the revocation
-- - Optional reason for revocation
-- - Bulk revocation grouping

-- Create access_revocations table
CREATE TABLE IF NOT EXISTS access_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  revoked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revoked_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  revocation_reason text,
  membership_id uuid, -- Reference to the deleted membership (for historical tracking)
  bulk_revocation_id uuid, -- Groups multiple revocations from a single bulk operation
  revoked_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_revocations_program_id ON access_revocations(program_id);
CREATE INDEX IF NOT EXISTS idx_access_revocations_revoked_user_id ON access_revocations(revoked_user_id);
CREATE INDEX IF NOT EXISTS idx_access_revocations_revoked_by_user_id ON access_revocations(revoked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_access_revocations_bulk_revocation_id ON access_revocations(bulk_revocation_id);
CREATE INDEX IF NOT EXISTS idx_access_revocations_revoked_at ON access_revocations(revoked_at DESC);

-- Enable RLS
ALTER TABLE access_revocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only OWNERs can read audit logs for their programs
-- Note: We don't allow writes through RLS - writes are done via service role in API routes

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "access_revocations_read_if_owner" ON access_revocations;

CREATE POLICY "access_revocations_read_if_owner"
ON access_revocations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM program_memberships pm
    WHERE pm.program_id = access_revocations.program_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'OWNER'
  )
);

-- Note: INSERT operations are done via service role in API routes (bypassing RLS)
-- This ensures audit logs cannot be tampered with by users, even OWNERs


