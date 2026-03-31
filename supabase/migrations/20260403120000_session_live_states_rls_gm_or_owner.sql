-- session_live_states: RLS wie App — gm_id ODER owner_id (sonst schlagen INSERT/UPDATE fehl).

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS owner_id uuid;

DROP POLICY IF EXISTS "session_live_states_gm_all" ON public.session_live_states;
CREATE POLICY "session_live_states_gm_all"
  ON public.session_live_states
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_live_states.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_live_states.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
