-- Migration: Add permissions_locked field to caregivers table
-- This field indicates if permissions are locked (tutor/curator)

-- Add permissions_locked column
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS permissions_locked BOOLEAN DEFAULT FALSE;

-- Documentation comment
COMMENT ON COLUMN caregivers.permissions_locked IS 'Indicates if permissions are locked (true for tutor/curator). If true, permissions cannot be modified by the employer.';
