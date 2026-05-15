-- Migration 049: Fix profile email
-- handle_new_user ne stockait pas l'email dans profiles
-- Fix : inclure l'email + backfill des profils existants

-- 1. Corriger handle_new_user pour inclure l'email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
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
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Backfill des profils dont l'email est NULL
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id
  AND public.profiles.email IS NULL;
