-- Migration: Complete RLS Audit Fix
-- Fixes critical security issues identified in RLS audit
--
-- Business Logic:
-- - Employers manage their employees, caregivers, contracts, shifts
-- - Employees can see their employer's info (including handicap for care purposes)
-- - Caregivers can see employer info if they have permission
-- - Each user can only see data relevant to their relationships

-- ============================================
-- 1. EMPLOYERS TABLE - Enable RLS
-- ============================================

ALTER TABLE employers ENABLE ROW LEVEL SECURITY;

-- Users can read their own employer record
CREATE POLICY "Users can read own employer record"
  ON employers FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can update their own employer record
CREATE POLICY "Users can update own employer record"
  ON employers FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Users can insert their own employer record (during signup)
CREATE POLICY "Users can insert own employer record"
  ON employers FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Employees can read employer data for their active contracts
-- (they need to know handicap info to provide proper care)
CREATE POLICY "Employees can read employer for active contracts"
  ON employers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employer_id = employers.profile_id
        AND contracts.employee_id = auth.uid()
        AND contracts.status = 'active'
    )
  );

-- Caregivers can read employer data if linked
CREATE POLICY "Caregivers can read linked employer"
  ON employers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = employers.profile_id
        AND caregivers.profile_id = auth.uid()
    )
  );

-- Tutors/Curators can update employer data (legal authority)
CREATE POLICY "Tutors and curators can update employer"
  ON employers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = employers.profile_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = employers.profile_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

-- ============================================
-- 2. EMPLOYEES TABLE - Enable RLS
-- ============================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Users can read their own employee record
CREATE POLICY "Users can read own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can update their own employee record
CREATE POLICY "Users can update own employee record"
  ON employees FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Users can insert their own employee record (during signup)
CREATE POLICY "Users can insert own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Employers can read employee data for their active contracts
CREATE POLICY "Employers can read employees for active contracts"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employee_id = employees.profile_id
        AND contracts.employer_id = auth.uid()
        AND contracts.status = 'active'
    )
  );

-- Tutors/Curators can read employees of their ward
CREATE POLICY "Tutors can read employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      JOIN contracts ON contracts.employer_id = caregivers.employer_id
      WHERE contracts.employee_id = employees.profile_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

-- ============================================
-- 3. CONTRACTS TABLE - Enable RLS
-- ============================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Employers can read their own contracts
CREATE POLICY "Employers can read own contracts"
  ON contracts FOR SELECT
  USING (auth.uid() = employer_id);

-- Employees can read their own contracts
CREATE POLICY "Employees can read own contracts"
  ON contracts FOR SELECT
  USING (auth.uid() = employee_id);

-- Only employers can create contracts
CREATE POLICY "Employers can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

-- Only employers can update contracts
CREATE POLICY "Employers can update contracts"
  ON contracts FOR UPDATE
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

-- Only employers can delete contracts
CREATE POLICY "Employers can delete contracts"
  ON contracts FOR DELETE
  USING (auth.uid() = employer_id);

-- Caregivers can read contracts for their linked employer
CREATE POLICY "Caregivers can read employer contracts"
  ON contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = contracts.employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.permissions->>'view_planning' = 'true'
    )
  );

-- Tutors/Curators can fully manage contracts (legal authority)
CREATE POLICY "Tutors can read contracts"
  ON contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = contracts.employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can update contracts"
  ON contracts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = contracts.employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can delete contracts"
  ON contracts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = contracts.employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

-- ============================================
-- 4. SHIFTS TABLE - Enable RLS
-- ============================================

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Employers can read shifts for their contracts
CREATE POLICY "Employers can read shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employer_id = auth.uid()
    )
  );

-- Employees can read shifts for their contracts
CREATE POLICY "Employees can read shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employee_id = auth.uid()
    )
  );

-- Employers can create shifts
CREATE POLICY "Employers can create shifts"
  ON shifts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
        AND contracts.employer_id = auth.uid()
    )
  );

-- Employees can create shifts for their contracts
CREATE POLICY "Employees can create shifts"
  ON shifts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
        AND contracts.employee_id = auth.uid()
        AND contracts.status = 'active'
    )
  );

-- Employers can update shifts
CREATE POLICY "Employers can update shifts"
  ON shifts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employer_id = auth.uid()
    )
  );

-- Employees can update shifts for their contracts
CREATE POLICY "Employees can update shifts"
  ON shifts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employee_id = auth.uid()
        AND contracts.status = 'active'
    )
  );

-- Only employers can delete shifts
CREATE POLICY "Employers can delete shifts"
  ON shifts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employer_id = auth.uid()
    )
  );

