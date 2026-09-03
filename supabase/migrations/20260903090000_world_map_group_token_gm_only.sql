-- Restrict world-map group token moves to world GM or campaign GM/owner (not players).

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

  IF NOT (
    public.user_is_world_gm(v_map.world_id)
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.world_id = v_map.world_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Nur der Spielleiter darf das Gruppentoken verschieben.';
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
  'Nur SL: Gruppentoken auf Weltkarte verschieben (nur Position/Sichtbarkeit).';
