-- Spalte check_results (jsonb) für Skill-Checks (Wahrnehmung, Insight, etc.) auf npcs.
-- Nur anlegen, falls sie noch nicht existiert.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'check_results'
  ) THEN
    ALTER TABLE public.npcs
    ADD COLUMN check_results jsonb DEFAULT NULL;
  END IF;
END $$;
