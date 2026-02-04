-- Remove pajemploi_number column from employers table
-- PAJEMPLOI feature is no longer used in UniLien

ALTER TABLE employers DROP COLUMN IF EXISTS pajemploi_number;
