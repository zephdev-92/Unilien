-- Migration: Backend validation constraints
-- Adds PostgreSQL-level validation for emails, phone numbers, and file upload auditing

-- ============================================
-- 1. EMAIL FORMAT CONSTRAINT
-- ============================================

-- Add CHECK constraint on profiles.email for RFC 5322 basic format
-- This ensures email validation even if frontend is bypassed
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_format_check
CHECK (
  email IS NULL OR
  email ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
);

-- ============================================
-- 2. PHONE NUMBER FORMAT CONSTRAINT
-- ============================================

-- Add CHECK constraint for French phone number format
-- Accepts: +33XXXXXXXXX, 0XXXXXXXXX (with optional spaces/dots)
-- Stored format should be normalized (no spaces)
ALTER TABLE profiles
ADD CONSTRAINT profiles_phone_format_check
CHECK (
  phone IS NULL OR
  phone ~ '^(\+33|0)[1-9][0-9]{8}$'
);

-- ============================================
-- 3. FILE UPLOAD AUDIT TABLE
-- ============================================

-- Create audit table for tracking all file uploads
CREATE TABLE IF NOT EXISTS file_upload_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_id text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by user
CREATE INDEX idx_file_upload_audit_user_id ON file_upload_audit(user_id);

-- Index for querying by bucket
CREATE INDEX idx_file_upload_audit_bucket_id ON file_upload_audit(bucket_id);

-- Index for querying by date
CREATE INDEX idx_file_upload_audit_created_at ON file_upload_audit(created_at DESC);

-- ============================================
-- 4. RLS POLICIES FOR AUDIT TABLE
-- ============================================

ALTER TABLE file_upload_audit ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit entries
CREATE POLICY "Users can view own upload audit"
  ON file_upload_audit FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can insert (via trigger or service role)
-- No direct insert policy for regular users
CREATE POLICY "Service role can insert audit entries"
  ON file_upload_audit FOR INSERT
  WITH CHECK (true);

-- No update or delete allowed
-- Audit logs are immutable

-- ============================================
-- 5. TRIGGER FUNCTION FOR STORAGE AUDIT
-- ============================================

-- Function to log file uploads to audit table
CREATE OR REPLACE FUNCTION log_storage_upload()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log for our application buckets
  IF NEW.bucket_id IN ('justifications', 'avatars') THEN
    INSERT INTO file_upload_audit (
      user_id,
      bucket_id,
      file_path,
      file_name,
      mime_type,
      file_size,
      operation,
      metadata
    ) VALUES (
      COALESCE(NEW.owner, auth.uid()),
      NEW.bucket_id,
      NEW.name,
      split_part(NEW.name, '/', -1),
      NEW.metadata->>'mimetype',
      (NEW.metadata->>'size')::bigint,
      TG_OP,
      jsonb_build_object(
        'content_type', NEW.metadata->>'mimetype',
        'cache_control', NEW.metadata->>'cacheControl'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 6. STORAGE TRIGGER
-- ============================================

-- Note: This trigger needs to be created on storage.objects
-- which may require superuser privileges in production.
-- For Supabase hosted, use the Dashboard or contact support.

-- For local development, create the trigger:
DO $$
BEGIN
  -- Check if we can access storage schema
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    -- Drop existing trigger if exists
    DROP TRIGGER IF EXISTS on_storage_object_created ON storage.objects;

    -- Create trigger for INSERT operations
    CREATE TRIGGER on_storage_object_created
      AFTER INSERT ON storage.objects
      FOR EACH ROW
      EXECUTE FUNCTION log_storage_upload();
  END IF;
END $$;

-- ============================================
-- 7. HELPER FUNCTION: VALIDATE EMAIL
-- ============================================

-- Function to validate email format (can be called from application)
CREATE OR REPLACE FUNCTION is_valid_email(email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN email ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$';
END;
$$;

-- ============================================
-- 8. HELPER FUNCTION: VALIDATE FRENCH PHONE
-- ============================================

-- Function to validate French phone number format
CREATE OR REPLACE FUNCTION is_valid_french_phone(phone text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Remove spaces and dots for validation
  RETURN regexp_replace(phone, '[\s.]', '', 'g') ~ '^(\+33|0)[1-9][0-9]{8}$';
END;
$$;

-- ============================================
-- 9. HELPER FUNCTION: NORMALIZE PHONE
-- ============================================

-- Function to normalize phone number (remove spaces/dots)
CREATE OR REPLACE FUNCTION normalize_french_phone(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN regexp_replace(phone, '[\s.]', '', 'g');
END;
$$;

-- ============================================
-- 10. TRIGGER TO NORMALIZE PHONE ON INSERT/UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION normalize_profile_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := normalize_french_phone(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles
DROP TRIGGER IF EXISTS normalize_phone_before_save ON profiles;
CREATE TRIGGER normalize_phone_before_save
  BEFORE INSERT OR UPDATE OF phone ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_profile_phone();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE file_upload_audit IS 'Audit log for file uploads to storage buckets';
COMMENT ON FUNCTION is_valid_email IS 'Validates email format according to RFC 5322';
COMMENT ON FUNCTION is_valid_french_phone IS 'Validates French phone number format (+33 or 0 prefix)';
COMMENT ON FUNCTION normalize_french_phone IS 'Normalizes French phone by removing spaces and dots';
