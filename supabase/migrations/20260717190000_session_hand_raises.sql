-- Handheben / Melden in der Live Session (Queue + Urgent für SL)

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS hand_raises jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.session_live_states.hand_raises IS
  'Aktive Meldungen: [{id,userId,characterId?,displayName,urgent,at}] — Reihenfolge nach at.';

CREATE OR REPLACE FUNCTION public.raise_session_hand(
  p_session_id uuid,
  p_urgent boolean DEFAULT false,
  p_display_name text DEFAULT NULL,
  p_character_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text;
  v_existing jsonb;
  v_entry jsonb;
  v_next jsonb;
  v_id text;
  v_at text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;
  IF NOT public.th_session_participant_ok(p_session_id, v_user_id) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diese Session.';
  END IF;

  v_name := NULLIF(btrim(COALESCE(p_display_name, '')), '');
  IF v_name IS NULL THEN
    v_name := 'Spieler';
  END IF;

  SELECT elem
  INTO v_existing
  FROM public.session_live_states ls
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ls.hand_raises, '[]'::jsonb)) AS elem
  WHERE ls.session_id = p_session_id
    AND elem->>'userId' = v_user_id::text
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    v_id := v_existing->>'id';
    v_at := v_existing->>'at';
  ELSE
    v_id := 'hand-' || extract(epoch from clock_timestamp())::bigint::text || '-' || substr(md5(random()::text), 1, 6);
    v_at := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  END IF;

  v_entry := jsonb_build_object(
    'id', v_id,
    'userId', v_user_id::text,
    'characterId', NULLIF(btrim(COALESCE(p_character_id, '')), ''),
    'displayName', v_name,
    'urgent', COALESCE(p_urgent, false) OR COALESCE((v_existing->>'urgent')::boolean, false),
    'at', v_at
  );

  -- Wenn neu urgent: Flag setzen, Timestamp der Erstmeldung behalten
  IF COALESCE(p_urgent, false) AND v_existing IS NOT NULL THEN
    v_entry := jsonb_set(v_entry, '{urgent}', 'true'::jsonb);
  END IF;

  SELECT COALESCE(
    (
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM public.session_live_states ls
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ls.hand_raises, '[]'::jsonb))
        WITH ORDINALITY AS t(elem, ord)
      WHERE ls.session_id = p_session_id
        AND elem->>'userId' IS DISTINCT FROM v_user_id::text
    ),
    '[]'::jsonb
  ) || jsonb_build_array(v_entry)
  INTO v_next;

  UPDATE public.session_live_states
  SET hand_raises = v_next
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Live-State nicht gefunden.';
  END IF;

  RETURN v_entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.lower_session_hand(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_next jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;
  IF NOT public.th_session_participant_ok(p_session_id, v_user_id) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diese Session.';
  END IF;

  SELECT COALESCE(
    (
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM public.session_live_states ls
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ls.hand_raises, '[]'::jsonb))
        WITH ORDINALITY AS t(elem, ord)
      WHERE ls.session_id = p_session_id
        AND elem->>'userId' IS DISTINCT FROM v_user_id::text
    ),
    '[]'::jsonb
  )
  INTO v_next;

  UPDATE public.session_live_states
  SET hand_raises = v_next
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Live-State nicht gefunden.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_session_hand(
  p_session_id uuid,
  p_raise_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_next jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;
  IF COALESCE(btrim(p_raise_id), '') = '' THEN
    RAISE EXCEPTION 'Ungültige Meldungs-ID.';
  END IF;
  IF NOT public.th_session_gm_ok(p_session_id, v_user_id) THEN
    RAISE EXCEPTION 'Nur der Spielleiter kann Meldungen entfernen.';
  END IF;

  SELECT COALESCE(
    (
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM public.session_live_states ls
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ls.hand_raises, '[]'::jsonb))
        WITH ORDINALITY AS t(elem, ord)
      WHERE ls.session_id = p_session_id
        AND elem->>'id' IS DISTINCT FROM p_raise_id
    ),
    '[]'::jsonb
  )
  INTO v_next;

  UPDATE public.session_live_states
  SET hand_raises = v_next
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Live-State nicht gefunden.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.raise_session_hand(uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lower_session_hand(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dismiss_session_hand(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.raise_session_hand(uuid, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lower_session_hand(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_session_hand(uuid, text) TO authenticated;
