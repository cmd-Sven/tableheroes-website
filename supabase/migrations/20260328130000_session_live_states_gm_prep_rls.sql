-- GM darf session_live_states für Sessions seiner Kampagnen anlegen und ändern (Vorbereitung + Live).
-- Kampagnenmitglieder dürfen lesen (Realtime / Live-Ansicht).
-- Nur ausführen, wenn die Tabelle public.session_live_states existiert.

ALTER TABLE public.session_live_states ENABLE ROW LEVEL SECURITY;

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
        AND c.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_live_states.session_id
        AND c.gm_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "session_live_states_member_select" ON public.session_live_states;
CREATE POLICY "session_live_states_member_select"
  ON public.session_live_states
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaign_members cm
        ON cm.campaign_id = s.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
      WHERE s.id = session_live_states.session_id
    )
  );
