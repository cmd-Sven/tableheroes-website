-- Karten-Editor POIs (besondere Orte, keine Gebäude)
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS map_poi_kind text,
  ADD COLUMN IF NOT EXISTS map_poi_influences jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.locations.map_poi_kind IS 'Art eines Karten-POI (Brunnen, Statue, …); NULL = kein POI';
COMMENT ON COLUMN public.locations.map_poi_influences IS 'POI-Einfluss [{aspect, delta}] als heutiger Modifikator; überschreibt keine Viertel-Ruhewerte';

CREATE INDEX IF NOT EXISTS locations_map_poi_idx
  ON public.locations (world_id)
  WHERE map_poi_kind IS NOT NULL;
