-- UI-Sprache für das D&D-5e-Charakterblatt (pro Charakter)

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS sheet_locale text NOT NULL DEFAULT 'de';

ALTER TABLE public.characters
  DROP CONSTRAINT IF EXISTS characters_sheet_locale_check;

ALTER TABLE public.characters
  ADD CONSTRAINT characters_sheet_locale_check
  CHECK (sheet_locale IN ('de', 'en'));

COMMENT ON COLUMN public.characters.sheet_locale IS
  'Anzeigesprache des D&D-5e-Charakterblatts: de | en.';
