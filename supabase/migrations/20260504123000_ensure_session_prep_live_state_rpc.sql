-- Live-State für SL-Vorbereitung: INSERT unter RLS kann an verschachtelten policies scheitern
-- (z. B. sessions-SELECT in WITH CHECK). SECURITY DEFINER + explizite GM/Owner-Prüfung.

CREATE OR REPLACE FUNCTION public.ensure_session_prep_live_state(p_session_id uuid)
RETURNS SETOF public.session_live_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_campaign_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT s.campaign_id
  INTO v_campaign_id
  FROM public.sessions s
  WHERE s.id = p_session_id;

  IF v_campaign_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = v_campaign_id
      AND (c.gm_id = v_uid OR c.owner_id = v_uid)
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.session_live_states l WHERE l.session_id = p_session_id) THEN
    RETURN QUERY
    SELECT *
    FROM public.session_live_states l
    WHERE l.session_id = p_session_id;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.session_live_states (
      session_id,
      weather,
      temperature,
      temperature_value,
      "current_time",
      current_location,
      journal_text,
      system_logs,
      visible_npc_ids,
      visible_faction_ids,
      is_background_manual_override,
      is_combat_mode,
      current_turn_index,
      scribe_id
    ) VALUES (
      p_session_id,
      'Klar',
      'normal',
      15,
      'Tagsüber',
      NULL,
      NULL,
      '[]'::jsonb,
      '{}'::uuid[],
      '{}'::uuid[],
      false,
      false,
      0,
      v_uid
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  RETURN QUERY
  SELECT *
  FROM public.session_live_states l
  WHERE l.session_id = p_session_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_session_prep_live_state(uuid) IS
  'Legt session_live_states für SL/Vorbereitung an (RLS-robust). Liefert die Zeile oder kein Ergebnis.';

REVOKE ALL ON FUNCTION public.ensure_session_prep_live_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_session_prep_live_state(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
