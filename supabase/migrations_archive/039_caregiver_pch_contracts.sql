-- Migration 039 : Contrats aidants PCH (dédommagement CNSA)
-- Permet de planifier des interventions avec un aidant familial

-- 1. Ajouter la catégorie de contrat
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS contract_category TEXT NOT NULL DEFAULT 'employment'
    CHECK (contract_category IN ('employment', 'caregiver_pch'));

-- 2. Ajouter caregiver_id (nullable)
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS caregiver_id UUID REFERENCES profiles(id);

-- 3. Taux horaire PCH (dédommagement CNSA)
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS pch_hourly_rate NUMERIC(10,2);

-- 4. Statut aidant (actif = maintient activité pro, temps_plein = a cessé)
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS caregiver_status TEXT
    CHECK (caregiver_status IN ('active', 'full_time', 'voluntary'));

-- 5. Rendre employee_id nullable (un contrat aidant n'a pas d'employé)
ALTER TABLE contracts
  ALTER COLUMN employee_id DROP NOT NULL;

-- 6. Contrainte : exactement un des deux (employee_id ou caregiver_id) doit être renseigné
ALTER TABLE contracts
  ADD CONSTRAINT chk_contract_party
    CHECK (
      (contract_category = 'employment' AND employee_id IS NOT NULL AND caregiver_id IS NULL)
      OR
      (contract_category = 'caregiver_pch' AND caregiver_id IS NOT NULL AND employee_id IS NULL)
    );

-- 7. Index pour les requêtes par aidant
CREATE INDEX IF NOT EXISTS idx_contracts_caregiver_id ON contracts(caregiver_id)
  WHERE caregiver_id IS NOT NULL;

-- 8. RLS : un aidant peut voir ses propres contrats PCH
CREATE POLICY "Caregiver can view own pch contracts"
  ON contracts FOR SELECT
  USING (caregiver_id = auth.uid());
