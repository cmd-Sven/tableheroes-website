-- Repair migration for scheduled-session preparation:
-- ensure required live-state columns exist and GM/Owner can create the row.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS current_location text,
  ADD COLUMN IF NOT EXISTS "current_time" text,
  ADD COLUMN IF NOT EXISTS weather text,
  ADD COLUMN IF NOT EXISTS journal_text text,
  ADD COLUMN IF NOT EXISTS visible_npc_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS visible_faction_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS scribe_id uuid,
  ADD COLUMN IF NOT EXISTS background_url text,
  ADD COLUMN IF NOT EXISTS current_location_lore_id uuid;

ALTER TABLE public.session_live_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_live_states_insert_gm" ON public.session_live_states;
DROP POLICY IF EXISTS "session_live_states_insert_gm_owner" ON public.session_live_states;

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
