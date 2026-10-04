-- Stadtfraktionen von Aurenfurt als echte Welt-Fraktionen.
-- aurenfurt_catalog_id verbindet den Lore-Eintrag mit der Karte.

alter table public.factions
  add column if not exists aurenfurt_catalog_id text;

create unique index if not exists factions_aurenfurt_catalog_id_uidx
  on public.factions (aurenfurt_catalog_id);

comment on column public.factions.aurenfurt_catalog_id is
  'Katalog-ID der Aurenfurt-Stadtsimulation. Verbindet den Fraktionseintrag mit der Karte.';

insert into public.factions (
  id,
  world_id,
  name,
  type,
  current_status,
  description,
  alignment,
  goals,
  appearance,
  philosophy,
  structure,
  gm_notes,
  hq_location_id,
  location_id,
  is_revealed,
  image_is_ai_generated,
  banner_is_ai_generated,
  aurenfurt_catalog_id
)
select
  md5('aurenfurt-faction:' || seed.catalog_id)::uuid,
  '689a0f11-7aa3-440b-9527-c6da0a84aebb'::uuid,
  seed.name,
  seed.type,
  seed.current_status,
  seed.description,
  seed.alignment,
  seed.goals,
  seed.appearance,
  seed.philosophy,
  seed.structure,
  'Dieser Eintrag ist mit der Stadtsimulation verbunden. Macht, Legalität und Wirtschaft folgen dem Stadttag.',
  seed.hq::uuid,
  seed.hq::uuid,
  false,
  false,
  false,
  seed.catalog_id
