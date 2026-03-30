-- RSVP: Spieler-Schreibzugriff nur noch mit Kampagnen-Mitgliedschaft (klarer als nur user_id).
-- Die alte Policy "Users can manage own session rsvps" erlaubte theoretisch jede session_id;
-- in Kombination mit der GM-FOR-ALL-Policy können je nach Postgres/PostgREST Versionen Upserts scheitern.
-- GM-Einträge für andere User laufen weiter über "GM can view and update rsvps for own campaigns".

DROP POLICY IF EXISTS "Users can manage own session rsvps" ON session_rsvps;

CREATE POLICY "Campaign members manage own rsvp rows"
  ON session_rsvps
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM sessions s
      JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
      WHERE s.id = session_rsvps.session_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Drafting', 'In_Review')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM sessions s
      JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
      WHERE s.id = session_rsvps.session_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Drafting', 'In_Review')
    )
  );
