-- Ajout date de naissance, N° sécu sociale, IBAN au profil auxiliaire
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS social_security_number TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT;

COMMENT ON COLUMN employees.date_of_birth IS 'Date de naissance de l''auxiliaire';
COMMENT ON COLUMN employees.social_security_number IS 'Numéro de sécurité sociale (déclarations URSSAF / bulletins de paie)';
COMMENT ON COLUMN employees.iban IS 'IBAN pour le virement du salaire';
