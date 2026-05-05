-- Loot-Gun: Beutel auf der Bühne (GM prüft, Spieler nehmen per Realtime)

CREATE TABLE IF NOT EXISTS public.campaign_loot_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  gp_remaining integer NOT NULL DEFAULT 0,
  sp_remaining integer NOT NULL DEFAULT 0,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_loot_containers_gp_nonneg CHECK (gp_remaining >= 0),
  CONSTRAINT campaign_loot_containers_sp_nonneg CHECK (sp_remaining >= 0),
  CONSTRAINT campaign_loot_containers_items_array CHECK (jsonb_typeof(items_json) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_campaign_loot_containers_campaign
  ON public.campaign_loot_containers(campaign_id);

DROP TRIGGER IF EXISTS trg_touch_campaign_loot_containers ON public.campaign_loot_containers;
CREATE TRIGGER trg_touch_campaign_loot_containers
  BEFORE UPDATE ON public.campaign_loot_containers
  FOR EACH ROW
  EXECUTE FUNCTION public.th_touch_updated_at();

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS current_loot_id uuid REFERENCES public.campaign_loot_containers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_session_live_states_current_loot
  ON public.session_live_states(current_loot_id)
  WHERE current_loot_id IS NOT NULL;

ALTER TABLE public.campaign_loot_containers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.th_can_access_campaign(campaign_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_members m
    WHERE m.campaign_id = campaign_uuid
      AND m.user_id = auth.uid()
      AND m.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
  )
  OR EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = campaign_uuid
      AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.th_can_access_campaign(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.th_can_access_campaign(uuid) TO authenticated;

DROP POLICY IF EXISTS campaign_loot_containers_select_member ON public.campaign_loot_containers;
CREATE POLICY campaign_loot_containers_select_member
  ON public.campaign_loot_containers
  FOR SELECT
  TO authenticated
  USING (public.th_can_access_campaign(campaign_id));

DROP POLICY IF EXISTS campaign_loot_containers_insert_gm ON public.campaign_loot_containers;
CREATE POLICY campaign_loot_containers_insert_gm
  ON public.campaign_loot_containers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS campaign_loot_containers_update_member ON public.campaign_loot_containers;
CREATE POLICY campaign_loot_containers_update_member
  ON public.campaign_loot_containers
  FOR UPDATE
  TO authenticated
  USING (public.th_can_access_campaign(campaign_id))
  WITH CHECK (public.th_can_access_campaign(campaign_id));

DROP POLICY IF EXISTS campaign_loot_containers_delete_gm ON public.campaign_loot_containers;
CREATE POLICY campaign_loot_containers_delete_gm
  ON public.campaign_loot_containers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

COMMENT ON TABLE public.campaign_loot_containers IS 'Aktiver Beute-Stapel: GP/SP + items_json (id, name, desc, rarity, price, isMagical).';
COMMENT ON COLUMN public.session_live_states.current_loot_id IS 'Optional: Truhe auf der Live-Bühne.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public'
        AND c.relname = 'campaign_loot_containers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_loot_containers;
    END IF;
  END IF;
END $$;
