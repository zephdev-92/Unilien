-- Migration: Drop test_auth_context function
-- This was a debug function that should not exist in production

DROP FUNCTION IF EXISTS test_auth_context();
