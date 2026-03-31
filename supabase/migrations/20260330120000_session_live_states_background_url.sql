-- Vollflächiger Session-Hintergrund (LiveSessionBoard / Bühnenvorbereitung)
ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS background_url text;

COMMENT ON COLUMN public.session_live_states.background_url IS 'Hintergrundbild-URL für die Session-Oberfläche.';
