-- Verknüpfung Session-Ort → world_lore (Link für Spieler:innen)
ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS current_location_lore_id uuid;

COMMENT ON COLUMN public.session_live_states.current_location_lore_id IS 'world_lore.id – Anzeigename bleibt in current_location';
