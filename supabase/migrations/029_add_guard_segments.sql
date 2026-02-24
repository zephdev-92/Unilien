-- Migration 029 : Garde 24h avec 3 segments configurables
-- Ajoute fin du bloc de nuit + types des segments jour (avant/après nuit)

-- Fin du bloc de présence de nuit (ex: "07:00")
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS guard_night_end_time TEXT DEFAULT NULL
  CHECK (
    guard_night_end_time IS NULL
    OR guard_night_end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

-- Type du segment avant la nuit (travail effectif ou présence de jour)
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS guard_before_type TEXT DEFAULT NULL
  CHECK (guard_before_type IS NULL OR guard_before_type IN ('effective', 'presence_day'));

-- Type du segment après la nuit (travail effectif ou présence de jour)
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS guard_after_type TEXT DEFAULT NULL
  CHECK (guard_after_type IS NULL OR guard_after_type IN ('effective', 'presence_day'));

COMMENT ON COLUMN shifts.guard_night_end_time IS
  'Pour guard_24h 3-segments : heure HH:mm de fin de présence de nuit. NULL = mode 1-bascule (tout après guardNightStartTime = nuit).';

COMMENT ON COLUMN shifts.guard_before_type IS
  'Pour guard_24h : type du segment avant la nuit (effective | presence_day). NULL = effective par défaut.';

COMMENT ON COLUMN shifts.guard_after_type IS
  'Pour guard_24h : type du segment après la nuit (effective | presence_day). NULL = effective par défaut.';
