-- Allow campaign members (players) to move the world-map group token during live sessions.
-- Only group_token_grid_x/y (+ visibility for placement) are updated; camping stays GM-only via app.

CREATE OR REPLACE FUNCTION public.move_world_map_group_token(
  p_map_id uuid,
  p_grid_x integer,
  p_grid_y integer,
  p_visible boolean DEFAULT true
)
RETURNS public.world_maps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_map public.world_maps;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;

  SELECT * INTO v_map
  FROM public.world_maps
  WHERE id = p_map_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Weltkarte nicht gefunden.';
  END IF;

  IF NOT public.user_can_access_world_maps(v_map.world_id) THEN
    RAISE EXCEPTION 'Kein Zugriff auf diese Weltkarte.';
  END IF;

  UPDATE public.world_maps
  SET
    group_token_grid_x = p_grid_x,
    group_token_grid_y = p_grid_y,
    group_token_visible = COALESCE(p_visible, true),
    updated_at = now()
  WHERE id = p_map_id
  RETURNING * INTO v_map;

  RETURN v_map;
END;
$$;

COMMENT ON FUNCTION public.move_world_map_group_token(uuid, integer, integer, boolean) IS
  'Spieler/GM: Gruppentoken auf Weltkarte verschieben (nur Position/Sichtbarkeit).';

GRANT EXECUTE ON FUNCTION public.move_world_map_group_token(uuid, integer, integer, boolean)
  TO authenticated;
