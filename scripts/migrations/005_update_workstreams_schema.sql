-- Migration: Add additional fields to workstreams table
-- Run in Supabase SQL Editor

-- Add description field (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workstreams' AND column_name = 'description'
    ) THEN
        ALTER TABLE workstreams ADD COLUMN description text;
    END IF;
END $$;

-- Add tags field as JSONB array (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workstreams' AND column_name = 'tags'
    ) THEN
        ALTER TABLE workstreams ADD COLUMN tags jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add start_date field (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workstreams' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE workstreams ADD COLUMN start_date date;
    END IF;
END $$;

-- Add end_date field (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workstreams' AND column_name = 'end_date'
    ) THEN
        ALTER TABLE workstreams ADD COLUMN end_date date;
    END IF;
END $$;

-- Note: 'lead' field already exists and serves as 'owner'
-- If we need to rename it, we can do:
-- ALTER TABLE workstreams RENAME COLUMN lead TO owner;
