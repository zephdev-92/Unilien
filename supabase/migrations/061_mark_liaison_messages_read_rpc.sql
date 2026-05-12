-- Migration 061 : RPC mark_liaison_messages_read
--
-- Bug initial : `markAllMessagesAsRead` côté client tentait un UPDATE direct
-- sur liaison_messages pour ajouter l'auth.uid() dans le tableau read_by.
-- La policy RLS UPDATE existante (migration 001) restreint l'UPDATE à
-- `auth.uid() = sender_id` → seul l'auteur peut modifier son message.
-- Conséquence : l'UPDATE était silencieusement bloqué (aucune ligne ne
-- matche le filtre RLS), donc read_by ne contenait jamais le lecteur, et
-- le compteur de non-lus revenait après un refresh.
--
-- Fix : RPC SECURITY DEFINER qui marque tous les messages non lus d'une
-- conversation comme lus pour l'auth.uid() courant. Vérifie côté serveur
-- que l'utilisateur est bien participant de la conversation (employer,
-- participant_ids, ou via contracts/caregivers — mêmes règles d'accès
-- que la policy SELECT sur conversations).

CREATE OR REPLACE FUNCTION mark_liaison_messages_read(
  p_conversation_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated_count integer := 0;
  v_has_access boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  -- Vérifie l'accès à la conversation : même logique que la policy SELECT
  -- sur conversations (migration 035) — employer, participant, ou lié via
  -- un contrat / un rôle d'aidant pour cet employeur.
  SELECT EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.employer_id = v_user_id
        OR v_user_id = ANY(c.participant_ids)
        OR EXISTS (
          SELECT 1 FROM contracts
          WHERE contracts.employer_id = c.employer_id
            AND contracts.employee_id = v_user_id
        )
        OR EXISTS (
          SELECT 1 FROM caregivers
          WHERE caregivers.employer_id = c.employer_id
            AND caregivers.profile_id = v_user_id
        )
      )
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Accès refusé à cette conversation' USING ERRCODE = '42501';
  END IF;

  -- Ajoute v_user_id dans read_by pour tous les messages non lus que
  -- l'utilisateur n'a pas envoyés. array_append + NULL-safe.
  UPDATE liaison_messages
  SET read_by = COALESCE(read_by, ARRAY[]::uuid[]) || ARRAY[v_user_id]
  WHERE conversation_id = p_conversation_id
    AND sender_id <> v_user_id
    AND (read_by IS NULL OR NOT (v_user_id = ANY(read_by)));

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION mark_liaison_messages_read(uuid) FROM public;
GRANT EXECUTE ON FUNCTION mark_liaison_messages_read(uuid) TO authenticated;
