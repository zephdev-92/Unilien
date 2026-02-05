-- Migration: Fix handle_new_user search_path
-- Security fix for mutable search_path warning
-- Also adds this function to version control

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer le profil seulement si l'email vient d'être confirmé
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (id, role, first_name, last_name, accessibility_settings, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'employer'),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      '{}',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user IS 'Creates a profile in public.profiles when user email is confirmed';
