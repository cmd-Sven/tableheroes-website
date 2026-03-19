-- Geschichten & Legenden: DC-basierte, freischaltbare Abschnitte pro Ort
-- Format: [{dc, skill, content, is_revealed}]
ALTER TABLE world_lore
ADD COLUMN IF NOT EXISTS stories_and_legends jsonb DEFAULT NULL;

COMMENT ON COLUMN world_lore.stories_and_legends IS 'DC-basierte Geschichten & Legenden für Orte: [{dc: number, skill: string, content: string, is_revealed: boolean}]';
