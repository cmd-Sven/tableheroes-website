-- Kultur- und Sprachfelder für Charaktere
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS culture_lore_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}';
