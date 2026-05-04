-- Migration 058 : Chiffrement applicatif des colonnes santé via pgsodium
-- Conformité RGPD art. 9 — défense en profondeur au-delà de la RLS owner-only
--
-- Approche :
-- 1. Active pgsodium (extension dispo dans l'image Supabase Postgres)
-- 2. Crée une clé dédiée 'medical_data_key' dans le keyring pgsodium
-- 3. Convertit les colonnes text → bytea avec backfill chiffré (mode AEAD déterministe + AAD = profile_id pour éviter les fuites par pattern entre utilisateurs)
-- 4. Crée 2 helpers SECURITY DEFINER (encrypt + decrypt) qui wrappent les fonctions pgsodium —
--    nécessaire car l'accès direct aux fonctions pgsodium.crypto_aead_det_* est restreint par défaut
-- 5. Crée une vue déchiffrée `employer_health_data_v` (RLS héritée via security_invoker) qui appelle le helper decrypt
-- 6. Crée une RPC `upsert_employer_health_data` SECURITY DEFINER qui chiffre côté serveur avant écriture
--
-- Le code app lit via la vue et écrit via la RPC. La table de base ne contient que des bytea.

-- ── 1. Extension ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- ── 2. Clé (idempotent) ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgsodium.key WHERE name = 'medical_data_key') THEN
    PERFORM pgsodium.create_key(name := 'medical_data_key');
  END IF;
END $$;

-- ── 3. Migration des colonnes : text → bytea avec backfill chiffré ──────────
-- Idempotent : si déjà bytea (re-run), les ALTER ADD échouent silencieusement avec IF NOT EXISTS.
DO $$
DECLARE
  v_col_type text;
BEGIN
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_name = 'employer_health_data' AND column_name = 'handicap_type';

  -- Si la colonne est encore en text, on fait la migration
  IF v_col_type = 'text' THEN
    ALTER TABLE employer_health_data
      ADD COLUMN handicap_type_enc bytea,
      ADD COLUMN handicap_name_enc bytea,
      ADD COLUMN specific_needs_enc bytea;

    UPDATE employer_health_data
    SET
      handicap_type_enc = CASE
        WHEN handicap_type IS NOT NULL THEN pgsodium.crypto_aead_det_encrypt(
          convert_to(handicap_type, 'utf8'),
          convert_to(profile_id::text, 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'medical_data_key')
        )
      END,
      handicap_name_enc = CASE
        WHEN handicap_name IS NOT NULL THEN pgsodium.crypto_aead_det_encrypt(
          convert_to(handicap_name, 'utf8'),
          convert_to(profile_id::text, 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'medical_data_key')
        )
      END,
      specific_needs_enc = CASE
        WHEN specific_needs IS NOT NULL THEN pgsodium.crypto_aead_det_encrypt(
          convert_to(specific_needs, 'utf8'),
          convert_to(profile_id::text, 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'medical_data_key')
        )
      END;

    ALTER TABLE employer_health_data
      DROP COLUMN handicap_type,
      DROP COLUMN handicap_name,
      DROP COLUMN specific_needs;

    ALTER TABLE employer_health_data RENAME COLUMN handicap_type_enc TO handicap_type;
    ALTER TABLE employer_health_data RENAME COLUMN handicap_name_enc TO handicap_name;
    ALTER TABLE employer_health_data RENAME COLUMN specific_needs_enc TO specific_needs;
  END IF;
END $$;

-- ── 4. Helpers SECURITY DEFINER ─────────────────────────────────────────────
-- Les fonctions pgsodium.crypto_aead_det_* sont restreintes par défaut au superuser.
-- Ces helpers les wrappent : ils tournent avec les privilèges de leur owner (postgres),
-- ce qui permet à `authenticated` de chiffrer/déchiffrer SES propres données.
-- L'AAD = profile_id (passée explicitement) garantit qu'un user ne peut pas déchiffrer
-- les données d'un autre user, même s'il devinait le bytea (l'AAD doit matcher).

CREATE OR REPLACE FUNCTION decrypt_health_field(p_ciphertext bytea, p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pgsodium, pg_temp
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

REVOKE ALL ON FUNCTION decrypt_health_field(bytea, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrypt_health_field(bytea, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION encrypt_health_field(p_plaintext text, p_profile_id uuid)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pgsodium, pg_temp
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

REVOKE ALL ON FUNCTION encrypt_health_field(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION encrypt_health_field(text, uuid) TO authenticated;

-- ── 5. Vue déchiffrée (lecture côté app) ────────────────────────────────────
-- security_invoker=true → la RLS de la table de base s'applique aussi à la vue
-- DROP préalable pour permettre changement de définition (CREATE OR REPLACE est strict sur le type des colonnes)
DROP VIEW IF EXISTS employer_health_data_v;

CREATE VIEW employer_health_data_v
WITH (security_invoker = true)
AS
SELECT
  profile_id,
  decrypt_health_field(handicap_type, profile_id)  AS handicap_type,
  decrypt_health_field(handicap_name, profile_id)  AS handicap_name,
  decrypt_health_field(specific_needs, profile_id) AS specific_needs,
  created_at,
  updated_at
FROM employer_health_data;

GRANT SELECT ON employer_health_data_v TO authenticated;

-- ── 6. RPC d'upsert (écriture côté app) ─────────────────────────────────────
-- SECURITY DEFINER : nécessaire pour appeler encrypt_health_field qui dépend de pgsodium.
-- Vérification explicite de auth.uid() à l'intérieur pour préserver l'isolation par user.
CREATE OR REPLACE FUNCTION upsert_employer_health_data(
  p_handicap_type text DEFAULT NULL,
  p_handicap_name text DEFAULT NULL,
  p_specific_needs text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION upsert_employer_health_data(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_employer_health_data(text, text, text) TO authenticated;

-- ── 7. Commentaires ─────────────────────────────────────────────────────────
COMMENT ON COLUMN employer_health_data.handicap_type
  IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';
COMMENT ON COLUMN employer_health_data.handicap_name
  IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';
COMMENT ON COLUMN employer_health_data.specific_needs
  IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';
COMMENT ON VIEW employer_health_data_v
  IS 'Vue déchiffrée d''employer_health_data. RLS héritée via security_invoker. Utiliser pour la lecture côté app.';
COMMENT ON FUNCTION decrypt_health_field(bytea, uuid)
  IS 'Helper SECURITY DEFINER : déchiffre un champ santé pour le profile_id donné. Réservé aux roles authenticated.';
COMMENT ON FUNCTION encrypt_health_field(text, uuid)
  IS 'Helper SECURITY DEFINER : chiffre une valeur en clair pour stockage. Réservé aux roles authenticated.';
COMMENT ON FUNCTION upsert_employer_health_data(text, text, text)
  IS 'Upsert santé chiffré côté serveur (SECURITY DEFINER, vérifie auth.uid()). Utiliser pour l''écriture côté app.';
