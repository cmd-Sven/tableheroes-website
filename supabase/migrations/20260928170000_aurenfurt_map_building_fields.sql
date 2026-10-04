-- Map-Editor-Gebäude: Straße, Position, Viertel, Editor-Flag, NPC-Hinweis erledigt
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS aurenfurt_street_id text,
  ADD COLUMN IF NOT EXISTS map_u double precision,
  ADD COLUMN IF NOT EXISTS map_v double precision,
  ADD COLUMN IF NOT EXISTS map_district_id text,
  ADD COLUMN IF NOT EXISTS created_via_map_editor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS npc_hint_dismissed_at timestamptz;

COMMENT ON COLUMN public.locations.aurenfurt_street_id IS 'Lokale Straßen-Id aus aurenfurt-streets-v1; ohne Zuordnung gilt das Gebäude als inaktiv für NPCs';
COMMENT ON COLUMN public.locations.map_u IS 'UV-Position auf der Aurenfurt-Karte (u)';
COMMENT ON COLUMN public.locations.map_v IS 'UV-Position auf der Aurenfurt-Karte (v)';
COMMENT ON COLUMN public.locations.map_district_id IS 'CityDistrictId des Viertels auf der Karte';
COMMENT ON COLUMN public.locations.created_via_map_editor IS 'true = über den Viertel-Karten-Editor angelegt';
COMMENT ON COLUMN public.locations.npc_hint_dismissed_at IS 'SL hat den „keine NPCs“-Hinweis als erledigt markiert';

CREATE INDEX IF NOT EXISTS locations_map_editor_idx
  ON public.locations (world_id)
  WHERE created_via_map_editor = true;
