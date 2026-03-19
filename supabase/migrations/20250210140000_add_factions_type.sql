-- Spalte type auf factions (z. B. "Gilde", "Sekte") für Abfragen die factions.type erwarten.
-- Behebt: column factions_1.type does not exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'factions' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.factions ADD COLUMN type text DEFAULT NULL;
  END IF;
END $$;
