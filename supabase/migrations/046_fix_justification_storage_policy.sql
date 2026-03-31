-- Migration 046: Fix storage policies for caregiver justifications
-- L'employeur doit pouvoir lire les justificatifs de ses aidants (caregiver_id)
-- La policy existante ne vérifie que employee_id, pas caregiver_id

-- Policy: Employers can view justifications from their caregivers
CREATE POLICY "Employers can view caregiver justifications"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'justifications'
  AND EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.employer_id = auth.uid()
    AND contracts.caregiver_id = (storage.foldername(name))[1]::uuid
    AND contracts.status = 'active'
  )
);
