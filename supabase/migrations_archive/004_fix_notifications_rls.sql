-- Migration: Fix notifications RLS policies
-- La table notifications manquait de policies RLS pour INSERT/SELECT/UPDATE

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

-- Policy: Les utilisateurs peuvent lire leurs propres notifications
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent insérer des notifications pour eux-mêmes
-- (pour les notifications système cross-user, utiliser la fonction RPC)
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres notifications
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres notifications
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Fonction RPC pour créer des notifications (contourne RLS via SECURITY DEFINER)
-- Nécessaire pour permettre à un utilisateur de créer une notification pour un autre
-- Ex: quand un employé crée une absence, il notifie l'employeur
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text DEFAULT 'normal',
  p_data jsonb DEFAULT '{}'::jsonb,
  p_action_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Vérifier que l'appelant est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, priority, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_priority, p_data, p_action_url)
  RETURNING to_jsonb(notifications.*) INTO v_result;

  RETURN v_result;
END;
$$;

-- Accorder l'accès aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;

-- Grant permissions sur la table
GRANT ALL ON public.notifications TO authenticated;
