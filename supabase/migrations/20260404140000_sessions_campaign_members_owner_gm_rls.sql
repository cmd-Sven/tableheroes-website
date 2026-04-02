-- Align RLS mit isCampaignGm (gm_id ODER owner_id): Owner ohne Treffer auf gm_id
-- konnte weder campaign_members (Party) noch sessions zuverlässig lesen → leere Gruppe, kein Live-State.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Kampagnen: Owner wie GM lesen
DROP POLICY IF EXISTS "GM can view own campaigns" ON public.campaigns;
CREATE POLICY "GM can view own campaigns"
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (
    gm_id = auth.uid()
    OR owner_id = auth.uid()
  );

-- Sessions: Owner wie GM lesen
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
        AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
    )
  );

-- campaign_members: Owner sieht alle Mitgliederzeilen (Party + verschachtelte characters)
DROP POLICY IF EXISTS "GM views campaign members" ON public.campaign_members;
CREATE POLICY "GM views campaign members"
  ON public.campaign_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_members.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaign_members my_cm
      WHERE my_cm.campaign_id = campaign_members.campaign_id
        AND my_cm.user_id = auth.uid()
        AND my_cm.role = 'gm'
    )
  );
