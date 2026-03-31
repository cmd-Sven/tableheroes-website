-- Nach campaign_shops: RLS wie App — gm_id ODER owner_id (Fix für abgelehnte Inserts).
-- Für bestehende DBs, die nur die alte gm_id-Policy haben.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS owner_id uuid;

DROP POLICY IF EXISTS "campaign_shops_gm_all" ON public.campaign_shops;
CREATE POLICY "campaign_shops_gm_all" ON public.campaign_shops
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_shops.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_shops.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "campaign_shop_items_gm_all" ON public.campaign_shop_items;
CREATE POLICY "campaign_shop_items_gm_all" ON public.campaign_shop_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_shops s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = campaign_shop_items.shop_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_shops s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = campaign_shop_items.shop_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
