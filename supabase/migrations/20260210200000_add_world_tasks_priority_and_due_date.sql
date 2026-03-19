-- Erweiterung der Welt-Tasks um Priorität und Fälligkeitsdatum
-- priority: optionale numerische Priorität (z.B. 1 = hoch, 2 = mittel, 3 = niedrig)
-- due_date: optionales Datum, bis wann der GM die Aufgabe erledigen möchte

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'world_tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.world_tasks
    ADD COLUMN priority integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'world_tasks' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.world_tasks
    ADD COLUMN due_date date DEFAULT NULL;
  END IF;
END $$;

