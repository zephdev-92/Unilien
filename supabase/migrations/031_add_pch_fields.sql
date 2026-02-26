/**
 * Migration 031 — PCH : type de prise en charge et heures mensuelles allouées
 *
 * Ajoute deux colonnes à la table `employers` pour stocker les paramètres PCH
 * (Prestation de Compensation du Handicap) nécessaires au calcul de l'enveloppe
 * mensuelle et du reste à charge.
 */

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS pch_type TEXT DEFAULT NULL
    CHECK (pch_type IN ('emploiDirect', 'mandataire', 'prestataire', 'aidantFamilial', 'aidantFamilialCessation')),
  ADD COLUMN IF NOT EXISTS pch_monthly_hours NUMERIC(5, 2) DEFAULT NULL;

COMMENT ON COLUMN employers.pch_type IS 'Type de dispositif PCH : emploiDirect | mandataire | prestataire | aidantFamilial | aidantFamilialCessation';
COMMENT ON COLUMN employers.pch_monthly_hours IS 'Heures mensuelles allouées par le plan de compensation du Conseil Départemental';
