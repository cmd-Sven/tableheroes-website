-- Persönliche Sichtbarkeit von Gebäuden, Orten und Mauern auf der Stadtkarte.
-- Bestehende Zeilen bleiben sichtbar (Default true). RLS bleibt zeilenweise auf die eigene Ansicht.

ALTER TABLE public.city_map_viewer_prefs
  ADD COLUMN buildings_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN pois_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN walls_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.city_map_viewer_prefs.buildings_visible IS
  'Eigene Kartenansicht: Gebäude-Marker und 3D-Landmarks zeichnen.';
COMMENT ON COLUMN public.city_map_viewer_prefs.pois_visible IS
  'Eigene Kartenansicht: Orte (POI-Marker) zeichnen.';
COMMENT ON COLUMN public.city_map_viewer_prefs.walls_visible IS
  'Eigene Kartenansicht: Mauern zeichnen.';
