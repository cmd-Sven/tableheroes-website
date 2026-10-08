-- Lore-Beziehungen können die Stadtsimulation auslassen.

ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS affects_city_sim boolean NOT NULL DEFAULT true;
