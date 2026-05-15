-- =============================================================================
-- 000_baseline_schema.sql — Schéma de référence (baseline)
-- =============================================================================
-- Snapshot du schéma `public` de la base de production (VPS self-hosted),
-- généré le 2026-05-15 via `pg_dump --schema-only --schema=public`.
--
-- POURQUOI : l'historique de migrations d'origine (001 → 065) était partiel —
-- il supposait l'existence préalable des tables de base (profiles, contracts,
-- caregivers…) jamais créées par une migration. `supabase db reset` échouait
-- donc dès la migration 001. Ce baseline squash rétablit une chaîne de
-- migrations complète et rejouable depuis zéro.
--
-- Les 64 migrations historiques sont conservées dans `supabase/migrations_archive/`
-- (référence + historique git), hors du chemin de reset.
--
-- TRANSFORMATIONS appliquées au dump brut :
--   - retrait des méta-commandes `\restrict` / `\unrestrict` (pg_dump pg17)
--   - `CREATE SCHEMA public` rendu idempotent (`IF NOT EXISTS`)
--   - `supabase_admin` → `postgres` : le rôle qui applique les migrations en
--     local n'est pas membre de `supabase_admin` (cf. README).
--
-- NB : les objets hors schéma `public` (trigger sur auth.users de la mig. 060,
-- buckets storage) ne sont pas inclus — non requis pour les tests RLS locaux.
-- =============================================================================