from (
  values
    ('rotes-auge', 'Das rote Auge', 'Kult', 'Feindlich', 'Untergrundschurken und Malanthir-Schmuggler in den roten Gassen.', 'Malanthir', 'Schmuggel, Zellen und Einfluss in der Unterstadt halten.', 'Rotes Zeichen in den Gassen, selten offen getragen.', 'Malanthir ist Ware und Waffe.', 'Präsenz: Unterstadt. Hauptsitz: Malanthir-Umschlagplatz.', 'ba3e351d-1844-c3f3-4635-71084c04dd07'),
    ('goldkelchen', 'Die Aurenfurter Goldkelchen', 'Gilde', 'Neutral', 'Barden und Gaukler. Heimliche Informanten für das Haus der Seide.', 'Neutral', 'Lieder, Märkte und Nachrichten zwischen den Vierteln tragen.', 'Goldene Kelche auf Wämsern und Instrumententaschen.', 'Die Bühne hört mehr, als sie singt.', 'Präsenz: Unterstadt, Handwerkerviertel, Adelsviertel. Hauptsitz: Gauklerbühne.', '25639ea7-b4f6-b51a-405b-6b0898ea2855'),
    ('haus-der-seide', 'Das Haus der Seide', 'Gilde', 'Neutral', 'Reiche Handelsleute am Markt. Hohe Standgebühren, Netz in die Adelshäuser.', 'Neutral', 'Handel, Standgelder und Schulden der Häuser mehren.', 'Seidene Banner an Kontor und Marktständen.', 'Was einen Preis hat, hat einen Herrn.', 'Präsenz: Handwerkerviertel, Adelsviertel. Hauptsitz: Kontor des Hauses der Seide.', '8a3313b7-d534-eff2-5bab-3160957aa436'),
    ('stadtwachen', 'Aurenfurter Stadtwachen', 'Militär', 'Neutral', 'Lokale Exekutive unter den kaiserlichen Gardisten. Neigt zu Willkür.', 'Kaiserlich', 'Straßen, Tore und den Hof ruhig halten.', 'Löwenemblem auf Harnisch und Wachstube.', 'Ordnung ist Härte, und Härte hat einen Preis.', 'Präsenz: Palast, Adelsviertel, Südtor, Unterstadt, Akademieviertel. Hauptsitz: Hofwache.', '42cb474f-a3e3-e199-5c42-0143e962fd2f'),
    ('haeuser-des-nordens', 'Häuser des Nordens', 'Politik', 'Neutral', 'Blaue Salons und Wappen. Hofnähe, Gärten und Druck auf Markt und Garde.', 'Kaiserlich', 'Hof, Vattrak-Vorrang und die Garde in der Hand behalten.', 'Kobalt und Wappen der Nordhäuser.', 'Wer den Hof spricht, spricht die Stadt.', 'Präsenz: Adelsviertel, Palast. Hauptsitz: Festungspalast.', '98fd35d1-f789-4c91-afef-0215ed4b21e7'),
    ('bund-silberne-rose', 'Bund der Silbernen Rose', 'Religion', 'Neutral', 'Elysia-Anhänger. Hoffnung und offene Höfe gegen gezähltes Schicksal.', 'Elysia', 'Offene Höfe, Heilung und Widerstand gegen das Konklave.', 'Silberne Rose an Stola und Kapellentür.', 'Schicksal wird nicht gezählt, es wird geteilt.', 'Präsenz: Tempelbezirk, Palast. Hauptsitz: Hof der Silbernen Rose.', 'c84447ac-3d10-1f0a-c24a-1798f66199a5'),
    ('konklave-ewige-ordnung', 'Konklave der Ewigen Ordnung', 'Religion', 'Neutral', 'Chromus-Liturgie. Gezähltes Schicksal, strenge Höfe, Druck auf den Palast.', 'Chromus', 'Liturgie, Ordnung und den Anspruch auf den Hof sichern.', 'Goldene Liturgie, strenge Gewänder.', 'Was gezählt ist, ist entschieden.', 'Präsenz: Tempelbezirk, Palast. Hauptsitz: Saal der Ewigen Ordnung.', 'd5de33d0-0b03-60ae-31f1-5da93a47647b'),
    ('zunftbund', 'Zunftbund Aurenfurt', 'Gilde', 'Neutral', 'Essen und Kontore. Verträge wiegen mehr als Wappen.', 'Zünftig', 'Werkstätten, Verträge und den Zunftkeller halten.', 'Zunftzeichen über Tür und Esse.', 'Eine Esse ohne Vertrag ist nur Lärm.', 'Präsenz: Handwerkerviertel. Hauptsitz: Zunfthaus.', '5f84b4d0-e120-4c32-b4a7-492398bded19'),
    ('zirkel-observatorium', 'Zirkel des Observatoriums', 'Orden', 'Neutral', 'Magier und Archivare der Akademie. Legale weiße Magie, Sternenkammer und Lehrstuhl.', 'Neutral', 'Vattrak lehren und die Sternenkammer hüten.', 'Kuppel, Linse und Akademiesiegel.', 'Was der Himmel zeigt, bleibt im Archiv.', 'Präsenz: Akademieviertel. Hauptsitz: Das magische Observatorium.', 'e0d7fe0a-4805-4abf-8b0c-fa3f3101b9d6')
) as seed(catalog_id, name, type, current_status, description, alignment, goals, appearance, philosophy, structure, hq)
on conflict (aurenfurt_catalog_id) do update set
  name = excluded.name,
  type = excluded.type,
  description = excluded.description,
  alignment = excluded.alignment,
  goals = excluded.goals,
  appearance = excluded.appearance,
  philosophy = excluded.philosophy,
  structure = excluded.structure,
  hq_location_id = excluded.hq_location_id,
  location_id = excluded.location_id,
  gm_notes = excluded.gm_notes;

update public.npcs as npc
set faction_id = faction.id
from public.factions as faction
where npc.world_id = faction.world_id
  and npc.world_id = '689a0f11-7aa3-440b-9527-c6da0a84aebb'::uuid
  and npc.for_city_simulation = true
  and npc.city_faction_id = faction.aurenfurt_catalog_id
  and npc.faction_id is null;
