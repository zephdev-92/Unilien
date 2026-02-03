-- Migration: Add caregiver profile fields
-- Description: Adds fields for caregiver self-management (relationship details, legal status, contact info, availability)

-- Add new columns to caregivers table
ALTER TABLE caregivers
ADD COLUMN IF NOT EXISTS relationship_details TEXT,
ADD COLUMN IF NOT EXISTS legal_status TEXT CHECK (legal_status IN ('none', 'tutor', 'curator', 'safeguard_justice', 'family_caregiver')),
ADD COLUMN IF NOT EXISTS address JSONB,
ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
ADD COLUMN IF NOT EXISTS availability_hours TEXT,
ADD COLUMN IF NOT EXISTS can_replace_employer BOOLEAN DEFAULT FALSE;

-- Update relationship column to use the new enum values
-- Note: Existing data may need to be migrated if using different values
ALTER TABLE caregivers
DROP CONSTRAINT IF EXISTS caregivers_relationship_check;

ALTER TABLE caregivers
ADD CONSTRAINT caregivers_relationship_check
CHECK (relationship IS NULL OR relationship IN (
  'parent', 'child', 'spouse', 'sibling', 'grandparent',
  'grandchild', 'friend', 'neighbor', 'legal_guardian',
  'curator', 'other'
));

-- Add RLS policy for caregivers to update their own profile
CREATE POLICY "Caregivers can update their own profile"
ON caregivers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Comment on new columns
COMMENT ON COLUMN caregivers.relationship_details IS 'Additional details when relationship is "other"';
COMMENT ON COLUMN caregivers.legal_status IS 'Legal status of caregiver (tutor, curator, etc.)';
COMMENT ON COLUMN caregivers.address IS 'Caregiver address if different from employer';
COMMENT ON COLUMN caregivers.emergency_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN caregivers.availability_hours IS 'Description of availability (e.g., "Lundi-Vendredi 9h-18h")';
COMMENT ON COLUMN caregivers.can_replace_employer IS 'Whether caregiver can act when employer is unavailable';
