-- ============================================
-- Migration 025: Refonte du système d'absences
-- Conformité IDCC 3239 (Convention Collective Particuliers Employeurs)
-- ============================================

-- Extension nécessaire pour EXCLUDE USING GIST avec daterange
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- 1. Nouvelles colonnes sur absences
-- ============================================

ALTER TABLE public.absences
  ADD COLUMN IF NOT EXISTS business_days_count smallint,
  ADD COLUMN IF NOT EXISTS justification_due_date date,
  ADD COLUMN IF NOT EXISTS family_event_type text,
  ADD COLUMN IF NOT EXISTS leave_year text;

-- ============================================
-- 2. Nettoyage des chevauchements existants
-- Rejeter les absences en conflit (garder la plus ancienne)
-- ============================================

UPDATE public.absences a
SET status = 'rejected'
WHERE a.status IN ('pending', 'approved')
  AND EXISTS (
    SELECT 1 FROM public.absences b
    WHERE b.employee_id = a.employee_id
      AND b.id != a.id
      AND b.status IN ('pending', 'approved')
      AND daterange(b.start_date, b.end_date, '[]') && daterange(a.start_date, a.end_date, '[]')
      AND b.created_at < a.created_at
  );

-- ============================================
-- 3. Contrainte anti-chevauchement
-- Un employé ne peut pas avoir 2 absences (pending ou approved)
-- sur la même période
-- ============================================

ALTER TABLE public.absences
  ADD CONSTRAINT absences_no_overlap
  EXCLUDE USING GIST (
    employee_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  )
  WHERE (status IN ('pending', 'approved'));

-- ============================================
-- 4. Contrainte sur family_event_type
-- ============================================

ALTER TABLE public.absences
  ADD CONSTRAINT absences_family_event_type_check
  CHECK (
    (absence_type != 'family_event') OR
    (family_event_type IS NOT NULL AND family_event_type IN (
      'marriage', 'pacs', 'birth', 'adoption',
      'death_spouse', 'death_parent', 'death_child',
      'death_sibling', 'death_in_law',
      'child_marriage', 'disability_announcement'
    ))
  );

-- ============================================
-- 5. Table leave_balances (soldes de congés)
-- ============================================

CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  employer_id uuid NOT NULL REFERENCES public.profiles(id),
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  leave_year text NOT NULL,
  acquired_days numeric(5,2) NOT NULL DEFAULT 0,
  taken_days numeric(5,2) NOT NULL DEFAULT 0,
  adjustment_days numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contract_id, leave_year)
);

-- Trigger updated_at
CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. RLS sur leave_balances
-- ============================================

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- L'employé voit ses propres soldes
CREATE POLICY "employee_view_own_balance"
  ON public.leave_balances
  FOR SELECT
  USING (employee_id = auth.uid());

-- L'employeur voit les soldes de ses employés
CREATE POLICY "employer_view_balances"
  ON public.leave_balances
  FOR SELECT
  USING (employer_id = auth.uid());

-- L'employeur gère les soldes (insert/update/delete)
CREATE POLICY "employer_manage_balances"
  ON public.leave_balances
  FOR ALL
  USING (employer_id = auth.uid());
