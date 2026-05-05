-- Allow the assigned session scribe to update the live-state row.
-- This keeps GM/Owner control policies intact while allowing journal edits by the Chronist.

ALTER TABLE public.session_live_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_live_states_update_scribe" ON public.session_live_states;

CREATE POLICY "session_live_states_update_scribe"
  ON public.session_live_states
  FOR UPDATE
  TO authenticated
  USING (scribe_id = auth.uid())
  WITH CHECK (scribe_id = auth.uid());
