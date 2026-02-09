-- Migration: Fix RLS Policy Conflicts
-- Drops existing policies before recreating them to avoid conflicts
-- This is a fix for migration 020 which failed due to existing policies

-- ============================================
-- DROP ALL EXISTING POLICIES FIRST
-- ============================================

-- EMPLOYERS
DROP POLICY IF EXISTS "Users can read own employer record" ON employers;
DROP POLICY IF EXISTS "Users can update own employer record" ON employers;
DROP POLICY IF EXISTS "Users can insert own employer record" ON employers;
DROP POLICY IF EXISTS "Employees can read employer for active contracts" ON employers;
DROP POLICY IF EXISTS "Caregivers can read linked employer" ON employers;
DROP POLICY IF EXISTS "Tutors and curators can update employer" ON employers;

-- EMPLOYEES
DROP POLICY IF EXISTS "Users can read own employee record" ON employees;
DROP POLICY IF EXISTS "Users can update own employee record" ON employees;
DROP POLICY IF EXISTS "Users can insert own employee record" ON employees;
DROP POLICY IF EXISTS "Employers can read employees for active contracts" ON employees;
DROP POLICY IF EXISTS "Tutors can read employees" ON employees;

-- CONTRACTS
DROP POLICY IF EXISTS "Employers can read own contracts" ON contracts;
DROP POLICY IF EXISTS "Employees can read own contracts" ON contracts;
DROP POLICY IF EXISTS "Employers can create contracts" ON contracts;
DROP POLICY IF EXISTS "Employers can update contracts" ON contracts;
DROP POLICY IF EXISTS "Employers can delete contracts" ON contracts;
DROP POLICY IF EXISTS "Caregivers can read employer contracts" ON contracts;
DROP POLICY IF EXISTS "Tutors can read contracts" ON contracts;
DROP POLICY IF EXISTS "Tutors can create contracts" ON contracts;
DROP POLICY IF EXISTS "Tutors can update contracts" ON contracts;
DROP POLICY IF EXISTS "Tutors can delete contracts" ON contracts;

-- SHIFTS
DROP POLICY IF EXISTS "Employers can read shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can read shifts" ON shifts;
DROP POLICY IF EXISTS "Employers can create shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can create shifts" ON shifts;
DROP POLICY IF EXISTS "Employers can update shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can update shifts" ON shifts;
DROP POLICY IF EXISTS "Employers can delete shifts" ON shifts;
DROP POLICY IF EXISTS "Caregivers can read shifts" ON shifts;
DROP POLICY IF EXISTS "Tutors can read shifts" ON shifts;
DROP POLICY IF EXISTS "Tutors can create shifts" ON shifts;
DROP POLICY IF EXISTS "Tutors can update shifts" ON shifts;
DROP POLICY IF EXISTS "Tutors can delete shifts" ON shifts;

-- ABSENCES
DROP POLICY IF EXISTS "Employees can read own absences" ON absences;
DROP POLICY IF EXISTS "Employers can read employee absences" ON absences;
DROP POLICY IF EXISTS "Employees can create absences" ON absences;
DROP POLICY IF EXISTS "Employees can update own pending absences" ON absences;
DROP POLICY IF EXISTS "Employers can update absence status" ON absences;
DROP POLICY IF EXISTS "Employees can delete own pending absences" ON absences;
DROP POLICY IF EXISTS "Tutors can read absences" ON absences;
DROP POLICY IF EXISTS "Tutors can update absences" ON absences;

-- LOG_ENTRIES
DROP POLICY IF EXISTS "Employers can read log entries" ON log_entries;
DROP POLICY IF EXISTS "Employees can read log entries" ON log_entries;
DROP POLICY IF EXISTS "Caregivers can read log entries" ON log_entries;
DROP POLICY IF EXISTS "Employers can create log entries" ON log_entries;
DROP POLICY IF EXISTS "Employees can create log entries" ON log_entries;
DROP POLICY IF EXISTS "Caregivers can create log entries" ON log_entries;
DROP POLICY IF EXISTS "Authors can update own log entries" ON log_entries;
DROP POLICY IF EXISTS "Employers can update log entries" ON log_entries;
DROP POLICY IF EXISTS "Authors can delete own log entries" ON log_entries;
DROP POLICY IF EXISTS "Tutors can read log entries" ON log_entries;
DROP POLICY IF EXISTS "Tutors can create log entries" ON log_entries;
DROP POLICY IF EXISTS "Tutors can update log entries" ON log_entries;
DROP POLICY IF EXISTS "Tutors can delete log entries" ON log_entries;

