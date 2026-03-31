-- Strukturiertes Wetter (Vorlage + Stufe + Temperatur) für Live-Session
ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS weather_preset text,
  ADD COLUMN IF NOT EXISTS weather_intensity smallint,
  ADD COLUMN IF NOT EXISTS weather_temperature text;

COMMENT ON COLUMN public.session_live_states.weather_preset IS 'z. B. rain, snow, sunny — siehe App session-weather.ts';
COMMENT ON COLUMN public.session_live_states.weather_intensity IS '1 leicht, 2 schwer, 3 extrem';
COMMENT ON COLUMN public.session_live_states.weather_temperature IS 'Freitext, z. B. Eisig −12 °C';
