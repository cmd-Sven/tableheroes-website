-- Numeric live-session temperature for the animated thermometer display.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS temperature_value integer NOT NULL DEFAULT 15;

ALTER TABLE public.session_live_states
  DROP CONSTRAINT IF EXISTS session_live_states_temperature_value_check;

ALTER TABLE public.session_live_states
  ADD CONSTRAINT session_live_states_temperature_value_check
  CHECK (temperature_value BETWEEN -40 AND 55);

COMMENT ON COLUMN public.session_live_states.temperature_value IS
  'Numerischer Temperaturwert fuer die Live-Session-Thermometeranzeige in Grad Celsius: -40 bis 55, Mitte 15.';
