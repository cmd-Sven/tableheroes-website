-- Spieler (akzeptierte Kampagnenmitglieder) dürfen world_lore der verknüpften Welt lesen
CREATE POLICY "Campaign members can view world lore"
  ON world_lore
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_members cm ON cm.campaign_id = c.id
      WHERE c.world_id = world_lore.world_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Drafting')
    )
  );

-- campaign_visibility: Auch Mitglieder OHNE Charakter (z.B. während Charakter-Erstellung)
CREATE POLICY "Campaign members can view visibility"
  ON campaign_visibility
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_visibility.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Drafting')
    )
  );