-- Caregivers can read shifts if they have view_planning permission
CREATE POLICY "Caregivers can read shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      JOIN caregivers ON caregivers.employer_id = contracts.employer_id
      WHERE contracts.id = shifts.contract_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.permissions->>'view_planning' = 'true'
    )
  );

-- Tutors/Curators can fully manage shifts (legal authority)
CREATE POLICY "Tutors can read shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      JOIN caregivers ON caregivers.employer_id = contracts.employer_id
      WHERE contracts.id = shifts.contract_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can create shifts"
  ON shifts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      JOIN caregivers ON caregivers.employer_id = contracts.employer_id
      WHERE contracts.id = contract_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can update shifts"
  ON shifts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      JOIN caregivers ON caregivers.employer_id = contracts.employer_id
      WHERE contracts.id = shifts.contract_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can delete shifts"
  ON shifts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      JOIN caregivers ON caregivers.employer_id = contracts.employer_id
      WHERE contracts.id = shifts.contract_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

-- ============================================
-- 5. ABSENCES TABLE - Complete RLS
-- ============================================

-- RLS may already be enabled, ensure it is
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Drop existing incomplete policies if any
DROP POLICY IF EXISTS "Employees can delete own pending absences" ON absences;

-- Employees can read their own absences
CREATE POLICY "Employees can read own absences"
  ON absences FOR SELECT
  USING (auth.uid() = employee_id);

-- Employers can read absences for their employees
CREATE POLICY "Employers can read employee absences"
  ON absences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employee_id = absences.employee_id
        AND contracts.employer_id = auth.uid()
    )
  );

-- Employees can create absences
CREATE POLICY "Employees can create absences"
  ON absences FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

-- Employees can update their own pending absences
CREATE POLICY "Employees can update own pending absences"
  ON absences FOR UPDATE
  USING (auth.uid() = employee_id AND status = 'pending')
  WITH CHECK (auth.uid() = employee_id);

-- Employers can update absence status (approve/reject)
CREATE POLICY "Employers can update absence status"
  ON absences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employee_id = absences.employee_id
        AND contracts.employer_id = auth.uid()
    )
  );

-- Employees can delete their own pending absences
CREATE POLICY "Employees can delete own pending absences"
  ON absences FOR DELETE
  USING (auth.uid() = employee_id AND status = 'pending');

-- Tutors/Curators can read and manage absences (legal authority)
CREATE POLICY "Tutors can read absences"
  ON absences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      JOIN caregivers ON caregivers.employer_id = contracts.employer_id
      WHERE contracts.employee_id = absences.employee_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can update absences"
  ON absences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      JOIN caregivers ON caregivers.employer_id = contracts.employer_id
      WHERE contracts.employee_id = absences.employee_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

-- ============================================
-- 6. LOG_ENTRIES TABLE - Enable RLS
-- ============================================

ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;

-- Employers can read all entries in their workspace
CREATE POLICY "Employers can read log entries"
  ON log_entries FOR SELECT
  USING (auth.uid() = employer_id);

-- Employees can read entries for employers they work for
CREATE POLICY "Employees can read log entries"
  ON log_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employer_id = log_entries.employer_id
        AND contracts.employee_id = auth.uid()
        AND contracts.status = 'active'
    )
  );

-- Caregivers can read entries if they have logbook permission
CREATE POLICY "Caregivers can read log entries"
  ON log_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = log_entries.employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.permissions->>'view_logbook' = 'true'
    )
  );

-- Users can create entries (employer, employee with contract, caregiver with permission)
CREATE POLICY "Employers can create log entries"
  ON log_entries FOR INSERT
  WITH CHECK (auth.uid() = employer_id AND auth.uid() = author_id);

CREATE POLICY "Employees can create log entries"
  ON log_entries FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employer_id = employer_id
        AND contracts.employee_id = auth.uid()
        AND contracts.status = 'active'
    )
  );

CREATE POLICY "Caregivers can create log entries"
  ON log_entries FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.permissions->>'write_logbook' = 'true'
    )
  );

-- Authors can update their own entries
CREATE POLICY "Authors can update own log entries"
  ON log_entries FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Employers can also update entries in their workspace
CREATE POLICY "Employers can update log entries"
  ON log_entries FOR UPDATE
  USING (auth.uid() = employer_id);

-- Authors can delete their own entries
CREATE POLICY "Authors can delete own log entries"
  ON log_entries FOR DELETE
  USING (auth.uid() = author_id);

-- Tutors/Curators have full access to log entries (legal authority)
CREATE POLICY "Tutors can read log entries"
  ON log_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = log_entries.employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can create log entries"
  ON log_entries FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can update log entries"
  ON log_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = log_entries.employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

CREATE POLICY "Tutors can delete log entries"
  ON log_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = log_entries.employer_id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

