-- Migration 044: Table audit_logs pour traçabilité RGPD
-- Log les accès et modifications aux données sensibles (santé, sécu, IBAN)
-- Ne stocke JAMAIS les valeurs — uniquement qui, quoi, quand

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete', 'grant_consent', 'revoke_consent')),
  resource TEXT NOT NULL,
  resource_id UUID DEFAULT NULL,
  fields_accessed TEXT[] DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes d'audit
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS : insert uniquement pour son propre user_id, lecture réservée au propriétaire
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Pas d'UPDATE ni DELETE — les logs d'audit sont immuables

COMMENT ON TABLE audit_logs IS 'Journal d''audit RGPD — traçabilité des accès aux données sensibles';
COMMENT ON COLUMN audit_logs.action IS 'Type d''opération effectuée';
COMMENT ON COLUMN audit_logs.resource IS 'Ressource concernée (employer_health_data, employee_sensitive, user_consents)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID de la ressource (profile_id cible, optionnel)';
COMMENT ON COLUMN audit_logs.fields_accessed IS 'Liste des champs accédés/modifiés (sans les valeurs)';
