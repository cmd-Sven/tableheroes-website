-- 10-foot UI temperature state for the live-session picture frame.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'normal';

ALTER TABLE public.session_live_states
  DROP CONSTRAINT IF EXISTS session_live_states_temperature_check;

ALTER TABLE public.session_live_states
  ADD CONSTRAINT session_live_states_temperature_check
  CHECK (temperature IN ('cold', 'normal', 'hot'));

COMMENT ON COLUMN public.session_live_states.temperature IS
  'Plakative Temperaturstimmung fuer die Live-Session: cold | normal | hot.';
