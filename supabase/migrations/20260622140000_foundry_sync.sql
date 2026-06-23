-- Foundry VTT Sync: API-Key pro Kampagne + Actor ↔ Charakter-Zuordnung

CREATE TABLE IF NOT EXISTS public.foundry_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
  api_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.foundry_sync IS
  'API-Key pro Kampagne für das Foundry-Modul Table Heroes Bridge (Header x-tableheroes-api-key).';

CREATE TABLE IF NOT EXISTS public.foundry_character_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE,
  foundry_actor_id text NOT NULL,
  foundry_actor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_campaign_foundry_actor UNIQUE (campaign_id, foundry_actor_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_foundry_mapping_campaign_character_unique
  ON public.foundry_character_mapping (campaign_id, character_id)
  WHERE character_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_foundry_mapping_lookup
  ON public.foundry_character_mapping (campaign_id, foundry_actor_id);

COMMENT ON TABLE public.foundry_character_mapping IS
  'Zuordnung Foundry Actor-ID (z. B. Actor.…) zu Table-Heroes-Charakter pro Kampagne.';

ALTER TABLE public.foundry_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foundry_character_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GMs can manage foundry sync" ON public.foundry_sync;
CREATE POLICY "GMs can manage foundry sync"
  ON public.foundry_sync
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = foundry_sync.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = foundry_sync.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "GMs can manage character mappings" ON public.foundry_character_mapping;
CREATE POLICY "GMs can manage character mappings"
  ON public.foundry_character_mapping
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = foundry_character_mapping.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = foundry_character_mapping.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
