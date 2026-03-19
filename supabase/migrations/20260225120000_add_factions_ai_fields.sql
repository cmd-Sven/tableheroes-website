-- Zusätzliche AI-Felder für Fraktionen:
-- appearance: Beschreibung von Identität & Heraldik
-- structure: Organisationsstruktur
-- philosophy: Kodex & Weltbild
-- important_npcs_info: Fließtext zu wichtigen Persönlichkeiten

ALTER TABLE factions
ADD COLUMN IF NOT EXISTS appearance text DEFAULT NULL;

ALTER TABLE factions
ADD COLUMN IF NOT EXISTS structure text DEFAULT NULL;

ALTER TABLE factions
ADD COLUMN IF NOT EXISTS philosophy text DEFAULT NULL;

ALTER TABLE factions
ADD COLUMN IF NOT EXISTS important_npcs_info text DEFAULT NULL;

