-- Spieler-Dashboard: Tutor-Karte kann ausgeblendet und in den Einstellungen wieder aktiviert werden
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS player_dashboard_tutorial_dismissed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.player_dashboard_tutorial_dismissed IS 'true = Tutor-Hilfe auf dem Spieler-Dashboard ausgeblendet';
