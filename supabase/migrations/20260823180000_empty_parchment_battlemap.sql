-- Unique system empty parchment battlemap per session (idempotent ensure).

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_battlemaps_empty_parchment_once
  ON public.session_battlemaps (session_id)
  WHERE image_storage_path = 'system:empty-parchment';

COMMENT ON INDEX public.idx_session_battlemaps_empty_parchment_once IS
  'At most one default empty parchment battlemap (system:empty-parchment) per session.';
