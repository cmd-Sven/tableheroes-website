-- Consecutive short-sleep nights for city/leisure FAP exhaustion tracking

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS consecutive_short_sleep_days integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.characters.consecutive_short_sleep_days IS
  'Stadt-FAP: aufeinanderfolgende Naechte mit nur 2 FAP Schlaf (2. und weitere: +1 Erschoepfung).';
