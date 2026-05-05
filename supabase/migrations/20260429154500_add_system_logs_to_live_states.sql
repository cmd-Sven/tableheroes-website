-- Repair migration: ensure live-session system logs exist for the chronicle panel.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS system_logs jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.session_live_states.system_logs IS
  'Chronik-Systemlogs als JSONB-Array, z. B. [{ id, at, text, type, author_name }].';
