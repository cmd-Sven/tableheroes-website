-- Battlemap Phase 2: SL-Tokens, Sichtbarkeit, Bewegungs-Pause, Tisch-Props.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS battlemap_movement_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.session_live_states.battlemap_movement_paused IS
  'SL: Spieler dürfen Charakter-Token nicht bewegen, wenn true. SL darf weiterhin alles steuern.';

-- ---------------------------------------------------------------------------
-- Tisch-Props (NSC-Karte / Szenen-Bild) — Position normalisiert 0–1 relativ zur Map-Bildgröße
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_battlemap_props (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battlemap_id uuid NOT NULL REFERENCES public.session_battlemaps(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  npc_id uuid REFERENCES public.npcs(id) ON DELETE SET NULL,
  image_url text,
  scene_media_id uuid REFERENCES public.campaign_scene_media(id) ON DELETE SET NULL,
  pos_x numeric(8, 6) NOT NULL DEFAULT 0,
  pos_y numeric(8, 6) NOT NULL DEFAULT 0,
  width numeric(8, 6) NOT NULL DEFAULT 0.15,
  height numeric(8, 6) NOT NULL DEFAULT 0.2,
  rotation numeric(8, 4) NOT NULL DEFAULT 0,
  is_visible_to_players boolean NOT NULL DEFAULT true,
  z_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_battlemap_props_kind_check CHECK (kind IN ('npc_card', 'scene_image')),
  CONSTRAINT session_battlemap_props_pos_x_check CHECK (pos_x >= 0 AND pos_x <= 1),
  CONSTRAINT session_battlemap_props_pos_y_check CHECK (pos_y >= 0 AND pos_y <= 1),
  CONSTRAINT session_battlemap_props_width_check CHECK (width > 0 AND width <= 1),
  CONSTRAINT session_battlemap_props_height_check CHECK (height > 0 AND height <= 1),
  CONSTRAINT session_battlemap_props_ref_check CHECK (
    (kind = 'npc_card' AND npc_id IS NOT NULL)
    OR (kind = 'scene_image' AND (scene_media_id IS NOT NULL OR image_url IS NOT NULL))
  )
);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_props_battlemap
  ON public.session_battlemap_props (battlemap_id, z_index);

CREATE INDEX IF NOT EXISTS idx_session_battlemap_props_session
  ON public.session_battlemap_props (session_id);

COMMENT ON TABLE public.session_battlemap_props IS
  'Tisch-Props auf Battlemap (NSC-Karte, Szenen-Foto). pos_x/pos_y/width/height: Anteil 0–1 der Map-Bildbreite/-höhe.';

-- ---------------------------------------------------------------------------
-- RPC: Spieler-Token — Pause prüfen
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

  IF v_live.battlemap_movement_paused IS TRUE
     AND NOT public.user_is_session_gm(p_session_id) THEN
    RAISE EXCEPTION 'Bewegung ist pausiert — der Spielleiter hat Token-Bewegungen gesperrt.';
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

-- ---------------------------------------------------------------------------
-- RPC: SL platziert/verschiebt NSC- oder Kreatur-Token
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_battlemap_gm_token(
  p_session_id uuid,
  p_battlemap_id uuid,
  p_grid_x integer,
  p_grid_y integer,
  p_token_id uuid DEFAULT NULL,
  p_npc_id uuid DEFAULT NULL,
  p_creature_id uuid DEFAULT NULL,
  p_token_side text DEFAULT 'hostile',
  p_size_cells integer DEFAULT 1,
  p_is_visible_to_players boolean DEFAULT true,
  p_label text DEFAULT NULL,
  p_image_url text DEFAULT NULL
)
RETURNS public.session_battlemap_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_map record;
  v_live record;
  v_existing public.session_battlemap_tokens;
  v_npc record;
  v_creature record;
  v_cols integer;
  v_rows integer;
  v_size integer;
  v_cx integer;
  v_cy integer;
  v_label text;
  v_image text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;

  IF NOT public.user_is_session_gm(p_session_id) THEN
    RAISE EXCEPTION 'Nur der Spielleiter darf SL-Tokens setzen.';
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

  v_size := GREATEST(1, LEAST(4, COALESCE(p_size_cells, 1)));

  IF p_token_side NOT IN ('party', 'friendly', 'neutral', 'hostile') THEN
    RAISE EXCEPTION 'Ungültige Token-Seite.';
  END IF;

  v_cols := COALESCE((v_map.grid_config->>'columns')::integer, 20);
  v_rows := COALESCE((v_map.grid_config->>'rows')::integer, 20);

  IF p_grid_x < 0 OR p_grid_y < 0
     OR p_grid_x + v_size > v_cols
     OR p_grid_y + v_size > v_rows THEN
    RAISE EXCEPTION 'Ziel liegt außerhalb des Rasters.';
  END IF;

  IF p_token_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.session_battlemap_tokens t
    WHERE t.id = p_token_id
      AND t.battlemap_id = p_battlemap_id
      AND t.session_id = p_session_id
      AND t.character_id IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SL-Token nicht gefunden.';
    END IF;
  END IF;

  FOR v_cx IN p_grid_x .. (p_grid_x + v_size - 1) LOOP
    FOR v_cy IN p_grid_y .. (p_grid_y + v_size - 1) LOOP
      IF public.battlemap_cell_blocked(
        p_battlemap_id, v_cx, v_cy,
        CASE WHEN v_existing.id IS NOT NULL THEN v_existing.id ELSE NULL END
      ) THEN
        RAISE EXCEPTION 'Zelle ist blockiert.';
      END IF;
    END LOOP;
  END LOOP;

  IF p_token_id IS NOT NULL THEN
    UPDATE public.session_battlemap_tokens
    SET grid_x = p_grid_x,
        grid_y = p_grid_y,
        size_cells = v_size,
        token_side = p_token_side,
        is_visible_to_players = COALESCE(p_is_visible_to_players, true),
        label = COALESCE(NULLIF(trim(p_label), ''), label),
        image_url = COALESCE(NULLIF(trim(p_image_url), ''), image_url),
        updated_at = now()
    WHERE id = p_token_id
    RETURNING * INTO v_existing;
    RETURN v_existing;
  END IF;

  IF (p_npc_id IS NOT NULL)::int + (p_creature_id IS NOT NULL)::int <> 1 THEN
    RAISE EXCEPTION 'Genau eine Referenz (npc_id oder creature_id) erforderlich.';
  END IF;

  IF p_npc_id IS NOT NULL THEN
    SELECT * INTO v_npc
    FROM public.npcs n
    WHERE n.id = p_npc_id
      AND n.campaign_id = v_map.campaign_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NSC nicht gefunden.';
    END IF;
    v_label := COALESCE(NULLIF(trim(p_label), ''), v_npc.name, 'NSC');
    v_image := COALESCE(
      NULLIF(trim(p_image_url), ''),
      NULLIF(trim(v_npc.image_url), ''),
      ''
    );
  ELSE
    SELECT * INTO v_creature
    FROM public.bestarium_creatures bc
    WHERE bc.id = p_creature_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kreatur nicht gefunden.';
    END IF;
    v_label := COALESCE(NULLIF(trim(p_label), ''), v_creature.name, 'Kreatur');
    v_image := COALESCE(
      NULLIF(trim(p_image_url), ''),
      NULLIF(trim(v_creature.image_url), ''),
      ''
    );
  END IF;

  INSERT INTO public.session_battlemap_tokens (
    battlemap_id,
    session_id,
    npc_id,
    creature_id,
    grid_x,
    grid_y,
    label,
    image_url,
    size_cells,
    is_visible_to_players,
    token_side
  ) VALUES (
    p_battlemap_id,
    p_session_id,
    p_npc_id,
    p_creature_id,
    p_grid_x,
    p_grid_y,
    v_label,
    NULLIF(v_image, ''),
    v_size,
    COALESCE(p_is_visible_to_players, true),
    p_token_side
  )
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;

COMMENT ON FUNCTION public.place_battlemap_gm_token IS
  'SL: NSC-/Kreatur-Token auf aktiver Battlemap platzieren oder verschieben.';

GRANT EXECUTE ON FUNCTION public.place_battlemap_gm_token TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: Props
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_battlemap_props ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_battlemap_props_select" ON public.session_battlemap_props;
DROP POLICY IF EXISTS "session_battlemap_props_insert_gm" ON public.session_battlemap_props;
DROP POLICY IF EXISTS "session_battlemap_props_update_gm" ON public.session_battlemap_props;
DROP POLICY IF EXISTS "session_battlemap_props_delete_gm" ON public.session_battlemap_props;

CREATE POLICY "session_battlemap_props_select"
  ON public.session_battlemap_props
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_session(session_id)
    AND (is_visible_to_players OR public.user_is_session_gm(session_id))
  );

CREATE POLICY "session_battlemap_props_insert_gm"
  ON public.session_battlemap_props
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_session_gm(session_id));

CREATE POLICY "session_battlemap_props_update_gm"
  ON public.session_battlemap_props
  FOR UPDATE
  TO authenticated
  USING (public.user_is_session_gm(session_id))
  WITH CHECK (public.user_is_session_gm(session_id));

CREATE POLICY "session_battlemap_props_delete_gm"
  ON public.session_battlemap_props
  FOR DELETE
  TO authenticated
  USING (public.user_is_session_gm(session_id));

-- Realtime
ALTER TABLE public.session_battlemap_props REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public' AND c.relname = 'session_battlemap_props'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_battlemap_props;
    END IF;
  END IF;
END $$;
