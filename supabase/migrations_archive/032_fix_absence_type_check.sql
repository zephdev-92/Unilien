-- ============================================
-- Migration 032: Fix contrainte absence_type
-- Ajout de 'family_event' et 'emergency' à la liste des valeurs autorisées
-- ============================================

-- Suppression de l'ancienne contrainte (créée lors de l'init de la table)
ALTER TABLE public.absences
  DROP CONSTRAINT IF EXISTS absences_absence_type_check;

-- Recréation avec toutes les valeurs définies dans l'application
ALTER TABLE public.absences
  ADD CONSTRAINT absences_absence_type_check
  CHECK (absence_type IN (
    'sick',
    'vacation',
    'family_event',
    'training',
    'unavailable',
    'emergency'
  ));
