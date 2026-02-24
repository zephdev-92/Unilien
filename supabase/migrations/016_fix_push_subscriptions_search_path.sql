-- Migration: Fix update_push_subscriptions_updated_at search_path
-- Security fix for mutable search_path warning

CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_push_subscriptions_updated_at IS 'Trigger function to auto-update push_subscriptions.updated_at';
