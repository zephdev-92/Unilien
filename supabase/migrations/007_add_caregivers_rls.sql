-- ============================================
-- Migration: Caregivers RLS Policies
-- Description: Ajoute les politiques RLS pour la gestion des aidants familiaux
-- ============================================

-- S'assurer que RLS est activé
ALTER TABLE IF EXISTS caregivers ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Employers can manage their caregivers" ON caregivers;
DROP POLICY IF EXISTS "Caregivers can view their own record" ON caregivers;
DROP POLICY IF EXISTS "Employers can insert caregivers" ON caregivers;
DROP POLICY IF EXISTS "Employers can update caregivers" ON caregivers;
DROP POLICY IF EXISTS "Employers can delete caregivers" ON caregivers;

-- ============================================
-- SELECT Policies
-- ============================================

-- Les employeurs peuvent voir leurs aidants
CREATE POLICY "Employers can view their caregivers"
  ON caregivers
  FOR SELECT
  USING (
    auth.uid() = employer_id
  );

-- Les aidants peuvent voir leur propre enregistrement
CREATE POLICY "Caregivers can view own record"
  ON caregivers
  FOR SELECT
  USING (
    auth.uid() = profile_id
  );

-- ============================================
-- INSERT Policy
-- ============================================

-- Seuls les employeurs peuvent ajouter des aidants
CREATE POLICY "Employers can insert caregivers"
  ON caregivers
  FOR INSERT
  WITH CHECK (
    auth.uid() = employer_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employer'
    )
  );

-- ============================================
-- UPDATE Policy
-- ============================================

-- Les employeurs peuvent modifier les aidants de leur équipe
CREATE POLICY "Employers can update their caregivers"
  ON caregivers
  FOR UPDATE
  USING (
    auth.uid() = employer_id
  )
  WITH CHECK (
    auth.uid() = employer_id
  );

-- ============================================
-- DELETE Policy
-- ============================================

-- Les employeurs peuvent supprimer les aidants de leur équipe
CREATE POLICY "Employers can delete their caregivers"
  ON caregivers
  FOR DELETE
  USING (
    auth.uid() = employer_id
  );

-- ============================================
-- Commentaires
-- ============================================

COMMENT ON POLICY "Employers can view their caregivers" ON caregivers IS
  'Permet aux employeurs de voir la liste de leurs aidants familiaux';

COMMENT ON POLICY "Caregivers can view own record" ON caregivers IS
  'Permet aux aidants de voir leur propre enregistrement';

COMMENT ON POLICY "Employers can insert caregivers" ON caregivers IS
  'Permet aux employeurs d ajouter des aidants à leur équipe';

COMMENT ON POLICY "Employers can update their caregivers" ON caregivers IS
  'Permet aux employeurs de modifier les permissions de leurs aidants';

COMMENT ON POLICY "Employers can delete their caregivers" ON caregivers IS
  'Permet aux employeurs de retirer des aidants de leur équipe';
