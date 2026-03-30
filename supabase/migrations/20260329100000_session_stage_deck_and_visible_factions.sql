-- Geplantes Bühnendeck (NPCs + Fraktionen) pro Termin; NULL = alle sichtbaren Einträge wie bisher.
-- Live: welche Fraktionen zusätzlich zur Bühne gehören.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS stage_deck_npc_ids uuid[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_deck_faction_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.sessions.stage_deck_npc_ids IS 'NULL = alle Kampagnen-NPCs im Stage Manager; sonst nur diese IDs.';
COMMENT ON COLUMN public.sessions.stage_deck_faction_ids IS 'NULL = alle sichtbaren Fraktionen; sonst nur diese IDs.';

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS visible_faction_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.session_live_states.visible_faction_ids IS 'Fraktionen auf der Bühne (wie visible_npc_ids).';
