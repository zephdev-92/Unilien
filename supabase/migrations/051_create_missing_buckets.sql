-- ============================================
-- Migration 051 : Création des buckets Storage manquants
-- Buckets historiquement créés via le dashboard Supabase cloud,
-- recréés ici pour la migration self-hosted (OVH) et pour versionnage.
-- ============================================

-- ============================================
-- 1. Bucket "avatars" (public, 2 MB, images)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy : lecture publique (bucket public)
CREATE POLICY "avatars_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Policy : upload uniquement dans son propre dossier (<profile_id>/...)
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy : mise à jour de son propre avatar
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy : suppression de son propre avatar
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 2. Bucket "liaison-attachments" (privé, 5 MB, images + docs)
-- Chemin : <conversation_id>/<sender_id>/<timestamp>_<filename>
-- URL signées (1h) via createSignedUrl côté client
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'liaison-attachments',
  'liaison-attachments',
  false,
  5242880,  -- 5 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy : INSERT — on uploade dans une conversation à laquelle on a accès,
-- et seulement dans son propre dossier <sender_id>
CREATE POLICY "liaison_attachments_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'liaison-attachments'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = ((storage.foldername(name))[1])::uuid
        AND (
          c.employer_id = auth.uid()
          OR auth.uid() = ANY(c.participant_ids)
          OR EXISTS (
            SELECT 1 FROM public.contracts
            WHERE contracts.employer_id = c.employer_id
              AND contracts.employee_id = auth.uid()
              AND contracts.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.caregivers
            WHERE caregivers.employer_id = c.employer_id
              AND caregivers.profile_id = auth.uid()
              AND (caregivers.permissions->>'canViewLiaison')::boolean = true
          )
        )
    )
  );

-- Policy : SELECT — lecture des pièces jointes des conversations auxquelles on a accès
CREATE POLICY "liaison_attachments_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'liaison-attachments'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = ((storage.foldername(name))[1])::uuid
        AND (
          c.employer_id = auth.uid()
          OR auth.uid() = ANY(c.participant_ids)
          OR EXISTS (
            SELECT 1 FROM public.contracts
            WHERE contracts.employer_id = c.employer_id
              AND contracts.employee_id = auth.uid()
              AND contracts.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.caregivers
            WHERE caregivers.employer_id = c.employer_id
              AND caregivers.profile_id = auth.uid()
              AND (caregivers.permissions->>'canViewLiaison')::boolean = true
          )
        )
    )
  );

-- Policy : DELETE — l'uploader peut supprimer sa propre pièce jointe
CREATE POLICY "liaison_attachments_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'liaison-attachments'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
