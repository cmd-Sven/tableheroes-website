-- ============================================================================
-- Charakter: Karten-Token + Zustandsvarianten (Foundry-Conditions)
-- ============================================================================

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS token_url text,
  ADD COLUMN IF NOT EXISTS token_storage_path text,
  ADD COLUMN IF NOT EXISTS condition_tokens jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.characters.token_url IS
  'Basis-Token für Karte/Foundry; falls leer wird avatar_url als Fallback genutzt.';
COMMENT ON COLUMN public.characters.token_storage_path IS
  'Supabase-Storage-Pfad des Basis-Tokens (profile-media).';
COMMENT ON COLUMN public.characters.condition_tokens IS
  'Zustands-Token pro Foundry-Condition: { "poisoned": { "url", "storage_path", "is_ai_generated" }, ... }.';
