-- ============================================
-- Migration 050: Politique de conservation des données (RGPD art. 5.1e)
-- ============================================

-- Table de configuration des durées de rétention (modifiable par admin)
CREATE TABLE IF NOT EXISTS data_retention_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_category TEXT NOT NULL UNIQUE,
  retention_months INTEGER NOT NULL,
  description TEXT,
  legal_basis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Politique par défaut
INSERT INTO data_retention_policy (data_category, retention_months, description, legal_basis) VALUES
  ('payslips',           60, 'Bulletins de paie',                    'Code du travail L3243-4 — 5 ans'),
  ('contracts',          60, 'Contrats de travail',                  'Code du travail — 5 ans après fin contrat'),
  ('cesu_declarations',  36, 'Déclarations CESU',                   'Prescription URSSAF — 3 ans'),
  ('health_data',         6, 'Données de santé (employer_health_data)', 'RGPD art. 9 — dès fin de finalité + 6 mois grâce'),
  ('messages',           24, 'Messages et conversations',            'Pas d''obligation légale — 2 ans'),
  ('notifications',       6, 'Notifications et push subscriptions',  'Pas d''obligation légale — 6 mois'),
  ('shifts',             60, 'Interventions (shifts)',               'Lié aux bulletins de paie — 5 ans'),
  ('absences',           60, 'Absences et justificatifs',            'Prescription prud''homale — 5 ans'),
  ('audit_logs',         60, 'Journal d''audit',                     'Traçabilité CNIL recommandée — 5 ans')
ON CONFLICT (data_category) DO NOTHING;

-- RLS : lecture seule pour les utilisateurs authentifiés (admin only pour écriture)
ALTER TABLE data_retention_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read retention policy"
  ON data_retention_policy FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Fonction de purge des données expirées
-- ============================================
-- Appelée manuellement ou via cron (pg_cron / Edge Function schedulée)
-- Purge les données des utilisateurs dont TOUS les contrats sont terminés
-- depuis plus longtemps que la durée de rétention configurée.

