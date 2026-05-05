-- Harden Fog of War RLS for live state, NPCs, and lore.
-- Goal: players only see campaign-revealed world entities via campaign_visibility.

-- ---------------------------------------------------------------------------
-- Performance support for RLS subqueries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_id
  ON public.sessions (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_world_id
  ON public.campaigns (world_id);

CREATE INDEX IF NOT EXISTS idx_campaign_members_user_campaign_status
  ON public.campaign_members (user_id, campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_npcs_world_id
  ON public.npcs (world_id);

CREATE INDEX IF NOT EXISTS idx_world_lore_world_id
  ON public.world_lore (world_id);

CREATE INDEX IF NOT EXISTS idx_campaign_visibility_revealed_lookup
  ON public.campaign_visibility (campaign_id, entity_type, entity_id)
  WHERE is_revealed = true;

-- ---------------------------------------------------------------------------
-- session_live_states: remove broad authenticated read and enforce campaign scope
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_live_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View live state" ON public.session_live_states;
DROP POLICY IF EXISTS "session_live_states_gm_all" ON public.session_live_states;
DROP POLICY IF EXISTS "session_live_states_member_select" ON public.session_live_states;

CREATE POLICY "session_live_states_select_campaign_access"
  ON public.session_live_states
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_live_states.session_id
        AND (
          c.gm_id = auth.uid()
          OR c.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.campaign_members cm
            WHERE cm.campaign_id = c.id
              AND cm.user_id = auth.uid()
              AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed')
          )
        )
    )
  );

CREATE POLICY "session_live_states_insert_gm_owner"
  ON public.session_live_states
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_live_states.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "session_live_states_update_gm_owner"
  ON public.session_live_states
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_live_states.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_live_states.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "session_live_states_delete_gm_owner"
  ON public.session_live_states
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_live_states.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- npcs: GM sees full world, players only campaign-revealed NPCs
-- ---------------------------------------------------------------------------
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaign members can view world NPCs" ON public.npcs;
DROP POLICY IF EXISTS "GMs can manage NPCs of their worlds" ON public.npcs;

CREATE POLICY "npcs_select_gm_or_revealed_to_campaign_member"
  ON public.npcs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.worlds w
      WHERE w.id = npcs.world_id
        AND w.gm_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.campaign_members cm ON cm.campaign_id = c.id
      JOIN public.campaign_visibility cv ON cv.campaign_id = c.id
      WHERE c.world_id = npcs.world_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed')
        AND cv.entity_type = 'npc'
        AND cv.entity_id = npcs.id
        AND cv.is_revealed = true
    )
  );

CREATE POLICY "npcs_manage_world_gm"
  ON public.npcs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.worlds w
      WHERE w.id = npcs.world_id
        AND w.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.worlds w
      WHERE w.id = npcs.world_id
        AND w.gm_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- world_lore: GM sees full world, players only campaign-revealed lore
-- ---------------------------------------------------------------------------
ALTER TABLE public.world_lore ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaign members can view world lore" ON public.world_lore;
DROP POLICY IF EXISTS "GMs can manage lore of their worlds" ON public.world_lore;
DROP POLICY IF EXISTS "GMs can manage their world_lore" ON public.world_lore;

CREATE POLICY "world_lore_select_gm_or_revealed_to_campaign_member"
  ON public.world_lore
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.worlds w
      WHERE w.id = world_lore.world_id
        AND w.gm_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.campaign_members cm ON cm.campaign_id = c.id
      JOIN public.campaign_visibility cv ON cv.campaign_id = c.id
      WHERE c.world_id = world_lore.world_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed')
        AND cv.entity_type = 'lore'
        AND cv.entity_id = world_lore.id
        AND cv.is_revealed = true
    )
  );

CREATE POLICY "world_lore_manage_world_gm"
  ON public.world_lore
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.worlds w
      WHERE w.id = world_lore.world_id
        AND w.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.worlds w
      WHERE w.id = world_lore.world_id
        AND w.gm_id = auth.uid()
    )
  );
