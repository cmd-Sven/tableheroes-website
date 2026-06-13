-- Manuelle Termin-Anpassung: nicht vom Spielplan-Generator überschreiben
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS schedule_customized boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sessions.schedule_customized IS
  'True wenn der GM Datum/Uhrzeit manuell geändert hat — Spielplan-Realign überspringt diese Session.';
