-- Heimatort/Startort des Charakters (world_lore.id für geografische Orte)
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS current_location_id uuid DEFAULT NULL;

-- Optional: FK zu world_lore (Orte sind Lore-Einträge)
-- ALTER TABLE characters ADD CONSTRAINT characters_current_location_id_fkey
--   FOREIGN KEY (current_location_id) REFERENCES world_lore(id) ON DELETE SET NULL;
