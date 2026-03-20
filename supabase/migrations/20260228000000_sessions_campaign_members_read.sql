-- Kampagnenmitglieder und GMs sollen Sessions ihrer Kampagnen sehen können
-- (auch bei privaten Kampagnen). Bisher nur "published" Kampagnen lesbar.

CREATE POLICY "Campaign members and GM can view sessions"
  ON sessions
  FOR SELECT
  USING (
    -- GM der Kampagne
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = sessions.campaign_id AND c.gm_id = auth.uid()
    )
    OR
    -- Kampagnenmitglied (Accepted, Drafting, In_Review, Approved)
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = sessions.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Drafting', 'In_Review')
    )
  );
