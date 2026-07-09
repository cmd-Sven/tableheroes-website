-- DnD5e Charakterblatt: strukturierte Spielwerte (Foundry-Import, manuell, später KI-Scan)

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS subclass text,
  ADD COLUMN IF NOT EXISTS background text,
  ADD COLUMN IF NOT EXISTS alignment text,
  ADD COLUMN IF NOT EXISTS sheet_data jsonb,
  ADD COLUMN IF NOT EXISTS sheet_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sheet_source text,
  ADD COLUMN IF NOT EXISTS sheet_synced_at timestamptz;

COMMENT ON COLUMN public.characters.sheet_data IS
  'DnD5e Charakterblatt als JSON (Attribute, Skills, Combat, Features). Quelle: foundry_import | manual | ai_scan.';
COMMENT ON COLUMN public.characters.sheet_overrides IS
  'Manuell gesetzte Overrides pro Feld-Pfad (z. B. ac, initiative, skills.prc).';
COMMENT ON COLUMN public.characters.sheet_source IS
  'Letzte Datenquelle: foundry_import, manual, ai_scan.';
COMMENT ON COLUMN public.characters.sheet_synced_at IS
  'Zeitpunkt des letzten Imports/Syncs (Foundry einseitig nach TH).';

CREATE INDEX IF NOT EXISTS idx_characters_sheet_data_present
  ON public.characters ((sheet_data IS NOT NULL))
  WHERE sheet_data IS NOT NULL;
