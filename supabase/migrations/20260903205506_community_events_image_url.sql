-- Cover-/Beitragsbild für Community-Termine (Startseite & Formulare).

ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.community_events.image_url IS
  'Optionales Termin-/Beitragsbild (URL) für Startseiten-Karten und Listen.';
