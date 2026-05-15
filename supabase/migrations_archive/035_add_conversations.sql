-- Migration: Add conversations table for multi-thread messaging
-- Supports 'team' (shared by all employer members) and 'private' (1-to-1) conversations

-- =====================================================
-- TABLE: conversations
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('team', 'private')),
  participant_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_employer
  ON public.conversations(employer_id);

CREATE INDEX IF NOT EXISTS idx_conversations_participants
  ON public.conversations USING GIN(participant_ids);

-- Trigger: auto-update updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT — employer, participants, active employees, caregivers with canViewLiaison
CREATE POLICY "Users can read their conversations" ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = employer_id
    OR auth.uid() = ANY(participant_ids)
    OR EXISTS (
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
  );

-- Policy: INSERT — employer or participants
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = employer_id
    OR auth.uid() = ANY(participant_ids)
  );

-- Policy: UPDATE — employer or participants (e.g. updated_at refresh)
CREATE POLICY "Users can update their conversations" ON public.conversations
  FOR UPDATE
  USING (
    auth.uid() = employer_id
    OR auth.uid() = ANY(participant_ids)
  );

-- =====================================================
-- ALTER: liaison_messages — add conversation_id
-- =====================================================

ALTER TABLE public.liaison_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Index for fast message queries by conversation
CREATE INDEX IF NOT EXISTS idx_liaison_messages_conversation
  ON public.liaison_messages(conversation_id, created_at DESC);

-- =====================================================
-- DATA MIGRATION: create team conversations for existing employers
-- =====================================================

-- Create one 'team' conversation per employer that has existing messages
INSERT INTO public.conversations (employer_id, type, participant_ids)
SELECT DISTINCT employer_id, 'team', ARRAY[]::UUID[]
FROM public.liaison_messages
WHERE employer_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Link existing messages to their employer's team conversation
UPDATE public.liaison_messages m
SET conversation_id = c.id
FROM public.conversations c
WHERE c.employer_id = m.employer_id
  AND c.type = 'team'
  AND m.conversation_id IS NULL;

-- =====================================================
-- REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
