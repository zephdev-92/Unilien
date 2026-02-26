-- Migration: Auto-create employees/employers row on signup
-- Date: 2026-02-10
--
-- BUG: handle_new_user ne créait qu'une ligne dans profiles.
-- La ligne employees/employers n'était créée que lors de la visite
-- de la page Profil (upsertEmployee/upsertEmployer).
-- Cela provoquait une erreur FK 23503 quand un employeur tentait
-- de créer un contrat avec un auxiliaire qui n'avait pas encore
-- visité sa page Profil.

-- ============================================
-- 1. Mettre à jour handle_new_user
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  -- Cas 1: INSERT - si email déjà confirmé (auto-confirm)
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL THEN
    _role := COALESCE(NEW.raw_user_meta_data->>'role', 'employer');

    INSERT INTO public.profiles (id, role, first_name, last_name, email, accessibility_settings, created_at, updated_at)
    VALUES (
      NEW.id,
      _role,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      '{}',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Créer la ligne role-specific
    IF _role = 'employee' THEN
      INSERT INTO public.employees (profile_id, qualifications, languages, availability_template)
      VALUES (NEW.id, '{}', '{}', '{}')
      ON CONFLICT (profile_id) DO NOTHING;
    ELSIF _role = 'employer' THEN
      INSERT INTO public.employers (profile_id, address, pch_beneficiary, emergency_contacts)
      VALUES (NEW.id, '{}'::jsonb, false, ARRAY[]::jsonb[])
      ON CONFLICT (profile_id) DO NOTHING;
    ELSIF _role = 'caregiver' THEN
      -- Les caregivers nécessitent un employer_id, pas de création automatique
      NULL;
    END IF;
  END IF;

  -- Cas 2: UPDATE - email vient d'être confirmé
  IF TG_OP = 'UPDATE' AND NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    _role := COALESCE(NEW.raw_user_meta_data->>'role', 'employer');

    INSERT INTO public.profiles (id, role, first_name, last_name, email, accessibility_settings, created_at, updated_at)
    VALUES (
      NEW.id,
      _role,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      '{}',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Créer la ligne role-specific
    IF _role = 'employee' THEN
      INSERT INTO public.employees (profile_id, qualifications, languages, availability_template)
      VALUES (NEW.id, '{}', '{}', '{}')
      ON CONFLICT (profile_id) DO NOTHING;
    ELSIF _role = 'employer' THEN
      INSERT INTO public.employers (profile_id, address, pch_beneficiary, emergency_contacts)
      VALUES (NEW.id, '{}'::jsonb, false, ARRAY[]::jsonb[])
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user IS 'Creates a profile + role-specific row (employees/employers) when user signs up or confirms email.';

-- ============================================
-- 2. Rattrapage des utilisateurs existants
--    qui ont un profil mais pas de ligne employees/employers
-- ============================================

-- Créer les lignes employees manquantes
INSERT INTO public.employees (profile_id, qualifications, languages, availability_template)
SELECT p.id, '{}', '{}', '{}'
FROM public.profiles p
WHERE p.role = 'employee'
  AND NOT EXISTS (
    SELECT 1 FROM public.employees e WHERE e.profile_id = p.id
  );

-- Créer les lignes employers manquantes
INSERT INTO public.employers (profile_id, address, pch_beneficiary, emergency_contacts)
SELECT p.id, '{}'::jsonb, false, ARRAY[]::jsonb[]
FROM public.profiles p
WHERE p.role = 'employer'
  AND NOT EXISTS (
    SELECT 1 FROM public.employers e WHERE e.profile_id = p.id
  );
