-- Migration: Fix get_user_role function search_path
-- Security fix: Add explicit search_path to prevent schema injection attacks

-- Recreate the function with proper search_path
-- This function is used in RLS policies to get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role;
END;
$$;

COMMENT ON FUNCTION get_user_role IS 'Returns the role of the current authenticated user from profiles table';
