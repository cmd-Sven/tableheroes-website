-- Live-session system logs, background override priority and combat encounter mode.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS is_background_manual_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_combat_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_turn_index integer NOT NULL DEFAULT 0;

ALTER TABLE public.session_live_states
  DROP CONSTRAINT IF EXISTS session_live_states_current_turn_index_check;

ALTER TABLE public.session_live_states
  ADD CONSTRAINT session_live_states_current_turn_index_check
  CHECK (current_turn_index >= 0);

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS default_image_url text;

ALTER TABLE public.world_lore
  ADD COLUMN IF NOT EXISTS default_image_url text;

COMMENT ON COLUMN public.session_live_states.is_background_manual_override IS
  'Wenn true, setzt ein Ortswechsel den Buehnenhintergrund nicht automatisch.';

COMMENT ON COLUMN public.session_live_states.is_combat_mode IS
  'Aktiviert die Initiative-Leiste und GM-Kampfsteuerung in der Live-Session.';

COMMENT ON COLUMN public.session_live_states.current_turn_index IS
  'Index des aktiven Teilnehmers in der sortierten Combat-Initiative.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'combat_participant_type') THEN
    CREATE TYPE public.combat_participant_type AS ENUM ('player', 'monster');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.combat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.combat_participant_type NOT NULL,
  initiative_value integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combat_participants_session
  ON public.combat_participants(session_id, is_active, initiative_value DESC, sort_order ASC);

DROP TRIGGER IF EXISTS th_touch_combat_participants ON public.combat_participants;
CREATE TRIGGER th_touch_combat_participants
  BEFORE UPDATE ON public.combat_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.th_touch_updated_at();

ALTER TABLE public.combat_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "combat_participants_select_campaign_access" ON public.combat_participants;
DROP POLICY IF EXISTS "combat_participants_insert_gm_owner" ON public.combat_participants;
DROP POLICY IF EXISTS "combat_participants_update_gm_owner" ON public.combat_participants;
DROP POLICY IF EXISTS "combat_participants_delete_gm_owner" ON public.combat_participants;

CREATE POLICY "combat_participants_select_campaign_access"
  ON public.combat_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id
       AND cm.user_id = auth.uid()
       AND cm.status IN ('Approved', 'Active')
      WHERE s.id = combat_participants.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid() OR cm.user_id IS NOT NULL)
    )
  );

CREATE POLICY "combat_participants_insert_gm_owner"
  ON public.combat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = combat_participants.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "combat_participants_update_gm_owner"
  ON public.combat_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = combat_participants.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = combat_participants.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "combat_participants_delete_gm_owner"
  ON public.combat_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = combat_participants.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
