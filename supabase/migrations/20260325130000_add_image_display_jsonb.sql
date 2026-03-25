-- Darstellung von URL-Bildern: Ausschnitt (Cover), ganzes Bild (Contain), Hintergrundfarbe bei Letterboxing
ALTER TABLE public.world_lore
ADD COLUMN IF NOT EXISTS image_display jsonb DEFAULT NULL;

COMMENT ON COLUMN public.world_lore.image_display IS
  '{ "fit": "cover"|"contain", "posX": 0-100, "posY": 0-100, "letterboxColor": "#hex" }';

ALTER TABLE public.npcs
ADD COLUMN IF NOT EXISTS image_display jsonb DEFAULT NULL;

COMMENT ON COLUMN public.npcs.image_display IS
  'Optional: Bilddarstellung für image_url (wie world_lore.image_display).';

ALTER TABLE public.factions
ADD COLUMN IF NOT EXISTS image_display jsonb DEFAULT NULL;

COMMENT ON COLUMN public.factions.image_display IS
  'Optional: Bilddarstellung für image_url (wie world_lore.image_display).';
