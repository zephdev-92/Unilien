-- Migration 059 : RPC complete_onboarding
--
-- Remplace l'UPSERT direct sur la table profiles depuis OnboardingRolePage
-- (qui plantait avec un 401 + "role '' does not exist" sur certains signups
-- OAuth, vraisemblablement à cause d'un timing/JWT mal résolu côté PostgREST).
--
-- La RPC est SECURITY DEFINER → tourne avec les privilèges de l'owner et
-- vérifie auth.uid() côté serveur. Atomique : update profile + crée la ligne
-- role-specific (employers/employees) + nettoie l'ancienne ligne orpheline
-- si le rôle change (cas typique : OAuth crée un employer par défaut, l'user
-- choisit ensuite employee/caregiver dans l'onboarding).
--
-- Caregivers : pas de création de ligne caregivers ici — un caregiver est
-- censé entrer dans l'app via une invitation employeur (Edge Function
-- invite-caregiver + addCaregiverToEmployer). L'auto-inscription caregiver
-- reste dans son état actuel (profile.role = 'caregiver' sans ligne liée),
-- à reprendre dans une PR dédiée.

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_role text,
  p_first_name text,
  p_last_name text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_old_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '28000';
  END IF;

  IF p_role NOT IN ('employer', 'employee', 'caregiver') THEN
    RAISE EXCEPTION 'Rôle invalide: %', p_role USING ERRCODE = '22023';
  END IF;

  IF p_first_name IS NULL OR length(trim(p_first_name)) = 0 THEN
    RAISE EXCEPTION 'Le prénom est obligatoire' USING ERRCODE = '22023';
  END IF;

  SELECT role INTO v_old_role FROM profiles WHERE id = v_user_id;

  UPDATE profiles
  SET
    role       = p_role,
    first_name = p_first_name,
    last_name  = COALESCE(p_last_name, ''),
    updated_at = now()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil introuvable pour l''utilisateur %', v_user_id USING ERRCODE = 'P0002';
  END IF;

  -- Création de la ligne role-specific (idempotent)
  IF p_role = 'employer' THEN
    INSERT INTO employers (profile_id, address, pch_beneficiary, emergency_contacts)
    VALUES (v_user_id, '{}'::jsonb, false, ARRAY[]::jsonb[])
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role = 'employee' THEN
    INSERT INTO employees (profile_id)
    VALUES (v_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- Nettoyage de la ligne orpheline si le rôle a changé.
  -- Tolère un échec FK (au cas où des contrats existeraient — improbable au
  -- stade onboarding mais on ne veut pas bloquer l'utilisateur pour ça).
  IF v_old_role IS NOT NULL AND v_old_role <> p_role THEN
    BEGIN
      IF v_old_role = 'employer' THEN
        DELETE FROM employers WHERE profile_id = v_user_id;
      ELSIF v_old_role = 'employee' THEN
        DELETE FROM employees WHERE profile_id = v_user_id;
      END IF;
    EXCEPTION
      WHEN foreign_key_violation THEN
        -- Ligne référencée ailleurs : on laisse en l'état, à corriger manuellement.
        NULL;
    END;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION complete_onboarding(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_onboarding(text, text, text) TO authenticated;

COMMENT ON FUNCTION complete_onboarding(text, text, text)
  IS 'Onboarding utilisateur (SECURITY DEFINER) : update profile + crée la ligne employers/employees selon le rôle, nettoie l''orpheline si le rôle change. Caregiver = update profile uniquement (entrée via invitation employeur).';
