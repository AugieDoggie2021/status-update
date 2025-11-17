-- Migration: Add whitelabel columns to programs table
-- Run in Supabase SQL Editor
--
-- This migration adds theme/branding columns to enable multi-tenant whitelabeling:
-- - Custom logos per program/client
-- - Configurable color schemes (primary, secondary, accent colors)
-- - Customizable app name per deployment
-- - Theme configuration stored in database

-- Add whitelabel columns to programs table
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS app_name text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS accent_color text;

-- Add check constraints for valid hex color format
-- Hex colors must be in format #RRGGBB or #RRGGBBAA (6 or 8 hex digits)
DO $$ 
BEGIN
  -- Primary color constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'programs_primary_color_check'
  ) THEN
    ALTER TABLE programs
      ADD CONSTRAINT programs_primary_color_check
      CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;

  -- Secondary color constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'programs_secondary_color_check'
  ) THEN
    ALTER TABLE programs
      ADD CONSTRAINT programs_secondary_color_check
      CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;

  -- Accent color constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'programs_accent_color_check'
  ) THEN
    ALTER TABLE programs
      ADD CONSTRAINT programs_accent_color_check
      CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

-- Add comment to document the columns
COMMENT ON COLUMN programs.logo_url IS 'URL to logo image stored in Supabase Storage (program-logos bucket)';
COMMENT ON COLUMN programs.app_name IS 'Custom application name for this program (defaults to "Status Tracker" if null)';
COMMENT ON COLUMN programs.primary_color IS 'Primary brand color in hex format (e.g., #10b981)';
COMMENT ON COLUMN programs.secondary_color IS 'Secondary brand color in hex format (e.g., #0284c7)';
COMMENT ON COLUMN programs.accent_color IS 'Accent brand color in hex format (e.g., #10b981)';

-- ============================================================================
-- Supabase Storage Bucket Setup
-- ============================================================================
-- Note: Storage buckets must be created manually in Supabase Dashboard
-- 
-- Steps to create the bucket:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: "program-logos"
-- 4. Public bucket: Yes (for public read access)
-- 5. File size limit: 2MB
-- 6. Allowed MIME types: image/png, image/jpeg, image/jpg, image/svg+xml
--
-- Bucket Policies (RLS):
-- 1. Public read access:
--    - Policy name: "Public logo read access"
--    - Operation: SELECT
--    - Target roles: anon, authenticated
--    - Policy: true (allow all)
--
-- 2. Authenticated write access (OWNER role only):
--    - Policy name: "Owner logo upload"
--    - Operation: INSERT
--    - Target roles: authenticated
--    - Policy: Check if user is OWNER of the program (requires custom function)
--
-- 3. Owner delete access:
--    - Policy name: "Owner logo delete"
--    - Operation: DELETE
--    - Target roles: authenticated
--    - Policy: Check if user is OWNER of the program
--
-- Note: For simplicity, we can use service role for uploads in API routes
-- which bypasses RLS, and enforce OWNER role check in the API endpoint itself.

