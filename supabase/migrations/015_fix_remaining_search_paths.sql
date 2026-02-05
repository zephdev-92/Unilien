-- Migration: Fix remaining search_path security warnings
-- Also fixes overly permissive RLS policy on file_upload_audit

-- ============================================
-- 1. FIX update_updated_at_column FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. FIX/CREATE is_employee FUNCTION
-- ============================================

-- This function checks if current user is an employee of a given employer
-- Used in RLS policies
CREATE OR REPLACE FUNCTION is_employee(employer_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.employer_id = employer_uuid
      AND contracts.employee_id = auth.uid()
      AND contracts.status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION is_employee IS 'Checks if current user is an active employee of the given employer';

-- ============================================
-- 3. FIX file_upload_audit RLS POLICY
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert audit entries" ON file_upload_audit;

-- The log_storage_upload() trigger function uses SECURITY DEFINER,
-- which means it runs with the privileges of the function owner (postgres)
-- and bypasses RLS. No INSERT policy needed for regular users.

-- For completeness, add a policy that only allows the function context
-- In practice, SECURITY DEFINER functions bypass RLS anyway
-- But we add this to satisfy the linter and document intent
CREATE POLICY "Only triggers can insert audit entries"
  ON file_upload_audit FOR INSERT
  WITH CHECK (
    -- This will only allow inserts from SECURITY DEFINER functions
    -- or service_role. Regular users cannot insert directly.
    current_setting('role') = 'service_role'
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function to auto-update updated_at timestamp';
