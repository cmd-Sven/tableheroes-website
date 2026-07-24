-- Perf: Query-Indizes für häufige Lookups (idempotent)
-- Lokal anlegen; remote erst nach explizitem User-OK anwenden.
--
-- Anwenden (remote, wenn freigegeben):
--   npx supabase db push
-- oder einzelne Datei im Supabase SQL Editor ausführen.
-- Lokal (supabase start):
--   npx supabase migration up

CREATE INDEX IF NOT EXISTS idx_factions_world_id
  ON public.factions (world_id);

CREATE INDEX IF NOT EXISTS idx_characters_campaign_id
  ON public.characters (campaign_id);

CREATE INDEX IF NOT EXISTS idx_characters_user_id
  ON public.characters (user_id);

-- Composite: Kampagnen-Sessions nach Startzeit sortieren/filtern
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_id_start_time
  ON public.sessions (campaign_id, start_time);

-- Composite: Lore einer Welt nach Typ
CREATE INDEX IF NOT EXISTS idx_world_lore_world_id_type
  ON public.world_lore (world_id, type);
