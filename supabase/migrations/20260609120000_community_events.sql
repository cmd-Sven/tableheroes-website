-- Community-Termine (Stammtisch, Vereinsfeier …) — unabhängig von Kampagnen.
-- RSVP nur mit Spielerprofil (approved), kein Charakter nötig.

CREATE TABLE IF NOT EXISTS public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_kind text NOT NULL DEFAULT 'Sonstiges'
    CHECK (event_kind IN ('Stammtisch', 'Feier', 'Sonstiges')),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text,
  status text NOT NULL DEFAULT 'Scheduled'
    CHECK (status IN ('Scheduled', 'Cancelled', 'Completed')),
  rsvp_deadline_days smallint DEFAULT 2
    CHECK (rsvp_deadline_days IS NULL OR rsvp_deadline_days IN (1, 2, 3)),
  is_live boolean NOT NULL DEFAULT true,
  visible_on_landing boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_events_start_time
  ON public.community_events (start_time);

CREATE TABLE IF NOT EXISTS public.community_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsvp_status text NOT NULL CHECK (rsvp_status IN ('Zusage', 'Absage', 'Via Online')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_event_rsvps_event
  ON public.community_event_rsvps (event_id);

CREATE OR REPLACE FUNCTION public.th_is_approved_user()
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
      AND COALESCE(u.status, 'approved') = 'approved'
  );
$$;

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Events lesen: Admins alles; Mitglieder geplante; Landing öffentlich sichtbar
DROP POLICY IF EXISTS community_events_select ON public.community_events;
CREATE POLICY community_events_select ON public.community_events
  FOR SELECT TO authenticated
  USING (
    public.th_is_admin_user()
    OR status IN ('Scheduled', 'Completed', 'Cancelled')
  );

DROP POLICY IF EXISTS community_events_select_anon ON public.community_events;
CREATE POLICY community_events_select_anon ON public.community_events
  FOR SELECT TO anon
  USING (
    visible_on_landing = true
    AND status = 'Scheduled'
    AND start_time >= now() - interval '1 day'
  );

DROP POLICY IF EXISTS community_events_admin_write ON public.community_events;
CREATE POLICY community_events_admin_write ON public.community_events
  FOR ALL TO authenticated
  USING (public.th_is_admin_user())
  WITH CHECK (public.th_is_admin_user());

-- RSVPs
DROP POLICY IF EXISTS community_event_rsvps_select ON public.community_event_rsvps;
CREATE POLICY community_event_rsvps_select ON public.community_event_rsvps
  FOR SELECT TO authenticated
  USING (
    public.th_is_admin_user()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS community_event_rsvps_insert ON public.community_event_rsvps;
CREATE POLICY community_event_rsvps_insert ON public.community_event_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.th_is_approved_user()
  );

DROP POLICY IF EXISTS community_event_rsvps_update ON public.community_event_rsvps;
CREATE POLICY community_event_rsvps_update ON public.community_event_rsvps
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.th_is_approved_user())
  WITH CHECK (user_id = auth.uid() AND public.th_is_approved_user());

DROP POLICY IF EXISTS community_event_rsvps_admin ON public.community_event_rsvps;
CREATE POLICY community_event_rsvps_admin ON public.community_event_rsvps
  FOR ALL TO authenticated
  USING (public.th_is_admin_user())
  WITH CHECK (public.th_is_admin_user());

COMMENT ON TABLE public.community_events IS
  'Vereins-/Community-Termine ohne Kampagne (Stammtisch, Jubiläum …).';

COMMENT ON TABLE public.community_event_rsvps IS
  'Teilnahme-Rückmeldungen zu Community-Terminen — nur Spielerprofil nötig.';
