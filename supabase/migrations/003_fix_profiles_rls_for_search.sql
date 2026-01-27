-- Migration: Allow authenticated users to search profiles by email
-- Required for: employer searching for an auxiliary by email to create a contract

-- Allow any authenticated user to read basic profile info of employees/caregivers
-- This is needed so employers can search for auxiliaries by email
CREATE POLICY "Authenticated users can search profiles by email"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id  -- users can always read their own profile
    OR
    auth.role() = 'authenticated'  -- any authenticated user can search profiles
  );

-- Note: If a more restrictive "own profile only" policy already exists,
-- you may need to drop it first. Run this to check:
-- SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
-- Then: DROP POLICY "policy_name" ON public.profiles;