-- Extensions requises par le schéma public
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgsodium;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: complete_onboarding(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.complete_onboarding(p_role text, p_first_name text, p_last_name text DEFAULT ''::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


ALTER FUNCTION public.complete_onboarding(p_role text, p_first_name text, p_last_name text) OWNER TO postgres;

--
-- Name: FUNCTION complete_onboarding(p_role text, p_first_name text, p_last_name text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.complete_onboarding(p_role text, p_first_name text, p_last_name text) IS 'Onboarding utilisateur (SECURITY DEFINER) : update profile + crée la ligne employers/employees selon le rôle, nettoie l''orpheline si le rôle change. Caregiver = update profile uniquement (entrée via invitation employeur).';


--
-- Name: count_working_days(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.count_working_days(p_start date, p_end date) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT COUNT(*)::integer
  FROM generate_series(p_start, p_end, '1 day'::interval) AS d
  WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 6;
$$;


ALTER FUNCTION public.count_working_days(p_start date, p_end date) OWNER TO postgres;

--
-- Name: create_notification(uuid, text, text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_priority text DEFAULT 'normal'::text, p_data jsonb DEFAULT '{}'::jsonb, p_action_url text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_caller uuid;
BEGIN
  v_caller := auth.uid();

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate action_url: only relative paths starting with /
  IF p_action_url IS NOT NULL AND (
    p_action_url LIKE 'javascript:%' OR
    p_action_url LIKE 'data:%' OR
    p_action_url LIKE '//%' OR
    p_action_url ~ '^https?://' OR
    p_action_url LIKE 'vbscript:%'
  ) THEN
    RAISE EXCEPTION 'Invalid action_url: only relative paths allowed';
  END IF;

  -- Verify caller has a business relationship with target user
  -- Allow: self, employer↔employee (via contract), employer↔caregiver
  IF v_caller != p_user_id AND NOT EXISTS (
    -- Caller is employer, target is employee
    SELECT 1 FROM contracts
    WHERE employer_id = v_caller AND employee_id = p_user_id AND status = 'active'
    UNION ALL
    -- Caller is employee, target is employer
    SELECT 1 FROM contracts
    WHERE employee_id = v_caller AND employer_id = p_user_id AND status = 'active'
    UNION ALL
    -- Caller is employer, target is caregiver
    SELECT 1 FROM caregivers
    WHERE employer_id = v_caller AND profile_id = p_user_id
    UNION ALL
    -- Caller is caregiver, target is employer
    SELECT 1 FROM caregivers
    WHERE profile_id = v_caller AND employer_id = p_user_id
    UNION ALL
    -- Caller is employer/caregiver, target is co-caregiver (same employer)
    SELECT 1 FROM caregivers c1
    JOIN caregivers c2 ON c1.employer_id = c2.employer_id
    WHERE c1.profile_id = v_caller AND c2.profile_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'No business relationship with target user';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, priority, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_priority, p_data, p_action_url)
  RETURNING to_jsonb(notifications.*) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_priority text, p_data jsonb, p_action_url text) OWNER TO postgres;

--
-- Name: decrypt_health_field(bytea, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.decrypt_health_field(p_ciphertext bytea, p_profile_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pgsodium', 'pg_temp'
    AS $$
DECLARE
  v_key uuid;
BEGIN
  IF p_ciphertext IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_key FROM pgsodium.key WHERE name = 'medical_data_key';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Clé medical_data_key introuvable';
  END IF;

  RETURN convert_from(
    pgsodium.crypto_aead_det_decrypt(
      p_ciphertext,
      convert_to(p_profile_id::text, 'utf8'),
      v_key
    ),
    'utf8'
  );
END;
$$;


ALTER FUNCTION public.decrypt_health_field(p_ciphertext bytea, p_profile_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION decrypt_health_field(p_ciphertext bytea, p_profile_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.decrypt_health_field(p_ciphertext bytea, p_profile_id uuid) IS 'Helper SECURITY DEFINER : déchiffre un champ santé pour le profile_id donné. Réservé aux roles authenticated.';


--
-- Name: delete_own_account(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_own_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.delete_own_account() OWNER TO postgres;

--
-- Name: FUNCTION delete_own_account(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.delete_own_account() IS 'Supprime le compte et toutes les données associées (RGPD art. 17 - droit à l effacement)';


--
-- Name: delete_own_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_own_data() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.delete_own_data() OWNER TO postgres;

--
-- Name: encrypt_health_field(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.encrypt_health_field(p_plaintext text, p_profile_id uuid) RETURNS bytea
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pgsodium', 'pg_temp'
    AS $$
DECLARE
  v_key uuid;
BEGIN
  IF p_plaintext IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_key FROM pgsodium.key WHERE name = 'medical_data_key';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Clé medical_data_key introuvable';
  END IF;

  RETURN pgsodium.crypto_aead_det_encrypt(
    convert_to(p_plaintext, 'utf8'),
    convert_to(p_profile_id::text, 'utf8'),
    v_key
  );
END;
$$;


ALTER FUNCTION public.encrypt_health_field(p_plaintext text, p_profile_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION encrypt_health_field(p_plaintext text, p_profile_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.encrypt_health_field(p_plaintext text, p_profile_id uuid) IS 'Helper SECURITY DEFINER : chiffre une valeur en clair pour stockage. Réservé aux roles authenticated.';


--
-- Name: ensure_auth_user_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_auth_user_role() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.role IS NULL OR NEW.role = '' THEN
    NEW.role := 'authenticated';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.ensure_auth_user_role() OWNER TO postgres;

--
-- Name: FUNCTION ensure_auth_user_role(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.ensure_auth_user_role() IS 'Trigger BEFORE INSERT/UPDATE sur auth.users : force role=''authenticated'' si vide. Contournement bug GoTrue v2.186 sur OAuth Google qui laisse le role vide.';


--
-- Name: get_user_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_role() RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role;
END;
$$;


ALTER FUNCTION public.get_user_role() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: FUNCTION handle_new_user(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a profile + role-specific row (employees/employers) when user signs up or confirms email.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: leave_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    employer_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    leave_year text NOT NULL,
    acquired_days numeric(5,2) DEFAULT 0 NOT NULL,
    taken_days numeric(5,2) DEFAULT 0 NOT NULL,
    adjustment_days numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_manual_init boolean DEFAULT false NOT NULL
);


ALTER TABLE public.leave_balances OWNER TO postgres;

--
-- Name: initialize_leave_balance(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.initialize_leave_balance(p_contract_id uuid, p_leave_year text) RETURNS public.leave_balances
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
  v_user_id uuid := auth.uid();
  v_employer_id uuid;
  v_employee_id uuid;
  v_contract_start date;
  v_leave_year_start date;
  v_effective_start date;
  v_working_days integer;
  v_acquired integer;
  v_balance public.leave_balances;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  -- Format attendu : "YYYY-YYYY" (cf. getLeaveYear côté TS).
  IF p_leave_year !~ '^\d{4}-\d{4}$' THEN
    RAISE EXCEPTION 'Format leave_year invalide' USING ERRCODE = '22023';
  END IF;
  v_leave_year_start := make_date(split_part(p_leave_year, '-', 1)::int, 6, 1);

  SELECT employer_id, employee_id, start_date
    INTO v_employer_id, v_employee_id, v_contract_start
  FROM public.contracts
  WHERE id = p_contract_id;

  IF v_employer_id IS NULL THEN
    RAISE EXCEPTION 'Contrat introuvable' USING ERRCODE = 'P0002';
  END IF;

  IF v_user_id <> v_employer_id AND v_user_id <> v_employee_id THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  -- Port fidèle de calculateAcquiredDays(TS) :
  --   effectiveStart = max(contract.startDate, leaveYearStart)
  --   workingDays    = jours ouvrables (lun-sam) effectiveStart → now
  --   months         = floor(workingDays / 24)
  --   acquired       = min(ceil(months * 2.5), 30)
  v_effective_start := GREATEST(v_contract_start, v_leave_year_start);

  IF v_effective_start > CURRENT_DATE THEN
    v_acquired := 0;
  ELSE
    v_working_days := public.count_working_days(v_effective_start, CURRENT_DATE);
    -- Division entière intentionnelle : (workingDays / 24) tronque
    v_acquired := LEAST(CEIL((v_working_days / 24) * 2.5)::integer, 30);
  END IF;

  -- Idempotent : si une balance existe déjà, on ne touche pas et on la renvoie.
  INSERT INTO public.leave_balances (
    contract_id, employee_id, employer_id, leave_year,
    acquired_days, taken_days, adjustment_days
  ) VALUES (
    p_contract_id, v_employee_id, v_employer_id, p_leave_year,
    v_acquired, 0, 0
  )
  ON CONFLICT (contract_id, leave_year) DO NOTHING;

  SELECT * INTO v_balance
  FROM public.leave_balances
  WHERE contract_id = p_contract_id AND leave_year = p_leave_year;

  RETURN v_balance;
END;
$_$;


ALTER FUNCTION public.initialize_leave_balance(p_contract_id uuid, p_leave_year text) OWNER TO postgres;

--
-- Name: is_employee(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_employee() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
  );
END;
$$;


ALTER FUNCTION public.is_employee() OWNER TO postgres;

--
-- Name: is_employee(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_employee(employer_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.employer_id = employer_uuid
      AND contracts.employee_id = auth.uid()
      AND contracts.status = 'active'
  );
END;
$$;


ALTER FUNCTION public.is_employee(employer_uuid uuid) OWNER TO postgres;

--
-- Name: is_employer(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_employer() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS(SELECT 1 FROM employers WHERE profile_id = auth.uid());
$$;


ALTER FUNCTION public.is_employer() OWNER TO postgres;

--
-- Name: is_valid_email(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_valid_email(email text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $_$
BEGIN
  RETURN email ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$';
END;
$_$;


ALTER FUNCTION public.is_valid_email(email text) OWNER TO postgres;

--
-- Name: is_valid_french_phone(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_valid_french_phone(phone text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $_$
BEGIN
  -- Remove spaces and dots for validation
  RETURN regexp_replace(phone, '[\s.]', '', 'g') ~ '^(\+33|0)[1-9][0-9]{8}$';
END;
$_$;


ALTER FUNCTION public.is_valid_french_phone(phone text) OWNER TO postgres;

--
-- Name: log_storage_upload(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_storage_upload() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only log for our application buckets
  IF NEW.bucket_id IN ('justifications', 'avatars') THEN
    INSERT INTO file_upload_audit (
      user_id,
      bucket_id,
      file_path,
      file_name,
      mime_type,
      file_size,
      operation,
      metadata
    ) VALUES (
      COALESCE(NEW.owner, auth.uid()),
      NEW.bucket_id,
      NEW.name,
      split_part(NEW.name, '/', -1),
      NEW.metadata->>'mimetype',
      (NEW.metadata->>'size')::bigint,
      TG_OP,
      jsonb_build_object(
        'content_type', NEW.metadata->>'mimetype',
        'cache_control', NEW.metadata->>'cacheControl'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_storage_upload() OWNER TO postgres;

--
-- Name: mark_liaison_messages_read(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_liaison_messages_read(p_conversation_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


ALTER FUNCTION public.mark_liaison_messages_read(p_conversation_id uuid) OWNER TO postgres;

--
-- Name: mark_log_entry_read(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_log_entry_read(p_entry_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


ALTER FUNCTION public.mark_log_entry_read(p_entry_id uuid) OWNER TO postgres;

--
-- Name: normalize_french_phone(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalize_french_phone(phone text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN regexp_replace(phone, '[\s.]', '', 'g');
END;
$$;


ALTER FUNCTION public.normalize_french_phone(phone text) OWNER TO postgres;

--
-- Name: normalize_profile_phone(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalize_profile_phone() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := normalize_french_phone(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.normalize_profile_phone() OWNER TO postgres;

--
-- Name: purge_expired_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.purge_expired_data() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.purge_expired_data() OWNER TO postgres;

--
-- Name: update_push_subscriptions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_push_subscriptions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_push_subscriptions_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: upsert_employer_health_data(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_employer_health_data(p_handicap_type text DEFAULT NULL::text, p_handicap_name text DEFAULT NULL::text, p_specific_needs text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  INSERT INTO employer_health_data (profile_id, handicap_type, handicap_name, specific_needs, updated_at)
  VALUES (
    v_profile_id,
    encrypt_health_field(p_handicap_type, v_profile_id),
    encrypt_health_field(p_handicap_name, v_profile_id),
    encrypt_health_field(p_specific_needs, v_profile_id),
    now()
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    handicap_type  = EXCLUDED.handicap_type,
    handicap_name  = EXCLUDED.handicap_name,
    specific_needs = EXCLUDED.specific_needs,
    updated_at     = now();
END;
$$;


ALTER FUNCTION public.upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text) OWNER TO postgres;

--
-- Name: FUNCTION upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text) IS 'Upsert santé chiffré côté serveur (SECURITY DEFINER, vérifie auth.uid()). Utiliser pour l''écriture côté app.';


--
-- Name: absences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.absences (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    absence_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    justification_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    business_days_count smallint,
    justification_due_date date,
    family_event_type text,
    leave_year text,
    CONSTRAINT absences_absence_type_check CHECK ((absence_type = ANY (ARRAY['sick'::text, 'vacation'::text, 'family_event'::text, 'training'::text, 'unavailable'::text, 'emergency'::text]))),
    CONSTRAINT absences_family_event_type_check CHECK (((absence_type <> 'family_event'::text) OR ((family_event_type IS NOT NULL) AND (family_event_type = ANY (ARRAY['marriage'::text, 'pacs'::text, 'birth'::text, 'adoption'::text, 'death_spouse'::text, 'death_parent'::text, 'death_child'::text, 'death_sibling'::text, 'death_in_law'::text, 'child_marriage'::text, 'disability_announcement'::text]))))),
    CONSTRAINT absences_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.absences OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id uuid,
    fields_accessed text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['read'::text, 'create'::text, 'update'::text, 'delete'::text, 'grant_consent'::text, 'revoke_consent'::text])))
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: caregivers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.caregivers (
    profile_id uuid NOT NULL,
    employer_id uuid NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    relationship text,
    created_at timestamp with time zone DEFAULT now(),
    relationship_details text,
    legal_status text,
    address jsonb,
    emergency_phone text,
    availability_hours text,
    can_replace_employer boolean DEFAULT false,
    permissions_locked boolean DEFAULT false
);


ALTER TABLE public.caregivers OWNER TO postgres;

--
-- Name: cesu_declarations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cesu_declarations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    period_label text NOT NULL,
    total_employees integer NOT NULL,
    total_hours numeric(8,2) NOT NULL,
    total_gross_pay numeric(10,2) NOT NULL,
    declaration_data jsonb NOT NULL,
    storage_path text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cesu_declarations_month_check CHECK (((month >= 1) AND (month <= 12)))
);


ALTER TABLE public.cesu_declarations OWNER TO postgres;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    employer_id uuid NOT NULL,
    employee_id uuid,
    contract_type text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    weekly_hours numeric(5,2) NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pas_rate numeric(5,4) DEFAULT 0 NOT NULL,
    contract_category text DEFAULT 'employment'::text NOT NULL,
    caregiver_id uuid,
    pch_hourly_rate numeric(10,2),
    caregiver_status text,
    CONSTRAINT chk_contract_party CHECK ((((contract_category = 'employment'::text) AND (employee_id IS NOT NULL) AND (caregiver_id IS NULL)) OR ((contract_category = 'caregiver_pch'::text) AND (caregiver_id IS NOT NULL) AND (employee_id IS NULL)))),
    CONSTRAINT contracts_caregiver_status_check CHECK ((caregiver_status = ANY (ARRAY['active'::text, 'full_time'::text, 'voluntary'::text]))),
    CONSTRAINT contracts_contract_category_check CHECK ((contract_category = ANY (ARRAY['employment'::text, 'caregiver_pch'::text]))),
    CONSTRAINT contracts_contract_type_check CHECK ((contract_type = ANY (ARRAY['CDI'::text, 'CDD'::text]))),
    CONSTRAINT contracts_pas_rate_check CHECK (((pas_rate >= (0)::numeric) AND (pas_rate <= (1)::numeric))),
    CONSTRAINT contracts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'terminated'::text, 'suspended'::text])))
);


ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: convention_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.convention_settings (
    profile_id uuid NOT NULL,
    rule_break boolean DEFAULT true NOT NULL,
    rule_daily_max boolean DEFAULT true NOT NULL,
    rule_overtime boolean DEFAULT true NOT NULL,
    rule_night boolean DEFAULT true NOT NULL,
    maj_dimanche integer DEFAULT 30 NOT NULL,
    maj_ferie integer DEFAULT 60 NOT NULL,
    maj_nuit integer DEFAULT 25 NOT NULL,
    maj_supp integer DEFAULT 25 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.convention_settings OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    type text NOT NULL,
    participant_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT conversations_type_check CHECK ((type = ANY (ARRAY['team'::text, 'private'::text])))
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: data_retention_policy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_retention_policy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data_category text NOT NULL,
    retention_months integer NOT NULL,
    description text,
    legal_basis text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_retention_policy OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    profile_id uuid NOT NULL,
    qualifications text[] DEFAULT ARRAY[]::text[],
    languages text[] DEFAULT ARRAY[]::text[],
    max_distance_km integer,
    availability_template jsonb DEFAULT '{}'::jsonb,
    address jsonb,
    drivers_license jsonb,
    date_of_birth date,
    social_security_number text,
    iban text,
    emergency_contacts jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employer_health_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employer_health_data (
    profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    handicap_type bytea,
    handicap_name bytea,
    specific_needs bytea
);


ALTER TABLE public.employer_health_data OWNER TO postgres;

--
-- Name: COLUMN employer_health_data.handicap_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.employer_health_data.handicap_type IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';


--
-- Name: COLUMN employer_health_data.handicap_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.employer_health_data.handicap_name IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';


--
-- Name: COLUMN employer_health_data.specific_needs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.employer_health_data.specific_needs IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';


--
-- Name: employer_health_data_v; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.employer_health_data_v WITH (security_invoker='true') AS
 SELECT profile_id,
    public.decrypt_health_field(handicap_type, profile_id) AS handicap_type,
    public.decrypt_health_field(handicap_name, profile_id) AS handicap_name,
    public.decrypt_health_field(specific_needs, profile_id) AS specific_needs,
    created_at,
    updated_at
   FROM public.employer_health_data;


ALTER VIEW public.employer_health_data_v OWNER TO postgres;

--
-- Name: VIEW employer_health_data_v; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.employer_health_data_v IS 'Vue déchiffrée d''employer_health_data. RLS héritée via security_invoker. Utiliser pour la lecture côté app.';


--
-- Name: employers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employers (
    profile_id uuid NOT NULL,
    address jsonb NOT NULL,
    cesu_number text,
    pch_beneficiary boolean DEFAULT false,
    pch_monthly_amount numeric(10,2),
    emergency_contacts jsonb[] DEFAULT ARRAY[]::jsonb[],
    pch_type text,
    pch_monthly_hours numeric(5,2) DEFAULT NULL::numeric,
    CONSTRAINT employers_pch_type_check CHECK ((pch_type = ANY (ARRAY['emploiDirect'::text, 'mandataire'::text, 'prestataire'::text, 'aidantFamilial'::text, 'aidantFamilialCessation'::text])))
);


ALTER TABLE public.employers OWNER TO postgres;

--
-- Name: file_upload_audit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_upload_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bucket_id text NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    file_size bigint,
    operation text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT file_upload_audit_operation_check CHECK ((operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE public.file_upload_audit OWNER TO postgres;

--
-- Name: intervention_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.intervention_settings (
    profile_id uuid NOT NULL,
    default_tasks text[] DEFAULT '{}'::text[] NOT NULL,
    custom_tasks text[] DEFAULT '{}'::text[] NOT NULL,
    shopping_list jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.intervention_settings OWNER TO postgres;

--
-- Name: liaison_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.liaison_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text NOT NULL,
    content text NOT NULL,
    audio_url text,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_edited boolean DEFAULT false,
    read_by uuid[] DEFAULT ARRAY[]::uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    conversation_id uuid,
    CONSTRAINT liaison_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['employer'::text, 'employee'::text, 'caregiver'::text])))
);


ALTER TABLE public.liaison_messages OWNER TO postgres;

--
-- Name: log_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log_entries (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    employer_id uuid NOT NULL,
    author_id uuid NOT NULL,
    author_role text NOT NULL,
    type text NOT NULL,
    importance text DEFAULT 'normal'::text NOT NULL,
    content text NOT NULL,
    audio_url text,
    attachments jsonb[] DEFAULT ARRAY[]::jsonb[],
    recipient_id uuid,
    read_by uuid[] DEFAULT ARRAY[]::uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT log_entries_importance_check CHECK ((importance = ANY (ARRAY['normal'::text, 'urgent'::text]))),
    CONSTRAINT log_entries_type_check CHECK ((type = ANY (ARRAY['info'::text, 'alert'::text, 'incident'::text, 'instruction'::text])))
);


ALTER TABLE public.log_entries OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    compliance_alerts boolean DEFAULT true,
    shift_reminders boolean DEFAULT true,
    message_notifications boolean DEFAULT true,
    reminder_hours_before integer DEFAULT 24,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    priority text DEFAULT 'normal'::text,
    is_dismissed boolean DEFAULT false,
    action_url text,
    expires_at timestamp with time zone,
    CONSTRAINT notifications_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: payslips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payslips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    period_label text,
    gross_pay numeric(10,2),
    net_pay numeric(10,2),
    total_hours numeric(8,2),
    pas_rate numeric(5,4) DEFAULT 0 NOT NULL,
    is_exempt_patronal_ss boolean DEFAULT false NOT NULL,
    storage_path text,
    storage_url text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payslips_month_check CHECK (((month >= 1) AND (month <= 12)))
);


ALTER TABLE public.payslips OWNER TO postgres;

--
-- Name: privacy_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.privacy_settings (
    profile_id uuid NOT NULL,
    analytics_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.privacy_settings OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    avatar_url text,
    accessibility_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    email text,
    CONSTRAINT profiles_email_format_check CHECK (((email IS NULL) OR (email ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'::text))),
    CONSTRAINT profiles_phone_format_check CHECK (((phone IS NULL) OR (phone ~ '^(\+33|0)[1-9][0-9]{8}$'::text))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['employer'::text, 'employee'::text, 'caregiver'::text])))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: COLUMN profiles.avatar_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.avatar_url IS 'Storage path dans le bucket "avatars" (ex: <profile_id>/<timestamp>.jpg). URL publique générée côté client via resolveAvatarUrl (src/lib/supabase/avatars.ts). Historique : contenait l''URL publique complète avant migration 053 (2026-04-24).';


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO postgres;

--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contract_id uuid NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    break_duration integer DEFAULT 0,
    tasks text[] DEFAULT ARRAY[]::text[],
    notes text,
    status text DEFAULT 'planned'::text NOT NULL,
    computed_pay jsonb DEFAULT '{}'::jsonb,
    validated_by_employer boolean DEFAULT false,
    validated_by_employee boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    has_night_action boolean,
    shift_type text DEFAULT 'effective'::text NOT NULL,
    night_interventions_count integer,
    is_requalified boolean DEFAULT false NOT NULL,
    effective_hours numeric,
    guard_segments jsonb,
    late_entry boolean DEFAULT false,
    CONSTRAINT shifts_night_interventions_count_check CHECK (((night_interventions_count IS NULL) OR (night_interventions_count >= 0))),
    CONSTRAINT shifts_shift_type_check CHECK ((shift_type = ANY (ARRAY['effective'::text, 'presence_day'::text, 'presence_night'::text, 'guard_24h'::text]))),
    CONSTRAINT shifts_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'completed'::text, 'cancelled'::text, 'absent'::text])))
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: shopping_article_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shopping_article_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    name text NOT NULL,
    brand text DEFAULT ''::text NOT NULL,
    use_count integer DEFAULT 1 NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shopping_article_history OWNER TO postgres;

--
-- Name: shopping_list_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shopping_list_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shopping_list_templates_name_check CHECK (((length(name) >= 1) AND (length(name) <= 60)))
);


ALTER TABLE public.shopping_list_templates OWNER TO postgres;

--
-- Name: user_consents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    consent_type text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    ip_address inet,
    user_agent text,
    CONSTRAINT user_consents_consent_type_check CHECK ((consent_type = ANY (ARRAY['health_data'::text, 'cookie'::text])))
);


ALTER TABLE public.user_consents OWNER TO postgres;

--
-- Name: absences absences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: caregivers caregivers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caregivers
    ADD CONSTRAINT caregivers_pkey PRIMARY KEY (profile_id);


--
-- Name: cesu_declarations cesu_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cesu_declarations
    ADD CONSTRAINT cesu_declarations_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: convention_settings convention_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.convention_settings
    ADD CONSTRAINT convention_settings_pkey PRIMARY KEY (profile_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: data_retention_policy data_retention_policy_data_category_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_retention_policy
    ADD CONSTRAINT data_retention_policy_data_category_key UNIQUE (data_category);


--
-- Name: data_retention_policy data_retention_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_retention_policy
    ADD CONSTRAINT data_retention_policy_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (profile_id);


--
-- Name: employer_health_data employer_health_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employer_health_data
    ADD CONSTRAINT employer_health_data_pkey PRIMARY KEY (profile_id);


--
-- Name: employers employers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_pkey PRIMARY KEY (profile_id);


--
-- Name: file_upload_audit file_upload_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_upload_audit
    ADD CONSTRAINT file_upload_audit_pkey PRIMARY KEY (id);


--
-- Name: intervention_settings intervention_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_settings
    ADD CONSTRAINT intervention_settings_pkey PRIMARY KEY (profile_id);


--
-- Name: leave_balances leave_balances_contract_id_leave_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_contract_id_leave_year_key UNIQUE (contract_id, leave_year);


--
-- Name: leave_balances leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);


--
-- Name: liaison_messages liaison_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liaison_messages
    ADD CONSTRAINT liaison_messages_pkey PRIMARY KEY (id);


--
-- Name: log_entries log_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_entries
    ADD CONSTRAINT log_entries_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payslips payslips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);


--
-- Name: privacy_settings privacy_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_settings
    ADD CONSTRAINT privacy_settings_pkey PRIMARY KEY (profile_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: shopping_article_history shopping_article_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_article_history
    ADD CONSTRAINT shopping_article_history_pkey PRIMARY KEY (id);


--
-- Name: shopping_article_history shopping_article_history_profile_id_name_brand_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_article_history
    ADD CONSTRAINT shopping_article_history_profile_id_name_brand_key UNIQUE (profile_id, name, brand);


--
-- Name: shopping_list_templates shopping_list_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_list_templates
    ADD CONSTRAINT shopping_list_templates_pkey PRIMARY KEY (id);


--
-- Name: user_consents user_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);


--
-- Name: user_consents user_consents_user_id_consent_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_user_id_consent_type_key UNIQUE (user_id, consent_type);


--
-- Name: cesu_declarations_employer_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cesu_declarations_employer_idx ON public.cesu_declarations USING btree (employer_id);


--
-- Name: cesu_declarations_unique_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cesu_declarations_unique_period ON public.cesu_declarations USING btree (employer_id, year, month);


--
-- Name: idx_absences_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_absences_dates ON public.absences USING btree (start_date, end_date);


--
-- Name: idx_absences_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_absences_employee ON public.absences USING btree (employee_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_contracts_caregiver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_caregiver_id ON public.contracts USING btree (caregiver_id) WHERE (caregiver_id IS NOT NULL);


--
-- Name: idx_conversations_employer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_employer ON public.conversations USING btree (employer_id);


--
-- Name: idx_conversations_participants; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_participants ON public.conversations USING gin (participant_ids);


--
-- Name: idx_employees_address_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_address_city ON public.employees USING btree (((address ->> 'city'::text)));


--
-- Name: idx_employees_has_vehicle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_has_vehicle ON public.employees USING btree (((drivers_license ->> 'has_vehicle'::text)));


--
-- Name: idx_file_upload_audit_bucket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_upload_audit_bucket_id ON public.file_upload_audit USING btree (bucket_id);


--
-- Name: idx_file_upload_audit_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_upload_audit_created_at ON public.file_upload_audit USING btree (created_at DESC);


--
-- Name: idx_file_upload_audit_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_upload_audit_user_id ON public.file_upload_audit USING btree (user_id);


--
-- Name: idx_liaison_messages_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_liaison_messages_conversation ON public.liaison_messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_liaison_messages_employer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_liaison_messages_employer ON public.liaison_messages USING btree (employer_id, created_at DESC);


--
-- Name: idx_liaison_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_liaison_messages_sender ON public.liaison_messages USING btree (sender_id);


--
-- Name: idx_log_entries_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_log_entries_created ON public.log_entries USING btree (created_at DESC);


--
-- Name: idx_log_entries_employer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_log_entries_employer ON public.log_entries USING btree (employer_id);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_push_subscriptions_endpoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions USING btree (endpoint);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_shifts_contract; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shifts_contract ON public.shifts USING btree (contract_id);


--
-- Name: idx_shifts_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shifts_date ON public.shifts USING btree (date);


--
-- Name: idx_shifts_guard_24h; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shifts_guard_24h ON public.shifts USING btree (contract_id, date) WHERE (shift_type = 'guard_24h'::text);


--
-- Name: idx_shifts_has_night_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shifts_has_night_action ON public.shifts USING btree (has_night_action) WHERE (has_night_action IS NOT NULL);


--
-- Name: idx_shifts_presence_night_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shifts_presence_night_date ON public.shifts USING btree (contract_id, date) WHERE (shift_type = 'presence_night'::text);


--
-- Name: idx_shifts_shift_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shifts_shift_type ON public.shifts USING btree (shift_type) WHERE (shift_type <> 'effective'::text);


--
-- Name: idx_shifts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shifts_status ON public.shifts USING btree (status);


--
-- Name: idx_user_consents_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_consents_type ON public.user_consents USING btree (consent_type);


--
-- Name: idx_user_consents_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_consents_user_id ON public.user_consents USING btree (user_id);


--
-- Name: payslips_employee_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payslips_employee_idx ON public.payslips USING btree (employee_id);


--
-- Name: payslips_employer_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payslips_employer_period_idx ON public.payslips USING btree (employer_id, year, month);


--
-- Name: payslips_unique_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payslips_unique_period ON public.payslips USING btree (employee_id, contract_id, year, month);


--
-- Name: shopping_list_templates_employer_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shopping_list_templates_employer_idx ON public.shopping_list_templates USING btree (employer_id);


--
-- Name: shopping_list_templates_one_default_per_employer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX shopping_list_templates_one_default_per_employer ON public.shopping_list_templates USING btree (employer_id) WHERE (is_default = true);


--
-- Name: profiles normalize_phone_before_save; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER normalize_phone_before_save BEFORE INSERT OR UPDATE OF phone ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_phone();


--
-- Name: push_subscriptions trigger_push_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_push_subscriptions_updated_at();


--
-- Name: contracts update_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_balances update_leave_balances_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: liaison_messages update_liaison_messages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_liaison_messages_updated_at BEFORE UPDATE ON public.liaison_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: log_entries update_log_entries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_log_entries_updated_at BEFORE UPDATE ON public.log_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shifts update_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: absences absences_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(profile_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: caregivers caregivers_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caregivers
    ADD CONSTRAINT caregivers_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(profile_id);


--
-- Name: caregivers caregivers_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caregivers
    ADD CONSTRAINT caregivers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: cesu_declarations cesu_declarations_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cesu_declarations
    ADD CONSTRAINT cesu_declarations_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.profiles(id);


--
-- Name: contracts contracts_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(profile_id);


--
-- Name: contracts contracts_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(profile_id);


--
-- Name: convention_settings convention_settings_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.convention_settings
    ADD CONSTRAINT convention_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: employees employees_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: employer_health_data employer_health_data_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employer_health_data
    ADD CONSTRAINT employer_health_data_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.employers(profile_id) ON DELETE CASCADE;


--
-- Name: employers employers_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: file_upload_audit file_upload_audit_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_upload_audit
    ADD CONSTRAINT file_upload_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: intervention_settings intervention_settings_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_settings
    ADD CONSTRAINT intervention_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: leave_balances leave_balances_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: leave_balances leave_balances_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id);


--
-- Name: leave_balances leave_balances_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id);


--
-- Name: liaison_messages liaison_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liaison_messages
    ADD CONSTRAINT liaison_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: liaison_messages liaison_messages_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liaison_messages
    ADD CONSTRAINT liaison_messages_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: liaison_messages liaison_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liaison_messages
    ADD CONSTRAINT liaison_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: log_entries log_entries_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_entries
    ADD CONSTRAINT log_entries_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);


--
-- Name: log_entries log_entries_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_entries
    ADD CONSTRAINT log_entries_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(profile_id);


--
-- Name: log_entries log_entries_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_entries
    ADD CONSTRAINT log_entries_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id);


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: payslips payslips_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: payslips payslips_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: payslips payslips_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: privacy_settings privacy_settings_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_settings
    ADD CONSTRAINT privacy_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: shifts shifts_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: shopping_article_history shopping_article_history_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_article_history
    ADD CONSTRAINT shopping_article_history_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: shopping_list_templates shopping_list_templates_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_list_templates
    ADD CONSTRAINT shopping_list_templates_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_consents user_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: data_retention_policy Authenticated users can read retention policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read retention policy" ON public.data_retention_policy FOR SELECT TO authenticated USING (true);


--
-- Name: log_entries Authors can delete own log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authors can delete own log entries" ON public.log_entries FOR DELETE USING ((auth.uid() = author_id));


--
-- Name: log_entries Authors can update own entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authors can update own entries" ON public.log_entries FOR UPDATE USING (((author_id = auth.uid()) AND (created_at > (now() - '00:05:00'::interval))));


--
-- Name: log_entries Authors can update own log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authors can update own log entries" ON public.log_entries FOR UPDATE USING ((auth.uid() = author_id)) WITH CHECK ((auth.uid() = author_id));


--
-- Name: contracts Caregiver can view own pch contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregiver can view own pch contracts" ON public.contracts FOR SELECT USING ((caregiver_id = auth.uid()));


--
-- Name: log_entries Caregivers can create log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can create log entries" ON public.log_entries FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = caregivers.employer_id) AND (caregivers.profile_id = auth.uid()) AND ((caregivers.permissions ->> 'write_logbook'::text) = 'true'::text))))));


--
-- Name: shifts Caregivers can create shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can create shifts" ON public.shifts FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.caregivers c
     JOIN public.contracts ct ON ((ct.employer_id = c.employer_id)))
  WHERE ((c.profile_id = auth.uid()) AND (ct.id = shifts.contract_id) AND (((c.permissions ->> 'canEditPlanning'::text))::boolean = true)))));


--
-- Name: shifts Caregivers can delete shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can delete shifts" ON public.shifts FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.caregivers c
     JOIN public.contracts ct ON ((ct.employer_id = c.employer_id)))
  WHERE ((c.profile_id = auth.uid()) AND (ct.id = shifts.contract_id) AND (((c.permissions ->> 'canEditPlanning'::text))::boolean = true)))));


--
-- Name: contracts Caregivers can read employer contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can read employer contracts" ON public.contracts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = contracts.employer_id) AND (caregivers.profile_id = auth.uid()) AND ((caregivers.permissions ->> 'view_planning'::text) = 'true'::text)))));


--
-- Name: profiles Caregivers can read employer profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can read employer profiles" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = profiles.id) AND (caregivers.profile_id = auth.uid())))));


--
-- Name: employers Caregivers can read linked employer; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can read linked employer" ON public.employers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = employers.profile_id) AND (caregivers.profile_id = auth.uid())))));


--
-- Name: log_entries Caregivers can read log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can read log entries" ON public.log_entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = log_entries.employer_id) AND (caregivers.profile_id = auth.uid()) AND ((caregivers.permissions ->> 'view_logbook'::text) = 'true'::text)))));


--
-- Name: shifts Caregivers can read shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can read shifts" ON public.shifts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.contracts
     JOIN public.caregivers ON ((caregivers.employer_id = contracts.employer_id)))
  WHERE ((contracts.id = shifts.contract_id) AND (caregivers.profile_id = auth.uid()) AND ((caregivers.permissions ->> 'view_planning'::text) = 'true'::text)))));


--
-- Name: caregivers Caregivers can update own profile limited; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can update own profile limited" ON public.caregivers FOR UPDATE TO authenticated USING ((profile_id = auth.uid())) WITH CHECK (((profile_id = auth.uid()) AND (NOT (legal_status IS DISTINCT FROM ( SELECT c.legal_status
   FROM public.caregivers c
  WHERE (c.profile_id = auth.uid())))) AND (NOT (employer_id IS DISTINCT FROM ( SELECT c.employer_id
   FROM public.caregivers c
  WHERE (c.profile_id = auth.uid())))) AND (NOT (permissions_locked IS DISTINCT FROM ( SELECT c.permissions_locked
   FROM public.caregivers c
  WHERE (c.profile_id = auth.uid())))) AND (NOT (permissions IS DISTINCT FROM ( SELECT c.permissions
   FROM public.caregivers c
  WHERE (c.profile_id = auth.uid()))))));


