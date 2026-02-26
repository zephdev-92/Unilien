-- Migration 027 : Traçabilité des soldes de congés initialisés manuellement
-- Permet de distinguer les soldes calculés automatiquement vs saisis lors
-- de la reprise d'historique à la création d'un contrat antérieur.

ALTER TABLE leave_balances
ADD COLUMN IF NOT EXISTS is_manual_init BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN leave_balances.is_manual_init IS
  'true si le solde a été initialisé manuellement lors de la création d''un contrat avec date antérieure';
