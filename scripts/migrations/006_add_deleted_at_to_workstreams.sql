-- Migration: Add deleted_at column to workstreams for soft deletes
-- Run in Supabase SQL Editor

-- Add deleted_at field (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workstreams' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE workstreams ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- Create index for faster queries on deleted items
CREATE INDEX IF NOT EXISTS idx_workstreams_deleted_at ON workstreams(deleted_at) WHERE deleted_at IS NOT NULL;

-- Note: Existing rows will have deleted_at = NULL (not deleted)

