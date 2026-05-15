-- Préférences de confidentialité par utilisateur
-- Activation/désactivation des analytics (Plausible cookieless)

CREATE TABLE privacy_settings (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Analytics anonymisés (Plausible) — opt-in par défaut, cookieless
  analytics_enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own privacy settings"
  ON privacy_settings FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
