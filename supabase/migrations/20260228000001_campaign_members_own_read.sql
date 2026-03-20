-- Spieler müssen ihre eigenen campaign_members-Zeilen lesen können
-- (z.B. für getUpcomingSessionsForUser, Dashboard "Meine Kampagnen", Termine).
-- Bisher: Nur GM oder role='gm' konnten lesen – Spieler sahen keine eigenen Memberships.

CREATE POLICY "Users can view own campaign memberships"
  ON campaign_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
