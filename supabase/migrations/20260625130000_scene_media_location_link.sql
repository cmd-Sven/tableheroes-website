-- Szenen-Auftritte auch mit aktivem Ort auf der Bühne verknüpfen

ALTER TABLE public.scene_media_appearances
  ADD COLUMN IF NOT EXISTS location_lore_id uuid REFERENCES public.world_lore(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_name text;

CREATE INDEX IF NOT EXISTS idx_scene_media_appearances_location
  ON public.scene_media_appearances (location_lore_id, shown_at DESC)
  WHERE location_lore_id IS NOT NULL;

COMMENT ON COLUMN public.scene_media_appearances.location_lore_id IS
  'Lore-Ort, der beim Anzeigen des Szenenbilds auf der Bühne aktiv war.';

COMMENT ON COLUMN public.scene_media_appearances.location_name IS
  'Anzeigename des aktiven Orts zum Zeitpunkt der Szene (Snapshot).';
