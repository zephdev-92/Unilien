-- Migration: Ajouter le type de shift "Garde 24h" (guard_24h)
-- Date: 2026-02-18
--
-- Convention Collective IDCC 3239 :
-- La garde de 24h combine travail effectif (jour) et présence responsable de nuit.
-- Elle n'est PAS 24h de travail effectif pur (illégal, max 10h/12h par jour).
-- Le point de bascule (guard_night_start_time) détermine quand commence la présence de nuit.
--
-- Règles :
-- - Partie travail effectif (start → guard_night_start_time) : max 12h
-- - Partie présence de nuit (guard_night_start_time → end) : max 12h (Art. 148 IDCC 3239)
-- - Total amplitude : 24h

-- Étendre le CHECK constraint shift_type pour inclure 'guard_24h'
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_shift_type_check;

ALTER TABLE shifts ADD CONSTRAINT shifts_shift_type_check
  CHECK (shift_type IN ('effective', 'presence_day', 'presence_night', 'guard_24h'));

COMMENT ON COLUMN shifts.shift_type IS
  'Type d''intervention : effective = travail effectif (défaut), presence_day = présence responsable de jour (conversion 2/3), presence_night = présence responsable de nuit (forfaitaire 1/4), guard_24h = garde 24h composite (travail effectif + présence nuit)';

-- Heure de bascule : moment où le travail effectif se termine et la présence de nuit commence
-- Format HH:mm, ex: "20:00" pour une garde 08:00→20:00 effectif + 20:00→08:00 présence nuit
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS guard_night_start_time TEXT DEFAULT NULL
  CHECK (guard_night_start_time IS NULL OR guard_night_start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

COMMENT ON COLUMN shifts.guard_night_start_time IS
  'Pour guard_24h uniquement : heure HH:mm à partir de laquelle débute la présence responsable de nuit. Ex: "20:00" = travail effectif 08:00→20:00 (12h), présence nuit 20:00→08:00 (12h). NULL pour les autres types.';

-- Index pour les gardes 24h
CREATE INDEX IF NOT EXISTS idx_shifts_guard_24h
ON shifts (contract_id, date)
WHERE shift_type = 'guard_24h';
