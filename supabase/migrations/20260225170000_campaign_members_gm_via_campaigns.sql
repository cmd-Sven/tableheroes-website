-- GM (Kampagnenbesitzer) soll campaign_members sehen können, auch ohne eigenes campaign_members-Row.
-- Bisher: "GM views campaign members" verlangt my_cm.role = 'gm' – GM hat oft kein Row.
-- Neu: Zusätzliche Policy: campaigns.gm_id = auth.uid() erlaubt SELECT.
DROP POLICY IF EXISTS "GM views campaign members" ON campaign_members;

CREATE POLICY "GM views campaign members"
  ON campaign_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_members.campaign_id
        AND c.gm_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM campaign_members my_cm
      WHERE my_cm.campaign_id = campaign_members.campaign_id
        AND my_cm.user_id = auth.uid()
        AND my_cm.role = 'gm'
    )
  );
