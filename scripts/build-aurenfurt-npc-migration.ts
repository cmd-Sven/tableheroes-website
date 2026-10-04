import { writeFileSync } from "node:fs";
import { CITY_BUILDINGS } from "../src/components/city/aurenfurt/aurenfurt-districts";
import { buildingCategoryForId } from "../src/components/city/aurenfurt/aurenfurt-building-categories";
import {
  AURENFURT_WORLD_ID,
  LORE_PLACEHOLDER_IMAGE,
  loreIdFromDistrictId,
} from "../src/components/city/aurenfurt/aurenfurt-district-lore-ids";
import { allAurenfurtNpcs, NPC_PORTRAIT_PLACEHOLDER } from "../src/components/city/aurenfurt/aurenfurt-npcs";

const buildings = CITY_BUILDINGS.map((building) => ({
  slug: building.id,
  name: building.name,
  type: buildingCategoryForId(building.id),
  description: building.summary,
  parent_id: loreIdFromDistrictId(building.districtId),
  u: building.u,
  v: building.v,
  district_id: building.districtId,
}));

const npcs = allAurenfurtNpcs().map((npc) => {
  const notes = [npc.gm_notes, npc.darkSecret ? `Geheimnis (Spielleitung): ${npc.darkSecret}` : null]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n\n");
  return {
    catalog_id: npc.id,
    location_slug: npc.locationId,
    name: npc.name,
    title: npc.title,
    role: npc.role,
    race: npc.race,
    alignment: npc.alignment,
    description: npc.description,
    appearance: npc.appearance,
    personality_traits: npc.personality_traits,
    gm_notes: notes || null,
    true_nature: npc.true_nature,
    hidden_agenda: npc.hidden_agenda,
    status: npc.status,
    narrative_hooks: npc.narrative_hooks,
    check_results: npc.check_results,
    for_city_simulation: npc.forCitySimulation === true,
    city_influence_tier: npc.forCitySimulation ? npc.cityInfluenceTier : null,
    city_axis_loyal_criminal: npc.forCitySimulation ? npc.cityAxisLoyalCriminal : null,
    city_axis_greedy_altruist: npc.forCitySimulation ? npc.cityAxisGreedyAltruist : null,
    city_axis_pious_skeptic: npc.forCitySimulation ? npc.cityAxisPiousSkeptic : null,
    city_axis_superstition_reason: npc.forCitySimulation ? npc.cityAxisSuperstitionReason : null,
    city_deity: npc.forCitySimulation ? npc.cityDeity : null,
    city_faction_id: npc.forCitySimulation ? npc.cityFactionId : null,
    city_agenda: npc.forCitySimulation ? npc.cityAgenda : null,
    city_event_deck: npc.forCitySimulation ? npc.cityEventDeck : [],
  };
});

const payload = JSON.stringify({ buildings, npcs }).replaceAll("$aurenfurt$", "$aurenfurt_$");

