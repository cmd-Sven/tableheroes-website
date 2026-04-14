-- GM kann auf der öffentlichen Landingpage statt belegter Plätze
-- „Gruppe komplett - keine Anmeldung mehr möglich“ anzeigen (unabhängig von max_players / Accepted-Count).

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS registration_closed_on_landing boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sessions.registration_closed_on_landing IS
  'Wenn true: Landingpage-Terminkarte zeigt geschlossene Gruppe statt x/y Plätze.';
