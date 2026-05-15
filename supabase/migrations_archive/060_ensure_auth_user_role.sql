-- Migration 060 : Forcer auth.users.role = 'authenticated' par défaut
--
-- Bug observé en prod : GoTrue v2.186.0 (self-host) ne set pas
-- auth.users.role pour les signups OAuth Google → role = '' → le claim
-- JWT `role` est vide → PostgREST échoue avec
-- "role '' does not exist" (code 22023) sur toutes les requêtes du user.
--
-- Les autres providers (email/mdp, Azure, magic link) posent bien
-- role='authenticated'. C'est spécifique au flux Google sur ce setup.
--
-- Le trigger BEFORE INSERT/UPDATE force le défaut côté DB. Plus robuste
-- qu'un ALTER COLUMN ... SET DEFAULT (GoTrue peut redéfinir le schéma
-- auth.* lors de ses migrations internes — un trigger sur public.*
-- survit, contrairement à un default sur auth.users).
--
-- Idempotent : peut être rejouée. Doit être appliquée via
-- `psql -U supabase_admin` (création de trigger sur le schéma auth).

CREATE OR REPLACE FUNCTION public.ensure_auth_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS NULL OR NEW.role = '' THEN
    NEW.role := 'authenticated';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_auth_user_role()
  IS 'Trigger BEFORE INSERT/UPDATE sur auth.users : force role=''authenticated'' si vide. Contournement bug GoTrue v2.186 sur OAuth Google qui laisse le role vide.';

DROP TRIGGER IF EXISTS ensure_auth_user_role_before_write ON auth.users;
CREATE TRIGGER ensure_auth_user_role_before_write
BEFORE INSERT OR UPDATE OF role ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_auth_user_role();
