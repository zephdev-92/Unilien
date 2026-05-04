-- Migration 058 : Chiffrement applicatif des colonnes santé via pgsodium
-- Conformité RGPD art. 9 — défense en profondeur au-delà de la RLS owner-only
--
-- Approche :
-- 1. Active pgsodium (extension dispo dans l'image Supabase Postgres)
-- 2. Crée une clé dédiée 'medical_data_key' dans le keyring pgsodium
-- 3. Convertit les colonnes text → bytea avec backfill chiffré (mode AEAD déterministe + AAD = profile_id pour éviter les fuites par pattern entre utilisateurs)
-- 4. Crée une vue déchiffrée `employer_health_data_v` (RLS héritée via security_invoker)
-- 5. Crée une RPC `upsert_employer_health_data` qui chiffre côté serveur avant écriture
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
-- Ajout des colonnes encrypted en parallèle pour éviter de perdre les données en cas d'erreur
ALTER TABLE employer_health_data
  ADD COLUMN IF NOT EXISTS handicap_type_enc bytea,
  ADD COLUMN IF NOT EXISTS handicap_name_enc bytea,
  ADD COLUMN IF NOT EXISTS specific_needs_enc bytea;

-- Backfill : chiffrer les valeurs existantes (AAD = profile_id pour unicité par user)
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

-- Drop des colonnes en clair après backfill
ALTER TABLE employer_health_data
  DROP COLUMN handicap_type,
  DROP COLUMN handicap_name,
  DROP COLUMN specific_needs;

-- Renommage : on garde les noms d'origine côté schéma (l'app verra des bytea)
ALTER TABLE employer_health_data RENAME COLUMN handicap_type_enc TO handicap_type;
ALTER TABLE employer_health_data RENAME COLUMN handicap_name_enc TO handicap_name;
ALTER TABLE employer_health_data RENAME COLUMN specific_needs_enc TO specific_needs;

-- ── 4. Vue déchiffrée (lecture côté app) ────────────────────────────────────
-- security_invoker=true → la RLS de la table de base s'applique aussi à la vue
CREATE OR REPLACE VIEW employer_health_data_v
WITH (security_invoker = true)
AS
SELECT
  profile_id,
  CASE WHEN handicap_type IS NOT NULL THEN
    convert_from(
      pgsodium.crypto_aead_det_decrypt(
        handicap_type,
        convert_to(profile_id::text, 'utf8'),
        (SELECT id FROM pgsodium.key WHERE name = 'medical_data_key')
      ),
      'utf8'
    )
  END AS handicap_type,
  CASE WHEN handicap_name IS NOT NULL THEN
    convert_from(
      pgsodium.crypto_aead_det_decrypt(
        handicap_name,
        convert_to(profile_id::text, 'utf8'),
        (SELECT id FROM pgsodium.key WHERE name = 'medical_data_key')
      ),
      'utf8'
    )
  END AS handicap_name,
  CASE WHEN specific_needs IS NOT NULL THEN
    convert_from(
      pgsodium.crypto_aead_det_decrypt(
        specific_needs,
        convert_to(profile_id::text, 'utf8'),
        (SELECT id FROM pgsodium.key WHERE name = 'medical_data_key')
      ),
      'utf8'
    )
  END AS specific_needs,
  created_at,
  updated_at
FROM employer_health_data;

GRANT SELECT ON employer_health_data_v TO authenticated;

-- ── 5. RPC d'upsert (écriture côté app) ─────────────────────────────────────
-- L'app passe les valeurs en clair, la fonction chiffre côté serveur et upsert.
-- SECURITY INVOKER → la RLS owner-only s'applique aussi à l'upsert.
CREATE OR REPLACE FUNCTION upsert_employer_health_data(
  p_handicap_type text DEFAULT NULL,
  p_handicap_name text DEFAULT NULL,
  p_specific_needs text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_key_id uuid;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT id INTO v_key_id FROM pgsodium.key WHERE name = 'medical_data_key';
  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'Clé medical_data_key introuvable';
  END IF;

  INSERT INTO employer_health_data (profile_id, handicap_type, handicap_name, specific_needs, updated_at)
  VALUES (
    v_profile_id,
    CASE WHEN p_handicap_type IS NOT NULL THEN
      pgsodium.crypto_aead_det_encrypt(
        convert_to(p_handicap_type, 'utf8'),
        convert_to(v_profile_id::text, 'utf8'),
        v_key_id
      )
    END,
    CASE WHEN p_handicap_name IS NOT NULL THEN
      pgsodium.crypto_aead_det_encrypt(
        convert_to(p_handicap_name, 'utf8'),
        convert_to(v_profile_id::text, 'utf8'),
        v_key_id
      )
    END,
    CASE WHEN p_specific_needs IS NOT NULL THEN
      pgsodium.crypto_aead_det_encrypt(
        convert_to(p_specific_needs, 'utf8'),
        convert_to(v_profile_id::text, 'utf8'),
        v_key_id
      )
    END,
    now()
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    handicap_type  = EXCLUDED.handicap_type,
    handicap_name  = EXCLUDED.handicap_name,
    specific_needs = EXCLUDED.specific_needs,
    updated_at     = now();
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_employer_health_data(text, text, text) TO authenticated;

-- ── 6. Commentaires ─────────────────────────────────────────────────────────
COMMENT ON COLUMN employer_health_data.handicap_type
  IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';
COMMENT ON COLUMN employer_health_data.handicap_name
  IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';
COMMENT ON COLUMN employer_health_data.specific_needs
  IS 'CHIFFRÉ pgsodium AEAD-det (clé medical_data_key, AAD = profile_id). Lire via la vue employer_health_data_v.';
COMMENT ON VIEW employer_health_data_v
  IS 'Vue déchiffrée d''employer_health_data. RLS héritée via security_invoker. Utiliser pour la lecture côté app.';
COMMENT ON FUNCTION upsert_employer_health_data(text, text, text)
  IS 'Upsert santé chiffré côté serveur. Utiliser pour l''écriture côté app (au lieu d''un .from(employer_health_data).upsert).';