--
-- Name: shifts Caregivers can update shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can update shifts" ON public.shifts FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.caregivers c
     JOIN public.contracts ct ON ((ct.employer_id = c.employer_id)))
  WHERE ((c.profile_id = auth.uid()) AND (ct.id = shifts.contract_id) AND (((c.permissions ->> 'canEditPlanning'::text))::boolean = true)))));


--
-- Name: absences Caregivers can view absences of employer's employees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can view absences of employer's employees" ON public.absences FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.caregivers c
     JOIN public.contracts ct ON ((ct.employer_id = c.employer_id)))
  WHERE ((c.profile_id = auth.uid()) AND (ct.employee_id = absences.employee_id)))));


--
-- Name: contracts Caregivers can view employer contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can view employer contracts" ON public.contracts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.caregivers c
  WHERE ((c.profile_id = auth.uid()) AND (c.employer_id = contracts.employer_id) AND (((c.permissions ->> 'canViewPlanning'::text))::boolean = true)))));


--
-- Name: employees Caregivers can view employer employees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can view employer employees" ON public.employees FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.caregivers c
     JOIN public.contracts ct ON ((ct.employer_id = c.employer_id)))
  WHERE ((c.profile_id = auth.uid()) AND (ct.employee_id = employees.profile_id)))));