-- ============================================
-- 7. PROFILES TABLE - Restrict SELECT
-- ============================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can search profiles by email" ON profiles;

-- Users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Employers can read profiles of their employees
CREATE POLICY "Employers can read employee profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employee_id = profiles.id
        AND contracts.employer_id = auth.uid()
    )
  );

-- Employers can read profiles of their caregivers
CREATE POLICY "Employers can read caregiver profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.profile_id = profiles.id
        AND caregivers.employer_id = auth.uid()
    )
  );

-- Employees can read profiles of their employers
CREATE POLICY "Employees can read employer profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employer_id = profiles.id
        AND contracts.employee_id = auth.uid()
    )
  );

-- Caregivers can read profiles of their linked employers
CREATE POLICY "Caregivers can read employer profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = profiles.id
        AND caregivers.profile_id = auth.uid()
    )
  );

-- Allow email search for adding employees/caregivers (limited info)
-- This is needed for the "add by email" feature
CREATE POLICY "Employers can search profiles by email"
  ON profiles FOR SELECT
  USING (
    -- Only employers can search
    EXISTS (SELECT 1 FROM employers WHERE employers.profile_id = auth.uid())
  );

-- Tutors/Curators can read profiles of employees working for their ward
CREATE POLICY "Tutors can read employee profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      JOIN contracts ON contracts.employer_id = caregivers.employer_id
      WHERE contracts.employee_id = profiles.id
        AND caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

-- Tutors/Curators can search profiles (like employers)
CREATE POLICY "Tutors can search profiles by email"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.profile_id = auth.uid()
        AND caregivers.legal_status IN ('tutor', 'curator')
    )
  );

-- ============================================
-- 8. STORAGE - Remove public access to justifications
-- ============================================

-- Note: Storage policies are in storage.objects table
-- This needs to be run with appropriate permissions

DO $$
BEGIN
  -- Try to drop the public read policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Public read access for justifications'
  ) THEN
    DROP POLICY "Public read access for justifications" ON storage.objects;
  END IF;

  -- Add policy for tutors/curators to read justifications
  -- They have legal authority to access medical documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Tutors can read justifications'
  ) THEN
    CREATE POLICY "Tutors can read justifications" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'justifications'
      AND EXISTS (
        SELECT 1 FROM caregivers
        JOIN contracts ON contracts.employer_id = caregivers.employer_id
        WHERE contracts.employee_id::text = (storage.foldername(name))[1]
          AND caregivers.profile_id = auth.uid()
          AND caregivers.legal_status IN ('tutor', 'curator')
      )
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Policy might not exist or we don't have permission
    RAISE NOTICE 'Storage policy error: %', SQLERRM;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can read own employer record" ON employers IS 'Users can always access their own employer data';
COMMENT ON POLICY "Employees can read employer for active contracts" ON employers IS 'Employees need employer info (including handicap) to provide proper care';
COMMENT ON POLICY "Caregivers can read linked employer" ON employers IS 'Caregivers need employer info to assist properly';

COMMENT ON POLICY "Employers can read employees for active contracts" ON employees IS 'Employers can view their employee data';

COMMENT ON POLICY "Employers can read own contracts" ON contracts IS 'Employers manage their contracts';
COMMENT ON POLICY "Employees can read own contracts" ON contracts IS 'Employees can view their work contracts';

COMMENT ON POLICY "Caregivers can read shifts" ON shifts IS 'Caregivers with view_planning permission can see the schedule';

COMMENT ON POLICY "Employers can read employee absences" ON absences IS 'Employers need to manage employee absences';
COMMENT ON POLICY "Employers can update absence status" ON absences IS 'Employers approve or reject absence requests';

COMMENT ON POLICY "Caregivers can read log entries" ON log_entries IS 'Caregivers with view_logbook permission can read the logbook';
COMMENT ON POLICY "Caregivers can create log entries" ON log_entries IS 'Caregivers with write_logbook permission can add entries';

-- Tutor/Curator comments
COMMENT ON POLICY "Tutors and curators can update employer" ON employers IS 'Legal representatives (tutors/curators) can manage employer data';
COMMENT ON POLICY "Tutors can read contracts" ON contracts IS 'Legal representatives have full access to contracts';
COMMENT ON POLICY "Tutors can create contracts" ON contracts IS 'Legal representatives can create contracts on behalf of their ward';
COMMENT ON POLICY "Tutors can read shifts" ON shifts IS 'Legal representatives have full access to shifts';
COMMENT ON POLICY "Tutors can read absences" ON absences IS 'Legal representatives can view and manage absences';
COMMENT ON POLICY "Tutors can read log entries" ON log_entries IS 'Legal representatives have full access to logbook';
