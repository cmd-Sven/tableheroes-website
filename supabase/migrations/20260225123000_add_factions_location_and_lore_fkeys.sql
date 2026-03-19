-- Foreign Keys für Fraktionen:
-- - location_id → locations.id (Hauptsitz-Ort)
-- - lore_id     → world_lore.id (verknüpfter Lore-Eintrag)

-- Stelle sicher, dass die Spalte lore_id existiert
ALTER TABLE public.factions
ADD COLUMN IF NOT EXISTS lore_id uuid;

-- FK: factions.location_id → locations.id (ON DELETE SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'factions_location_id_fkey'
  ) THEN
    ALTER TABLE public.factions
    ADD CONSTRAINT factions_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK: factions.lore_id → world_lore.id (ON DELETE SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'factions_lore_id_fkey'
  ) THEN
    ALTER TABLE public.factions
    ADD CONSTRAINT factions_lore_id_fkey
      FOREIGN KEY (lore_id) REFERENCES public.world_lore(id) ON DELETE SET NULL;
  END IF;
END $$;

