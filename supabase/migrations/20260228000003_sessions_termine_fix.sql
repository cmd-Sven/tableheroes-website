-- Session = Termin (Spielsitzung, physisch oder online). Die Tabelle "sessions" speichert die Termine.
-- Fix: Kampagnenmitglieder mit status "Active" einbeziehen + session_rsvps/campaign_members lesbar für Teilnehmer.

-- 0. campaigns-Policy: "Active" hinzufügen (falls Policy existiert)
DROP POLICY IF EXISTS "Campaign members can view their campaigns" ON campaigns;

CREATE POLICY "Campaign members can view their campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaigns.id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
    )
  );

-- 1. Sessions-Policy: "Active" zu den erlaubten campaign_members-Status hinzufügen
DROP POLICY IF EXISTS "Campaign members and GM can view sessions" ON sessions;

CREATE POLICY "Campaign members and GM can view sessions"
  ON sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = sessions.campaign_id AND c.gm_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = sessions.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
    )
  );

-- 2. session_rsvps: Kampagnenmitglieder dürfen alle RSVPs ihrer Sessions lesen (für Teilnehmer-Anzeige)
CREATE POLICY "Campaign members can view rsvps for own campaign sessions"
  ON session_rsvps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
      WHERE s.id = session_rsvps.session_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
    )
  );

-- 3. campaign_members: Kampagnenmitglieder dürfen andere Mitglieder derselben Kampagne lesen (für Teilnehmer-Anzeige bei Terminen)
CREATE POLICY "Campaign members can view other members in same campaign"
  ON campaign_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members my_cm
      WHERE my_cm.campaign_id = campaign_members.campaign_id
        AND my_cm.user_id = auth.uid()
        AND my_cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
    )
  );
