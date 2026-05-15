-- Migration 047: RPC pour suppression de compte utilisateur (RGPD - droit à l'effacement)
-- SECURITY DEFINER car on doit supprimer dans auth.users

-- Fonction : supprime toutes les données + le compte auth de l'utilisateur appelant
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

  -- Récupérer le rôle pour nettoyage spécifique
  SELECT role INTO _role FROM public.profiles WHERE id = _uid;

  -- 1. Tables sans CASCADE sur profiles(id)
  DELETE FROM public.leave_balances WHERE employee_id = _uid OR employer_id = _uid;

  -- 2. Nettoyer caregiver_id sur contracts (pas de CASCADE)
  UPDATE public.contracts SET caregiver_id = NULL WHERE caregiver_id = _uid;

  -- 3. Supprimer les absences (employee_id peut être sans CASCADE)
  DELETE FROM public.absences WHERE employee_id = _uid;

  -- 4. Supprimer les shifts liés aux contrats de l'utilisateur
  IF _role = 'employer' THEN
    DELETE FROM public.shifts WHERE contract_id IN (
      SELECT id FROM public.contracts WHERE employer_id = _uid
    );
    DELETE FROM public.contracts WHERE employer_id = _uid;
    DELETE FROM public.logbook_entries WHERE employer_id = _uid;
  ELSIF _role = 'employee' THEN
    DELETE FROM public.shifts WHERE contract_id IN (
      SELECT id FROM public.contracts WHERE employee_id = _uid
    );
    DELETE FROM public.contracts WHERE employee_id = _uid;
  END IF;

  -- 5. Supprimer les entrées caregivers
  DELETE FROM public.caregivers WHERE caregiver_id = _uid;
  DELETE FROM public.caregivers WHERE employer_id = _uid;

  -- 6. Supprimer les entrées conversation_participants
  DELETE FROM public.conversation_participants WHERE profile_id = _uid;

  -- 7. Supprimer employer/employee record
  DELETE FROM public.employer_health_data WHERE profile_id = _uid;
  DELETE FROM public.employers WHERE profile_id = _uid;
  DELETE FROM public.employees WHERE profile_id = _uid;

  -- 8. Supprimer le profil (cascade notifications, push_subscriptions, etc.)
  DELETE FROM public.profiles WHERE id = _uid;

  -- 9. Supprimer l'utilisateur auth
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

-- Seul l'utilisateur authentifié peut appeler cette fonction
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account() IS 'Supprime le compte et toutes les données associées (RGPD art. 17 - droit à l effacement)';

-- RPC pour supprimer uniquement les données (garder le compte)
CREATE OR REPLACE FUNCTION public.delete_own_data()
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

  -- Supprimer les données métier, garder le profil et le compte auth

  -- 1. Leave balances
  DELETE FROM public.leave_balances WHERE employee_id = _uid OR employer_id = _uid;

  -- 2. Absences
  DELETE FROM public.absences WHERE employee_id = _uid;

  -- 3. Shifts + contrats
  IF _role = 'employer' THEN
    DELETE FROM public.shifts WHERE contract_id IN (
      SELECT id FROM public.contracts WHERE employer_id = _uid
    );
    DELETE FROM public.contracts WHERE employer_id = _uid;
    DELETE FROM public.logbook_entries WHERE employer_id = _uid;
    DELETE FROM public.cesu_declarations WHERE employer_id = _uid;
    DELETE FROM public.payslips WHERE employer_id = _uid;
  ELSIF _role = 'employee' THEN
    DELETE FROM public.shifts WHERE contract_id IN (
      SELECT id FROM public.contracts WHERE employee_id = _uid
    );
    DELETE FROM public.contracts WHERE employee_id = _uid;
  END IF;

  -- 4. Caregivers
  DELETE FROM public.caregivers WHERE caregiver_id = _uid;
  DELETE FROM public.caregivers WHERE employer_id = _uid;

  -- 5. Messages et conversations
  DELETE FROM public.conversation_participants WHERE profile_id = _uid;
  DELETE FROM public.liaison_messages WHERE sender_id = _uid;

  -- 6. Notifications
  DELETE FROM public.notifications WHERE user_id = _uid;

  -- 7. Données santé
  DELETE FROM public.employer_health_data WHERE profile_id = _uid;

  -- 8. Audit logs (conserver pour traçabilité RGPD — on anonymise)
  UPDATE public.audit_logs SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_data() TO authenticated;

COMMENT ON FUNCTION public.delete_own_data() IS 'Supprime les données métier de l utilisateur (interventions, contrats, absences) tout en conservant le compte';
