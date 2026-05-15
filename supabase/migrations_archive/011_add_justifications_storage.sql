-- Create storage bucket for absence justifications (arrêts de travail)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'justifications',
  'justifications',
  true,
  5242880, -- 5MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Employees can upload their own justifications
CREATE POLICY "Employees can upload own justifications"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'justifications'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Employees can view their own justifications
CREATE POLICY "Employees can view own justifications"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'justifications'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Employers can view justifications from their employees
CREATE POLICY "Employers can view employee justifications"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'justifications'
  AND EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.employer_id = auth.uid()
    AND contracts.employee_id = (storage.foldername(name))[1]::uuid
    AND contracts.status = 'active'
  )
);

-- Policy: Public read access for justifications (since bucket is public)
CREATE POLICY "Public read access for justifications"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'justifications');
