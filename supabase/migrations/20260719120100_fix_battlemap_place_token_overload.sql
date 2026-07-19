-- Fix: place_battlemap_character_token hatte zwei Overloads (5- und 6-Parameter),
-- weil 20260719120000 CREATE OR REPLACE eine neue Signatur angelegt hat.
-- Bereinigt beide Signaturen und legt die kanonische 6-Parameter-Version an.

DROP FUNCTION IF EXISTS public.place_battlemap_character_token(uuid, uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.place_battlemap_character_token(uuid, uuid, uuid, integer, integer, boolean);

CREATE OR REPLACE FUNCTION public.place_battlemap_character_token(
  p_session_id uuid,
  p_battlemap_id uuid,
  p_character_id uuid,
  p_grid_x integer,
  p_grid_y integer,
  p_use_dash boolean DEFAULT false
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
  v_speed_ft integer;
  v_max_cells integer;
  v_dist integer;
  v_is_gm boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;

  IF NOT public.user_can_access_session(p_session_id) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diese Session.';
  END IF;

  v_is_gm := public.user_is_session_gm(p_session_id);

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
     AND NOT v_is_gm THEN
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
     AND NOT v_is_gm THEN
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

  -- Verschieben: Reichweite prüfen (SL darf frei bewegen; Erstplatzierung ohne Limit)
  IF v_existing.id IS NOT NULL AND NOT v_is_gm THEN
    v_speed_ft := public.character_movement_speed_ft(p_character_id);
    v_max_cells := GREATEST(0, v_speed_ft / 5);
    IF p_use_dash THEN
      v_max_cells := v_max_cells * 2;
    END IF;
    v_dist := GREATEST(
      ABS(p_grid_x - v_existing.grid_x),
      ABS(p_grid_y - v_existing.grid_y)
    );
    IF v_dist > v_max_cells THEN
      RAISE EXCEPTION
        'Bewegung zu weit (% Zellen, erlaubt %). Nutze die Dash-Aktion für doppelte Reichweite.',
        v_dist, v_max_cells;
    END IF;
  END IF;

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

COMMENT ON FUNCTION public.place_battlemap_character_token(uuid, uuid, uuid, integer, integer, boolean) IS
  'Spieler/SL: Charakter-Token platzieren (frei) oder verschieben (Speed aus sheet_data, optional Dash ×2, Chebyshev). SL ohne Limit.';

GRANT EXECUTE ON FUNCTION public.place_battlemap_character_token(uuid, uuid, uuid, integer, integer, boolean) TO authenticated;
