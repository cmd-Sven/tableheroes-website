-- NPC Battlemap-Token + D&D5e-Kampfwerte (GM-only sheet_data)

ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS token_url text,
  ADD COLUMN IF NOT EXISTS token_storage_path text,
  ADD COLUMN IF NOT EXISTS token_border jsonb,
  ADD COLUMN IF NOT EXISTS token_size_category text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS sheet_data jsonb,
  ADD COLUMN IF NOT EXISTS sheet_source text,
  ADD COLUMN IF NOT EXISTS sheet_synced_at timestamptz;

COMMENT ON COLUMN public.npcs.token_url IS
  'Rundes Battlemap-Token (Crop aus Portrait). Fallback: image_url.';
COMMENT ON COLUMN public.npcs.token_storage_path IS
  'Storage-Pfad des Token-Bildes.';
COMMENT ON COLUMN public.npcs.token_border IS
  'Optional: { thicknessPx: number, color: string (hex) }.';
COMMENT ON COLUMN public.npcs.token_size_category IS
  'D&D5e Größenkategorie: tiny|small|medium|large|huge|gargantuan → Grid-Zellen.';
COMMENT ON COLUMN public.npcs.sheet_data IS
  'D&D5e-NPC-Statblock als JSON (Attribute, Combat, Attacks, Spells). Nur für SL relevant.';
COMMENT ON COLUMN public.npcs.sheet_source IS
  'Quelle: manual | ai_wizard | ai_regen.';
COMMENT ON COLUMN public.npcs.sheet_synced_at IS
  'Zeitpunkt der letzten KI-/Manuell-Aktualisierung des Statblocks.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'npcs_token_size_category_check'
  ) THEN
    ALTER TABLE public.npcs
      ADD CONSTRAINT npcs_token_size_category_check
      CHECK (
        token_size_category IS NULL
        OR token_size_category IN ('tiny', 'small', 'medium', 'large', 'huge', 'gargantuan')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_npcs_sheet_data_present
  ON public.npcs ((sheet_data IS NOT NULL))
  WHERE sheet_data IS NOT NULL;
