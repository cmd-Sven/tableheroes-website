-- Biografie-Unterfelder & Makel (JSON-Array, max. 3, nicht stufenabhängig)

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS bio_family text,
  ADD COLUMN IF NOT EXISTS bio_occupation text,
  ADD COLUMN IF NOT EXISTS bio_appearance text,
  ADD COLUMN IF NOT EXISTS character_flaws jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.characters.bio_family IS
  'Biografie: Familie und Herkunft.';

COMMENT ON COLUMN public.characters.bio_occupation IS
  'Biografie: Bisherige Tätigkeiten, Beruf, Ausbildung.';

COMMENT ON COLUMN public.characters.bio_appearance IS
  'Biografie: Aussehen und körperliche Besonderheiten (nicht charakterlich).';

COMMENT ON COLUMN public.characters.character_flaws IS
  'Gewählte Makel (max. 3, nicht stufenabhängig). JSON-Array von Objekten: '
  '[{ "flawId": "burn_scars", "story": "Wie ist es dazu gekommen?", "grantedNote": "optional: SL-Situation" }, …]. '
  'Auf Stufe 1 darf optional ein Makel gewählt werden — kein Zwang. '
  'Weitere Makel nur nach Freigabe durch den Spielleiter im Spielverlauf (Rollenspiel-Situation). '
  'Mechanische Wertanpassungen werden im Charakterblatt abgeleitet. '
  'Rollenspiel-Ausspielung eines Makels (außerhalb des Kampfs): schwarzer → weißer Schicksalspunkt — manuell in der Live-Session.';

-- Validierung per Funktion (CHECK-Constraints dürfen keine Subqueries enthalten)
CREATE OR REPLACE FUNCTION public.is_valid_character_flaws(flaws jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT
    jsonb_typeof(flaws) = 'array'
    AND jsonb_array_length(flaws) <= 3
    AND (
      flaws = '[]'::jsonb
      OR NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(flaws) AS elem
        WHERE jsonb_typeof(elem) <> 'object'
          OR NOT (elem ? 'flawId')
          OR NOT (elem ? 'story')
          OR btrim(elem ->> 'flawId') = ''
      )
    );
$$;

COMMENT ON FUNCTION public.is_valid_character_flaws(jsonb) IS
  'Prüft character_flaws: JSON-Array, max. 3 Einträge, jedes Objekt mit flawId (nicht leer) und story.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'characters_character_flaws_valid'
      AND conrelid = 'public.characters'::regclass
  ) THEN
    ALTER TABLE public.characters
      ADD CONSTRAINT characters_character_flaws_valid
      CHECK (public.is_valid_character_flaws(character_flaws));
  END IF;
END $$;
