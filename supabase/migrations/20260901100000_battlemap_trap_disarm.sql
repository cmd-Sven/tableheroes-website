-- Fallen entschärfen: Status + Komponenten bleiben in ai_payload JSON.

ALTER TABLE public.session_battlemap_traps
  ADD COLUMN IF NOT EXISTS is_disarmed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.session_battlemap_traps.is_disarmed IS
  'Falle wurde erfolgreich entschärft; Komponenten können extrahiert werden.';
