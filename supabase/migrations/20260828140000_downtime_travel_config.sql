-- Reise-Konfiguration (Tempo, Transport, Proviant, Tages-Logs)

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS downtime_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.session_live_states.downtime_config IS
  'Reise/Freizeit: { mode: travel|leisure, pace, transport, provisions, fromLocation, toLocation, distanceKm, dayLogs[] }';
