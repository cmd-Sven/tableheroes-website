-- Status-Effekt (CharacterConditionKey) für Fallen — bei fehlgeschlagenem Rettungswurf.

ALTER TABLE public.session_battlemap_traps
  ADD COLUMN IF NOT EXISTS status_effect text;

COMMENT ON COLUMN public.session_battlemap_traps.status_effect IS
  'Optionaler CharacterConditionKey (z.B. poisoned), der bei fehlgeschlagenem Save gesetzt wird.';
