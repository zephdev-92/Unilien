-- Migration: Fix is_employer search_path
-- Security fix for mutable search_path warning

CREATE OR REPLACE FUNCTION is_employer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM employers WHERE profile_id = auth.uid());
$$;

COMMENT ON FUNCTION is_employer IS 'Checks if current user is an employer';
