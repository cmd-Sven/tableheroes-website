-- Echter Name / Ansprache am Tisch (unabhängig vom Plattform-Profilnamen).
-- Für Chronist-Audio: Whisper-Transkript → Charakter zuordnen (z. B. Sonja → Sajeri).

ALTER TABLE public.campaign_members
  ADD COLUMN IF NOT EXISTS player_table_name text;

COMMENT ON COLUMN public.campaign_members.player_table_name IS
  'Vom GM gepflegter realer Name oder übliche Ansprache am Tisch (z. B. Sonja). '
  'Unabhängig von users.username. Wird für Session-Chronist und Recap-Auswertung genutzt.';
