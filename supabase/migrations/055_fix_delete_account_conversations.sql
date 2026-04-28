-- Migration 055 : corrige delete_own_account
-- La table conversation_participants n'existe pas (l'archi conversations stocke
-- les participants dans un array conversations.participant_ids).
-- Suppression de la ligne fautive + retrait de l'utilisateur du tableau de
-- participants pour éviter les UUID orphelins.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _role TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO _role FROM public.profiles WHERE id = _uid;

  -- 1. Tables FK vers profiles sans CASCADE
  DELETE FROM public.leave_balances WHERE employee_id = _uid OR employer_id = _uid;
  DELETE FROM public.log_entries WHERE author_id = _uid OR recipient_id = _uid;
  DELETE FROM public.notifications WHERE user_id = _uid;

  -- 2. Nettoyer caregiver_id sur contracts (NO ACTION)
  UPDATE public.contracts SET caregiver_id = NULL WHERE caregiver_id = _uid;

  -- 3. Absences
  DELETE FROM public.absences WHERE employee_id = _uid;

  -- 4. Shifts liés aux contrats de l'utilisateur
  IF _role = 'employer' THEN
    DELETE FROM public.shifts WHERE contract_id IN (
      SELECT id FROM public.contracts WHERE employer_id = _uid
    );
    DELETE FROM public.contracts WHERE employer_id = _uid;
    DELETE FROM public.log_entries WHERE employer_id = _uid;
  ELSIF _role = 'employee' THEN
    DELETE FROM public.shifts WHERE contract_id IN (
      SELECT id FROM public.contracts WHERE employee_id = _uid
    );
    DELETE FROM public.contracts WHERE employee_id = _uid;
  END IF;

  -- 5. Caregivers (utilise profile_id, pas caregiver_id)
  DELETE FROM public.caregivers WHERE profile_id = _uid;
  DELETE FROM public.caregivers WHERE employer_id = _uid;

  -- 6. Conversations : retirer l'utilisateur du tableau participant_ids
  --    (les conversations dont il est employer sont supprimées via CASCADE en étape 8)
  UPDATE public.conversations
     SET participant_ids = array_remove(participant_ids, _uid)
   WHERE _uid = ANY(participant_ids);

  -- 7. Données métier
  DELETE FROM public.employer_health_data WHERE profile_id = _uid;
  DELETE FROM public.employers WHERE profile_id = _uid;
  DELETE FROM public.employees WHERE profile_id = _uid;

  -- 8. Profil (CASCADE vers caregivers, intervention_settings, convention_settings,
  --    cesu_declarations, payslips, push_subscriptions, notification_preferences,
  --    shopping_article_history, liaison_messages, conversations…)
  DELETE FROM public.profiles WHERE id = _uid;

  -- 9. Compte auth (CASCADE vers audit_logs, user_consents)
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

COMMENT ON FUNCTION public.delete_own_account() IS 'Supprime le compte et toutes les données associées (RGPD art. 17 - droit à l effacement)';
