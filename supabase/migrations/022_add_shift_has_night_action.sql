-- Migration: Ajouter le champ has_night_action aux interventions
-- Date: 2026-02-03
-- 
-- La majoration de nuit (+20%) ne s'applique que si l'auxiliaire effectue un acte
-- (soin, aide...) pendant les heures de nuit (21h-6h).
-- La simple présence ne donne pas droit à la majoration.
-- Convention Collective IDCC 3239

ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS has_night_action BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN shifts.has_night_action IS 'Indique si un acte (soin, aide) est effectué pendant les heures de nuit. true = majoration +20% appliquée, false = présence seule (pas de majoration), NULL = ancien shift (rétrocompatibilité, majoration appliquée)';

-- Index pour filtrer les interventions avec actes de nuit
CREATE INDEX IF NOT EXISTS idx_shifts_has_night_action
ON shifts (has_night_action)
WHERE has_night_action IS NOT NULL;
