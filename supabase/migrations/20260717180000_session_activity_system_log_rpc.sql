-- Atomare Session-Chat/Würfel-Logs: Spieler dürfen system_logs schreiben,
-- obwohl session_live_states UPDATE sonst nur GM/Owner/Scribe erlaubt (RLS).

CREATE OR REPLACE FUNCTION public.th_session_participant_ok(p_session_id uuid, p_user_id uuid)
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
      AND (c.gm_id = p_user_id OR c.owner_id = p_user_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.campaign_members m ON m.campaign_id = s.campaign_id
    WHERE s.id = p_session_id
      AND m.user_id = p_user_id
      AND m.status::text IN ('Approved', 'Active', 'Drafting', 'Changes_Proposed')
  );
$$;

CREATE OR REPLACE FUNCTION public.th_session_gm_ok(p_session_id uuid, p_user_id uuid)
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
      AND (c.gm_id = p_user_id OR c.owner_id = p_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.append_session_system_log(
  p_session_id uuid,
  p_entry jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_combined jsonb;
  v_trimmed jsonb;
  v_len integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;
  IF p_entry IS NULL OR jsonb_typeof(p_entry) <> 'object' THEN
    RAISE EXCEPTION 'Ungültiger Log-Eintrag.';
  END IF;
  IF COALESCE(btrim(p_entry->>'text'), '') = '' THEN
    RAISE EXCEPTION 'Leerer Log-Text.';
  END IF;
  IF NOT public.th_session_participant_ok(p_session_id, v_user_id) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diese Session.';
  END IF;

  UPDATE public.session_live_states ls
  SET system_logs = COALESCE(ls.system_logs, '[]'::jsonb) || jsonb_build_array(p_entry)
  WHERE ls.session_id = p_session_id
  RETURNING ls.system_logs INTO v_combined;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Live-State nicht gefunden.';
  END IF;

  v_len := jsonb_array_length(v_combined);
  IF v_len > 120 THEN
    SELECT COALESCE(jsonb_agg(t.elem ORDER BY t.ord), '[]'::jsonb)
    INTO v_trimmed
    FROM (
      SELECT elem, ord
      FROM jsonb_array_elements(v_combined) WITH ORDINALITY AS x(elem, ord)
      WHERE ord > (v_len - 120)
    ) t;

    UPDATE public.session_live_states
    SET system_logs = v_trimmed
    WHERE session_id = p_session_id;
  END IF;

  RETURN p_entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_session_system_logs(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;
  IF NOT public.th_session_gm_ok(p_session_id, v_user_id) THEN
    RAISE EXCEPTION 'Nur der Spielleiter kann den Chat leeren.';
  END IF;

  UPDATE public.session_live_states
  SET system_logs = '[]'::jsonb
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Live-State nicht gefunden.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_session_system_log(
  p_session_id uuid,
  p_entry_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_next jsonb;
  v_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;
  IF COALESCE(btrim(p_entry_id), '') = '' THEN
    RAISE EXCEPTION 'Ungültige Eintrags-ID.';
  END IF;
  IF NOT public.th_session_gm_ok(p_session_id, v_user_id) THEN
    RAISE EXCEPTION 'Nur der Spielleiter kann Nachrichten löschen.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.session_live_states ls WHERE ls.session_id = p_session_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Live-State nicht gefunden.';
  END IF;

  SELECT COALESCE(
    (
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM public.session_live_states ls
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ls.system_logs, '[]'::jsonb))
        WITH ORDINALITY AS t(elem, ord)
      WHERE ls.session_id = p_session_id
        AND elem->>'id' IS DISTINCT FROM p_entry_id
    ),
    '[]'::jsonb
  )
  INTO v_next;

  UPDATE public.session_live_states
  SET system_logs = v_next
  WHERE session_id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.th_session_participant_ok(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.th_session_gm_ok(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.append_session_system_log(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_session_system_logs(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_session_system_log(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.th_session_participant_ok(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.th_session_gm_ok(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_session_system_log(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_session_system_logs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_session_system_log(uuid, text) TO authenticated;
