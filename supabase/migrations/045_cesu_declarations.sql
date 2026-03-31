-- Migration 045: Table cesu_declarations
-- Persiste les déclarations CESU mensuelles (snapshot JSONB complet)

CREATE TABLE IF NOT EXISTS public.cesu_declarations (
  id               UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id      UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Période (clé de déduplication)
  year             INTEGER       NOT NULL,
  month            INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),
  period_label     TEXT          NOT NULL,

  -- Résumé dénormalisé pour affichage liste (sans parser le JSONB)
  total_employees  INTEGER       NOT NULL,
  total_hours      NUMERIC(8,2)  NOT NULL,
  total_gross_pay  NUMERIC(10,2) NOT NULL,

  -- Snapshot complet MonthlyDeclarationData
  declaration_data JSONB         NOT NULL,

  -- Stockage PDF
  storage_path     TEXT          DEFAULT NULL,

  -- Métadonnées
  generated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Une seule déclaration par employeur par période
CREATE UNIQUE INDEX cesu_declarations_unique_period
  ON public.cesu_declarations (employer_id, year, month);

-- Index pour requêtes fréquentes
CREATE INDEX cesu_declarations_employer_idx
  ON public.cesu_declarations (employer_id);

-- RLS
ALTER TABLE public.cesu_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cesu_declarations_select"
  ON public.cesu_declarations FOR SELECT
  TO authenticated
  USING (employer_id = auth.uid());

CREATE POLICY "cesu_declarations_insert"
  ON public.cesu_declarations FOR INSERT
  TO authenticated
  WITH CHECK (employer_id = auth.uid());

CREATE POLICY "cesu_declarations_update"
  ON public.cesu_declarations FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

CREATE POLICY "cesu_declarations_delete"
  ON public.cesu_declarations FOR DELETE
  TO authenticated
  USING (employer_id = auth.uid());

COMMENT ON TABLE public.cesu_declarations IS 'Déclarations CESU mensuelles persistées (snapshot JSON complet)';
COMMENT ON COLUMN public.cesu_declarations.declaration_data IS 'Snapshot complet MonthlyDeclarationData au format JSON';

-- Bucket Storage pour les PDF CESU
INSERT INTO storage.buckets (id, name, public)
VALUES ('cesu-declarations', 'cesu-declarations', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Storage : l'employeur accède à ses propres fichiers (chemin = <employer_id>/...)
CREATE POLICY "cesu_pdf_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cesu-declarations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cesu_pdf_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cesu-declarations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cesu_pdf_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'cesu-declarations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cesu_pdf_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cesu-declarations' AND (storage.foldername(name))[1] = auth.uid()::text);
