-- Migration 065 : MEDIUM-1 fix — restreindre INSERT sur file_upload_audit
--
-- Bug initial (migration 013) : la policy INSERT s'appelait
-- "Service role can insert audit entries" et son commentaire disait
-- "Only system can insert (via trigger or service role)", mais le
-- WITH CHECK (true) autorisait en réalité **n'importe quel
-- authenticated** à insérer des lignes arbitraires dans la table
-- d'audit. Pas d'exfiltration possible (RLS SELECT reste
-- `auth.uid() = user_id`), mais permettait d'empoisonner l'audit log
-- avec des entrées fausses → compromettait la traçabilité RGPD.
--
-- Fix : restreindre INSERT au rôle `service_role` uniquement. Le
-- trigger `log_storage_upload` (SECURITY DEFINER, créé migration 013)
-- continue de fonctionner car il bypass RLS de toute façon.

DROP POLICY IF EXISTS "Service role can insert audit entries" ON public.file_upload_audit;

CREATE POLICY "service_role inserts audit entries"
  ON public.file_upload_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);
