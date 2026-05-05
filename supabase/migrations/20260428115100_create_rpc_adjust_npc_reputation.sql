-- Ensure the NPC reputation RPC exists independently of the table migration.
-- The function updates reputation atomically and is called by adjustNpcReputation().

CREATE TABLE IF NOT EXISTS public.campaign_npc_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  npc_id uuid NOT NULL REFERENCES public.npcs(id) ON DELETE CASCADE,
  reputation_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_npc_reputation_campaign_npc_unique
  ON public.campaign_npc_reputation (campaign_id, npc_id);

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
