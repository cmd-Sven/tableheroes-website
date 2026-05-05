-- Campaign-specific NPC reputation for live-session reactions.

CREATE TABLE IF NOT EXISTS public.campaign_npc_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  npc_id uuid NOT NULL REFERENCES public.npcs(id) ON DELETE CASCADE,
  reputation_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_npc_reputation_campaign_npc_unique UNIQUE (campaign_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_npc_reputation_campaign
  ON public.campaign_npc_reputation (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_npc_reputation_npc
  ON public.campaign_npc_reputation (npc_id);

ALTER TABLE public.campaign_npc_reputation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_npc_reputation_select_campaign_access"
  ON public.campaign_npc_reputation;
DROP POLICY IF EXISTS "campaign_npc_reputation_insert_gm_owner"
  ON public.campaign_npc_reputation;
DROP POLICY IF EXISTS "campaign_npc_reputation_update_gm_owner"
  ON public.campaign_npc_reputation;
DROP POLICY IF EXISTS "campaign_npc_reputation_delete_gm_owner"
  ON public.campaign_npc_reputation;

CREATE POLICY "campaign_npc_reputation_select_campaign_access"
  ON public.campaign_npc_reputation
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_npc_reputation.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR c.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.campaign_members cm
            WHERE cm.campaign_id = c.id
              AND cm.user_id = auth.uid()
              AND cm.status IN ('Approved', 'Active')
          )
        )
    )
  );

CREATE POLICY "campaign_npc_reputation_insert_gm_owner"
  ON public.campaign_npc_reputation
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_npc_reputation.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "campaign_npc_reputation_update_gm_owner"
  ON public.campaign_npc_reputation
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_npc_reputation.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_npc_reputation.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "campaign_npc_reputation_delete_gm_owner"
  ON public.campaign_npc_reputation
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_npc_reputation.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.th_touch_campaign_npc_reputation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_campaign_npc_reputation
  ON public.campaign_npc_reputation;
CREATE TRIGGER trg_touch_campaign_npc_reputation
  BEFORE UPDATE ON public.campaign_npc_reputation
  FOR EACH ROW
  EXECUTE FUNCTION public.th_touch_campaign_npc_reputation();

CREATE OR REPLACE FUNCTION public.adjust_campaign_npc_reputation(
  p_campaign_id uuid,
  p_npc_id uuid,
  p_amount integer
)
RETURNS public.campaign_npc_reputation
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.campaign_npc_reputation;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = p_campaign_id
      AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Nur GM oder Owner können NPC-Ruf ändern.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.npcs n ON n.world_id = c.world_id
    WHERE c.id = p_campaign_id
      AND n.id = p_npc_id
  ) THEN
    RAISE EXCEPTION 'NPC gehört nicht zur Kampagnenwelt.';
  END IF;

  INSERT INTO public.campaign_npc_reputation (
    campaign_id,
    npc_id,
    reputation_score
  )
  VALUES (
    p_campaign_id,
    p_npc_id,
    p_amount
  )
  ON CONFLICT (campaign_id, npc_id)
  DO UPDATE SET
    reputation_score = public.campaign_npc_reputation.reputation_score + EXCLUDED.reputation_score,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_campaign_npc_reputation(uuid, uuid, integer)
  TO authenticated;