const sql = `-- Karten-NPCs werden echte Welt-NPCs und hängen an ihrem Gebäude.
-- Stadtsimulations-Attribute nur, wenn for_city_simulation true ist.

alter table public.locations
  add column if not exists map_building_id text;

create unique index if not exists locations_map_building_id_uidx
  on public.locations (map_building_id);

alter table public.npcs
  add column if not exists aurenfurt_catalog_id text;

create unique index if not exists npcs_aurenfurt_catalog_id_uidx
  on public.npcs (aurenfurt_catalog_id);

with seed as (
  select $aurenfurt$${payload}$aurenfurt$::jsonb as doc
),
buildings as (
  select *
  from jsonb_to_recordset((select doc -> 'buildings' from seed)) as b(
    slug text,
    name text,
    type text,
    description text,
    parent_id uuid,
    u double precision,
    v double precision,
    district_id text
  )
),
tagged as (
  update public.locations as loc
  set map_building_id = b.slug
  from buildings b
  where loc.world_id = '${AURENFURT_WORLD_ID}'::uuid
    and loc.parent_location_id = b.parent_id
    and loc.name = b.name
    and (loc.map_building_id is null or loc.map_building_id = b.slug)
  returning loc.id
),
missing as (
  select
    b.*,
    md5('aurenfurt-building:' || b.slug)::uuid as new_id
  from buildings b
  where not exists (
    select 1
    from public.locations loc
    where loc.world_id = '${AURENFURT_WORLD_ID}'::uuid
      and (
        loc.map_building_id = b.slug
        or (loc.parent_location_id = b.parent_id and loc.name = b.name)
      )
  )
),
inserted_lore as (
  insert into public.world_lore (
    id, world_id, name, type, parent_id, description, image_url, is_revealed
  )
  select
    m.new_id,
    '${AURENFURT_WORLD_ID}'::uuid,
    m.name,
    m.type,
    m.parent_id,
    m.description,
    '${LORE_PLACEHOLDER_IMAGE}',
    false
  from missing m
  on conflict (id) do nothing
  returning id
),
inserted_locations as (
  insert into public.locations (
    id,
    world_id,
    name,
    type,
    description,
    image_url,
    parent_location_id,
    map_u,
    map_v,
    map_district_id,
    map_building_id,
    created_via_map_editor
  )
  select
    m.new_id,
    '${AURENFURT_WORLD_ID}'::uuid,
    m.name,
    m.type,
    m.description,
    '${LORE_PLACEHOLDER_IMAGE}',
    m.parent_id,
    m.u,
    m.v,
    m.district_id,
    m.slug,
    false
  from missing m
  on conflict (id) do nothing
  returning id
)
update public.locations as loc
set map_building_id = b.slug
from buildings b
where loc.world_id = '${AURENFURT_WORLD_ID}'::uuid
  and loc.parent_location_id = b.parent_id
  and loc.name = b.name
  and loc.map_building_id is null
  and (select count(*) from tagged) >= 0
  and (select count(*) from inserted_lore) >= 0
  and (select count(*) from inserted_locations) >= 0;

with seed as (
  select $aurenfurt$${payload}$aurenfurt$::jsonb as doc
),
npcs_seed as (
  select *
  from jsonb_to_recordset((select doc -> 'npcs' from seed)) as n(
    catalog_id text,
    location_slug text,
    name text,
    title text,
    role text,
    race text,
    alignment text,
    description text,
    appearance text,
    personality_traits text,
    gm_notes text,
    true_nature text,
    hidden_agenda text,
    status text,
    narrative_hooks jsonb,
    check_results jsonb,
    for_city_simulation boolean,
    city_influence_tier text,
    city_axis_loyal_criminal smallint,
    city_axis_greedy_altruist smallint,
    city_axis_pious_skeptic smallint,
    city_axis_superstition_reason smallint,
    city_deity text,
    city_faction_id text,
    city_agenda text,
    city_event_deck jsonb
  )
)
insert into public.npcs (
  id,
  world_id,
  aurenfurt_catalog_id,
  name,
  title,
  role,
  race,
  alignment,
  description,
  appearance,
  personality_traits,
  gm_notes,
  true_nature,
  hidden_agenda,
  status,
  narrative_hooks,
  check_results,
  image_url,
  home_location_id,
  current_location_id,
  for_city_simulation,
  city_influence_tier,
  city_axis_loyal_criminal,
  city_axis_greedy_altruist,
  city_axis_pious_skeptic,
  city_axis_superstition_reason,
  city_deity,
  city_faction_id,
  city_agenda,
  city_event_deck
)
select
  md5('aurenfurt-npc:' || n.catalog_id)::uuid,
  '${AURENFURT_WORLD_ID}'::uuid,
  n.catalog_id,
  n.name,
  n.title,
  n.role,
  n.race,
  n.alignment,
  n.description,
  n.appearance,
  n.personality_traits,
  n.gm_notes,
  n.true_nature,
  n.hidden_agenda,
  n.status,
  n.narrative_hooks,
  n.check_results,
  '${NPC_PORTRAIT_PLACEHOLDER}',
  loc.id,
  loc.id,
  coalesce(n.for_city_simulation, false),
  case when n.for_city_simulation then n.city_influence_tier else null end,
  case when n.for_city_simulation then n.city_axis_loyal_criminal else null end,
  case when n.for_city_simulation then n.city_axis_greedy_altruist else null end,
  case when n.for_city_simulation then n.city_axis_pious_skeptic else null end,
  case when n.for_city_simulation then n.city_axis_superstition_reason else null end,
  case when n.for_city_simulation then n.city_deity else null end,
  case when n.for_city_simulation then n.city_faction_id else null end,
  case when n.for_city_simulation then n.city_agenda else null end,
  case when n.for_city_simulation then coalesce(n.city_event_deck, '[]'::jsonb) else '[]'::jsonb end
from npcs_seed n
left join public.locations loc
  on loc.world_id = '${AURENFURT_WORLD_ID}'::uuid
 and loc.map_building_id = n.location_slug
on conflict (aurenfurt_catalog_id) do update set
  home_location_id = excluded.home_location_id,
  current_location_id = excluded.current_location_id,
  for_city_simulation = excluded.for_city_simulation,
  city_influence_tier = excluded.city_influence_tier,
  city_axis_loyal_criminal = excluded.city_axis_loyal_criminal,
  city_axis_greedy_altruist = excluded.city_axis_greedy_altruist,
  city_axis_pious_skeptic = excluded.city_axis_pious_skeptic,
  city_axis_superstition_reason = excluded.city_axis_superstition_reason,
  city_deity = excluded.city_deity,
  city_faction_id = excluded.city_faction_id,
  city_agenda = excluded.city_agenda,
  city_event_deck = excluded.city_event_deck;
`;

const out = "supabase/migrations/20260930221500_aurenfurt_map_npcs.sql";
writeFileSync(out, sql);
console.log(`wrote ${out} buildings=${buildings.length} npcs=${npcs.length} bytes=${sql.length}`);
