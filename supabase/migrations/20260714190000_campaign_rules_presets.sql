-- Benutzerdefinierte Regelvorlagen (Makel + Schicksalspunkte) zum Speichern und Importieren zwischen Kampagnen.

CREATE TABLE IF NOT EXISTS public.campaign_rules_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_rules_presets_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_campaign_rules_presets_user_id
  ON public.campaign_rules_presets (user_id, created_at DESC);

COMMENT ON TABLE public.campaign_rules_presets IS
  'Vom SL gespeicherte Regelvorlagen (Makel-Katalog + Schicksalspunkte) als JSON-Snapshot.';

ALTER TABLE public.campaign_rules_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_rules_presets_owner_select" ON public.campaign_rules_presets;
CREATE POLICY "campaign_rules_presets_owner_select"
  ON public.campaign_rules_presets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "campaign_rules_presets_owner_insert" ON public.campaign_rules_presets;
CREATE POLICY "campaign_rules_presets_owner_insert"
  ON public.campaign_rules_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "campaign_rules_presets_owner_update" ON public.campaign_rules_presets;
CREATE POLICY "campaign_rules_presets_owner_update"
  ON public.campaign_rules_presets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "campaign_rules_presets_owner_delete" ON public.campaign_rules_presets;
CREATE POLICY "campaign_rules_presets_owner_delete"
  ON public.campaign_rules_presets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