--
-- Name: shifts Caregivers can view employer shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can view employer shifts" ON public.shifts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.caregivers c
     JOIN public.contracts ct ON ((ct.employer_id = c.employer_id)))
  WHERE ((c.profile_id = auth.uid()) AND (ct.id = shifts.contract_id) AND (((c.permissions ->> 'canViewPlanning'::text))::boolean = true)))));


--
-- Name: caregivers Caregivers can view own record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Caregivers can view own record" ON public.caregivers FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: absences Employees can create absences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can create absences" ON public.absences FOR INSERT WITH CHECK ((auth.uid() = employee_id));


--
-- Name: log_entries Employees can create log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can create log entries" ON public.log_entries FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employer_id = contracts.employer_id) AND (contracts.employee_id = auth.uid()) AND (contracts.status = 'active'::text))))));


--
-- Name: shifts Employees can create shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can create shifts" ON public.shifts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.id = shifts.contract_id) AND (contracts.employee_id = auth.uid()) AND (contracts.status = 'active'::text)))));


--
-- Name: absences Employees can delete own pending absences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can delete own pending absences" ON public.absences FOR DELETE USING (((auth.uid() = employee_id) AND (status = 'pending'::text)));


--
-- Name: employees Employees can insert own data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can insert own data" ON public.employees FOR INSERT WITH CHECK ((profile_id = auth.uid()));


