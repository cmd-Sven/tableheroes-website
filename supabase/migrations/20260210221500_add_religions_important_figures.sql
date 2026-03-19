DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'religions'
      AND column_name = 'important_figures'
  ) THEN
    ALTER TABLE public.religions
      ADD COLUMN important_figures jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

