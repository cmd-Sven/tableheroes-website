-- Zusätzliche Termin-Typen: Event (z. B. Stammtisch) und Planning (Spielplanung)
-- Anmeldung nur mit Spielerprofil, kein Charakter nötig.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
    ALTER TYPE public.session_type ADD VALUE IF NOT EXISTS 'Event';
    ALTER TYPE public.session_type ADD VALUE IF NOT EXISTS 'Planning';
  END IF;
END $$;

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_type_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_type_check
  CHECK (
    type IS NULL
    OR type IN ('GameSession', 'Recruitment', 'Event', 'Planning')
  );

COMMENT ON COLUMN public.sessions.type IS
  'GameSession = Spielabend; Event = Stammtisch o.ä.; Planning = Spielplanung; Recruitment = Bewerbungstermin. Event/Planning: RSVP ohne Charakter.';
