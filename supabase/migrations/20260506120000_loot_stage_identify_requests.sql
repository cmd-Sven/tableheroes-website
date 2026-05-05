-- Bühnen-Beute: Identifikations-Anfragen (Spieler → SL) am Container, Realtime-fähig.

ALTER TABLE public.campaign_loot_containers
  ADD COLUMN IF NOT EXISTS identify_requests jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.campaign_loot_containers
  DROP CONSTRAINT IF EXISTS campaign_loot_containers_identify_requests_array_check;

ALTER TABLE public.campaign_loot_containers
  ADD CONSTRAINT campaign_loot_containers_identify_requests_array_check
  CHECK (jsonb_typeof(identify_requests) = 'array');

COMMENT ON COLUMN public.campaign_loot_containers.identify_requests IS
  'Offene Identifikations-Anfragen: [{ id, character_id, character_name, item_id, item_label, created_at }]';

NOTIFY pgrst, 'reload schema';
