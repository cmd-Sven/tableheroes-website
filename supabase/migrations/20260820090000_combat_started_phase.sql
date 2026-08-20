-- Combat-Flow: Setup (Initiative würfeln) vs. aktiver Kampf.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS combat_started boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.session_live_states.combat_started IS
  'true = Runden laufen; false bei is_combat_mode = Setup (Initiative würfeln).';

-- Bestehende Kämpfe (bereits im Combat-Modus) als gestartet behandeln
UPDATE public.session_live_states
SET combat_started = true
WHERE is_combat_mode = true AND combat_started = false;
