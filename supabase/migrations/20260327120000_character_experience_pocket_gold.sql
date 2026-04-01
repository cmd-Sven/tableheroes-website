-- Spieler-Charakter: EP und tragbare Währung (Goldbeutel) für Übersicht & Bearbeitung
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS experience_points integer NOT NULL DEFAULT 0;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS pocket_gold integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.characters.experience_points IS 'Aktuelle Erfahrungspunkte (vom Spieler pflegbar)';
COMMENT ON COLUMN public.characters.pocket_gold IS 'Mitgeführtes Gold / Währung (ganze Zahlen)';
