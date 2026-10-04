-- Goldene Kuppel und Lady Isolde von Nordwacht entfallen.
-- Der Festungspalast mit Kaiser Artheus bleibt der Sitz im Palastviertel.

delete from npcs
where aurenfurt_catalog_id = 'npc-leader-haeuser-des-nordens'
   or home_location_id in (
     select id from locations
     where map_building_id = 'goldkuppel'
        or (name = 'Goldene Kuppel' and parent_location_id = 'c1afce7e-5c4b-4fef-8654-818ef0534993')
   )
   or current_location_id in (
     select id from locations
     where map_building_id = 'goldkuppel'
        or (name = 'Goldene Kuppel' and parent_location_id = 'c1afce7e-5c4b-4fef-8654-818ef0534993')
   );

delete from world_lore
where id in (
  select id from locations
  where map_building_id = 'goldkuppel'
     or (name = 'Goldene Kuppel' and parent_location_id = 'c1afce7e-5c4b-4fef-8654-818ef0534993')
);

delete from locations
where map_building_id = 'goldkuppel'
   or (name = 'Goldene Kuppel' and parent_location_id = 'c1afce7e-5c4b-4fef-8654-818ef0534993');
