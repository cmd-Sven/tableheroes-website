-- Live-session shop handoff and player-readable shop catalogs.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS active_shop_id uuid REFERENCES public.campaign_shops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_merchant_npc_id uuid REFERENCES public.npcs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_session_live_states_active_shop_id
  ON public.session_live_states(active_shop_id);

CREATE INDEX IF NOT EXISTS idx_session_live_states_active_merchant_npc_id
  ON public.session_live_states(active_merchant_npc_id);

DROP POLICY IF EXISTS "campaign_shops_member_select" ON public.campaign_shops;
CREATE POLICY "campaign_shops_member_select"
  ON public.campaign_shops
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id
       AND cm.user_id = auth.uid()
       AND cm.status IN ('Approved', 'Active')
      WHERE c.id = campaign_shops.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR c.owner_id = auth.uid()
          OR cm.user_id IS NOT NULL
        )
    )
  );

DROP POLICY IF EXISTS "campaign_shop_items_member_select" ON public.campaign_shop_items;
CREATE POLICY "campaign_shop_items_member_select"
  ON public.campaign_shop_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_shops s
      JOIN public.campaigns c ON c.id = s.campaign_id
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id
       AND cm.user_id = auth.uid()
       AND cm.status IN ('Approved', 'Active')
      WHERE s.id = campaign_shop_items.shop_id
        AND (
          c.gm_id = auth.uid()
          OR c.owner_id = auth.uid()
          OR cm.user_id IS NOT NULL
        )
    )
  );
