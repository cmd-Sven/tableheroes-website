-- Spieler: Welten der Kampagne lesen — Member-Status wie in npcs/world_lore RLS.

DROP POLICY IF EXISTS "Campaign members can view linked world" ON public.worlds;

CREATE POLICY "Campaign members can view linked world"
  ON public.worlds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.campaign_members cm ON cm.campaign_id = c.id
      WHERE c.world_id = worlds.id
        AND cm.user_id = auth.uid()
        AND cm.status IN (
          'Accepted',
          'Approved',
          'Active',
          'Drafting',
          'In_Review',
          'Changes_Proposed'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.world_id = worlds.id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
