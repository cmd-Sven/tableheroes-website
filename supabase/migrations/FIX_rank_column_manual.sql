-- Manuell ausführen, falls "rank" Spalte fehlt (Schema-Cache-Fehler)
-- In Supabase Dashboard: SQL Editor -> New Query -> Einfügen & Run

-- 1. Spalte hinzufügen
ALTER TABLE character_faction_reputation
ADD COLUMN IF NOT EXISTS rank text DEFAULT NULL;

COMMENT ON COLUMN character_faction_reputation.rank IS 'Rang oder Position des Charakters bei dieser Fraktion (z.B. Explorer, Mitglied, Feind, Schuldner)';

-- 2. Schema-Cache neu laden (damit PostgREST die neue Spalte erkennt)
NOTIFY pgrst, 'reload schema';
