-- Weltkarte Live: Camping-Token, FoW/Effekte/Marker, freihändige Zeichnungen (Battlemap + Weltkarte).

-- ---------------------------------------------------------------------------
-- world_maps: Gruppentoken Camping-Modus
-- ---------------------------------------------------------------------------
ALTER TABLE public.world_maps
  ADD COLUMN IF NOT EXISTS group_token_is_camping boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.world_maps.group_token_is_camping IS
  'true = Gruppe kampiert (Lagerfeuer-Symbol statt Gruppentoken).';

-- Realtime für Token-/Grid-Sync in Live-Sessions
ALTER TABLE public.world_maps REPLICA IDENTITY FULL;
ALTER TABLE public.world_map_markers REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'world_maps'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.world_maps;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'world_map_markers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.world_map_markers;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- session_world_map_fog_shapes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_world_map_fog_shapes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_map_id uuid NOT NULL REFERENCES public.world_maps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  shape text NOT NULL,
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  grid_w integer NOT NULL DEFAULT 1,
  grid_h integer NOT NULL DEFAULT 1,
  z_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_world_map_fog_shapes_shape_check CHECK (shape IN ('rect', 'circle')),
  CONSTRAINT session_world_map_fog_shapes_w_check CHECK (grid_w >= 1 AND grid_w <= 200),
  CONSTRAINT session_world_map_fog_shapes_h_check CHECK (grid_h >= 1 AND grid_h <= 200)
);

CREATE INDEX IF NOT EXISTS idx_session_world_map_fog_shapes_map
  ON public.session_world_map_fog_shapes (world_map_id);
CREATE INDEX IF NOT EXISTS idx_session_world_map_fog_shapes_session
  ON public.session_world_map_fog_shapes (session_id);

ALTER TABLE public.session_world_map_fog_shapes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_world_map_fog_shapes_select" ON public.session_world_map_fog_shapes;
CREATE POLICY "session_world_map_fog_shapes_select"
  ON public.session_world_map_fog_shapes FOR SELECT TO authenticated
  USING (public.user_can_access_session(session_id));

DROP POLICY IF EXISTS "session_world_map_fog_shapes_write_gm" ON public.session_world_map_fog_shapes;
CREATE POLICY "session_world_map_fog_shapes_write_gm"
  ON public.session_world_map_fog_shapes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_world_map_fog_shapes.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_world_map_fog_shapes.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_world_map_fog_shapes REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------------
-- session_world_map_effect_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_world_map_effect_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_map_id uuid NOT NULL REFERENCES public.world_maps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  shape text NOT NULL,
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  grid_w integer NOT NULL DEFAULT 1,
  grid_h integer NOT NULL DEFAULT 1,
  direction_deg integer NOT NULL DEFAULT 0,
  z_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_world_map_effect_templates_shape_check
    CHECK (shape IN ('rect', 'circle', 'cone')),
  CONSTRAINT session_world_map_effect_templates_w_check CHECK (grid_w >= 1 AND grid_w <= 200),
  CONSTRAINT session_world_map_effect_templates_h_check CHECK (grid_h >= 1 AND grid_h <= 200)
);

CREATE INDEX IF NOT EXISTS idx_session_world_map_effect_templates_map
  ON public.session_world_map_effect_templates (world_map_id);
CREATE INDEX IF NOT EXISTS idx_session_world_map_effect_templates_session
  ON public.session_world_map_effect_templates (session_id);

ALTER TABLE public.session_world_map_effect_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_world_map_effect_templates_select"
  ON public.session_world_map_effect_templates;
CREATE POLICY "session_world_map_effect_templates_select"
  ON public.session_world_map_effect_templates FOR SELECT TO authenticated
  USING (public.user_can_access_session(session_id));

DROP POLICY IF EXISTS "session_world_map_effect_templates_write_gm"
  ON public.session_world_map_effect_templates;
CREATE POLICY "session_world_map_effect_templates_write_gm"
  ON public.session_world_map_effect_templates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_world_map_effect_templates.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_world_map_effect_templates.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_world_map_effect_templates REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------------
