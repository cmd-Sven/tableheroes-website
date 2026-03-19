-- Kampagnenmitglieder dürfen die Welt-Basisdaten der verlinkten Kampagne lesen
CREATE POLICY "Campaign members can view linked world"
  ON worlds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_members cm ON cm.campaign_id = c.id
      WHERE c.world_id = worlds.id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Drafting', 'In_Review')
    )
  );
