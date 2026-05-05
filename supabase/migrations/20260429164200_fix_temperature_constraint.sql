-- Allow realistic and extreme Celsius values for live-session temperature.

ALTER TABLE public.session_live_states
  DROP CONSTRAINT IF EXISTS session_live_states_temperature_value_check;

ALTER TABLE public.session_live_states
  ADD CONSTRAINT session_live_states_temperature_value_check
  CHECK (temperature_value >= -100 AND temperature_value <= 150);
