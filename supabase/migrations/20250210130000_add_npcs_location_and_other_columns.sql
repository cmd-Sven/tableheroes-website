-- Fehlende Spalten auf npcs ergänzen (current_location_id, home_location_id, title, status, faction_id, narrative_hooks, is_secret_antagonist, hidden_agenda, true_nature).
-- Behebt PGRST204: "Could not find the 'current_location_id' column of 'npcs' in the schema cache"

DO $$
BEGIN
  -- current_location_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'current_location_id') THEN
    ALTER TABLE public.npcs ADD COLUMN current_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
  END IF;
  -- home_location_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'home_location_id') THEN
    ALTER TABLE public.npcs ADD COLUMN home_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
  END IF;
  -- title
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'title') THEN
    ALTER TABLE public.npcs ADD COLUMN title text DEFAULT NULL;
  END IF;
  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'status') THEN
    ALTER TABLE public.npcs ADD COLUMN status text DEFAULT 'Alive';
  END IF;
  -- faction_id (FK nur wenn Tabelle factions existiert)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'faction_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'factions') THEN
      ALTER TABLE public.npcs ADD COLUMN faction_id uuid REFERENCES factions(id) ON DELETE SET NULL;
    ELSE
      ALTER TABLE public.npcs ADD COLUMN faction_id uuid DEFAULT NULL;
    END IF;
  END IF;
  -- narrative_hooks (Array von Objekten -> jsonb)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'narrative_hooks') THEN
    ALTER TABLE public.npcs ADD COLUMN narrative_hooks jsonb DEFAULT NULL;
  END IF;
  -- is_secret_antagonist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'is_secret_antagonist') THEN
    ALTER TABLE public.npcs ADD COLUMN is_secret_antagonist boolean DEFAULT false;
  END IF;
  -- hidden_agenda
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'hidden_agenda') THEN
    ALTER TABLE public.npcs ADD COLUMN hidden_agenda text DEFAULT NULL;
  END IF;
  -- true_nature
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'true_nature') THEN
    ALTER TABLE public.npcs ADD COLUMN true_nature text DEFAULT NULL;
  END IF;
END $$;
