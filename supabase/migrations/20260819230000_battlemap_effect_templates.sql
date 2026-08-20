-- Effekt-Schablonen: SL markiert Effektbereiche (Rechteck, Kreis, Kegel) auf dem Grid.

CREATE TABLE IF NOT EXISTS public.session_battlemap_effect_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battlemap_id uuid NOT NULL REFERENCES public.session_battlemaps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  shape text NOT NULL,
  -- Rect: grid_x/y = oben links, grid_w/h = Zellen.
  -- Circle: grid_x/y = Zentrumszelle, grid_w = Radius (grid_h = grid_w).
  -- Cone: grid_x/y = Spitze, grid_w = Länge in Zellen, direction_deg = Richtung.
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  grid_w integer NOT NULL DEFAULT 1,
  grid_h integer NOT NULL DEFAULT 1,
  direction_deg integer NOT NULL DEFAULT 0,
  z_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_battlemap_effect_templates_shape_check
    CHECK (shape IN ('rect', 'circle', 'cone')),
  CONSTRAINT session_battlemap_effect_templates_w_check
    CHECK (grid_w >= 1 AND grid_w <= 200),
  CONSTRAINT session_battlemap_effect_templates_h_check
    CHECK (grid_h >= 1 AND grid_h <= 200),
  CONSTRAINT session_battlemap_effect_templates_dir_check
    CHECK (direction_deg >= 0 AND direction_deg <= 359)
);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_effect_templates_battlemap
  ON public.session_battlemap_effect_templates (battlemap_id);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_effect_templates_session
  ON public.session_battlemap_effect_templates (session_id);

COMMENT ON TABLE public.session_battlemap_effect_templates IS
  'SL-Effekt-Schablonen (Rect/Circle/Cone) zur Markierung von Zauber-/Effektbereichen.';

ALTER TABLE public.session_battlemap_effect_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_battlemap_effect_templates_select"
  ON public.session_battlemap_effect_templates;
CREATE POLICY "session_battlemap_effect_templates_select"
  ON public.session_battlemap_effect_templates
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_session(session_id));

DROP POLICY IF EXISTS "session_battlemap_effect_templates_write_gm"
  ON public.session_battlemap_effect_templates;
CREATE POLICY "session_battlemap_effect_templates_write_gm"
  ON public.session_battlemap_effect_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_effect_templates.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_effect_templates.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_battlemap_effect_templates REPLICA IDENTITY FULL;

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
        AND c.relname = 'session_battlemap_effect_templates'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_battlemap_effect_templates;
    END IF;
  END IF;
END $$;
