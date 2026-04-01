-- Paramètres de convention collective par employeur (règles de validation + majorations)
-- Migration depuis localStorage vers Supabase

CREATE TABLE convention_settings (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Règles de validation
  rule_break BOOLEAN NOT NULL DEFAULT true,
  rule_daily_max BOOLEAN NOT NULL DEFAULT true,
  rule_overtime BOOLEAN NOT NULL DEFAULT true,
  rule_night BOOLEAN NOT NULL DEFAULT true,

  -- Majorations (pourcentages 0-100)
  maj_dimanche INTEGER NOT NULL DEFAULT 30,
  maj_ferie INTEGER NOT NULL DEFAULT 60,
  maj_nuit INTEGER NOT NULL DEFAULT 25,
  maj_supp INTEGER NOT NULL DEFAULT 25,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE convention_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own convention settings"
  ON convention_settings FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
