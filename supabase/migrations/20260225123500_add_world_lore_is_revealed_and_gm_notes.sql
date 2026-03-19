-- Sichtbarkeit und GM-Notizen für world_lore:
-- - is_revealed: ob Eintrag für Spieler sichtbar ist (optional, zusätzlich zu campaign_visibility)
-- - gm_notes: interne Notizen nur für den GM

ALTER TABLE public.world_lore
ADD COLUMN IF NOT EXISTS is_revealed boolean DEFAULT FALSE;

ALTER TABLE public.world_lore
ADD COLUMN IF NOT EXISTS gm_notes text DEFAULT NULL;

