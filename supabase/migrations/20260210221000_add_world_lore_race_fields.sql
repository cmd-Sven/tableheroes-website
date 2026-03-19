DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'world_lore'
      AND column_name = 'race_subtypes'
  ) THEN
    ALTER TABLE public.world_lore
      ADD COLUMN race_subtypes text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'world_lore'
      AND column_name = 'race_traits'
  ) THEN
    ALTER TABLE public.world_lore
      ADD COLUMN race_traits text DEFAULT NULL;
  END IF;
END $$;

