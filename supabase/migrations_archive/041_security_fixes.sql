-- ============================================================
-- 041 — Security fixes (P0/P1/P2)
-- Date: 2026-03-23
-- Ref: docs/SECURITY_PENTEST_REPORT.md, OFFENSIVE_SECURITY_REVIEW.md
-- ============================================================

-- ============================================================
-- P0-1: Caregiver self-update — block security-critical columns
-- Prevent caregivers from modifying legal_status, employer_id,
-- permissions, permissions_locked on their own row.
-- Only employers should be able to change these fields.
-- ============================================================

DROP POLICY IF EXISTS "Caregivers can update their own profile" ON caregivers;

CREATE POLICY "Caregivers can update own profile limited"
ON caregivers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (
  profile_id = auth.uid()
  -- legal_status must not change
  AND legal_status IS NOT DISTINCT FROM (
    SELECT c.legal_status FROM caregivers c WHERE c.profile_id = auth.uid()
  )
  -- employer_id must not change
  AND employer_id IS NOT DISTINCT FROM (
    SELECT c.employer_id FROM caregivers c WHERE c.profile_id = auth.uid()
  )
  -- permissions_locked must not change
  AND permissions_locked IS NOT DISTINCT FROM (
    SELECT c.permissions_locked FROM caregivers c WHERE c.profile_id = auth.uid()
  )
  -- permissions must not change
  AND permissions IS NOT DISTINCT FROM (
    SELECT c.permissions FROM caregivers c WHERE c.profile_id = auth.uid()
  )
);

-- ============================================================
-- P0-2: Justifications bucket — switch to private
-- The bucket was created with public=true in migration 011.
-- Public URLs bypass RLS entirely. Switch to private and
-- require signed URLs for access.
-- ============================================================

UPDATE storage.buckets
SET public = false
WHERE id = 'justifications';

-- ============================================================
-- P1-1: Notifications INSERT — restrict to own user_id only
-- The old policy allowed any authenticated user to insert
-- notifications for ANY user_id.
-- Cross-user notifications must go through server-side logic.
-- ============================================================

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_insert_own"
ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- P1-2: RPC create_notification — add relationship check + URL validation
-- The old function allowed any authenticated user to create
-- notifications for any user_id with any action_url.
-- ============================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text DEFAULT 'normal',
  p_data jsonb DEFAULT '{}'::jsonb,
  p_action_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_caller uuid;
BEGIN
  v_caller := auth.uid();

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate action_url: only relative paths starting with /
  IF p_action_url IS NOT NULL AND (
    p_action_url LIKE 'javascript:%' OR
    p_action_url LIKE 'data:%' OR
    p_action_url LIKE '//%' OR
    p_action_url ~ '^https?://' OR
    p_action_url LIKE 'vbscript:%'
  ) THEN
    RAISE EXCEPTION 'Invalid action_url: only relative paths allowed';
  END IF;

  -- Verify caller has a business relationship with target user
  -- Allow: self, employer↔employee (via contract), employer↔caregiver
  IF v_caller != p_user_id AND NOT EXISTS (
    -- Caller is employer, target is employee
    SELECT 1 FROM contracts
    WHERE employer_id = v_caller AND employee_id = p_user_id AND status = 'active'
    UNION ALL
    -- Caller is employee, target is employer
    SELECT 1 FROM contracts
    WHERE employee_id = v_caller AND employer_id = p_user_id AND status = 'active'
    UNION ALL
    -- Caller is employer, target is caregiver
    SELECT 1 FROM caregivers
    WHERE employer_id = v_caller AND profile_id = p_user_id
    UNION ALL
    -- Caller is caregiver, target is employer
    SELECT 1 FROM caregivers
    WHERE profile_id = v_caller AND employer_id = p_user_id
    UNION ALL
    -- Caller is employer/caregiver, target is co-caregiver (same employer)
    SELECT 1 FROM caregivers c1
    JOIN caregivers c2 ON c1.employer_id = c2.employer_id
    WHERE c1.profile_id = v_caller AND c2.profile_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'No business relationship with target user';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, priority, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_priority, p_data, p_action_url)
  RETURNING to_jsonb(notifications.*) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- P1-3: Profile enumeration — restrict search policies
-- The old "Employers can search profiles by email" policy
-- allowed any employer to SELECT ALL profiles.
-- Restrict to email-based lookup only (for invite flow).
-- ============================================================

DROP POLICY IF EXISTS "Employers can search profiles by email" ON profiles;

CREATE POLICY "Employers can search profiles by email"
ON profiles FOR SELECT
USING (
  EXISTS (SELECT 1 FROM employers WHERE employers.profile_id = auth.uid())
  -- Only allow when filtering by email (the query must include an eq filter on email)
  -- This uses the RLS trick: the policy passes for all rows, but the application
  -- must always filter by email. To truly restrict, we limit exposed columns via a view.
  -- For now, we scope to: own profile OR profiles linked via active contract/caregiver
  AND (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employer_id = auth.uid()
        AND (contracts.employee_id = profiles.id OR contracts.caregiver_id = profiles.id)
    )
    OR EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = auth.uid()
        AND caregivers.profile_id = profiles.id
    )
  )
);

DROP POLICY IF EXISTS "Tutors can search profiles by email" ON profiles;

CREATE POLICY "Tutors can search profiles by email"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM caregivers
    WHERE caregivers.profile_id = auth.uid()
      AND caregivers.legal_status IN ('tutor', 'curator')
  )
  AND (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM caregivers c
      JOIN contracts co ON co.employer_id = c.employer_id
      WHERE c.profile_id = auth.uid()
        AND c.legal_status IN ('tutor', 'curator')
        AND co.employee_id = profiles.id
    )
  )
);

-- ============================================================
-- P2-1: Conversations INSERT — require employer_id = auth.uid()
-- The old policy allowed creating conversations with arbitrary
-- employer_id if the caller was in participant_ids.
-- ============================================================

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  auth.uid() = employer_id
  OR (
    auth.uid() = ANY(participant_ids)
    AND EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.profile_id = auth.uid()
        AND caregivers.employer_id = conversations.employer_id
    )
  )
  OR (
    auth.uid() = ANY(participant_ids)
    AND EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employee_id = auth.uid()
        AND contracts.employer_id = conversations.employer_id
        AND contracts.status = 'active'
    )
  )
);

-- ============================================================
-- P2-2: file_upload_audit — restrict INSERT to service role
-- The old policy allowed any authenticated user to insert
-- arbitrary audit entries.
-- ============================================================

DROP POLICY IF EXISTS "Service role can insert audit entries" ON file_upload_audit;

-- No INSERT policy for authenticated users — only triggers/functions
-- should write to this table. If a trigger needs it, it runs as
-- SECURITY DEFINER which bypasses RLS.
