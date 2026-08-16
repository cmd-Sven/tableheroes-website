-- Fix: NPCs sind welt-zentrisch (world_id), nicht campaign_id.
-- place_battlemap_gm_token schlug fehl mit "NSC nicht gefunden".
-- Plus: show_hp_bar am Token + character token_settings.

ALTER TABLE public.session_battlemap_tokens
  ADD COLUMN IF NOT EXISTS show_hp_bar boolean NOT NULL DEFAULT false;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS token_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.session_battlemap_tokens.show_hp_bar IS
  'Wenn true: Lebensbalken am Battlemap-Token anzeigen.';
COMMENT ON COLUMN public.characters.token_settings IS
  'Battlemap-Token-Einstellungen: { showHpBar?: boolean, sizeCategory?: tiny|small|medium|large|huge|gargantuan }.';

DROP FUNCTION IF EXISTS public.place_battlemap_gm_token(
  uuid, uuid, integer, integer, uuid, uuid, uuid, text, integer, boolean, text, text
);

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
  p_image_url text DEFAULT NULL,
  p_show_hp_bar boolean DEFAULT false
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
  v_campaign record;
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
  v_show_hp boolean;
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

  SELECT c.id, c.world_id INTO v_campaign
  FROM public.campaigns c
  WHERE c.id = v_map.campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kampagne nicht gefunden.';
  END IF;

  v_size := GREATEST(1, LEAST(4, COALESCE(p_size_cells, 1)));
  v_show_hp := COALESCE(p_show_hp_bar, false);

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
        show_hp_bar = COALESCE(p_show_hp_bar, show_hp_bar),
        updated_at = now()
    WHERE id = p_token_id
    RETURNING * INTO v_existing;
    RETURN v_existing;
  END IF;

  IF (p_npc_id IS NOT NULL)::int + (p_creature_id IS NOT NULL)::int <> 1 THEN
    RAISE EXCEPTION 'Genau eine Referenz (npc_id oder creature_id) erforderlich.';
  END IF;

  IF p_npc_id IS NOT NULL THEN
    -- Welt-zentrische NPCs: über Kampagnen-world_id auflösen
    SELECT * INTO v_npc
    FROM public.npcs n
    WHERE n.id = p_npc_id
      AND n.world_id IS NOT DISTINCT FROM v_campaign.world_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NSC nicht gefunden.';
    END IF;
    v_label := COALESCE(NULLIF(trim(p_label), ''), v_npc.name, 'NSC');
    v_image := COALESCE(
      NULLIF(trim(p_image_url), ''),
      NULLIF(trim(v_npc.token_url), ''),
      NULLIF(trim(v_npc.image_url), ''),
      ''
    );
    -- Größe aus token_size_category, falls Client Default 1 schickt
    IF COALESCE(p_size_cells, 1) <= 1 THEN
      v_size := CASE lower(COALESCE(v_npc.token_size_category, 'medium'))
        WHEN 'large' THEN 2
        WHEN 'huge' THEN 3
        WHEN 'gargantuan' THEN 4
        ELSE 1
      END;
    END IF;
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
    token_side,
    show_hp_bar
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
    p_token_side,
    v_show_hp
  )
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;

COMMENT ON FUNCTION public.place_battlemap_gm_token IS
  'SL: NSC-/Kreatur-Token auf aktiver Battlemap platzieren oder verschieben (welt-zentrische NPCs).';

GRANT EXECUTE ON FUNCTION public.place_battlemap_gm_token TO authenticated;
