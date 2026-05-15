/**
 * Migration 030 — Garde 24h : N segments libres (JSONB)
 *
 * Remplace le modèle 3-segments fixés (migrations 028 + 029) par un tableau
 * JSONB de segments libres. Table rase des gardes 24h existantes (feature en dev).
 */

-- 1. Supprimer les gardes 24h existantes (feature en développement, pas en production)
DELETE FROM shifts WHERE shift_type = 'guard_24h';

-- 2. Supprimer les 4 anciens champs fixes introduits par les migrations 028 et 029
ALTER TABLE shifts DROP COLUMN IF EXISTS guard_night_start_time;
ALTER TABLE shifts DROP COLUMN IF EXISTS guard_night_end_time;
ALTER TABLE shifts DROP COLUMN IF EXISTS guard_before_type;
ALTER TABLE shifts DROP COLUMN IF EXISTS guard_after_type;

-- 3. Ajouter le nouveau champ JSONB pour N segments libres
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS guard_segments JSONB DEFAULT NULL;

COMMENT ON COLUMN shifts.guard_segments IS
  'Pour guard_24h : tableau JSON de segments [{startTime, type, breakMinutes?}]. '
  'segments[0].startTime = shift.start_time (verrouillé). '
  'La fin du segment[n] = segments[n+1].startTime. '
  'La fin du dernier segment = start_time du shift (+24h implicite). '
  'NULL pour tous les autres types d''intervention.';
