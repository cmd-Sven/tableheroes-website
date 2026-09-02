-- Trefferpunkte für Battlemap-Behälter (SL trackt Schaden bei gewaltsamem Öffnen).

ALTER TABLE public.session_battlemap_containers
  ADD COLUMN IF NOT EXISTS hp_current integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS hp_max integer NOT NULL DEFAULT 20;

ALTER TABLE public.session_battlemap_containers
  DROP CONSTRAINT IF EXISTS session_battlemap_containers_hp_max_check;
ALTER TABLE public.session_battlemap_containers
  ADD CONSTRAINT session_battlemap_containers_hp_max_check
  CHECK (hp_max >= 1 AND hp_max <= 9999);

ALTER TABLE public.session_battlemap_containers
  DROP CONSTRAINT IF EXISTS session_battlemap_containers_hp_current_check;
ALTER TABLE public.session_battlemap_containers
  ADD CONSTRAINT session_battlemap_containers_hp_current_check
  CHECK (hp_current >= 0 AND hp_current <= 9999);

COMMENT ON COLUMN public.session_battlemap_containers.hp_current IS
  'Aktuelle Trefferpunkte des Behälters (SL-Tracking bei gewaltsamem Öffnen).';
COMMENT ON COLUMN public.session_battlemap_containers.hp_max IS
  'Maximale Trefferpunkte des Behälters.';
