-- ============================================
-- Migration 052 : payslips — colonnes calculées rendues optionnelles
-- Contexte : on abandonne la génération du bulletin côté app. L'employeur
-- upload désormais le bulletin officiel reçu de l'URSSAF (CESU déclaratif).
-- Les montants dénormalisés ne sont plus extraits d'un PDF importé : ils
-- deviennent optionnels pour accepter un enregistrement "upload-only"
-- tout en conservant les bulletins historiquement générés.
-- ============================================

ALTER TABLE public.payslips
  ALTER COLUMN gross_pay     DROP NOT NULL,
  ALTER COLUMN net_pay       DROP NOT NULL,
  ALTER COLUMN total_hours   DROP NOT NULL,
  ALTER COLUMN period_label  DROP NOT NULL;
