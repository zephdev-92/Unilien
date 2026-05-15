-- Migration 046: Policy pour que les employeurs puissent voir les justificatifs des aidants
-- Complète la migration 041 qui ne couvrait que les employee_id

CREATE POLICY "Employers can view caregiver justifications"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'justifications'
    AND (storage.foldername(name))[1] IN (
      SELECT c.caregiver_id::text
      FROM public.contracts c
      WHERE c.employer_id = auth.uid()
        AND c.status = 'active'
        AND c.caregiver_id IS NOT NULL
    )
  );
