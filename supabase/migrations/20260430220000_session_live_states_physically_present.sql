-- GM markiert Spieler als physisch am Tisch (ohne Browser-Tab / ohne Online-Login sichtbar).

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS physically_present_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.session_live_states.physically_present_user_ids IS
  'User-IDs, die der SL als physisch anwesend markiert hat (Portraits nicht ausgegraut, unabhängig von Realtime-Presence).';

-- PostgREST-Schema-Cache (vermeidet „column … not in the schema cache“ nach ALTER)
NOTIFY pgrst, 'reload schema';
