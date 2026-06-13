-- NSC-Portraits: KI-Kennzeichnung und Bestätigung von Upload-Rechten
ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS image_is_ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_upload_rights_confirmed boolean NULL;

COMMENT ON COLUMN public.npcs.image_is_ai_generated IS
  'True wenn das Portrait per KI (z. B. gpt-image) erzeugt wurde.';
COMMENT ON COLUMN public.npcs.image_upload_rights_confirmed IS
  'True wenn der GM beim Upload bestätigt hat, Nutzungsrechte am Bild zu besitzen.';
