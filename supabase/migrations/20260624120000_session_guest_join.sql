-- Gäste-Zugang zur Live-Session (ohne Table-Heroes-Registrierung) per Join-Link.
-- Voraussetzung: Gäste nutzen signierte Cookies + API; registrierte Spieler weiterhin per Auth.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS guest_join_token text;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_guest_join_token_unique
  ON public.sessions (guest_join_token)
  WHERE guest_join_token IS NOT NULL;

COMMENT ON COLUMN public.sessions.guest_join_token IS
  'Geheimer Token für Gäste-Join-Link (/session/join/{token}). Wird beim Session-Start gesetzt.';

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS guest_slots jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.session_live_states.guest_slots IS
  'Gast-Platzhalter: [{ "slot": 1, "name": "…", "guest_id": "uuid" }, …] — synchron für alle Clients.';

CREATE TABLE IF NOT EXISTS public.session_guest_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  slot_index smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_guest_participants_slot_check CHECK (slot_index >= 1 AND slot_index <= 3),
  CONSTRAINT session_guest_participants_name_len CHECK (char_length(trim(display_name)) BETWEEN 1 AND 40)
);

CREATE UNIQUE INDEX IF NOT EXISTS session_guest_participants_session_slot_unique
  ON public.session_guest_participants (session_id, slot_index);

CREATE INDEX IF NOT EXISTS session_guest_participants_session_id_idx
  ON public.session_guest_participants (session_id);

COMMENT ON TABLE public.session_guest_participants IS
  'Nicht-registrierte Gäste an der Live-Session (Dummy-Plätze mit frei wählbarem Namen).';

ALTER TABLE public.session_guest_participants ENABLE ROW LEVEL SECURITY;

-- GM darf Gäste sehen
CREATE POLICY session_guest_participants_gm_select
  ON public.session_guest_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_guest_participants.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

-- Kampagnen-Mitglieder dürfen Gäste sehen (für Anzeige am Tisch)
CREATE POLICY session_guest_participants_member_select
  ON public.session_guest_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaign_members cm ON cm.campaign_id = s.campaign_id
      WHERE s.id = session_guest_participants.session_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed')
    )
  );

CREATE OR REPLACE FUNCTION public.generate_session_guest_join_token()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(gen_random_bytes(24), 'hex');
$$;

-- Gast tritt per Join-Token bei (serverseitig via Service Role / SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.join_session_as_guest(
  p_join_token text,
  p_display_name text,
  p_guest_id uuid DEFAULT gen_random_uuid()
)
RETURNS TABLE (
  guest_id uuid,
  session_id uuid,
  slot_index smallint,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_status text;
  v_dummy_count smallint;
  v_guest_slots jsonb;
  v_slot smallint;
  v_name text;
  v_new_slots jsonb;
  v_new_dummy smallint;
BEGIN
  v_name := trim(p_display_name);
  IF char_length(v_name) < 1 OR char_length(v_name) > 40 THEN
    RAISE EXCEPTION 'Anzeigename muss zwischen 1 und 40 Zeichen lang sein.';
  END IF;

  SELECT s.id, s.status
  INTO v_session_id, v_status
  FROM public.sessions s
  WHERE s.guest_join_token = trim(p_join_token)
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Ungültiger oder abgelaufener Einladungslink.';
  END IF;

  IF v_status IS DISTINCT FROM 'Live' THEN
    RAISE EXCEPTION 'Die Session ist gerade nicht live.';
  END IF;

  -- Bereits beigetreten (gleiche guest_id — Re-Join nach Cookie)
  IF EXISTS (
    SELECT 1 FROM public.session_guest_participants g
    WHERE g.session_id = v_session_id AND g.id = p_guest_id
  ) THEN
    UPDATE public.session_guest_participants
    SET last_seen_at = now(), display_name = v_name
    WHERE id = p_guest_id;

    RETURN QUERY
    SELECT g.id, g.session_id, g.slot_index, g.display_name
    FROM public.session_guest_participants g
    WHERE g.id = p_guest_id;
    RETURN;
  END IF;

  SELECT COALESCE(l.dummy_player_count, 0), COALESCE(l.guest_slots, '[]'::jsonb)
  INTO v_dummy_count, v_guest_slots
  FROM public.session_live_states l
  WHERE l.session_id = v_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Live-Zustand der Session fehlt.';
  END IF;

  -- Freien Slot suchen (1..max(dummy_count, belegte+1), max 3)
  v_slot := NULL;
  FOR i IN 1..LEAST(3, GREATEST(v_dummy_count, jsonb_array_length(v_guest_slots) + 1)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_guest_slots) elem
      WHERE (elem->>'slot')::int = i
    ) AND NOT EXISTS (
      SELECT 1 FROM public.session_guest_participants g
      WHERE g.session_id = v_session_id AND g.slot_index = i
    ) THEN
      v_slot := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'Alle Gast-Plätze sind belegt (max. 3). Bitte den Spielleiter informieren.';
  END IF;

  INSERT INTO public.session_guest_participants (id, session_id, display_name, slot_index)
  VALUES (p_guest_id, v_session_id, v_name, v_slot);

  v_new_slots := v_guest_slots || jsonb_build_array(
    jsonb_build_object('slot', v_slot, 'name', v_name, 'guest_id', p_guest_id::text)
  );

  v_new_dummy := GREATEST(v_dummy_count, v_slot);

  UPDATE public.session_live_states
  SET
    guest_slots = v_new_slots,
    dummy_player_count = v_new_dummy,
    updated_at = now()
  WHERE session_id = v_session_id;

  RETURN QUERY
  SELECT p_guest_id, v_session_id, v_slot, v_name;
END;
$$;

REVOKE ALL ON FUNCTION public.join_session_as_guest(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_session_as_guest(text, text, uuid) TO service_role;

COMMENT ON FUNCTION public.join_session_as_guest(text, text, uuid) IS
  'Gast-Beitritt per Join-Token; belegt Dummy-Slot und synchronisiert guest_slots am Live-State.';

NOTIFY pgrst, 'reload schema';
