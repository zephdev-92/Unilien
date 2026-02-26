-- ============================================
-- Migration 034: Création bucket Storage "payslips"
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payslips',
  'payslips',
  false,
  10485760,  -- 10 MB max par fichier
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Politique : l'employeur peut tout faire sur ses bulletins
CREATE POLICY "payslips_employer_all"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'payslips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'payslips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Politique : l'employé peut lire ses propres bulletins
-- Chemin : <employer_id>/<employee_id>/...
CREATE POLICY "payslips_employee_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'payslips'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
