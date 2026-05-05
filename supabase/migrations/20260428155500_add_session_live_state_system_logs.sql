-- Prepared structure for automatic live-session system logs.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS system_logs jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.session_live_states.system_logs IS
  'Chronik-Systemlogs als JSON-Array, z. B. [{ id, at, text, type }].';
