-- Aurenfurt-Stadtsimulation als Parallel-Einstieg in Live Sessions
-- Prep: Session markiert „Stadt relevant für den Abend“
-- Live: GM schiebt alle Spieler auf die 3D-Stadtkarte (wie Weltkarten-Force-View)

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS aurenfurt_city_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sessions.aurenfurt_city_enabled IS
  'Bühnenvorbereitung: Aurenfurt-Stadtsimulation ist für diese Session relevant (Kartenwechsel in Live).';

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS active_aurenfurt_city boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.session_live_states.active_aurenfurt_city IS
  'Live Force-View: Alle Teilnehmer sehen die Aurenfurt-3D-Stadtkarte.';
