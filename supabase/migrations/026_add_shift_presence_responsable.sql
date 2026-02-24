-- Migration: Ajouter le support des heures de présence responsable
-- Date: 2026-02-17
--
-- Convention Collective IDCC 3239 :
-- - Présence responsable de jour (Art. 137.1) : 1h = 2/3h de travail effectif
-- - Présence responsable de nuit (Art. 148) : indemnité forfaitaire >= 1/4 du salaire horaire
--   Max 12h consécutives, max 5 nuits consécutives
--   Requalification en travail effectif si >= 4 interventions par nuit

-- Type d'intervention
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS shift_type TEXT NOT NULL DEFAULT 'effective'
  CHECK (shift_type IN ('effective', 'presence_day', 'presence_night'));

COMMENT ON COLUMN shifts.shift_type IS
  'Type d''intervention : effective = travail effectif (défaut), presence_day = présence responsable de jour (conversion 2/3), presence_night = présence responsable de nuit (forfaitaire 1/4)';

-- Nombre d'interventions pendant une présence de nuit (pour seuil de requalification)
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS night_interventions_count INTEGER DEFAULT NULL
  CHECK (night_interventions_count IS NULL OR night_interventions_count >= 0);

COMMENT ON COLUMN shifts.night_interventions_count IS
  'Nombre d''interventions pendant une présence responsable de nuit. Si >= 4, la plage est requalifiée en travail effectif (Art. 148 IDCC 3239)';

-- Flag de requalification (auto-calculé côté app si >= 4 interventions nuit)
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS is_requalified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN shifts.is_requalified IS
  'true si la présence de nuit est requalifiée en travail effectif (>= 4 interventions). Calculé automatiquement côté application';

-- Heures de travail effectif après conversion (2/3 pour présence jour, 100% si requalifié)
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS effective_hours DECIMAL DEFAULT NULL;

COMMENT ON COLUMN shifts.effective_hours IS
  'Heures de travail effectif après conversion. Pour présence jour : durée × 2/3. Pour présence nuit requalifiée : durée × 1. NULL = ancien shift ou travail effectif (utiliser la durée brute)';

-- Index pour filtrer par type d'intervention
CREATE INDEX IF NOT EXISTS idx_shifts_shift_type
ON shifts (shift_type)
WHERE shift_type != 'effective';

-- Index composite pour les requêtes de compliance sur les nuits consécutives
CREATE INDEX IF NOT EXISTS idx_shifts_presence_night_date
ON shifts (contract_id, date)
WHERE shift_type = 'presence_night';
