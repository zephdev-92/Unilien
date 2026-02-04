-- Create storage bucket for absence justifications (arrêts de travail)
-- The bucket is PUBLIC so files can be accessed via public URLs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'justifications',
  'justifications',
  true,  -- PUBLIC bucket - files accessible without authentication
  5242880, -- 5MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Drop existing policies if they exist (idempotent migration)
DROP POLICY IF EXISTS "Users can upload own justifications" ON storage.objects;
DROP POLICY IF EXISTS "Employees can upload own justifications" ON storage.objects;
DROP POLICY IF EXISTS "Employees can view own justifications" ON storage.objects;
DROP POLICY IF EXISTS "Employers can view employee justifications" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for justifications" ON storage.objects;

-- Policy: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own justifications"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'justifications'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can read from public bucket (required even for public buckets)
CREATE POLICY "Public read access for justifications"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'justifications');
