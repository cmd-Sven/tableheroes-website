-- Zusätzliche Spalten für welt-zentrische Fraktionen:
-- world_id: Referenz auf die Welt
-- location_id: Hauptsitz-Ort (optional, verweist typischerweise auf locations.id oder world_lore.id)

ALTER TABLE public.factions
ADD COLUMN IF NOT EXISTS world_id uuid;

ALTER TABLE public.factions
ADD COLUMN IF NOT EXISTS location_id uuid;

