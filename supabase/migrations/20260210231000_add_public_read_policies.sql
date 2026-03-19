-- Veröffentlichte Kampagnen für alle lesbar (Landingpage, Spieler-Dashboard)
CREATE POLICY "Anyone can view published campaigns"
  ON campaigns
  FOR SELECT
  USING (is_published = true);

-- Sessions von veröffentlichten Kampagnen für alle lesbar (Landingpage-Termine)
CREATE POLICY "Anyone can view sessions of published campaigns"
  ON sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = sessions.campaign_id
        AND campaigns.is_published = true
    )
  );