--
-- Name: employers Employees can read employer for active contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can read employer for active contracts" ON public.employers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employer_id = employers.profile_id) AND (contracts.employee_id = auth.uid()) AND (contracts.status = 'active'::text)))));


--
-- Name: profiles Employees can read employer profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can read employer profiles" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employer_id = profiles.id) AND (contracts.employee_id = auth.uid())))));


--
-- Name: log_entries Employees can read log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can read log entries" ON public.log_entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employer_id = log_entries.employer_id) AND (contracts.employee_id = auth.uid()) AND (contracts.status = 'active'::text)))));


--
-- Name: absences Employees can read own absences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can read own absences" ON public.absences FOR SELECT USING ((auth.uid() = employee_id));


--
-- Name: contracts Employees can read own contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can read own contracts" ON public.contracts FOR SELECT USING ((auth.uid() = employee_id));


--
-- Name: shifts Employees can read shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can read shifts" ON public.shifts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.id = shifts.contract_id) AND (contracts.employee_id = auth.uid())))));


--
-- Name: employees Employees can update own data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can update own data" ON public.employees FOR UPDATE USING ((profile_id = auth.uid()));


--
-- Name: absences Employees can update own pending absences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can update own pending absences" ON public.absences FOR UPDATE USING (((auth.uid() = employee_id) AND (status = 'pending'::text))) WITH CHECK ((auth.uid() = employee_id));


--
-- Name: shifts Employees can update shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can update shifts" ON public.shifts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.id = shifts.contract_id) AND (contracts.employee_id = auth.uid()) AND (contracts.status = 'active'::text)))));


--
-- Name: shifts Employees can validate their shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can validate their shifts" ON public.shifts FOR UPDATE USING ((contract_id IN ( SELECT contracts.id
   FROM public.contracts
  WHERE (contracts.employee_id = auth.uid()))));


--
-- Name: absences Employees can view own absences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can view own absences" ON public.absences FOR SELECT USING ((employee_id = auth.uid()));


--
-- Name: employees Employees can view own data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can view own data" ON public.employees FOR SELECT USING ((profile_id = auth.uid()));


--
-- Name: contracts Employees can view their contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can view their contracts" ON public.contracts FOR SELECT USING ((employee_id = auth.uid()));


--
-- Name: shifts Employees can view their shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employees can view their shifts" ON public.shifts FOR SELECT USING ((contract_id IN ( SELECT contracts.id
   FROM public.contracts
  WHERE (contracts.employee_id = auth.uid()))));


--
-- Name: contracts Employers can create contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can create contracts" ON public.contracts FOR INSERT WITH CHECK ((auth.uid() = employer_id));


--
-- Name: log_entries Employers can create log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can create log entries" ON public.log_entries FOR INSERT WITH CHECK (((auth.uid() = employer_id) AND (auth.uid() = author_id)));


--
-- Name: shifts Employers can create shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can create shifts" ON public.shifts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.id = shifts.contract_id) AND (contracts.employer_id = auth.uid())))));


--
-- Name: contracts Employers can delete contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can delete contracts" ON public.contracts FOR DELETE USING ((auth.uid() = employer_id));


--
-- Name: shifts Employers can delete shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can delete shifts" ON public.shifts FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.id = shifts.contract_id) AND (contracts.employer_id = auth.uid())))));


--
-- Name: caregivers Employers can delete their caregivers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can delete their caregivers" ON public.caregivers FOR DELETE USING ((auth.uid() = employer_id));


--
-- Name: caregivers Employers can insert caregivers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can insert caregivers" ON public.caregivers FOR INSERT WITH CHECK (((auth.uid() = employer_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'employer'::text))))));


--
-- Name: employers Employers can insert own data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can insert own data" ON public.employers FOR INSERT WITH CHECK ((profile_id = auth.uid()));


--
-- Name: profiles Employers can read caregiver profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can read caregiver profiles" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.profile_id = profiles.id) AND (caregivers.employer_id = auth.uid())))));


--
-- Name: absences Employers can read employee absences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can read employee absences" ON public.absences FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employee_id = absences.employee_id) AND (contracts.employer_id = auth.uid())))));


--
-- Name: profiles Employers can read employee profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can read employee profiles" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employee_id = profiles.id) AND (contracts.employer_id = auth.uid())))));