CREATE OR REPLACE FUNCTION purge_expired_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy RECORD;
  v_employer RECORD;
  v_cutoff TIMESTAMPTZ;
  v_result jsonb := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  -- Pour chaque employeur dont TOUS les contrats sont terminés
  FOR v_employer IN
    SELECT DISTINCT c.employer_id,
           MAX(c.end_date) AS last_contract_end
    FROM contracts c
    WHERE c.status = 'terminated'
      AND c.end_date IS NOT NULL
    GROUP BY c.employer_id
    -- Exclure les employeurs qui ont encore des contrats actifs
    HAVING NOT EXISTS (
      SELECT 1 FROM contracts c2
      WHERE c2.employer_id = c.employer_id
        AND c2.status IN ('active', 'suspended')
    )
  LOOP
    -- ── Données de santé ──
    SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'health_data';
    v_cutoff := v_employer.last_contract_end::timestamptz + (v_policy.retention_months || ' months')::interval;
    IF now() > v_cutoff THEN
      DELETE FROM employer_health_data WHERE profile_id = v_employer.employer_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('health_data_purged', COALESCE((v_result->>'health_data_purged')::int, 0) + v_count);
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (v_employer.employer_id, 'purge_retention', 'employer_health_data', jsonb_build_object('reason', 'retention_expired', 'cutoff', v_cutoff));
      END IF;
    END IF;

    -- ── Messages et conversations ──
    SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'messages';
    v_cutoff := v_employer.last_contract_end::timestamptz + (v_policy.retention_months || ' months')::interval;
    IF now() > v_cutoff THEN
      -- Supprimer les messages des conversations de cet employeur
      DELETE FROM liaison_messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE employer_id = v_employer.employer_id
      );
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('messages_purged', COALESCE((v_result->>'messages_purged')::int, 0) + v_count);
      END IF;
      -- Supprimer les conversations
      DELETE FROM conversations WHERE employer_id = v_employer.employer_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('conversations_purged', COALESCE((v_result->>'conversations_purged')::int, 0) + v_count);
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (v_employer.employer_id, 'purge_retention', 'conversations', jsonb_build_object('reason', 'retention_expired', 'cutoff', v_cutoff));
      END IF;
    END IF;

    -- ── Notifications ──
    SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'notifications';
    v_cutoff := v_employer.last_contract_end::timestamptz + (v_policy.retention_months || ' months')::interval;
    IF now() > v_cutoff THEN
      DELETE FROM notifications WHERE user_id = v_employer.employer_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('notifications_purged', COALESCE((v_result->>'notifications_purged')::int, 0) + v_count);
      END IF;
      DELETE FROM push_subscriptions WHERE user_id = v_employer.employer_id;
      DELETE FROM notification_preferences WHERE user_id = v_employer.employer_id;
    END IF;

    -- ── Bulletins de paie ──
    SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'payslips';
    v_cutoff := v_employer.last_contract_end::timestamptz + (v_policy.retention_months || ' months')::interval;
    IF now() > v_cutoff THEN
      DELETE FROM payslips WHERE employer_id = v_employer.employer_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('payslips_purged', COALESCE((v_result->>'payslips_purged')::int, 0) + v_count);
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (v_employer.employer_id, 'purge_retention', 'payslips', jsonb_build_object('reason', 'retention_expired', 'cutoff', v_cutoff));
      END IF;
    END IF;

    -- ── Déclarations CESU ──
    SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'cesu_declarations';
    v_cutoff := v_employer.last_contract_end::timestamptz + (v_policy.retention_months || ' months')::interval;
    IF now() > v_cutoff THEN
      DELETE FROM cesu_declarations WHERE employer_id = v_employer.employer_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('cesu_purged', COALESCE((v_result->>'cesu_purged')::int, 0) + v_count);
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (v_employer.employer_id, 'purge_retention', 'cesu_declarations', jsonb_build_object('reason', 'retention_expired', 'cutoff', v_cutoff));
      END IF;
    END IF;

    -- ── Shifts (interventions) ──
    SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'shifts';
    v_cutoff := v_employer.last_contract_end::timestamptz + (v_policy.retention_months || ' months')::interval;
    IF now() > v_cutoff THEN
      DELETE FROM shifts WHERE employer_id = v_employer.employer_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('shifts_purged', COALESCE((v_result->>'shifts_purged')::int, 0) + v_count);
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (v_employer.employer_id, 'purge_retention', 'shifts', jsonb_build_object('reason', 'retention_expired', 'cutoff', v_cutoff));
      END IF;
    END IF;

    -- ── Absences ──
    SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'absences';
    v_cutoff := v_employer.last_contract_end::timestamptz + (v_policy.retention_months || ' months')::interval;
    IF now() > v_cutoff THEN
      DELETE FROM absences WHERE employer_id = v_employer.employer_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('absences_purged', COALESCE((v_result->>'absences_purged')::int, 0) + v_count);
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (v_employer.employer_id, 'purge_retention', 'absences', jsonb_build_object('reason', 'retention_expired', 'cutoff', v_cutoff));
      END IF;
    END IF;

    -- ── Contrats ──
    SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'contracts';
    v_cutoff := v_employer.last_contract_end::timestamptz + (v_policy.retention_months || ' months')::interval;
    IF now() > v_cutoff THEN
      DELETE FROM contracts WHERE employer_id = v_employer.employer_id AND status = 'terminated';
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_result := v_result || jsonb_build_object('contracts_purged', COALESCE((v_result->>'contracts_purged')::int, 0) + v_count);
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (v_employer.employer_id, 'purge_retention', 'contracts', jsonb_build_object('reason', 'retention_expired', 'cutoff', v_cutoff));
      END IF;
    END IF;

  END LOOP;

  -- ── Audit logs (global, pas par employeur) ──
  SELECT retention_months INTO v_policy FROM data_retention_policy WHERE data_category = 'audit_logs';
  v_cutoff := now() - (v_policy.retention_months || ' months')::interval;
  DELETE FROM audit_logs WHERE created_at < v_cutoff AND action != 'purge_retention';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_result := v_result || jsonb_build_object('audit_logs_purged', v_count);
  END IF;

  RETURN v_result;
END;
$$;

-- Note : pour automatiser, activer pg_cron (Supabase Pro) :
-- SELECT cron.schedule('purge-expired-data', '0 3 1 * *', 'SELECT purge_expired_data()');
-- Ou appeler via une Edge Function schedulée / cron externe.
