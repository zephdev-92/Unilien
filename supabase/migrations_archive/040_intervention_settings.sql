-- Préférences d'intervention par utilisateur (tâches habituelles + liste de courses)
CREATE TABLE intervention_settings (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  default_tasks TEXT[] NOT NULL DEFAULT '{}',
  custom_tasks TEXT[] NOT NULL DEFAULT '{}',
  shopping_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- shopping_list format: [{ "name": "Lait", "brand": "Lactel", "quantity": 1, "note": "" }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE intervention_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own intervention settings"
  ON intervention_settings FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Historique d'articles pour l'autocomplétion
CREATE TABLE shopping_article_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  use_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, name, brand)
);

ALTER TABLE shopping_article_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own article history"
  ON shopping_article_history FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