--
-- Name: employees Employers can read employees for active contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can read employees for active contracts" ON public.employees FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employee_id = employees.profile_id) AND (contracts.employer_id = auth.uid()) AND (contracts.status = 'active'::text)))));


--
-- Name: log_entries Employers can read log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can read log entries" ON public.log_entries FOR SELECT USING ((auth.uid() = employer_id));


--
-- Name: contracts Employers can read own contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can read own contracts" ON public.contracts FOR SELECT USING ((auth.uid() = employer_id));


--
-- Name: shifts Employers can read shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can read shifts" ON public.shifts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.id = shifts.contract_id) AND (contracts.employer_id = auth.uid())))));


--
-- Name: profiles Employers can search profiles by email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can search profiles by email" ON public.profiles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.employers
  WHERE (employers.profile_id = auth.uid()))) AND ((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employer_id = auth.uid()) AND ((contracts.employee_id = profiles.id) OR (contracts.caregiver_id = profiles.id))))) OR (EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = auth.uid()) AND (caregivers.profile_id = profiles.id)))))));


--
-- Name: absences Employers can update absence status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can update absence status" ON public.absences FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employee_id = absences.employee_id) AND (contracts.employer_id = auth.uid())))));


--
-- Name: contracts Employers can update contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can update contracts" ON public.contracts FOR UPDATE USING ((auth.uid() = employer_id)) WITH CHECK ((auth.uid() = employer_id));


--
-- Name: log_entries Employers can update log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can update log entries" ON public.log_entries FOR UPDATE USING ((auth.uid() = employer_id));


--
-- Name: contracts Employers can update own contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can update own contracts" ON public.contracts FOR UPDATE USING ((employer_id = auth.uid()));


--
-- Name: employers Employers can update own data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can update own data" ON public.employers FOR UPDATE USING ((profile_id = auth.uid()));


--
-- Name: shifts Employers can update shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can update shifts" ON public.shifts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.id = shifts.contract_id) AND (contracts.employer_id = auth.uid())))));


--
-- Name: caregivers Employers can update their caregivers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can update their caregivers" ON public.caregivers FOR UPDATE USING ((auth.uid() = employer_id)) WITH CHECK ((auth.uid() = employer_id));


--
-- Name: absences Employers can view absences of their employees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can view absences of their employees" ON public.absences FOR SELECT USING ((employee_id IN ( SELECT contracts.employee_id
   FROM public.contracts
  WHERE (contracts.employer_id = auth.uid()))));


--
-- Name: contracts Employers can view own contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can view own contracts" ON public.contracts FOR SELECT USING ((employer_id = auth.uid()));


--
-- Name: employers Employers can view own data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can view own data" ON public.employers FOR SELECT USING ((profile_id = auth.uid()));


--
-- Name: shifts Employers can view shifts of their contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can view shifts of their contracts" ON public.shifts FOR SELECT USING ((contract_id IN ( SELECT contracts.id
   FROM public.contracts
  WHERE (contracts.employer_id = auth.uid()))));


--
-- Name: caregivers Employers can view their caregivers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can view their caregivers" ON public.caregivers FOR SELECT USING ((auth.uid() = employer_id));


--
-- Name: employees Employers can view their employees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Employers can view their employees" ON public.employees FOR SELECT USING ((profile_id IN ( SELECT contracts.employee_id
   FROM public.contracts
  WHERE (contracts.employer_id = auth.uid()))));


--
-- Name: log_entries Liaison visible by employer and team; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Liaison visible by employer and team" ON public.log_entries FOR SELECT USING (((employer_id = auth.uid()) OR (author_id = auth.uid()) OR (recipient_id = auth.uid()) OR (auth.uid() IN ( SELECT contracts.employee_id
   FROM public.contracts
  WHERE (contracts.employer_id = log_entries.employer_id)))));


--
-- Name: file_upload_audit Only triggers can insert audit entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only triggers can insert audit entries" ON public.file_upload_audit FOR INSERT WITH CHECK (((current_setting('role'::text) = 'service_role'::text) OR (current_setting('request.jwt.claim.role'::text, true) = 'service_role'::text)));


--
-- Name: employer_health_data Owner can insert own health data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner can insert own health data" ON public.employer_health_data FOR INSERT TO authenticated WITH CHECK ((auth.uid() = profile_id));


--
-- Name: employer_health_data Owner can read own health data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner can read own health data" ON public.employer_health_data FOR SELECT TO authenticated USING ((auth.uid() = profile_id));


--
-- Name: employer_health_data Owner can update own health data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner can update own health data" ON public.employer_health_data FOR UPDATE TO authenticated USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: push_subscriptions Service role can read all push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can read all push subscriptions" ON public.push_subscriptions FOR SELECT TO service_role USING (true);


--
-- Name: log_entries Team members can create log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can create log entries" ON public.log_entries FOR INSERT WITH CHECK ((author_id = auth.uid()));


--
-- Name: employers Tutors and curators can update employer; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors and curators can update employer" ON public.employers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = employers.profile_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = employers.profile_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: contracts Tutors can create contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can create contracts" ON public.contracts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = caregivers.employer_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: log_entries Tutors can create log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can create log entries" ON public.log_entries FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = caregivers.employer_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text])))))));


--
-- Name: shifts Tutors can create shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can create shifts" ON public.shifts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.contracts
     JOIN public.caregivers ON ((caregivers.employer_id = contracts.employer_id)))
  WHERE ((contracts.id = shifts.contract_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: contracts Tutors can delete contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can delete contracts" ON public.contracts FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = contracts.employer_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: log_entries Tutors can delete log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can delete log entries" ON public.log_entries FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = log_entries.employer_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: shifts Tutors can delete shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can delete shifts" ON public.shifts FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.contracts
     JOIN public.caregivers ON ((caregivers.employer_id = contracts.employer_id)))
  WHERE ((contracts.id = shifts.contract_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: absences Tutors can read absences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can read absences" ON public.absences FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.contracts
     JOIN public.caregivers ON ((caregivers.employer_id = contracts.employer_id)))
  WHERE ((contracts.employee_id = absences.employee_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: contracts Tutors can read contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can read contracts" ON public.contracts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = contracts.employer_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: profiles Tutors can read employee profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can read employee profiles" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.caregivers
     JOIN public.contracts ON ((contracts.employer_id = caregivers.employer_id)))
  WHERE ((contracts.employee_id = profiles.id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: employees Tutors can read employees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can read employees" ON public.employees FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.caregivers
     JOIN public.contracts ON ((contracts.employer_id = caregivers.employer_id)))
  WHERE ((contracts.employee_id = employees.profile_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: log_entries Tutors can read log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can read log entries" ON public.log_entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = log_entries.employer_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: shifts Tutors can read shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can read shifts" ON public.shifts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.contracts
     JOIN public.caregivers ON ((caregivers.employer_id = contracts.employer_id)))
  WHERE ((contracts.id = shifts.contract_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: profiles Tutors can search profiles by email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can search profiles by email" ON public.profiles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))) AND ((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM (public.caregivers c
     JOIN public.contracts co ON ((co.employer_id = c.employer_id)))
  WHERE ((c.profile_id = auth.uid()) AND (c.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text])) AND (co.employee_id = profiles.id)))))));


--
-- Name: absences Tutors can update absences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can update absences" ON public.absences FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.contracts
     JOIN public.caregivers ON ((caregivers.employer_id = contracts.employer_id)))
  WHERE ((contracts.employee_id = absences.employee_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: contracts Tutors can update contracts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can update contracts" ON public.contracts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = contracts.employer_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: log_entries Tutors can update log entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can update log entries" ON public.log_entries FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = log_entries.employer_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: shifts Tutors can update shifts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tutors can update shifts" ON public.shifts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.contracts
     JOIN public.caregivers ON ((caregivers.employer_id = contracts.employer_id)))
  WHERE ((contracts.id = shifts.contract_id) AND (caregivers.profile_id = auth.uid()) AND (caregivers.legal_status = ANY (ARRAY['tutor'::text, 'curator'::text]))))));


--
-- Name: conversations Users can create conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (((auth.uid() = employer_id) OR ((auth.uid() = ANY (participant_ids)) AND (EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.profile_id = auth.uid()) AND (caregivers.employer_id = conversations.employer_id))))) OR ((auth.uid() = ANY (participant_ids)) AND (EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employee_id = auth.uid()) AND (contracts.employer_id = conversations.employer_id) AND (contracts.status = 'active'::text)))))));


--
-- Name: push_subscriptions Users can create own push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: liaison_messages Users can delete own liaison messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own liaison messages" ON public.liaison_messages FOR DELETE USING ((auth.uid() = sender_id));


--
-- Name: push_subscriptions Users can delete own push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: liaison_messages Users can insert liaison messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert liaison messages" ON public.liaison_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND ((auth.uid() = employer_id) OR (EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employer_id = liaison_messages.employer_id) AND (contracts.employee_id = auth.uid()) AND (contracts.status = 'active'::text)))) OR (EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = liaison_messages.employer_id) AND (caregivers.profile_id = auth.uid()) AND (((caregivers.permissions ->> 'canWriteLiaison'::text))::boolean = true)))))));


