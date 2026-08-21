-- Runtime-Fallen auf der Battlemap (Detection DC, Damage, AoE-Overlay).

CREATE TABLE IF NOT EXISTS public.session_battlemap_traps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battlemap_id uuid NOT NULL REFERENCES public.session_battlemaps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Falle',
  description text NOT NULL DEFAULT '',
  trap_type text NOT NULL DEFAULT 'mechanical',
  difficulty text NOT NULL DEFAULT 'medium',
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  detection_dc integer NOT NULL DEFAULT 15,
  is_area_effect boolean NOT NULL DEFAULT false,
  effect_shape text NOT NULL DEFAULT 'circle',
  effect_radius integer NOT NULL DEFAULT 1,
  damage text NOT NULL DEFAULT '2d6',
  damage_type text NOT NULL DEFAULT 'piercing',
  save_ability text,
  save_dc integer,
  is_armed boolean NOT NULL DEFAULT true,
  is_detected boolean NOT NULL DEFAULT false,
  is_triggered boolean NOT NULL DEFAULT false,
  is_visible_to_players boolean NOT NULL DEFAULT false,
  triggered_by_character_id uuid,
  triggered_at timestamptz,
  lore_context text,
  ai_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_battlemap_traps_difficulty_check
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'deadly')),
  CONSTRAINT session_battlemap_traps_shape_check
    CHECK (effect_shape IN ('circle', 'rect')),
  CONSTRAINT session_battlemap_traps_radius_check
    CHECK (effect_radius >= 1 AND effect_radius <= 20),
  CONSTRAINT session_battlemap_traps_dc_check
    CHECK (detection_dc >= 1 AND detection_dc <= 40)
);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_traps_battlemap
  ON public.session_battlemap_traps (battlemap_id);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_traps_session
  ON public.session_battlemap_traps (session_id);

COMMENT ON TABLE public.session_battlemap_traps IS
  'SL-Fallen: Detection DC vs Passive Perception, Trigger, optional AoE-Overlay.';

ALTER TABLE public.session_battlemap_traps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_battlemap_traps_select"
  ON public.session_battlemap_traps;
CREATE POLICY "session_battlemap_traps_select"
  ON public.session_battlemap_traps
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_session(session_id)
    AND (
      is_visible_to_players
      OR is_triggered
      OR EXISTS (
        SELECT 1
        FROM public.sessions s
        JOIN public.campaigns c ON c.id = s.campaign_id
        WHERE s.id = session_battlemap_traps.session_id
          AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "session_battlemap_traps_write_gm"
  ON public.session_battlemap_traps;
CREATE POLICY "session_battlemap_traps_write_gm"
  ON public.session_battlemap_traps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_traps.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_traps.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_battlemap_traps REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'session_battlemap_traps'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_battlemap_traps;
    END IF;
  END IF;
END $$;
