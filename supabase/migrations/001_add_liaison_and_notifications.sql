-- Migration: Add liaison_messages and notification_preferences tables
-- Run this in Supabase SQL Editor

-- =====================================================
-- TABLE: liaison_messages (messagerie en temps réel)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.liaison_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('employer', 'employee', 'caregiver')),
  content TEXT NOT NULL,
  audio_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_edited BOOLEAN DEFAULT false,
  read_by UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries by employer
CREATE INDEX IF NOT EXISTS idx_liaison_messages_employer
  ON public.liaison_messages(employer_id, created_at DESC);

-- Index for sender queries
CREATE INDEX IF NOT EXISTS idx_liaison_messages_sender
  ON public.liaison_messages(sender_id);

-- Enable Row Level Security
ALTER TABLE public.liaison_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages for their employer
CREATE POLICY "Users can read liaison messages" ON public.liaison_messages
  FOR SELECT
  USING (
    auth.uid() = employer_id
    OR auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.employer_id = liaison_messages.employer_id
      AND contracts.employee_id = auth.uid()
      AND contracts.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.caregivers
      WHERE caregivers.employer_id = liaison_messages.employer_id
      AND caregivers.profile_id = auth.uid()
      AND (caregivers.permissions->>'canViewLiaison')::boolean = true
    )
  );

-- Policy: Users can insert messages for their employer
CREATE POLICY "Users can insert liaison messages" ON public.liaison_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() = employer_id
      OR EXISTS (
        SELECT 1 FROM public.contracts
        WHERE contracts.employer_id = liaison_messages.employer_id
        AND contracts.employee_id = auth.uid()
        AND contracts.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.employer_id = liaison_messages.employer_id
        AND caregivers.profile_id = auth.uid()
        AND (caregivers.permissions->>'canWriteLiaison')::boolean = true
      )
    )
  );

-- Policy: Users can update their own messages
CREATE POLICY "Users can update own liaison messages" ON public.liaison_messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own liaison messages" ON public.liaison_messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- Enable Realtime for liaison_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.liaison_messages;

-- =====================================================
-- TABLE: notifications (système de notifications)
-- =====================================================

-- Update existing notifications table if needed, or create new
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'normal'
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'notifications' AND column_name = 'is_dismissed') THEN
    ALTER TABLE public.notifications ADD COLUMN is_dismissed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
    ALTER TABLE public.notifications ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =====================================================
-- TABLE: notification_preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  compliance_alerts BOOLEAN DEFAULT true,
  shift_reminders BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own preferences
CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTION: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for liaison_messages
DROP TRIGGER IF EXISTS update_liaison_messages_updated_at ON public.liaison_messages;
CREATE TRIGGER update_liaison_messages_updated_at
  BEFORE UPDATE ON public.liaison_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for notification_preferences
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT permissions
-- =====================================================

GRANT ALL ON public.liaison_messages TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;
