-- Initiative als Text (z. B. 17-1 vor 17-2) + D&D-5e-Zustände auf Combat-Tokens

ALTER TABLE public.combat_participants
  ADD COLUMN IF NOT EXISTS initiative_label text,
  ADD COLUMN IF NOT EXISTS conditions text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.combat_participants.initiative_label IS
  'Anzeige/Sortierung der Initiative, z. B. 17, 17-1, 17-2 (Tiebreak: kleinere Zahl nach dem Bindestrich geht zuerst).';

COMMENT ON COLUMN public.combat_participants.conditions IS
  'Aktive D&D-5e-/SL-Markierungen am Token (z. B. concentration, prone, dead).';

UPDATE public.combat_participants
SET initiative_label = initiative_value::text
WHERE initiative_label IS NULL OR trim(initiative_label) = '';
