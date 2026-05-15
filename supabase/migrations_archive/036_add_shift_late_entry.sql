-- Add late_entry column to shifts table
-- Tracks whether a shift was validated retroactively (not on the same day)
ALTER TABLE shifts ADD COLUMN late_entry BOOLEAN DEFAULT false;