-- session_world_map_effect_markers (Feuer/Eis/… wie Battlemap)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_world_map_effect_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_map_id uuid NOT NULL REFERENCES public.world_maps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  kind text NOT NULL,
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  is_visible_to_players boolean NOT NULL DEFAULT true,
  z_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_world_map_effect_markers_kind_check
    CHECK (kind IN ('fire', 'ice', 'debris', 'crack', 'danger', 'interest', 'trap')),
  CONSTRAINT session_world_map_effect_markers_grid_check
    CHECK (grid_x >= -500 AND grid_x <= 2000 AND grid_y >= -500 AND grid_y <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_session_world_map_effect_markers_map
  ON public.session_world_map_effect_markers (world_map_id);
CREATE INDEX IF NOT EXISTS idx_session_world_map_effect_markers_session
  ON public.session_world_map_effect_markers (session_id);

ALTER TABLE public.session_world_map_effect_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_world_map_effect_markers_select"
  ON public.session_world_map_effect_markers;
CREATE POLICY "session_world_map_effect_markers_select"
  ON public.session_world_map_effect_markers FOR SELECT TO authenticated
  USING (
    public.user_can_access_session(session_id)
    AND (
      is_visible_to_players
      OR EXISTS (
        SELECT 1 FROM public.sessions s
        JOIN public.campaigns c ON c.id = s.campaign_id
        WHERE s.id = session_world_map_effect_markers.session_id
          AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "session_world_map_effect_markers_write_gm"
  ON public.session_world_map_effect_markers;
CREATE POLICY "session_world_map_effect_markers_write_gm"
  ON public.session_world_map_effect_markers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_world_map_effect_markers.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_world_map_effect_markers.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_world_map_effect_markers REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------------
-- session_map_draw_strokes (Battlemap ODER Weltkarte)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_map_draw_strokes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  battlemap_id uuid REFERENCES public.session_battlemaps(id) ON DELETE CASCADE,
  world_map_id uuid REFERENCES public.world_maps(id) ON DELETE CASCADE,
  color text NOT NULL DEFAULT '#cab926',
  stroke_width numeric NOT NULL DEFAULT 4,
  -- Pixel-Koordinaten relativ zur Kartenbildgröße [{x,y},…]
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  z_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_map_draw_strokes_one_target CHECK (
    (battlemap_id IS NOT NULL AND world_map_id IS NULL)
    OR (battlemap_id IS NULL AND world_map_id IS NOT NULL)
  ),
  CONSTRAINT session_map_draw_strokes_width_check
    CHECK (stroke_width >= 1 AND stroke_width <= 64),
  CONSTRAINT session_map_draw_strokes_color_check
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_session_map_draw_strokes_session
  ON public.session_map_draw_strokes (session_id);
CREATE INDEX IF NOT EXISTS idx_session_map_draw_strokes_battlemap
  ON public.session_map_draw_strokes (battlemap_id)
  WHERE battlemap_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_map_draw_strokes_world_map
  ON public.session_map_draw_strokes (world_map_id)
  WHERE world_map_id IS NOT NULL;

COMMENT ON TABLE public.session_map_draw_strokes IS
  'Freihändige SL-Zeichnungen auf Battlemap oder Weltkarte (Live-Session).';

ALTER TABLE public.session_map_draw_strokes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_map_draw_strokes_select" ON public.session_map_draw_strokes;
CREATE POLICY "session_map_draw_strokes_select"
  ON public.session_map_draw_strokes FOR SELECT TO authenticated
  USING (public.user_can_access_session(session_id));

DROP POLICY IF EXISTS "session_map_draw_strokes_write_gm" ON public.session_map_draw_strokes;
CREATE POLICY "session_map_draw_strokes_write_gm"
  ON public.session_map_draw_strokes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_map_draw_strokes.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_map_draw_strokes.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_map_draw_strokes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename = 'session_world_map_fog_shapes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_world_map_fog_shapes;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename = 'session_world_map_effect_templates'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_world_map_effect_templates;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename = 'session_world_map_effect_markers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_world_map_effect_markers;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename = 'session_map_draw_strokes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_map_draw_strokes;
    END IF;
  END IF;
END $$;
