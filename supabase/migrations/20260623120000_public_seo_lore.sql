-- Öffentliche SEO-Lore-Einträge (GM-gesteuert) + Bildrechte für Lore/Fraktionen

CREATE TABLE IF NOT EXISTS public.public_seo_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lore', 'npc', 'faction')),
  entity_id uuid NOT NULL,
  slug text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_seo_entries_entity_unique UNIQUE (entity_type, entity_id),
  CONSTRAINT public_seo_entries_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_public_seo_entries_campaign_public
  ON public.public_seo_entries (campaign_id, is_public, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_seo_entries_slug_public
  ON public.public_seo_entries (slug)
  WHERE is_public = true;

COMMENT ON TABLE public.public_seo_entries IS
  'GM-freigegebene öffentliche Lore/NPC/Fraktion-URLs für SEO (z. B. /falghrik-gleidahr).';

ALTER TABLE public.public_seo_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read public seo entries" ON public.public_seo_entries;
CREATE POLICY "Anyone can read public seo entries"
  ON public.public_seo_entries
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "GMs can manage public seo entries" ON public.public_seo_entries;
CREATE POLICY "GMs can manage public seo entries"
  ON public.public_seo_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = public_seo_entries.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = public_seo_entries.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

-- Bildrechte für Lore (analog NPCs)
ALTER TABLE public.world_lore
  ADD COLUMN IF NOT EXISTS image_is_ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_upload_rights_confirmed boolean;

COMMENT ON COLUMN public.world_lore.image_is_ai_generated IS
  'True wenn Hauptbild KI-generiert ist (öffentliche Anzeige mit Hinweis).';
COMMENT ON COLUMN public.world_lore.image_upload_rights_confirmed IS
  'GM bestätigt Nutzungsrechte am Hauptbild für öffentliche Anzeige.';

ALTER TABLE public.factions
  ADD COLUMN IF NOT EXISTS image_is_ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_upload_rights_confirmed boolean;

COMMENT ON COLUMN public.factions.image_is_ai_generated IS
  'True wenn Hauptbild KI-generiert ist (öffentliche Anzeige mit Hinweis).';
COMMENT ON COLUMN public.factions.image_upload_rights_confirmed IS
  'GM bestätigt Nutzungsrechte am Hauptbild/Banner für öffentliche Anzeige.';

-- Kampagne auf Startseite in „Neueste Lore-Einträge“ listen
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS seo_lore_homepage_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.campaigns.seo_lore_homepage_enabled IS
  'Öffentliche Lore-Einträge dieser Kampagne auf der Startseite anzeigen.';
