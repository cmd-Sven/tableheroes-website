-- Repair migration: make sure live-session tables are part of Supabase Realtime.
-- Stage visibility is stored on session_live_states via visible_npc_ids / visible_faction_ids.

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
        AND c.relname = 'session_live_states'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_live_states;
    END IF;

    IF to_regclass('public.combat_participants') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
          AND n.nspname = 'public'
          AND c.relname = 'combat_participants'
      )
    THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.combat_participants;
    END IF;
  END IF;
END $$;