--
-- Name: audit_logs Users can insert own audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_consents Users can insert own consents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own consents" ON public.user_consents FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: employees Users can insert own employee record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own employee record" ON public.employees FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- Name: employers Users can insert own employer record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own employer record" ON public.employers FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: employees Users can insert their own employee profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own employee profile" ON public.employees FOR INSERT TO authenticated WITH CHECK ((auth.uid() = profile_id));


--
-- Name: employers Users can insert their own employer profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own employer profile" ON public.employers FOR INSERT TO authenticated WITH CHECK ((auth.uid() = profile_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: notification_preferences Users can manage own notification preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences USING ((auth.uid() = user_id));


--
-- Name: liaison_messages Users can read liaison messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read liaison messages" ON public.liaison_messages FOR SELECT USING (((auth.uid() = sender_id) OR (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = liaison_messages.conversation_id) AND ((auth.uid() = c.employer_id) OR (auth.uid() = ANY (c.participant_ids)) OR ((c.type = 'team'::text) AND ((EXISTS ( SELECT 1
           FROM public.contracts
          WHERE ((contracts.employer_id = c.employer_id) AND (contracts.employee_id = auth.uid()) AND (contracts.status = 'active'::text)))) OR (EXISTS ( SELECT 1
           FROM public.caregivers
          WHERE ((caregivers.employer_id = c.employer_id) AND (caregivers.profile_id = auth.uid()) AND (((caregivers.permissions ->> 'canViewLiaison'::text))::boolean = true))))))))))));


--
-- Name: audit_logs Users can read own audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_consents Users can read own consents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own consents" ON public.user_consents FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: employees Users can read own employee record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own employee record" ON public.employees FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: employers Users can read own employer record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own employer record" ON public.employers FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: conversations Users can read their conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their conversations" ON public.conversations FOR SELECT USING (((auth.uid() = employer_id) OR (auth.uid() = ANY (participant_ids)) OR ((type = 'team'::text) AND ((EXISTS ( SELECT 1
   FROM public.contracts
  WHERE ((contracts.employer_id = conversations.employer_id) AND (contracts.employee_id = auth.uid()) AND (contracts.status = 'active'::text)))) OR (EXISTS ( SELECT 1
   FROM public.caregivers
  WHERE ((caregivers.employer_id = conversations.employer_id) AND (caregivers.profile_id = auth.uid()) AND (((caregivers.permissions ->> 'canViewLiaison'::text))::boolean = true))))))));


