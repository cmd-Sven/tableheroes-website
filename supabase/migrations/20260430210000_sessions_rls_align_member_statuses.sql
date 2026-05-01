-- sessions SELECT: gleiche Mitglieds-Status wie session_live_states / campaign-access
-- (Changes_Proposed fehlte → Direktlink /session/[id] lieferte 404 trotz Dashboard-Zugriff)

DROP POLICY IF EXISTS "Campaign members and GM can view sessions" ON public.sessions;

CREATE POLICY "Campaign members and GM can view sessions"
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = sessions.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaign_members cm
      WHERE cm.campaign_id = sessions.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status IN (
          'Accepted',
          'Approved',
          'Active',
          'Drafting',
          'In_Review',
          'Changes_Proposed'
        )
    )
  );
