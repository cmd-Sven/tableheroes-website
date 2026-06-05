-- Vereinheitlicht Gold: character_wealth.gp ist kanonisch, characters.pocket_gold wird gespiegelt.

-- Bestehende pocket_gold-Werte in character_wealth übernehmen (höherer Wert gewinnt).
INSERT INTO public.character_wealth (character_id, gp, sp, cp, ep, pp, gem_data)
SELECT
  c.id,
  GREATEST(0, COALESCE(c.pocket_gold, 0)),
  0,
  0,
  0,
  0,
  '[]'::jsonb
FROM public.characters c
WHERE NOT EXISTS (
  SELECT 1 FROM public.character_wealth w WHERE w.character_id = c.id
)
AND COALESCE(c.pocket_gold, 0) > 0;

UPDATE public.character_wealth w
SET gp = GREATEST(w.gp, GREATEST(0, COALESCE(c.pocket_gold, 0)))
FROM public.characters c
WHERE c.id = w.character_id
  AND GREATEST(0, COALESCE(c.pocket_gold, 0)) > w.gp;

-- pocket_gold an wealth.gp spiegeln (Abwärtskompatibilität für Legacy-Queries).
UPDATE public.characters c
SET pocket_gold = w.gp
FROM public.character_wealth w
WHERE w.character_id = c.id
  AND COALESCE(c.pocket_gold, 0) IS DISTINCT FROM w.gp;

CREATE OR REPLACE FUNCTION public.sync_pocket_gold_from_character_wealth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.characters
  SET pocket_gold = GREATEST(0, COALESCE(NEW.gp, 0))
  WHERE id = NEW.character_id
    AND COALESCE(pocket_gold, 0) IS DISTINCT FROM GREATEST(0, COALESCE(NEW.gp, 0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pocket_gold_from_wealth ON public.character_wealth;
CREATE TRIGGER trg_sync_pocket_gold_from_wealth
AFTER INSERT OR UPDATE OF gp ON public.character_wealth
FOR EACH ROW
EXECUTE FUNCTION public.sync_pocket_gold_from_character_wealth();

COMMENT ON FUNCTION public.sync_pocket_gold_from_character_wealth() IS
  'Spiegelt character_wealth.gp nach characters.pocket_gold (Legacy-Kompatibilität).';
