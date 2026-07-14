-- ============================================================================
-- Fraktionen: Banner-Zuschnitt & Attribution (symmetrisch zu image_*)
-- banner_url existiert bereits; hier Display + KI/Rechte-Felder ergänzen.
-- ============================================================================

ALTER TABLE public.factions
  ADD COLUMN IF NOT EXISTS banner_display jsonb,
  ADD COLUMN IF NOT EXISTS banner_is_ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_upload_rights_confirmed boolean;

COMMENT ON COLUMN public.factions.banner_url IS
  'Fraktionsbild / Header-Banner (Detailseite, Karten-Hintergrund, Session-Bühne).';
COMMENT ON COLUMN public.factions.banner_display IS
  'Zuschnitt/Fokus für banner_url: { fit, posX, posY, letterboxColor }.';
COMMENT ON COLUMN public.factions.banner_is_ai_generated IS
  'true = Banner per KI erzeugt (Attribution/Pflicht-Hinweis).';
COMMENT ON COLUMN public.factions.banner_upload_rights_confirmed IS
  'GM bestätigt Upload-Rechte am Fraktionsbanner.';
