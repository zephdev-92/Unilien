-- Migration 064 : HIGH-2 fix — fuite des conversations privées via RLS
--
-- Bug : les policies SELECT sur `conversations` (migration 035) et
-- `liaison_messages` (migration 001) accordaient un accès à
-- **toute conversation** d'un employeur dès qu'un user avait un contrat
-- actif OU un statut de caregiver avec `canViewLiaison`. Cette règle
-- est appropriée pour les conversations `type = 'team'` (équipe), mais
-- elle laissait fuiter les conversations `type = 'private'` entre
-- l'employeur et un employé/aidant donné vers TOUS les autres
-- employés/aidants de la même équipe.
--
-- Démonstration : un nouvel auxiliaire ajouté à l'équipe de l'employeur
-- pouvait, dès activation de son contrat, lire toutes les conversations
-- privées historiques entre l'employeur et les autres auxiliaires
-- (cf. screenshot 2026-05-13).
--
-- Fix : la règle "employés/caregivers actifs" ne s'applique qu'aux
-- conversations `type = 'team'`. Pour `type = 'private'`, seuls
-- `employer_id` et `participant_ids` ont accès — règle déjà couverte
-- par les 2 premières clauses (`auth.uid() = employer_id OR
-- auth.uid() = ANY(participant_ids)`). `liaison_messages` SELECT
-- cascade via EXISTS sur la conversation parente — single source of
-- truth.

DROP POLICY IF EXISTS "Users can read their conversations" ON public.conversations;

CREATE POLICY "Users can read their conversations"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = employer_id
    OR auth.uid() = ANY(participant_ids)
    OR (
      type = 'team'
      AND (
        EXISTS (
          SELECT 1 FROM public.contracts
          WHERE contracts.employer_id = conversations.employer_id
            AND contracts.employee_id = auth.uid()
            AND contracts.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.caregivers
          WHERE caregivers.employer_id = conversations.employer_id
            AND caregivers.profile_id = auth.uid()
            AND (caregivers.permissions->>'canViewLiaison')::boolean = true
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can read liaison messages" ON public.liaison_messages;

CREATE POLICY "Users can read liaison messages"
  ON public.liaison_messages
  FOR SELECT
  USING (
    -- Le sender garde toujours accès à ses propres messages
    -- (utile pour ses propres messages dans une conversation
    -- où il aurait été retiré ensuite).
    auth.uid() = sender_id
    -- Sinon : accès cascadé via la conversation parente, même règle
    -- que la policy SELECT sur conversations.
    OR EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = liaison_messages.conversation_id
        AND (
          auth.uid() = c.employer_id
          OR auth.uid() = ANY(c.participant_ids)
          OR (
            c.type = 'team'
            AND (
              EXISTS (
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
        )
    )
  );
