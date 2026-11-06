-- Goldene Tempelkuppel → Goldene Kapelle (Lore, Location, Betreiber-NPC)

update public.locations
set
  name = 'Goldene Kapelle',
  description = replace(
    replace(coalesce(description, ''), 'Ostkuppel', 'Ostkapelle'),
    'Goldene Tempelkuppel',
    'Goldene Kapelle'
  )
where id = 'd21ad8e8-8b64-443b-92ba-f5285adb665e'
   or name = 'Goldene Tempelkuppel';

update public.world_lore
set
  name = 'Goldene Kapelle',
  description = replace(
    replace(coalesce(description, ''), 'Ostkuppel', 'Ostkapelle'),
    'Goldene Tempelkuppel',
    'Goldene Kapelle'
  )
where id = 'd21ad8e8-8b64-443b-92ba-f5285adb665e'
   or name = 'Goldene Tempelkuppel';

update public.npcs
set
  role = 'Betreiberin der Goldenen Kapelle',
  title = 'Hüterin der Goldenen Kapelle',
  description = replace(
    replace(coalesce(description, ''), 'Ostkuppel', 'Goldenen Kapelle'),
    'Goldenen Tempelkuppel',
    'Goldenen Kapelle'
  )
where id = '0e8d6afb-4ef4-f1ca-f358-bfe1bc081b09'
   or role ilike '%Goldenen Tempelkuppel%'
   or title ilike '%Ostkuppel%';
