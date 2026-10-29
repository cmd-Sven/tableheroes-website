-- NPCs can belong to several world factions.
-- npcs.faction_id stays the primary faction for existing embeds.
-- city_faction_id (Aurenfurt catalog) stays a single column and is not stored here.

CREATE TABLE IF NOT EXISTS public.npc_faction_links (
  npc_id uuid NOT NULL REFERENCES public.npcs(id) ON DELETE CASCADE,
  faction_id uuid NOT NULL REFERENCES public.factions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (npc_id, faction_id)
);

CREATE INDEX IF NOT EXISTS idx_npc_faction_links_faction_id
  ON public.npc_faction_links (faction_id);

COMMENT ON TABLE public.npc_faction_links IS
  'Many-to-many world-faction membership. npcs.faction_id is the primary faction.';

ALTER TABLE public.npc_faction_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "npc_faction_links_select_gm_or_revealed_to_campaign_member"
  ON public.npc_faction_links;
DROP POLICY IF EXISTS "npc_faction_links_manage_world_gm"
  ON public.npc_faction_links;

-- Same read rule as npcs: world GM, or a campaign member who can see the revealed NPC.
CREATE POLICY "npc_faction_links_select_gm_or_revealed_to_campaign_member"
  ON public.npc_faction_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.npcs n
      JOIN public.worlds w ON w.id = n.world_id
      WHERE n.id = npc_faction_links.npc_id
        AND w.gm_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.npcs n
      JOIN public.campaigns c ON c.world_id = n.world_id
      JOIN public.campaign_members cm ON cm.campaign_id = c.id
      JOIN public.campaign_visibility cv ON cv.campaign_id = c.id
      WHERE n.id = npc_faction_links.npc_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed')
        AND cv.entity_type = 'npc'
        AND cv.entity_id = n.id
        AND cv.is_revealed = true
    )
  );

-- Same write rule as npcs_manage_world_gm, plus faction and NPC must share that world.
CREATE POLICY "npc_faction_links_manage_world_gm"
  ON public.npc_faction_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.npcs n
      JOIN public.worlds w ON w.id = n.world_id
      WHERE n.id = npc_faction_links.npc_id
        AND w.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.npcs n
      JOIN public.factions f ON f.id = npc_faction_links.faction_id
      JOIN public.worlds w ON w.id = n.world_id
      WHERE n.id = npc_faction_links.npc_id
        AND f.world_id = n.world_id
        AND w.gm_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.npc_faction_links FROM PUBLIC;
REVOKE ALL ON TABLE public.npc_faction_links FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.npc_faction_links TO authenticated;
GRANT ALL ON TABLE public.npc_faction_links TO service_role;

INSERT INTO public.npc_faction_links (npc_id, faction_id)
SELECT n.id, n.faction_id
FROM public.npcs n
INNER JOIN public.factions f ON f.id = n.faction_id
WHERE n.faction_id IS NOT NULL
ON CONFLICT (npc_id, faction_id) DO NOTHING;

INSERT INTO public.npc_faction_links (npc_id, faction_id)
SELECT DISTINCT n.id, f.id
FROM public.factions f
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(f.planned_members) = 'array' THEN f.planned_members
    ELSE '[]'::jsonb
  END
) AS member
INNER JOIN public.npcs n
  ON n.id = CASE
    WHEN (member->>'npc_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (member->>'npc_id')::uuid
    ELSE NULL
  END
ON CONFLICT (npc_id, faction_id) DO NOTHING;
