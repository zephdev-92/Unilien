-- Migration: Fix profiles INSERT/UPDATE policies + ensure trigger exists
-- Date: 2026-02-03
--
-- BUG: La migration 021 a supprimé toutes les anciennes policies sur profiles
-- mais n'a recréé que des policies SELECT. Les INSERT et UPDATE manquent,
-- ce qui empêche la création et modification de profil après inscription.

-- ============================================
-- 1. Ajouter INSERT policy sur profiles
-- ============================================

-- Permettre à un utilisateur de créer son propre profil
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. Ajouter UPDATE policy sur profiles
-- ============================================

-- Permettre à un utilisateur de modifier son propre profil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. S'assurer que le trigger handle_new_user existe
-- ============================================

-- Recréer la fonction avec support INSERT + UPDATE
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cas 1: INSERT - si email déjà confirmé (confirmations désactivées ou auto-confirm)
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (id, role, first_name, last_name, email, accessibility_settings, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'employer'),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      '{}',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Cas 2: UPDATE - email vient d'être confirmé
  IF TG_OP = 'UPDATE' AND NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (id, role, first_name, last_name, email, accessibility_settings, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'employer'),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      '{}',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Créer le trigger sur INSERT (pour le cas où email_confirmed_at est déjà set)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Créer le trigger sur UPDATE (pour la confirmation email)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user IS 'Creates a profile in public.profiles when user signs up or confirms email. Handles both INSERT (auto-confirm) and UPDATE (email confirmation) cases.';
