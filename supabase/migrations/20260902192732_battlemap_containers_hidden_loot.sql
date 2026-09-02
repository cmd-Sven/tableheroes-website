-- Hidden containers + player visibility / discovery; allow session members to UPDATE (open/discover).

ALTER TABLE public.session_battlemap_containers
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_discovered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS detection_dc integer NOT NULL DEFAULT 15;

ALTER TABLE public.session_battlemap_containers
  DROP CONSTRAINT IF EXISTS session_battlemap_containers_detection_dc_check;

ALTER TABLE public.session_battlemap_containers
  ADD CONSTRAINT session_battlemap_containers_detection_dc_check
  CHECK (detection_dc >= 1 AND detection_dc <= 40);

COMMENT ON COLUMN public.session_battlemap_containers.is_hidden IS
  'Wenn true: für Spieler unsichtbar bis is_discovered; Passive Perception nur dann.';
COMMENT ON COLUMN public.session_battlemap_containers.is_discovered IS
  'Versteckter Behälter wurde entdeckt (PP / aktive Suche / SL).';
COMMENT ON COLUMN public.session_battlemap_containers.detection_dc IS
  'SG für Entdeckung versteckter Behälter (Passive Perception / Suche).';

-- SELECT: sichtbare Behälter + entdeckte Versteckte + offene/Fallen-sichtbar + SL
DROP POLICY IF EXISTS "session_battlemap_containers_select"
  ON public.session_battlemap_containers;
CREATE POLICY "session_battlemap_containers_select"
  ON public.session_battlemap_containers
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_session(session_id)
    AND (
      (NOT is_hidden OR is_discovered)
      OR is_open
      OR trap_visible_to_players
      OR is_trap_triggered
      OR EXISTS (
        SELECT 1
        FROM public.sessions s
        JOIN public.campaigns c ON c.id = s.campaign_id
        WHERE s.id = session_battlemap_containers.session_id
          AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
      )
    )
  );

-- Split writes: GM insert/delete; session members may update (open, discover, trap state)
DROP POLICY IF EXISTS "session_battlemap_containers_write_gm"
  ON public.session_battlemap_containers;

DROP POLICY IF EXISTS "session_battlemap_containers_insert_gm"
  ON public.session_battlemap_containers;
CREATE POLICY "session_battlemap_containers_insert_gm"
  ON public.session_battlemap_containers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_containers.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_battlemap_containers_delete_gm"
  ON public.session_battlemap_containers;
CREATE POLICY "session_battlemap_containers_delete_gm"
  ON public.session_battlemap_containers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_battlemap_containers.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_battlemap_containers_update_session"
  ON public.session_battlemap_containers;
CREATE POLICY "session_battlemap_containers_update_session"
  ON public.session_battlemap_containers
  FOR UPDATE
  TO authenticated
  USING (public.user_can_access_session(session_id))
  WITH CHECK (public.user_can_access_session(session_id));

-- PP-Entdeckung: Spieler dürfen versteckte Rows nicht SELECTen → SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.discover_hidden_battlemap_container_near(
  p_session_id uuid,
  p_battlemap_id uuid,
  p_grid_x integer,
  p_grid_y integer,
  p_passive_perception integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_session(p_session_id) THEN
    RAISE EXCEPTION 'Keine Berechtigung.';
  END IF;

  SELECT c.id INTO v_id
  FROM public.session_battlemap_containers c
  WHERE c.session_id = p_session_id
    AND c.battlemap_id = p_battlemap_id
    AND c.is_hidden = true
    AND c.is_discovered = false
    AND GREATEST(ABS(c.grid_x - p_grid_x), ABS(c.grid_y - p_grid_y)) = 1
    AND p_passive_perception >= c.detection_dc
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.session_battlemap_containers
  SET is_discovered = true,
      updated_at = now()
  WHERE id = v_id
    AND is_discovered = false;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.discover_hidden_battlemap_container_near(uuid, uuid, integer, integer, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discover_hidden_battlemap_container_near(uuid, uuid, integer, integer, integer)
  TO authenticated;
