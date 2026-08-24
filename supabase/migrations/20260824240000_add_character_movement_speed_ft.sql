-- Fix: character_movement_speed_ft fehlte in Production (Battlemap-Migrationen nur teilweise angewendet).
-- place_battlemap_character_token ruft diese Funktion beim Verschieben auf → RPC schlägt fehl, Token snappt zurück.

CREATE OR REPLACE FUNCTION public.character_movement_speed_ft(p_character_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    GREATEST(
      0,
      NULLIF(trim(ch.sheet_data->'combat'->>'speed'), '')::integer
    ),
    30
  )
  FROM public.characters ch
  WHERE ch.id = p_character_id;
$$;

COMMENT ON FUNCTION public.character_movement_speed_ft(uuid) IS
  'Bewegungsreichweite in ft aus D&D-5e-Charakterbogen (sheet_data.combat.speed), Fallback 30.';

GRANT EXECUTE ON FUNCTION public.character_movement_speed_ft(uuid) TO authenticated;
