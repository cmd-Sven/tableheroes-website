-- GM-Shops pro Kampagne (Unique-Listen oder Archetyp + Preismodifikator)
CREATE TABLE IF NOT EXISTS public.campaign_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  name text NOT NULL,
  shop_mode text NOT NULL CHECK (shop_mode IN ('archetype', 'unique')),
  archetype_key text,
  price_modifier_percent numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_shops_archetype_consistency CHECK (
    (shop_mode = 'archetype' AND archetype_key IS NOT NULL)
    OR (shop_mode = 'unique' AND archetype_key IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_campaign_shops_campaign_id ON public.campaign_shops (campaign_id);

COMMENT ON TABLE public.campaign_shops IS 'Handelslisten: unique = eigene Waren; archetype = Typ + globaler Katalog (App), Preis über price_modifier_percent';

-- Positionen nur für Unique-Shops (Phase 1); Archetyp-Waren folgen aus Templates
CREATE TABLE IF NOT EXISTS public.campaign_shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.campaign_shops (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  description text,
  base_price_gp numeric(14, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_shop_items_shop_id ON public.campaign_shop_items (shop_id);

ALTER TABLE public.campaign_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_shop_items ENABLE ROW LEVEL SECURITY;

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
