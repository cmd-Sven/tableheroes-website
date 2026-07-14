-- Kampagnen-Regelsystem: Makel-Katalog + Schicksalspunkte-Regeln (Malanthirk/Vattrak)

CREATE TABLE IF NOT EXISTS public.campaign_rules_settings (
  campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  fate_points_intro text NOT NULL DEFAULT '',
  fate_points_w10_rules text NOT NULL DEFAULT '',
  fate_points_gm_notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.campaign_rules_settings IS
  'Kampagnenspezifische Regeltexte (Schicksalspunkte / Malanthirk & Vattrak).';

CREATE TABLE IF NOT EXISTS public.campaign_flaws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  flaw_key text NOT NULL,
  nr integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  main_disadvantage text NOT NULL DEFAULT '',
  small_advantage text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  effects text NOT NULL DEFAULT '',
  roleplay text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_flaws_campaign_key_unique UNIQUE (campaign_id, flaw_key)
);

CREATE INDEX IF NOT EXISTS idx_campaign_flaws_campaign_id
  ON public.campaign_flaws (campaign_id, sort_order, nr);

COMMENT ON TABLE public.campaign_flaws IS
  'Kampagnenspezifischer Makel-Katalog (Seed aus Standardliste + SL-eigene Makel).';

ALTER TABLE public.campaign_rules_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_flaws ENABLE ROW LEVEL SECURITY;

-- Lesen: GM oder Kampagnenmitglied (wie getCampaignAccess)
DROP POLICY IF EXISTS "campaign_rules_settings_member_select" ON public.campaign_rules_settings;
CREATE POLICY "campaign_rules_settings_member_select"
  ON public.campaign_rules_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id
       AND cm.user_id = auth.uid()
       AND cm.status IN (
         'Accepted', 'Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed'
       )
      WHERE c.id = campaign_rules_settings.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR c.owner_id = auth.uid()
          OR cm.user_id IS NOT NULL
        )
    )
  );

DROP POLICY IF EXISTS "campaign_flaws_member_select" ON public.campaign_flaws;
CREATE POLICY "campaign_flaws_member_select"
  ON public.campaign_flaws
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id
       AND cm.user_id = auth.uid()
       AND cm.status IN (
         'Accepted', 'Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed'
       )
      WHERE c.id = campaign_flaws.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR c.owner_id = auth.uid()
          OR cm.user_id IS NOT NULL
        )
    )
  );

-- Schreiben: nur GM / Owner
DROP POLICY IF EXISTS "campaign_rules_settings_gm_write" ON public.campaign_rules_settings;
CREATE POLICY "campaign_rules_settings_gm_write"
  ON public.campaign_rules_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_rules_settings.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_rules_settings.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "campaign_flaws_gm_write" ON public.campaign_flaws;
CREATE POLICY "campaign_flaws_gm_write"
  ON public.campaign_flaws
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_flaws.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_flaws.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
