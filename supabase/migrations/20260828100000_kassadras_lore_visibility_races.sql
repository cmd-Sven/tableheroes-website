-- Kassadras: fehlende Rassen-Sichtbarkeit für Charakter-Wizard + Kultur-Verknüpfungen

-- Spieler-Sichtbarkeit für Rassen ohne campaign_visibility (beide Kassadras-Kampagnen)
INSERT INTO public.campaign_visibility (campaign_id, entity_id, entity_type, is_revealed, revealed_at)
SELECT c.id, r.id, 'lore', true, now()
FROM public.campaigns c
CROSS JOIN public.world_lore r
WHERE c.name IN (
  'Kassadras - Zeitalter des Krieges',
  'Kassadras - Zeitalter der Wiedergeburt'
)
AND r.type = 'Rasse'
AND r.id IN (
  '6a490309-30bf-4f25-b607-3798d90871b7', -- Dschungel-Khalkmari
  '47442201-b519-47ac-9827-bdffd7792170', -- Eis-Khalkmari
  'fc2a140a-8c8a-425d-aeba-d0affd7d1ea5', -- Freymannen
  'f9542ce1-17c1-4c0a-86af-188b0ad299b6', -- Südläufer
  'cdcd616c-d2e9-4e8b-b053-d01e3fb7dc28'  -- Westwinder
)
AND NOT EXISTS (
  SELECT 1 FROM public.campaign_visibility cv
  WHERE cv.campaign_id = c.id
    AND cv.entity_id = r.id
    AND cv.entity_type = 'lore'
);

-- Khalkmari Kultur: zugehörige Völker verknüpfen
UPDATE public.world_lore
SET race_ids = ARRAY[
  '47442201-b519-47ac-9827-bdffd7792170'::uuid,
  '6a490309-30bf-4f25-b607-3798d90871b7'::uuid
]
WHERE id = '027cc798-7f6f-43b2-9a13-f7f9f9e92044'
  AND type = 'Kultur';

-- Menschenkultur: zugehörige Völker verknüpfen
UPDATE public.world_lore
SET race_ids = ARRAY[
  'fc2a140a-8c8a-425d-aeba-d0affd7d1ea5'::uuid,
  'f9542ce1-17c1-4c0a-86af-188b0ad299b6'::uuid,
  'cdcd616c-d2e9-4e8b-b053-d01e3fb7dc28'::uuid,
  'a7c2cd4c-14af-4938-a5e8-430598e7edf7'::uuid
]
WHERE id = '3aa3a160-c0d2-437f-ad66-7407914ad3b2'
  AND type = 'Kultur';
