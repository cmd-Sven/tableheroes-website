-- Battlemap: Charakter-Zustände/Gemüt/Sheet für alle Clients live sichtbar
ALTER TABLE public.characters REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public'
        AND c.relname = 'characters'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
    END IF;
  END IF;
END $$;
