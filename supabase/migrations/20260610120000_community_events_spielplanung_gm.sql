-- Spielplanungs-Termine vor Kampagnenstart: GM legt an, nicht kampagnengebunden.

ALTER TABLE public.community_events
  DROP CONSTRAINT IF EXISTS community_events_event_kind_check;

ALTER TABLE public.community_events
  ADD CONSTRAINT community_events_event_kind_check
  CHECK (event_kind IN ('Stammtisch', 'Feier', 'Sonstiges', 'Spielplanung'));

CREATE OR REPLACE FUNCTION public.th_is_gm_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.primary_role IN ('GameMaster', 'Admin')
  );
$$;

-- GM: eigene Spielplanungs-Termine anlegen
DROP POLICY IF EXISTS community_events_gm_spielplanung_insert ON public.community_events;
CREATE POLICY community_events_gm_spielplanung_insert ON public.community_events
  FOR INSERT TO authenticated
  WITH CHECK (
    event_kind = 'Spielplanung'
    AND created_by = auth.uid()
    AND public.th_is_gm_user()
  );

DROP POLICY IF EXISTS community_events_gm_spielplanung_update ON public.community_events;
CREATE POLICY community_events_gm_spielplanung_update ON public.community_events
  FOR UPDATE TO authenticated
  USING (
    event_kind = 'Spielplanung'
    AND created_by = auth.uid()
    AND public.th_is_gm_user()
  )
  WITH CHECK (
    event_kind = 'Spielplanung'
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS community_events_gm_spielplanung_delete ON public.community_events;
CREATE POLICY community_events_gm_spielplanung_delete ON public.community_events
  FOR DELETE TO authenticated
  USING (
    event_kind = 'Spielplanung'
    AND created_by = auth.uid()
    AND public.th_is_gm_user()
  );

-- GM: RSVPs zu eigenen Spielplanungs-Terminen einsehen
DROP POLICY IF EXISTS community_event_rsvps_gm_spielplanung_select ON public.community_event_rsvps;
CREATE POLICY community_event_rsvps_gm_spielplanung_select ON public.community_event_rsvps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_events ce
      WHERE ce.id = community_event_rsvps.event_id
        AND ce.event_kind = 'Spielplanung'
        AND ce.created_by = auth.uid()
        AND public.th_is_gm_user()
    )
  );

COMMENT ON COLUMN public.community_events.event_kind IS
  'Stammtisch/Feier/Sonstiges (Admin), Spielplanung (GM vor Kampagnenstart).';
