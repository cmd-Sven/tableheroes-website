-- GM und Kampagnenmitglieder müssen Kampagnen lesen können,
-- damit getUpcomingSessionsForUser Kampagnen-IDs ermitteln kann.
-- Bisher: Nur "Anyone can view published campaigns" – private Kampagnen
-- waren für GM/Spieler nicht lesbar → allCampaignIds leer → keine Termine.

-- GM kann eigene Kampagnen lesen (auch private)
CREATE POLICY "GM can view own campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (gm_id = auth.uid());

-- Kampagnenmitglieder können Kampagnen lesen, in denen sie Mitglied sind
CREATE POLICY "Campaign members can view their campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaigns.id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Drafting', 'In_Review')
    )
  );
