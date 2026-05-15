-- Migration 043: Séparation des données de santé employeur
-- Les colonnes handicap_type, handicap_name, specific_needs sont déplacées
-- vers une table dédiée avec RLS strict (propriétaire uniquement)
-- Conformité RGPD article 9

-- 1. Créer la table dédiée
CREATE TABLE IF NOT EXISTS employer_health_data (
  profile_id UUID PRIMARY KEY REFERENCES employers(profile_id) ON DELETE CASCADE,
  handicap_type TEXT DEFAULT NULL,
  handicap_name TEXT DEFAULT NULL,
  specific_needs TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Migrer les données existantes
INSERT INTO employer_health_data (profile_id, handicap_type, handicap_name, specific_needs)
SELECT profile_id, handicap_type, handicap_name, specific_needs
FROM employers
WHERE handicap_type IS NOT NULL
   OR handicap_name IS NOT NULL
   OR specific_needs IS NOT NULL
ON CONFLICT (profile_id) DO NOTHING;

-- 3. RLS strict : uniquement le propriétaire
ALTER TABLE employer_health_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own health data"
  ON employer_health_data FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Owner can insert own health data"
  ON employer_health_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Owner can update own health data"
  ON employer_health_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 4. Supprimer les colonnes de la table employers
ALTER TABLE employers DROP COLUMN IF EXISTS handicap_type;
ALTER TABLE employers DROP COLUMN IF EXISTS handicap_name;
ALTER TABLE employers DROP COLUMN IF EXISTS specific_needs;

-- 5. Commentaires
COMMENT ON TABLE employer_health_data IS 'Données de santé employeur (RGPD art. 9) — accès restreint au propriétaire uniquement';
COMMENT ON COLUMN employer_health_data.handicap_type IS 'Type de handicap (moteur, visuel, auditif, etc.)';
COMMENT ON COLUMN employer_health_data.handicap_name IS 'Précision ou nom du handicap';
COMMENT ON COLUMN employer_health_data.specific_needs IS 'Besoins spécifiques liés au handicap';
