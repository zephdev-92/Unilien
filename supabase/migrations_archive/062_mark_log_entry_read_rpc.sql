-- Migration 062 : RPC mark_log_entry_read
--
-- Même pattern que la migration 061 (mark_liaison_messages_read).
--
-- Bug initial : `markAsRead` côté client tente un UPDATE direct sur
-- log_entries pour ajouter l'auth.uid() dans le tableau read_by. Or les
-- policies RLS UPDATE existantes (migration 021) restreignent l'UPDATE à
-- trois cas :
--   - author_id = auth.uid()
--   - employer_id = auth.uid()
--   - caregivers.legal_status IN ('tutor', 'curator')
-- Un employé non-auteur qui peut LIRE l'entrée (via contract + recipient
-- broadcast ou ciblé), ou un caregiver avec uniquement `view_logbook`,
-- voit son UPDATE bloqué silencieusement (0 ligne match → pas d'erreur).
-- Résultat : read_by ne contient jamais le lecteur, le compteur de non
-- lus revient après refresh.
--
-- Fix : RPC SECURITY DEFINER qui vérifie côté serveur que l'utilisateur a
-- bien le droit de LIRE l'entrée (mêmes 4 cas que les policies SELECT)
-- avant d'ajouter son uid à read_by.

CREATE OR REPLACE FUNCTION mark_log_entry_read(
  p_entry_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_employer_id uuid;
  v_recipient_id uuid;
  v_read_by uuid[];
  v_has_access boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  SELECT employer_id, recipient_id, read_by
    INTO v_employer_id, v_recipient_id, v_read_by
  FROM log_entries
  WHERE id = p_entry_id;

  IF v_employer_id IS NULL THEN
    RAISE EXCEPTION 'Entrée introuvable' USING ERRCODE = 'P0002';
  END IF;

  -- Mêmes 4 cas que les policies SELECT (migration 021) :
  -- employer / employee via contrat actif / caregiver view_logbook /
  -- tutor-curator. On exige en plus que l'entrée soit destinée à
  -- l'utilisateur (broadcast OU dirigée vers lui) pour les employés —
  -- cohérent avec le filtre côté getLogEntries.
  v_has_access := (
    v_user_id = v_employer_id
    OR EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.employer_id = v_employer_id
        AND contracts.employee_id = v_user_id
        AND contracts.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.employer_id = v_employer_id
        AND caregivers.profile_id = v_user_id
        AND (
          caregivers.permissions->>'view_logbook' = 'true'
          OR caregivers.legal_status IN ('tutor', 'curator')
        )
    )
  );

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Accès refusé à cette entrée' USING ERRCODE = '42501';
  END IF;

  -- Idempotent : si déjà lu, on ne touche pas.
  IF v_read_by IS NOT NULL AND v_user_id = ANY(v_read_by) THEN
    RETURN false;
  END IF;

  UPDATE log_entries
  SET read_by = COALESCE(read_by, ARRAY[]::uuid[]) || ARRAY[v_user_id]
  WHERE id = p_entry_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION mark_log_entry_read(uuid) FROM public;
GRANT EXECUTE ON FUNCTION mark_log_entry_read(uuid) TO authenticated;
