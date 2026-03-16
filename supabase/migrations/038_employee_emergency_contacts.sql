-- Ajout contacts d'urgence au profil auxiliaire
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN employees.emergency_contacts IS 'Contacts d''urgence de l''auxiliaire [{name, phone, relationship}]';
