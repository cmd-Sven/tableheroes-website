-- Party-/Gruppen-Tokens auf der Aurenfurt-3D-Stadtkarte (UV-Positionen je Session).
ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS aurenfurt_party_tokens jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.session_live_states.aurenfurt_party_tokens IS
  'JSON: { group: {u,v}|null, characters: { [characterId]: {u,v,name,imageUrl} } }';
