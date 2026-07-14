-- ============================================================================
-- Charakter: Gemütszustand (Spieler) + aktive GM-Zustände
-- ============================================================================

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS mood_state text,
  ADD COLUMN IF NOT EXISTS mood_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS active_conditions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.characters.mood_state IS
  'Spieler-Gemütszustand (nur Roleplay, kein mechanischer Effekt). Schlüssel aus mood-states.ts.';
COMMENT ON COLUMN public.characters.mood_tokens IS
  'KI-Token pro Gemütszustand: { "amused": { "url", "storage_path", "is_ai_generated" }, ... }.';
COMMENT ON COLUMN public.characters.active_conditions IS
  'Vom SL gesetzte mechanische Zustände (Array von Condition-Keys). Überschreibt mood_state in der Anzeige.';
