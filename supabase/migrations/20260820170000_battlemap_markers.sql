-- Spezial-Marker: 1-Feld-Icons auf der Battlemap (Feuer, Eis, Geröll, …).

CREATE TABLE IF NOT EXISTS public.session_battlemap_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battlemap_id uuid NOT NULL REFERENCES public.session_battlemaps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  kind text NOT NULL,
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  is_visible_to_players boolean NOT NULL DEFAULT true,
  z_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_battlemap_markers_kind_check
    CHECK (kind IN ('fire', 'ice', 'debris', 'crack', 'danger', 'interest', 'trap')),
  CONSTRAINT session_battlemap_markers_grid_check
    CHECK (grid_x >= -500 AND grid_x <= 2000 AND grid_y >= -500 AND grid_y <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_markers_battlemap
  ON public.session_battlemap_markers (battlemap_id);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_markers_session
  ON public.session_battlemap_markers (session_id);

COMMENT ON TABLE public.session_battlemap_markers IS
  'SL-Spezialeffekt-Marker (1 Gridfeld): Feuer, Eis, Geröll, Riss, Gefahr, Interesse, Falle.';

ALTER TABLE public.session_battlemap_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_battlemap_markers_select"
  ON public.session_battlemap_markers;
CREATE POLICY "session_battlemap_markers_select"
  ON public.session_battlemap_markers
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_session(session_id)
    AND (
      is_visible_to_players
      OR EXISTS (
        SELECT 1
        FROM public.sessions s
        JOIN public.campaigns c ON c.id = s.campaign_id
        WHERE s.id = session_battlemap_markers.session_id
          AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "session_battlemap_markers_write_gm"
  ON public.session_battlemap_markers;
CREATE POLICY "session_battlemap_markers_write_gm"
  ON public.session_battlemap_markers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_markers.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_markers.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.session_battlemap_markers REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'session_battlemap_markers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_battlemap_markers;
    END IF;
  END IF;
END $$;
