-- Manuelles Fog of War: SL zeichnet Rechtecke/Kreise auf dem Grid.
-- Shapes leben an der Session-Map; Presets pro Kampagne+Bild für Übernahme in die nächste Session.

CREATE TABLE IF NOT EXISTS public.session_battlemap_fog_shapes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battlemap_id uuid NOT NULL REFERENCES public.session_battlemaps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  shape text NOT NULL,
  -- Rect: grid_x/y = oben links, grid_w/h = Zellen.
  -- Circle: grid_x/y = Zentrumszelle, grid_w = Radius in Zellen (grid_h = grid_w).
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  grid_w integer NOT NULL DEFAULT 1,
  grid_h integer NOT NULL DEFAULT 1,
  z_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_battlemap_fog_shapes_shape_check CHECK (shape IN ('rect', 'circle')),
  CONSTRAINT session_battlemap_fog_shapes_w_check CHECK (grid_w >= 1 AND grid_w <= 200),
  CONSTRAINT session_battlemap_fog_shapes_h_check CHECK (grid_h >= 1 AND grid_h <= 200)
);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_fog_shapes_battlemap
  ON public.session_battlemap_fog_shapes (battlemap_id);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_fog_shapes_session
  ON public.session_battlemap_fog_shapes (session_id);

COMMENT ON TABLE public.session_battlemap_fog_shapes IS
  'Manuelle Fog-of-War-Flächen (Rect/Circle), am Grid ausgerichtet. SL transparent, Spieler schwarz.';

-- Kampagnen-Preset: Fog einer Map-Bilddatei für die nächste Session übernehmen
CREATE TABLE IF NOT EXISTS public.campaign_battlemap_fog_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  image_storage_path text NOT NULL,
  shapes jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_battlemap_fog_presets_path_unique UNIQUE (campaign_id, image_storage_path)
);

COMMENT ON TABLE public.campaign_battlemap_fog_presets IS
  'Fog-Shapes je Kampagne + Map-Bildpfad — Übernahme in spätere Sessions mit derselben Map.';

ALTER TABLE public.session_battlemap_fog_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_battlemap_fog_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_battlemap_fog_shapes_select" ON public.session_battlemap_fog_shapes;
CREATE POLICY "session_battlemap_fog_shapes_select"
  ON public.session_battlemap_fog_shapes
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_session(session_id));

DROP POLICY IF EXISTS "session_battlemap_fog_shapes_write_gm" ON public.session_battlemap_fog_shapes;
CREATE POLICY "session_battlemap_fog_shapes_write_gm"
  ON public.session_battlemap_fog_shapes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_fog_shapes.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_fog_shapes.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "campaign_battlemap_fog_presets_select" ON public.campaign_battlemap_fog_presets;
CREATE POLICY "campaign_battlemap_fog_presets_select"
  ON public.campaign_battlemap_fog_presets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_battlemap_fog_presets.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.campaign_id = campaign_battlemap_fog_presets.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
    )
  );

DROP POLICY IF EXISTS "campaign_battlemap_fog_presets_write_gm" ON public.campaign_battlemap_fog_presets;
CREATE POLICY "campaign_battlemap_fog_presets_write_gm"
  ON public.campaign_battlemap_fog_presets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_battlemap_fog_presets.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_battlemap_fog_presets.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_battlemap_fog_shapes REPLICA IDENTITY FULL;

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
        AND c.relname = 'session_battlemap_fog_shapes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_battlemap_fog_shapes;
    END IF;
  END IF;
END $$;
