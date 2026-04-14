-- Öffentliche Terminkarte (Start-Landingpage): Sichtbarkeit und Anzeigeoptionen pro Session

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS visible_on_public_landing boolean NOT NULL DEFAULT true;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS show_open_slots_on_landing boolean NOT NULL DEFAULT true;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS show_session_title_on_landing boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.sessions.visible_on_public_landing IS
  'false = Termin erscheint nicht auf der Marketing-Start-Landingpage (nur Kampagne/Login-Bereich).';

COMMENT ON COLUMN public.sessions.show_open_slots_on_landing IS
  'false = keine Anzeige belegter/freier Plätze auf der öffentlichen Terminkarte.';

COMMENT ON COLUMN public.sessions.show_session_title_on_landing IS
  'false = kein Session-Titel auf der öffentlichen Terminkarte trotz gesetztem Titel.';
