-- Erweiterte Felder fuer KI-generierte Shop-Inventare.

ALTER TABLE public.campaign_shop_items
  ADD COLUMN IF NOT EXISTS is_magical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_legal boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'gear';

ALTER TABLE public.campaign_shop_items
  DROP CONSTRAINT IF EXISTS campaign_shop_items_rarity_check,
  ADD CONSTRAINT campaign_shop_items_rarity_check
    CHECK (rarity IN ('common', 'uncommon', 'rare', 'very rare', 'legendary'));

ALTER TABLE public.campaign_shop_items
  DROP CONSTRAINT IF EXISTS campaign_shop_items_item_type_check,
  ADD CONSTRAINT campaign_shop_items_item_type_check
    CHECK (item_type IN ('weapon', 'armor', 'potion', 'gear', 'material', 'service', 'quest'));

CREATE INDEX IF NOT EXISTS idx_campaign_shop_items_rarity
  ON public.campaign_shop_items (rarity);

CREATE INDEX IF NOT EXISTS idx_campaign_shop_items_item_type
  ON public.campaign_shop_items (item_type);
