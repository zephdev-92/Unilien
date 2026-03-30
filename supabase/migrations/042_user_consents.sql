-- Migration 042: Table user_consents pour traçabilité RGPD article 9
-- Stocke le consentement explicite avant collecte de données sensibles (santé)

CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('health_data', 'cookie')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  UNIQUE (user_id, consent_type)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);

-- RLS : chaque utilisateur ne voit et gère que ses propres consentements
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consents"
  ON user_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON user_consents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON user_consents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE user_consents IS 'Traçabilité des consentements RGPD (article 9 pour données de santé)';
COMMENT ON COLUMN user_consents.consent_type IS 'Type de consentement : health_data (données de santé), cookie';
COMMENT ON COLUMN user_consents.granted_at IS 'Date et heure du consentement';
COMMENT ON COLUMN user_consents.revoked_at IS 'Date de révocation (NULL = consentement actif)';
