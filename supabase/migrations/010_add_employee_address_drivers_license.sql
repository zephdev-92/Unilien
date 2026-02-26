-- Migration: Ajouter les champs adresse et permis de conduire aux auxiliaires
-- Date: 2026-02-03

-- Ajouter la colonne address (JSONB) pour stocker l'adresse de l'auxiliaire
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS address JSONB DEFAULT NULL;

-- Ajouter la colonne drivers_license (JSONB) pour stocker les informations du permis
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS drivers_license JSONB DEFAULT NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN employees.address IS 'Adresse du domicile de l''auxiliaire: { street?: string, city?: string, postalCode?: string }';
COMMENT ON COLUMN employees.drivers_license IS 'Informations permis de conduire: { has_license: boolean, license_type?: string, has_vehicle: boolean }';

-- Index pour recherche par ville (utile pour matching géographique futur)
CREATE INDEX IF NOT EXISTS idx_employees_address_city
ON employees ((address->>'city'));

-- Index pour filtrer les auxiliaires avec véhicule
CREATE INDEX IF NOT EXISTS idx_employees_has_vehicle
ON employees ((drivers_license->>'has_vehicle'));
