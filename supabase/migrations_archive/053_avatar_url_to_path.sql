-- ============================================
-- Migration 053 : profiles.avatar_url passe de URL complète à Storage path
-- ============================================
--
-- Contexte
-- --------
-- Avant cette migration, `uploadAvatar()` stockait en DB l'URL publique complète
-- générée via `getPublicUrl()`, ex :
--   https://lczfygydhnyygguvponw.supabase.co/storage/v1/object/public/avatars/<profileId>/<ts>.jpg
--
-- Conséquences post-migration self-host (21/04/2026) :
--   1. Les URLs pointent vers l'ancien projet Cloud → avatars cassés
--   2. Le bucket self-host `avatars` est vide (fichiers non migrés)
--   3. Le CSP a dû être élargi à `https://*.supabase.co` pour éviter un
--      blocage `img-src` sur ces URLs legacy (voir PR #288)
--
-- Nouvelle sémantique
-- -------------------
-- `avatar_url` stocke désormais un **path Storage** relatif au bucket `avatars`,
-- au format `<profile_id>/<timestamp>.<ext>`. L'URL publique est générée côté
-- client via `resolveAvatarUrl()` (`src/lib/supabase/avatars.ts`).
--
-- Avantage : immuable face aux migrations de projet/infra.
--
-- Effet de cette migration
-- ------------------------
-- Tous les `avatar_url` existants sont mis à NULL car les fichiers d'origine
-- n'existent plus dans le bucket self-host. Les utilisateurs devront
-- ré-uploader leur avatar via Paramètres > Profil.
-- ============================================

-- 1. Nettoyer les URLs legacy
UPDATE profiles
SET avatar_url = NULL,
    updated_at = NOW()
WHERE avatar_url IS NOT NULL;

-- 2. Documenter le nouveau contrat de la colonne
COMMENT ON COLUMN profiles.avatar_url IS
  'Storage path dans le bucket "avatars" (ex: <profile_id>/<timestamp>.jpg). '
  'URL publique générée côté client via resolveAvatarUrl (src/lib/supabase/avatars.ts). '
  'Historique : contenait l''URL publique complète avant migration 053 (2026-04-24).';