-- PROFILES
DROP POLICY IF EXISTS "Authenticated users can search profiles by email" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Employers can read employee profiles" ON profiles;
DROP POLICY IF EXISTS "Employers can read caregiver profiles" ON profiles;
DROP POLICY IF EXISTS "Employees can read employer profiles" ON profiles;
DROP POLICY IF EXISTS "Caregivers can read employer profiles" ON profiles;
DROP POLICY IF EXISTS "Employers can search profiles by email" ON profiles;
DROP POLICY IF EXISTS "Tutors can read employee profiles" ON profiles;
DROP POLICY IF EXISTS "Tutors can search profiles by email" ON profiles;

-- ============================================
-- 1. EMPLOYERS TABLE - Enable RLS & Create Policies
-- ============================================

ALTER TABLE employers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own employer record"
  ON employers FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own employer record"
  ON employers FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can insert own employer record"
  ON employers FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

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

CREATE POLICY "Caregivers can read linked employer"
  ON employers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = employers.profile_id
        AND caregivers.profile_id = auth.uid()
    )
  );

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
-- 2. EMPLOYEES TABLE - Enable RLS & Create Policies
-- ============================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own employee record"
  ON employees FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can insert own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

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
-- 3. CONTRACTS TABLE - Enable RLS & Create Policies
-- ============================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can read own contracts"
  ON contracts FOR SELECT
  USING (auth.uid() = employer_id);

CREATE POLICY "Employees can read own contracts"
  ON contracts FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employers can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update contracts"
  ON contracts FOR UPDATE
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can delete contracts"
  ON contracts FOR DELETE
  USING (auth.uid() = employer_id);

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
-- 4. SHIFTS TABLE - Enable RLS & Create Policies
-- ============================================

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can read shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can read shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employers can create shifts"
  ON shifts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
        AND contracts.employer_id = auth.uid()
    )
  );

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

CREATE POLICY "Employers can update shifts"
  ON shifts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employer_id = auth.uid()
    )
  );

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

CREATE POLICY "Employers can delete shifts"
  ON shifts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = shifts.contract_id
        AND contracts.employer_id = auth.uid()
    )
  );

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
-- 5. ABSENCES TABLE - Enable RLS & Create Policies
-- ============================================

ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read own absences"
  ON absences FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employers can read employee absences"
  ON absences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employee_id = absences.employee_id
        AND contracts.employer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create absences"
  ON absences FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update own pending absences"
  ON absences FOR UPDATE
  USING (auth.uid() = employee_id AND status = 'pending')
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employers can update absence status"
  ON absences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employee_id = absences.employee_id
        AND contracts.employer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can delete own pending absences"
  ON absences FOR DELETE
  USING (auth.uid() = employee_id AND status = 'pending');

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
-- 6. LOG_ENTRIES TABLE - Enable RLS & Create Policies
-- ============================================

ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can read log entries"
  ON log_entries FOR SELECT
  USING (auth.uid() = employer_id);

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

CREATE POLICY "Authors can update own log entries"
  ON log_entries FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Employers can update log entries"
  ON log_entries FOR UPDATE
  USING (auth.uid() = employer_id);

CREATE POLICY "Authors can delete own log entries"
  ON log_entries FOR DELETE
  USING (auth.uid() = author_id);

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

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Employers can read employee profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employee_id = profiles.id
        AND contracts.employer_id = auth.uid()
    )
  );

CREATE POLICY "Employers can read caregiver profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.profile_id = profiles.id
        AND caregivers.employer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can read employer profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employer_id = profiles.id
        AND contracts.employee_id = auth.uid()
    )
  );

CREATE POLICY "Caregivers can read employer profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = profiles.id
        AND caregivers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Employers can search profiles by email"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM employers WHERE employers.profile_id = auth.uid())
  );

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
-- 8. STORAGE - Remove public access
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Public read access for justifications'
  ) THEN
    DROP POLICY "Public read access for justifications" ON storage.objects;
  END IF;

  -- Add tutor policy for storage if not exists
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
    RAISE NOTICE 'Storage policy error: %', SQLERRM;
END $$;
