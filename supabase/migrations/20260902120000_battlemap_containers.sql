-- Runtime-Container auf der Battlemap (Kisten, Fässer) mit optionaler eingebetteter Falle.

CREATE TABLE IF NOT EXISTS public.session_battlemap_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battlemap_id uuid NOT NULL REFERENCES public.session_battlemaps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Behälter',
  description text NOT NULL DEFAULT '',
  container_type text NOT NULL DEFAULT 'chest',
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  is_open boolean NOT NULL DEFAULT false,
  force_open_dc integer NOT NULL DEFAULT 15,
  has_trap boolean NOT NULL DEFAULT false,
  trap_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_trap_detected boolean NOT NULL DEFAULT false,
  is_trap_disarmed boolean NOT NULL DEFAULT false,
  is_trap_triggered boolean NOT NULL DEFAULT false,
  trap_visible_to_players boolean NOT NULL DEFAULT false,
  trap_triggered_by_character_id uuid,
  trap_triggered_at timestamptz,
  lore_context text,
  ai_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_battlemap_containers_type_check
    CHECK (container_type IN ('chest', 'barrel', 'crate', 'urn', 'sarcophagus', 'other')),
  CONSTRAINT session_battlemap_containers_force_dc_check
    CHECK (force_open_dc >= 1 AND force_open_dc <= 40)
);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_containers_battlemap
  ON public.session_battlemap_containers (battlemap_id);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_containers_session
  ON public.session_battlemap_containers (session_id);

COMMENT ON TABLE public.session_battlemap_containers IS
  'SL-Behälter auf Battlemap: verschlossen, optional mit Falle, Loot später.';

ALTER TABLE public.session_battlemap_containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_battlemap_containers_select"
  ON public.session_battlemap_containers;
CREATE POLICY "session_battlemap_containers_select"
  ON public.session_battlemap_containers
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_session(session_id)
    AND (
      is_open
      OR trap_visible_to_players
      OR is_trap_triggered
      OR EXISTS (
        SELECT 1
        FROM public.sessions s
        JOIN public.campaigns c ON c.id = s.campaign_id
        WHERE s.id = session_battlemap_containers.session_id
          AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "session_battlemap_containers_write_gm"
  ON public.session_battlemap_containers;
CREATE POLICY "session_battlemap_containers_write_gm"
  ON public.session_battlemap_containers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_containers.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_containers.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_battlemap_containers REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'session_battlemap_containers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_battlemap_containers;
    END IF;
  END IF;
END $$;
