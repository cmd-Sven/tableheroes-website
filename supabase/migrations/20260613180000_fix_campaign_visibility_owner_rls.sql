-- campaign_visibility: Owner neben GM für Lesen/Schreiben (Live-RLS war nur gm_id).

DROP POLICY IF EXISTS "GMs can manage visibility for their campaigns" ON public.campaign_visibility;

CREATE POLICY "GMs can manage visibility for their campaigns"
  ON public.campaign_visibility
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns
      WHERE campaigns.id = campaign_visibility.campaign_id
        AND (campaigns.gm_id = auth.uid() OR campaigns.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns
      WHERE campaigns.id = campaign_visibility.campaign_id
        AND (campaigns.gm_id = auth.uid() OR campaigns.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view visibility of their campaigns" ON public.campaign_visibility;

CREATE POLICY "Users can view visibility of their campaigns"
  ON public.campaign_visibility
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.characters
      WHERE characters.campaign_id = campaign_visibility.campaign_id
        AND characters.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns
      WHERE campaigns.id = campaign_visibility.campaign_id
        AND (campaigns.gm_id = auth.uid() OR campaigns.owner_id = auth.uid())
    )
  );