--
-- Name: user_consents Users can update own consents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own consents" ON public.user_consents FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: employees Users can update own employee record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own employee record" ON public.employees FOR UPDATE USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: employers Users can update own employer record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own employer record" ON public.employers FOR UPDATE USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: liaison_messages Users can update own liaison messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own liaison messages" ON public.liaison_messages FOR UPDATE USING ((auth.uid() = sender_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: push_subscriptions Users can update own push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversations Users can update their conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their conversations" ON public.conversations FOR UPDATE USING (((auth.uid() = employer_id) OR (auth.uid() = ANY (participant_ids))));


--
-- Name: employees Users can update their own employee profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own employee profile" ON public.employees FOR UPDATE TO authenticated USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: employers Users can update their own employer profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own employer profile" ON public.employers FOR UPDATE TO authenticated USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: push_subscriptions Users can view own push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: file_upload_audit Users can view own upload audit; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own upload audit" ON public.file_upload_audit FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: employees Users can view their own employee profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own employee profile" ON public.employees FOR SELECT TO authenticated USING ((auth.uid() = profile_id));


--
-- Name: employers Users can view their own employer profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own employer profile" ON public.employers FOR SELECT TO authenticated USING ((auth.uid() = profile_id));


--
-- Name: shopping_article_history Users manage own article history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own article history" ON public.shopping_article_history USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: convention_settings Users manage own convention settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own convention settings" ON public.convention_settings USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: intervention_settings Users manage own intervention settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own intervention settings" ON public.intervention_settings USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: privacy_settings Users manage own privacy settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own privacy settings" ON public.privacy_settings USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: shopping_list_templates Users manage own shopping list templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own shopping list templates" ON public.shopping_list_templates USING ((employer_id = auth.uid())) WITH CHECK ((employer_id = auth.uid()));


--
-- Name: absences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: caregivers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;

--
-- Name: cesu_declarations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cesu_declarations ENABLE ROW LEVEL SECURITY;

--
-- Name: cesu_declarations cesu_declarations_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cesu_declarations_delete ON public.cesu_declarations FOR DELETE TO authenticated USING ((employer_id = auth.uid()));


--
-- Name: cesu_declarations cesu_declarations_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cesu_declarations_insert ON public.cesu_declarations FOR INSERT TO authenticated WITH CHECK ((employer_id = auth.uid()));


--
-- Name: cesu_declarations cesu_declarations_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cesu_declarations_select ON public.cesu_declarations FOR SELECT TO authenticated USING ((employer_id = auth.uid()));


--
-- Name: cesu_declarations cesu_declarations_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cesu_declarations_update ON public.cesu_declarations FOR UPDATE TO authenticated USING ((employer_id = auth.uid())) WITH CHECK ((employer_id = auth.uid()));


--
-- Name: contracts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: convention_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.convention_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: data_retention_policy; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.data_retention_policy ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_balances employee_view_own_balance; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY employee_view_own_balance ON public.leave_balances FOR SELECT USING ((employee_id = auth.uid()));


--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: employer_health_data; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.employer_health_data ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_balances employer_manage_balances; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY employer_manage_balances ON public.leave_balances USING ((employer_id = auth.uid()));


--
-- Name: leave_balances employer_view_balances; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY employer_view_balances ON public.leave_balances FOR SELECT USING ((employer_id = auth.uid()));


--
-- Name: employers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;

--
-- Name: file_upload_audit; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.file_upload_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: intervention_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.intervention_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_balances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: liaison_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.liaison_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: log_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notifications notifications_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications notifications_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notifications notifications_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: payslips; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

--
-- Name: payslips payslips_employee_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY payslips_employee_select ON public.payslips FOR SELECT USING ((employee_id = auth.uid()));


--
-- Name: payslips payslips_employer_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY payslips_employer_all ON public.payslips USING ((employer_id = auth.uid()));


--
-- Name: privacy_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: file_upload_audit service_role inserts audit entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "service_role inserts audit entries" ON public.file_upload_audit FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: shopping_article_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.shopping_article_history ENABLE ROW LEVEL SECURITY;

--
-- Name: shopping_list_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.shopping_list_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: user_consents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION complete_onboarding(p_role text, p_first_name text, p_last_name text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.complete_onboarding(p_role text, p_first_name text, p_last_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.complete_onboarding(p_role text, p_first_name text, p_last_name text) TO postgres;
GRANT ALL ON FUNCTION public.complete_onboarding(p_role text, p_first_name text, p_last_name text) TO anon;
GRANT ALL ON FUNCTION public.complete_onboarding(p_role text, p_first_name text, p_last_name text) TO authenticated;
GRANT ALL ON FUNCTION public.complete_onboarding(p_role text, p_first_name text, p_last_name text) TO service_role;


--
-- Name: FUNCTION count_working_days(p_start date, p_end date); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.count_working_days(p_start date, p_end date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.count_working_days(p_start date, p_end date) TO postgres;
GRANT ALL ON FUNCTION public.count_working_days(p_start date, p_end date) TO anon;
GRANT ALL ON FUNCTION public.count_working_days(p_start date, p_end date) TO authenticated;
GRANT ALL ON FUNCTION public.count_working_days(p_start date, p_end date) TO service_role;


--
-- Name: FUNCTION create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_priority text, p_data jsonb, p_action_url text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_priority text, p_data jsonb, p_action_url text) TO anon;
GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_priority text, p_data jsonb, p_action_url text) TO authenticated;
GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_priority text, p_data jsonb, p_action_url text) TO service_role;


--
-- Name: FUNCTION decrypt_health_field(p_ciphertext bytea, p_profile_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.decrypt_health_field(p_ciphertext bytea, p_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.decrypt_health_field(p_ciphertext bytea, p_profile_id uuid) TO anon;
GRANT ALL ON FUNCTION public.decrypt_health_field(p_ciphertext bytea, p_profile_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.decrypt_health_field(p_ciphertext bytea, p_profile_id uuid) TO service_role;


--
-- Name: FUNCTION delete_own_account(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_own_account() TO anon;
GRANT ALL ON FUNCTION public.delete_own_account() TO authenticated;
GRANT ALL ON FUNCTION public.delete_own_account() TO service_role;


--
-- Name: FUNCTION delete_own_data(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_own_data() TO anon;
GRANT ALL ON FUNCTION public.delete_own_data() TO authenticated;
GRANT ALL ON FUNCTION public.delete_own_data() TO service_role;


--
-- Name: FUNCTION encrypt_health_field(p_plaintext text, p_profile_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.encrypt_health_field(p_plaintext text, p_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.encrypt_health_field(p_plaintext text, p_profile_id uuid) TO anon;
GRANT ALL ON FUNCTION public.encrypt_health_field(p_plaintext text, p_profile_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.encrypt_health_field(p_plaintext text, p_profile_id uuid) TO service_role;


--
-- Name: FUNCTION ensure_auth_user_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ensure_auth_user_role() TO postgres;
GRANT ALL ON FUNCTION public.ensure_auth_user_role() TO anon;
GRANT ALL ON FUNCTION public.ensure_auth_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.ensure_auth_user_role() TO service_role;


--
-- Name: FUNCTION get_user_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_role() TO anon;
GRANT ALL ON FUNCTION public.get_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_role() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: TABLE leave_balances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.leave_balances TO anon;
GRANT ALL ON TABLE public.leave_balances TO authenticated;
GRANT ALL ON TABLE public.leave_balances TO service_role;


--
-- Name: FUNCTION initialize_leave_balance(p_contract_id uuid, p_leave_year text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.initialize_leave_balance(p_contract_id uuid, p_leave_year text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.initialize_leave_balance(p_contract_id uuid, p_leave_year text) TO postgres;
GRANT ALL ON FUNCTION public.initialize_leave_balance(p_contract_id uuid, p_leave_year text) TO anon;
GRANT ALL ON FUNCTION public.initialize_leave_balance(p_contract_id uuid, p_leave_year text) TO authenticated;
GRANT ALL ON FUNCTION public.initialize_leave_balance(p_contract_id uuid, p_leave_year text) TO service_role;


--
-- Name: FUNCTION is_employee(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_employee() TO anon;
GRANT ALL ON FUNCTION public.is_employee() TO authenticated;
GRANT ALL ON FUNCTION public.is_employee() TO service_role;


--
-- Name: FUNCTION is_employee(employer_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_employee(employer_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.is_employee(employer_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_employee(employer_uuid uuid) TO service_role;


--
-- Name: FUNCTION is_employer(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_employer() TO anon;
GRANT ALL ON FUNCTION public.is_employer() TO authenticated;
GRANT ALL ON FUNCTION public.is_employer() TO service_role;


--
-- Name: FUNCTION is_valid_email(email text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_valid_email(email text) TO anon;
GRANT ALL ON FUNCTION public.is_valid_email(email text) TO authenticated;
GRANT ALL ON FUNCTION public.is_valid_email(email text) TO service_role;


--
-- Name: FUNCTION is_valid_french_phone(phone text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_valid_french_phone(phone text) TO anon;
GRANT ALL ON FUNCTION public.is_valid_french_phone(phone text) TO authenticated;
GRANT ALL ON FUNCTION public.is_valid_french_phone(phone text) TO service_role;


--
-- Name: FUNCTION log_storage_upload(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_storage_upload() TO anon;
GRANT ALL ON FUNCTION public.log_storage_upload() TO authenticated;
GRANT ALL ON FUNCTION public.log_storage_upload() TO service_role;


--
-- Name: FUNCTION mark_liaison_messages_read(p_conversation_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.mark_liaison_messages_read(p_conversation_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mark_liaison_messages_read(p_conversation_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.mark_liaison_messages_read(p_conversation_id uuid) TO anon;
GRANT ALL ON FUNCTION public.mark_liaison_messages_read(p_conversation_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mark_liaison_messages_read(p_conversation_id uuid) TO service_role;


--
-- Name: FUNCTION mark_log_entry_read(p_entry_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.mark_log_entry_read(p_entry_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mark_log_entry_read(p_entry_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.mark_log_entry_read(p_entry_id uuid) TO anon;
GRANT ALL ON FUNCTION public.mark_log_entry_read(p_entry_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mark_log_entry_read(p_entry_id uuid) TO service_role;


--
-- Name: FUNCTION normalize_french_phone(phone text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalize_french_phone(phone text) TO anon;
GRANT ALL ON FUNCTION public.normalize_french_phone(phone text) TO authenticated;
GRANT ALL ON FUNCTION public.normalize_french_phone(phone text) TO service_role;


--
-- Name: FUNCTION normalize_profile_phone(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalize_profile_phone() TO anon;
GRANT ALL ON FUNCTION public.normalize_profile_phone() TO authenticated;
GRANT ALL ON FUNCTION public.normalize_profile_phone() TO service_role;


--
-- Name: FUNCTION purge_expired_data(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.purge_expired_data() TO anon;
GRANT ALL ON FUNCTION public.purge_expired_data() TO authenticated;
GRANT ALL ON FUNCTION public.purge_expired_data() TO service_role;


--
-- Name: FUNCTION update_push_subscriptions_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_push_subscriptions_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_push_subscriptions_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_push_subscriptions_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text) TO postgres;
GRANT ALL ON FUNCTION public.upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text) TO anon;
GRANT ALL ON FUNCTION public.upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text) TO authenticated;
GRANT ALL ON FUNCTION public.upsert_employer_health_data(p_handicap_type text, p_handicap_name text, p_specific_needs text) TO service_role;


--
-- Name: TABLE absences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.absences TO anon;
GRANT ALL ON TABLE public.absences TO authenticated;
GRANT ALL ON TABLE public.absences TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE caregivers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.caregivers TO anon;
GRANT ALL ON TABLE public.caregivers TO authenticated;
GRANT ALL ON TABLE public.caregivers TO service_role;


--
-- Name: TABLE cesu_declarations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cesu_declarations TO anon;
GRANT ALL ON TABLE public.cesu_declarations TO authenticated;
GRANT ALL ON TABLE public.cesu_declarations TO service_role;


--
-- Name: TABLE contracts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contracts TO anon;
GRANT ALL ON TABLE public.contracts TO authenticated;
GRANT ALL ON TABLE public.contracts TO service_role;


--
-- Name: TABLE convention_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.convention_settings TO anon;
GRANT ALL ON TABLE public.convention_settings TO authenticated;
GRANT ALL ON TABLE public.convention_settings TO service_role;


--
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;


--
-- Name: TABLE data_retention_policy; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.data_retention_policy TO anon;
GRANT ALL ON TABLE public.data_retention_policy TO authenticated;
GRANT ALL ON TABLE public.data_retention_policy TO service_role;


--
-- Name: TABLE employees; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.employees TO anon;
GRANT ALL ON TABLE public.employees TO authenticated;
GRANT ALL ON TABLE public.employees TO service_role;


--
-- Name: TABLE employer_health_data; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.employer_health_data TO anon;
GRANT ALL ON TABLE public.employer_health_data TO authenticated;
GRANT ALL ON TABLE public.employer_health_data TO service_role;


--
-- Name: TABLE employer_health_data_v; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.employer_health_data_v TO postgres;
GRANT ALL ON TABLE public.employer_health_data_v TO anon;
GRANT ALL ON TABLE public.employer_health_data_v TO authenticated;
GRANT ALL ON TABLE public.employer_health_data_v TO service_role;


--
-- Name: TABLE employers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.employers TO anon;
GRANT ALL ON TABLE public.employers TO authenticated;
GRANT ALL ON TABLE public.employers TO service_role;


--
-- Name: TABLE file_upload_audit; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.file_upload_audit TO anon;
GRANT ALL ON TABLE public.file_upload_audit TO authenticated;
GRANT ALL ON TABLE public.file_upload_audit TO service_role;


--
-- Name: TABLE intervention_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.intervention_settings TO anon;
GRANT ALL ON TABLE public.intervention_settings TO authenticated;
GRANT ALL ON TABLE public.intervention_settings TO service_role;


--
-- Name: TABLE liaison_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.liaison_messages TO anon;
GRANT ALL ON TABLE public.liaison_messages TO authenticated;
GRANT ALL ON TABLE public.liaison_messages TO service_role;


--
-- Name: TABLE log_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.log_entries TO anon;
GRANT ALL ON TABLE public.log_entries TO authenticated;
GRANT ALL ON TABLE public.log_entries TO service_role;


--
-- Name: TABLE notification_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_preferences TO anon;
GRANT ALL ON TABLE public.notification_preferences TO authenticated;
GRANT ALL ON TABLE public.notification_preferences TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE payslips; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payslips TO anon;
GRANT ALL ON TABLE public.payslips TO authenticated;
GRANT ALL ON TABLE public.payslips TO service_role;


--
-- Name: TABLE privacy_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.privacy_settings TO postgres;
GRANT ALL ON TABLE public.privacy_settings TO anon;
GRANT ALL ON TABLE public.privacy_settings TO authenticated;
GRANT ALL ON TABLE public.privacy_settings TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE push_subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.push_subscriptions TO anon;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;


--
-- Name: TABLE shifts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shifts TO anon;
GRANT ALL ON TABLE public.shifts TO authenticated;
GRANT ALL ON TABLE public.shifts TO service_role;


--
-- Name: TABLE shopping_article_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shopping_article_history TO anon;
GRANT ALL ON TABLE public.shopping_article_history TO authenticated;
GRANT ALL ON TABLE public.shopping_article_history TO service_role;


--
-- Name: TABLE shopping_list_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shopping_list_templates TO postgres;
GRANT ALL ON TABLE public.shopping_list_templates TO anon;
GRANT ALL ON TABLE public.shopping_list_templates TO authenticated;
GRANT ALL ON TABLE public.shopping_list_templates TO service_role;


--
-- Name: TABLE user_consents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_consents TO anon;
GRANT ALL ON TABLE public.user_consents TO authenticated;
GRANT ALL ON TABLE public.user_consents TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


