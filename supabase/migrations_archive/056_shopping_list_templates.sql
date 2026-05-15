-- Modèles de listes de courses (jusqu'à 5 par employeur)
-- Permet à Marie de gérer plusieurs listes (ex: "Courses semaine", "Pharmacie",
-- "Ménage") et de choisir laquelle utiliser à la création d'une intervention.
--
-- Le snapshot est natif : les items sélectionnés sont copiés dans `shifts.tasks`
-- (préfixés `[courses]`), donc modifier un template n'affecte pas les
-- interventions passées.

CREATE TABLE shopping_list_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  is_default BOOLEAN NOT NULL DEFAULT false,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- items format: [{ "name": "Lait", "brand": "Lactel", "quantity": 1, "note": "" }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un seul template "par défaut" par employeur (index partiel filtré)
CREATE UNIQUE INDEX shopping_list_templates_one_default_per_employer
  ON shopping_list_templates (employer_id)
  WHERE is_default = true;

CREATE INDEX shopping_list_templates_employer_idx
  ON shopping_list_templates (employer_id);

ALTER TABLE shopping_list_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shopping list templates"
  ON shopping_list_templates FOR ALL
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Migration des listes existantes : pour chaque utilisateur ayant une
-- `intervention_settings.shopping_list` non vide, on crée un template
-- "Liste par défaut" par défaut.
INSERT INTO shopping_list_templates (employer_id, name, is_default, items)
SELECT
  profile_id,
  'Liste par défaut',
  true,
  shopping_list
FROM intervention_settings
WHERE shopping_list IS NOT NULL
  AND jsonb_typeof(shopping_list) = 'array'
  AND jsonb_array_length(shopping_list) > 0
ON CONFLICT DO NOTHING;
