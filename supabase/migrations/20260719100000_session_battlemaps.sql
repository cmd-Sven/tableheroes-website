-- Battlemap Phase 1: session-scoped maps, grid tokens, live activation.

CREATE TABLE IF NOT EXISTS public.session_battlemaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text NOT NULL,
  image_storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  grid_config jsonb NOT NULL DEFAULT '{
    "cellSizePx": 50,
    "originX": 0,
    "originY": 0,
    "columns": 20,
    "rows": 20,
    "showGrid": true
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_battlemaps_session_sort
  ON public.session_battlemaps (session_id, sort_order, created_at);

COMMENT ON TABLE public.session_battlemaps IS
  'SL-vorbereitete Battlemaps pro Session (Quadrat-Grid, Phase 1).';

CREATE TABLE IF NOT EXISTS public.session_battlemap_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battlemap_id uuid NOT NULL REFERENCES public.session_battlemaps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE,
  npc_id uuid REFERENCES public.npcs(id) ON DELETE CASCADE,
  creature_id uuid REFERENCES public.bestarium_creatures(id) ON DELETE CASCADE,
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  label text,
  image_url text,
  size_cells integer NOT NULL DEFAULT 1,
  is_visible_to_players boolean NOT NULL DEFAULT true,
  token_side text NOT NULL DEFAULT 'party',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_battlemap_tokens_size_cells_check CHECK (size_cells >= 1 AND size_cells <= 4),
  CONSTRAINT session_battlemap_tokens_token_side_check CHECK (
    token_side IN ('party', 'friendly', 'neutral', 'hostile')
  ),
  CONSTRAINT session_battlemap_tokens_ref_check CHECK (
    (
      (character_id IS NOT NULL)::int +
      (npc_id IS NOT NULL)::int +
      (creature_id IS NOT NULL)::int
    ) = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_battlemap_tokens_character_unique
  ON public.session_battlemap_tokens (battlemap_id, character_id)
  WHERE character_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_battlemap_tokens_battlemap
  ON public.session_battlemap_tokens (battlemap_id);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_tokens_session
  ON public.session_battlemap_tokens (session_id);

COMMENT ON TABLE public.session_battlemap_tokens IS
  'Token auf Battlemap-Raster (Charakter/NPC/Kreatur). Ein Charakter pro Map.';

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS active_battlemap_id uuid
    REFERENCES public.session_battlemaps(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.session_live_states.active_battlemap_id IS
  'Aktive Battlemap ersetzt narrative Stage-Hintergrund in der Live-Session.';

-- ---------------------------------------------------------------------------
-- Helper: Session-Zugriff (GM oder Kampagnenmitglied)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_access_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.campaigns c ON c.id = s.campaign_id
    WHERE s.id = p_session_id
      AND (
        c.gm_id = auth.uid()
        OR c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.campaign_members cm
          WHERE cm.campaign_id = s.campaign_id
            AND cm.user_id = auth.uid()
            AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_session_gm(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.campaigns c ON c.id = s.campaign_id
    WHERE s.id = p_session_id
      AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Occupancy: party + friendly = passierbar; neutral + hostile = blockiert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.battlemap_token_blocks_cell(
  p_token public.session_battlemap_tokens
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_token.character_id IS NOT NULL THEN false
    WHEN p_token.token_side IN ('party', 'friendly') THEN false
    ELSE true
  END;
$$;

CREATE OR REPLACE FUNCTION public.battlemap_cell_blocked(
  p_battlemap_id uuid,
  p_grid_x integer,
  p_grid_y integer,
  p_exclude_token_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.session_battlemap_tokens t
    WHERE t.battlemap_id = p_battlemap_id
      AND (p_exclude_token_id IS NULL OR t.id <> p_exclude_token_id)
      AND public.battlemap_token_blocks_cell(t)
      AND p_grid_x >= t.grid_x
      AND p_grid_x < t.grid_x + t.size_cells
      AND p_grid_y >= t.grid_y
      AND p_grid_y < t.grid_y + t.size_cells
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: Spieler platziert/verschiebt eigenen Charakter-Token
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_battlemap_character_token(
  p_session_id uuid,
  p_battlemap_id uuid,
  p_character_id uuid,
  p_grid_x integer,
  p_grid_y integer
)
RETURNS public.session_battlemap_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_char record;
  v_map record;
  v_live record;
  v_existing public.session_battlemap_tokens;
  v_cols integer;
  v_rows integer;
  v_size integer := 1;
  v_cx integer;
  v_cy integer;
  v_label text;
  v_image text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;

  IF NOT public.user_can_access_session(p_session_id) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diese Session.';
  END IF;

  SELECT * INTO v_char
  FROM public.characters ch
  WHERE ch.id = p_character_id
    AND ch.campaign_id = (
      SELECT campaign_id FROM public.sessions WHERE id = p_session_id
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Charakter nicht gefunden.';
  END IF;

  IF v_char.user_id IS DISTINCT FROM v_uid
     AND NOT public.user_is_session_gm(p_session_id) THEN
    RAISE EXCEPTION 'Du darfst nur deinen eigenen Charakter-Token setzen.';
  END IF;

  SELECT * INTO v_map
  FROM public.session_battlemaps bm
  WHERE bm.id = p_battlemap_id
    AND bm.session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battlemap nicht gefunden.';
  END IF;

  SELECT * INTO v_live
  FROM public.session_live_states ls
  WHERE ls.session_id = p_session_id;

  IF v_live.active_battlemap_id IS DISTINCT FROM p_battlemap_id THEN
    RAISE EXCEPTION 'Diese Battlemap ist gerade nicht aktiv.';
  END IF;

  v_cols := COALESCE((v_map.grid_config->>'columns')::integer, 20);
  v_rows := COALESCE((v_map.grid_config->>'rows')::integer, 20);

  IF p_grid_x < 0 OR p_grid_y < 0
     OR p_grid_x + v_size > v_cols
     OR p_grid_y + v_size > v_rows THEN
    RAISE EXCEPTION 'Ziel liegt außerhalb des Rasters.';
  END IF;

  SELECT * INTO v_existing
  FROM public.session_battlemap_tokens t
  WHERE t.battlemap_id = p_battlemap_id
    AND t.character_id = p_character_id;

  FOR v_cx IN p_grid_x .. (p_grid_x + v_size - 1) LOOP
    FOR v_cy IN p_grid_y .. (p_grid_y + v_size - 1) LOOP
      IF public.battlemap_cell_blocked(
        p_battlemap_id, v_cx, v_cy,
        CASE WHEN v_existing.id IS NOT NULL THEN v_existing.id ELSE NULL END
      ) THEN
        RAISE EXCEPTION 'Zelle ist blockiert (Gegner oder neutraler Token).';
      END IF;
    END LOOP;
  END LOOP;

  v_label := COALESCE(v_char.name, 'Held');
  v_image := COALESCE(NULLIF(trim(v_char.token_url), ''), NULLIF(trim(v_char.avatar_url), ''), '');

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.session_battlemap_tokens
    SET grid_x = p_grid_x,
        grid_y = p_grid_y,
        label = v_label,
        image_url = NULLIF(v_image, ''),
        updated_at = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;
    RETURN v_existing;
  END IF;

  INSERT INTO public.session_battlemap_tokens (
    battlemap_id,
    session_id,
    character_id,
    grid_x,
    grid_y,
    label,
    image_url,
    size_cells,
    token_side
  ) VALUES (
    p_battlemap_id,
    p_session_id,
    p_character_id,
    p_grid_x,
    p_grid_y,
    v_label,
    NULLIF(v_image, ''),
    v_size,
    'party'
  )
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;

COMMENT ON FUNCTION public.place_battlemap_character_token IS
  'Spieler/SL: Charakter-Token auf aktiver Battlemap platzieren oder verschieben (D&D 5e Durchlässigkeit).';

GRANT EXECUTE ON FUNCTION public.place_battlemap_character_token TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_battlemaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_battlemap_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_battlemaps_select" ON public.session_battlemaps;
DROP POLICY IF EXISTS "session_battlemaps_insert_gm" ON public.session_battlemaps;
DROP POLICY IF EXISTS "session_battlemaps_update_gm" ON public.session_battlemaps;
DROP POLICY IF EXISTS "session_battlemaps_delete_gm" ON public.session_battlemaps;

CREATE POLICY "session_battlemaps_select"
  ON public.session_battlemaps
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_session(session_id));

CREATE POLICY "session_battlemaps_insert_gm"
  ON public.session_battlemaps
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_session_gm(session_id));

CREATE POLICY "session_battlemaps_update_gm"
  ON public.session_battlemaps
  FOR UPDATE
  TO authenticated
  USING (public.user_is_session_gm(session_id))
  WITH CHECK (public.user_is_session_gm(session_id));

CREATE POLICY "session_battlemaps_delete_gm"
  ON public.session_battlemaps
  FOR DELETE
  TO authenticated
  USING (public.user_is_session_gm(session_id));

DROP POLICY IF EXISTS "session_battlemap_tokens_select" ON public.session_battlemap_tokens;
DROP POLICY IF EXISTS "session_battlemap_tokens_insert_gm" ON public.session_battlemap_tokens;
DROP POLICY IF EXISTS "session_battlemap_tokens_update_gm" ON public.session_battlemap_tokens;
DROP POLICY IF EXISTS "session_battlemap_tokens_update_own_character" ON public.session_battlemap_tokens;
DROP POLICY IF EXISTS "session_battlemap_tokens_delete_gm" ON public.session_battlemap_tokens;

CREATE POLICY "session_battlemap_tokens_select"
  ON public.session_battlemap_tokens
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_session(session_id)
    AND (is_visible_to_players OR public.user_is_session_gm(session_id))
  );

CREATE POLICY "session_battlemap_tokens_insert_gm"
  ON public.session_battlemap_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_session_gm(session_id));

CREATE POLICY "session_battlemap_tokens_update_gm"
  ON public.session_battlemap_tokens
  FOR UPDATE
  TO authenticated
  USING (public.user_is_session_gm(session_id))
  WITH CHECK (public.user_is_session_gm(session_id));

CREATE POLICY "session_battlemap_tokens_update_own_character"
  ON public.session_battlemap_tokens
  FOR UPDATE
  TO authenticated
  USING (
    character_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.characters ch
      WHERE ch.id = session_battlemap_tokens.character_id
        AND ch.user_id = auth.uid()
    )
  )
  WITH CHECK (
    character_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.characters ch
      WHERE ch.id = session_battlemap_tokens.character_id
        AND ch.user_id = auth.uid()
    )
  );

CREATE POLICY "session_battlemap_tokens_delete_gm"
  ON public.session_battlemap_tokens
  FOR DELETE
  TO authenticated
  USING (public.user_is_session_gm(session_id));

-- Realtime
ALTER TABLE public.session_battlemaps REPLICA IDENTITY FULL;
ALTER TABLE public.session_battlemap_tokens REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public' AND c.relname = 'session_battlemaps'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_battlemaps;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public' AND c.relname = 'session_battlemap_tokens'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_battlemap_tokens;
    END IF;
  END IF;
END $$;
