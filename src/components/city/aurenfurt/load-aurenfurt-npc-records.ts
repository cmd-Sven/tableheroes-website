"use server";

import { createClient } from "@/src/lib/supabase/server";
import { citySimulationFromDb } from "@/src/lib/npcs/city-simulation";
import type { CityBond } from "./aurenfurt-bonds";
import { AURENFURT_WORLD_ID } from "./aurenfurt-district-lore-ids";
import { allAurenfurtNpcs } from "./aurenfurt-npcs";
import type { CityActor, CitySimEvent } from "./aurenfurt-pressure";
import { parseDay } from "./aurenfurt-time";
import { enrichPressureActors } from "./aurenfurt-verwaltung-runtime";

export async function loadAurenfurtNpcRecordIds(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);

  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return {};

  const { data, error } = await (supabase.from("npcs") as any)
    .select("id, aurenfurt_catalog_id")
    .eq("world_id", AURENFURT_WORLD_ID)
    .not("aurenfurt_catalog_id", "is", null);

  if (error || !Array.isArray(data)) return {};

  const records: Record<string, string> = {};
  for (const row of data as { id: string; aurenfurt_catalog_id: string | null }[]) {
    if (row.aurenfurt_catalog_id && row.id) records[row.aurenfurt_catalog_id] = row.id;
  }
  return records;
}

export type CityNpcDashboardRelationship = {
  otherName: string;
  roleLabel: string;
  intensity: number;
};

export type CityNpcDashboardExtras = {
  portraitUrl: string | null;
  /** Heimat-/Sitzort in der Stadt. */
  seatName: string | null;
  relationships: CityNpcDashboardRelationship[];
  faction: {
    name: string;
    imageUrl: string | null;
    intro: string;
  } | null;
};

/**
 * Portrait, Fraktion und wichtigste Beziehungen für das Dashboard-NPC-Detail.
 * Auth wie die übrigen Aurenfurt-Loader: Welt-GM oder Admin.
 */
export async function loadCityNpcDashboardExtras(
  npcRecordId: string,
  factionCatalogId: string | null = null,
): Promise<CityNpcDashboardExtras> {
  const empty: CityNpcDashboardExtras = {
    portraitUrl: null,
    seatName: null,
    relationships: [],
    faction: null,
  };
  if (!npcRecordId) return empty;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);
  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return empty;

  const { data: npcRow } = await (supabase.from("npcs") as any)
    .select("id, name, image_url, city_faction_id, home_location_id, current_location_id")
    .eq("id", npcRecordId)
    .eq("world_id", AURENFURT_WORLD_ID)
    .maybeSingle();
  if (!npcRow) return empty;

  const portraitUrl =
    typeof npcRow.image_url === "string" && npcRow.image_url.trim()
      ? npcRow.image_url.trim()
      : null;

  const seatLocationId =
    (typeof npcRow.home_location_id === "string" && npcRow.home_location_id.trim()) ||
    (typeof npcRow.current_location_id === "string" && npcRow.current_location_id.trim()) ||
    null;
  let seatName: string | null = null;
  if (seatLocationId) {
    const { data: seatRow } = await (supabase.from("locations") as any)
      .select("name")
      .eq("id", seatLocationId)
      .maybeSingle();
    seatName =
      typeof seatRow?.name === "string" && seatRow.name.trim() ? seatRow.name.trim() : null;
  }

  const catalogFactionId =
    (typeof factionCatalogId === "string" && factionCatalogId.trim()) ||
    (typeof npcRow.city_faction_id === "string" && npcRow.city_faction_id.trim()) ||
    null;

  let faction: CityNpcDashboardExtras["faction"] = null;
  if (catalogFactionId) {
    const { data: factionRow } = await (supabase.from("factions") as any)
      .select("name, image_url, banner_url, description, aurenfurt_catalog_id")
      .eq("world_id", AURENFURT_WORLD_ID)
      .eq("aurenfurt_catalog_id", catalogFactionId)
      .maybeSingle();
    if (factionRow) {
      const imageUrl =
        (typeof factionRow.image_url === "string" && factionRow.image_url.trim()) ||
        (typeof factionRow.banner_url === "string" && factionRow.banner_url.trim()) ||
        null;
      const intro =
        (typeof factionRow.description === "string" && factionRow.description.trim()) ||
        "";
      faction = {
        name: String(factionRow.name ?? "").trim() || catalogFactionId,
        imageUrl,
        intro,
      };
    }
  }

  const { data: links } = await (supabase.from("relationships") as any)
    .select("source_id, target_id, source_role, target_role, intensity, target_type")
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("target_type", "npc")
    .or(`source_id.eq.${npcRecordId},target_id.eq.${npcRecordId}`);

  const linkRows = Array.isArray(links) ? links : [];
  const otherIds = new Set<string>();
  for (const link of linkRows as {
    source_id: string;
    target_id: string;
  }[]) {
    const otherId = link.source_id === npcRecordId ? link.target_id : link.source_id;
    if (otherId) otherIds.add(otherId);
  }

  const nameById = new Map<string, string>();
  if (otherIds.size > 0) {
    const { data: others } = await (supabase.from("npcs") as any)
      .select("id, name")
      .in("id", [...otherIds]);
    for (const row of (others ?? []) as { id: string; name: string | null }[]) {
      nameById.set(row.id, String(row.name ?? "").trim() || "Unbekannt");
    }
  }

  const relationships: CityNpcDashboardRelationship[] = (
    linkRows as {
      source_id: string;
      target_id: string;
      source_role: string | null;
      target_role: string | null;
      intensity: number | null;
    }[]
  )
    .map((link) => {
      const fromSelf = link.source_id === npcRecordId;
      const otherId = fromSelf ? link.target_id : link.source_id;
      const roleLabel = fromSelf
        ? String(link.source_role ?? "").trim() || "Beziehung"
        : String(link.target_role ?? "").trim() || "Beziehung";
      return {
        otherName: nameById.get(otherId) ?? "Unbekannt",
        roleLabel,
        intensity: Number(link.intensity ?? 0),
      };
    })
    .sort((a, b) => Math.abs(b.intensity) - Math.abs(a.intensity))
    .slice(0, 6);

  return { portraitUrl, seatName, relationships, faction };
}

export type CityFactionDashboardMember = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  influence: number | null;
};

export type CityFactionDashboardExtras = {
  recordId: string | null;
  name: string;
  emblemUrl: string | null;
  bannerUrl: string | null;
  intro: string;
  loreExcerpt: string | null;
  loreId: string | null;
  members: CityFactionDashboardMember[];
};

/**
 * Lore-Auszug, Wappen/Banner und Mitglieder für das Dashboard-Fraktionsdetail.
 */
export async function loadCityFactionDashboardExtras(
  factionCatalogId: string,
): Promise<CityFactionDashboardExtras | null> {
  if (!factionCatalogId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);
  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return null;

  const { data: factionRow } = await (supabase.from("factions") as any)
    .select("id, name, image_url, banner_url, description, lore_id, planned_members, important_npcs_info")
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("aurenfurt_catalog_id", factionCatalogId)
    .maybeSingle();
  if (!factionRow) return null;

  const intro =
    (typeof factionRow.description === "string" && factionRow.description.trim()) || "";
  const emblemUrl =
    typeof factionRow.image_url === "string" && factionRow.image_url.trim()
      ? factionRow.image_url.trim()
      : null;
  const bannerUrl =
    typeof factionRow.banner_url === "string" && factionRow.banner_url.trim()
      ? factionRow.banner_url.trim()
      : null;

  let loreExcerpt: string | null = null;
  const loreId =
    typeof factionRow.lore_id === "string" && factionRow.lore_id.trim()
      ? factionRow.lore_id.trim()
      : null;
  if (loreId) {
    const { data: loreRow } = await (supabase.from("world_lore") as any)
      .select("description")
      .eq("id", loreId)
      .maybeSingle();
    const text =
      typeof loreRow?.description === "string" ? loreRow.description.trim() : "";
    if (text) loreExcerpt = text.slice(0, 420);
  }
  if (!loreExcerpt && intro) loreExcerpt = intro.slice(0, 420);

  const catalog = allAurenfurtNpcs().filter((npc) => npc.factionId === factionCatalogId);
  const catalogByName = new Map(
    catalog.map((npc) => [npc.name.trim().toLowerCase(), npc] as const),
  );
  const influenceByCatalogId = new Map(
    catalog.map((npc) => [npc.id, npc.influenceAndLoyalty.influence] as const),
  );

  const catalogIds = catalog.map((npc) => npc.id);
  const [{ data: byFactionRows }, { data: byCatalogRows }] = await Promise.all([
    (supabase.from("npcs") as any)
      .select("id, name, title, role, city_faction_id, aurenfurt_catalog_id")
      .eq("world_id", AURENFURT_WORLD_ID)
      .eq("city_faction_id", factionCatalogId),
    catalogIds.length > 0
      ? (supabase.from("npcs") as any)
          .select("id, name, title, role, city_faction_id, aurenfurt_catalog_id")
          .eq("world_id", AURENFURT_WORLD_ID)
          .in("aurenfurt_catalog_id", catalogIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const membersById = new Map<string, CityFactionDashboardMember>();
  for (const row of [...(byFactionRows ?? []), ...(byCatalogRows ?? [])] as {
    id: string;
    name: string | null;
    title: string | null;
    role: string | null;
    city_faction_id: string | null;
    aurenfurt_catalog_id: string | null;
  }[]) {
    if (membersById.has(row.id)) continue;
    const catalogId = row.aurenfurt_catalog_id;
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    membersById.set(row.id, {
      id: row.id,
      name,
      title: (row.title ?? "").trim() || null,
      role: (row.role ?? "").trim() || null,
      influence:
        catalogId && influenceByCatalogId.has(catalogId)
          ? influenceByCatalogId.get(catalogId)!
          : catalogByName.get(name.toLowerCase())?.influenceAndLoyalty.influence ?? null,
    });
  }

  // Katalog-Mitglieder ohne DB-Zeile ergänzen
  for (const npc of catalog) {
    const already = [...membersById.values()].some(
      (member) => member.name.trim().toLowerCase() === npc.name.trim().toLowerCase(),
    );
    if (already) continue;
    membersById.set(npc.id, {
      id: npc.id,
      name: npc.name,
      title: npc.title,
      role: npc.role,
      influence: npc.influenceAndLoyalty.influence,
    });
  }

  // Geplante Mitglieder / wichtige Persönlichkeiten als Fallback-Namen
  const planned = Array.isArray(factionRow.planned_members)
    ? (factionRow.planned_members as Array<{ name?: string; description?: string; npc_id?: string | null }>)
    : [];
  for (const entry of planned) {
    const name = String(entry.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if ([...membersById.values()].some((member) => member.name.toLowerCase() === key)) continue;
    membersById.set(entry.npc_id || `planned:${key}`, {
      id: entry.npc_id || `planned:${key}`,
      name,
      title: null,
      role: String(entry.description ?? "").trim() || null,
      influence: null,
    });
  }

  const members = [...membersById.values()]
    .sort((a, b) => (b.influence ?? -1) - (a.influence ?? -1) || a.name.localeCompare(b.name, "de"))
    .slice(0, 12);

  return {
    recordId: String(factionRow.id),
    name: String(factionRow.name ?? "").trim() || factionCatalogId,
    emblemUrl,
    bannerUrl,
    intro,
    loreExcerpt,
    loreId,
    members,
  };
}

export type CityFactionListMedia = {
  emblemUrl: string | null;
  bannerUrl: string | null;
};

/** Wappen/Banner aller Stadtfraktionen für Listen im Dashboard. */
export async function loadAurenfurtFactionListMedia(): Promise<
  Record<string, CityFactionListMedia>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);
  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return {};

  const { data, error } = await (supabase.from("factions") as any)
    .select("aurenfurt_catalog_id, image_url, banner_url")
    .eq("world_id", AURENFURT_WORLD_ID)
    .not("aurenfurt_catalog_id", "is", null);
  if (error || !Array.isArray(data)) return {};

  const media: Record<string, CityFactionListMedia> = {};
  for (const row of data as {
    aurenfurt_catalog_id: string | null;
    image_url: string | null;
    banner_url: string | null;
  }[]) {
    const id = row.aurenfurt_catalog_id?.trim();
    if (!id) continue;
    media[id] = {
      emblemUrl:
        typeof row.image_url === "string" && row.image_url.trim() ? row.image_url.trim() : null,
      bannerUrl:
        typeof row.banner_url === "string" && row.banner_url.trim() ? row.banner_url.trim() : null,
    };
  }
  return media;
}

/** Katalog-ID der Stadtfraktion → Fraktions-UUID in Welt & Lore. */
export async function loadAurenfurtFactionRecordIds(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);

  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return {};

  const { data, error } = await (supabase.from("factions") as any)
    .select("id, aurenfurt_catalog_id")
    .eq("world_id", AURENFURT_WORLD_ID)
    .not("aurenfurt_catalog_id", "is", null);

  if (error || !Array.isArray(data)) return {};

  const records: Record<string, string> = {};
  for (const row of data as { id: string; aurenfurt_catalog_id: string | null }[]) {
    if (row.aurenfurt_catalog_id && row.id) records[row.aurenfurt_catalog_id] = row.id;
  }
  return records;
}

type CityNpcRow = {
  id: string;
  name: string | null;
  status?: string | null;
  role?: string | null;
  for_city_simulation: boolean | null;
  aurenfurt_catalog_id: string | null;
  city_faction_id: string | null;
};

function placeOf(row: CityNpcRow) {
  if (!row.for_city_simulation) return null;
  const catalog = allAurenfurtNpcs();
  const byId = row.aurenfurt_catalog_id
    ? catalog.find((npc) => npc.id === row.aurenfurt_catalog_id)
    : null;
  const byName =
    byId ??
    catalog.find((npc) => npc.name.trim().toLowerCase() === String(row.name ?? "").trim().toLowerCase());
  if (!byName) return null;
  return {
    districtId: byName.districtId,
    factionId: row.city_faction_id || byName.cityFactionId || byName.factionId,
  };
}

/** Beziehungen, die beide Seiten in einem Viertel der Stadtsimulation haben. */
export async function loadAurenfurtCityBonds(): Promise<CityBond[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);
  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return [];

  const { data: links, error } = await (supabase.from("relationships") as any)
    .select("source_id, target_id, source_role, target_role, intensity, affects_city_sim, target_type")
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("target_type", "npc");
  if (error || !Array.isArray(links)) return [];

  const ids = new Set<string>();
  for (const link of links as { source_id: string; target_id: string; affects_city_sim?: boolean | null }[]) {
    if (link.affects_city_sim === false) continue;
    ids.add(link.source_id);
    ids.add(link.target_id);
  }
  if (ids.size === 0) return [];

  const { data: npcs } = await (supabase.from("npcs") as any)
    .select("id, name, for_city_simulation, aurenfurt_catalog_id, city_faction_id")
    .eq("world_id", AURENFURT_WORLD_ID)
    .in("id", [...ids]);
  const placed = new Map<string, { districtId: CityBond["sourceDistrictId"]; factionId: string | null }>();
  for (const row of (npcs ?? []) as CityNpcRow[]) {
    const place = placeOf(row);
    if (place) placed.set(row.id, place);
  }

  const bonds: CityBond[] = [];
  for (const link of links as {
    source_id: string;
    target_id: string;
    source_role: string | null;
    target_role: string | null;
    intensity: number | null;
    affects_city_sim?: boolean | null;
  }[]) {
    if (link.affects_city_sim === false) continue;
    const source = placed.get(link.source_id);
    const target = placed.get(link.target_id);
    if (!source || !target) continue;
    bonds.push({
      sourceDistrictId: source.districtId,
      targetDistrictId: target.districtId,
      sourceRole: link.source_role ?? "",
      targetRole: link.target_role ?? "",
      intensity: Number(link.intensity ?? 0),
      sameFaction: Boolean(source.factionId && source.factionId === target.factionId),
    });
  }
  return bonds;
}

export async function loadAurenfurtCityPressure(): Promise<{ actors: CityActor[]; events: CitySimEvent[] }> {
  const empty = { actors: [], events: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);
  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return empty;

  const { data: rows } = await (supabase.from("npcs") as any)
    .select("id, name, status, role, for_city_simulation, aurenfurt_catalog_id, city_faction_id, city_influence_tier, city_axis_loyal_criminal, city_axis_greedy_altruist, city_axis_pious_skeptic, city_axis_superstition_reason, city_abilities, city_event_deck, city_card_plays")
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("for_city_simulation", true);

  const rawActors: CityActor[] = [];
  for (const row of (rows ?? []) as CityNpcRow[]) {
    const place = placeOf(row);
    if (!place) continue;
    const fields = citySimulationFromDb(row as Parameters<typeof citySimulationFromDb>[0]);
    rawActors.push({
      id: row.id,
      name: row.name?.trim() || "NPC",
      alive: row.status == null || row.status === "Alive",
      districtId: place.districtId,
      factionId: place.factionId,
      role: row.role ?? "",
      tier: fields.cityInfluenceTier,
      axes: {
        loyalCriminal: fields.cityAxisLoyalCriminal ?? 0,
        greedyAltruist: fields.cityAxisGreedyAltruist ?? 0,
        piousSkeptic: fields.cityAxisPiousSkeptic ?? 0,
        superstitionReason: fields.cityAxisSuperstitionReason ?? 0,
      },
      abilities: fields.cityAbilities,
      cards: fields.cityEventDeck,
      plays: fields.cityCardPlays.flatMap((play) => {
        const startedOnMs = parseDay(play.startedOn);
        return Number.isFinite(startedOnMs) ? [{ ...play, startedOnMs }] : [];
      }),
    });
  }

  const catalog = allAurenfurtNpcs();
  const catalogByName = new Map(
    catalog.map((npc) => [
      npc.name.trim().toLowerCase(),
      {
        id: npc.id,
        tier: npc.cityInfluenceTier,
        isLeader: npc.mapRoles.includes("leader"),
        factionId: npc.factionId,
      },
    ]),
  );
  let actors = enrichPressureActors(rawActors, catalogByName);
  if (actors.length === 0) {
    actors = enrichPressureActors(
      catalog.map((npc) => ({
        id: npc.id,
        name: npc.name,
        alive: npc.status === "Alive",
        districtId: npc.districtId,
        factionId: npc.factionId,
        role: npc.role,
        tier: npc.cityInfluenceTier,
        axes: {
          loyalCriminal: npc.cityAxisLoyalCriminal,
          greedyAltruist: npc.cityAxisGreedyAltruist,
          piousSkeptic: npc.cityAxisPiousSkeptic,
          superstitionReason: npc.cityAxisSuperstitionReason,
        },
        abilities: npc.cityAbilities,
        cards: npc.cityEventDeck,
        plays: [],
      })),
      catalogByName,
    );
  }

  const { data: eventRows } = await (supabase as any).from("city_sim_events")
    .select(
      "id, title, body, image_url, scope, district_id, sector_label, effects, duration_days, start_on, end_when, active",
    )
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("active", true);

  const events: CitySimEvent[] = [];
  for (const row of (eventRows ?? []) as Array<Record<string, unknown>>) {
    const districtId = typeof row.district_id === "string" ? row.district_id : null;
    events.push({
      id: String(row.id),
      title: String(row.title ?? "Stadtereignis"),
      body: String(row.body ?? ""),
      imageUrl: typeof row.image_url === "string" && row.image_url.trim() ? row.image_url.trim() : null,
      scope: row.scope === "district" || row.scope === "sector" ? row.scope : "city",
      districtId: districtId as CitySimEvent["districtId"],
      sectorLabel: typeof row.sector_label === "string" ? row.sector_label : null,
      effects: Array.isArray(row.effects) ? (row.effects as CitySimEvent["effects"]) : [],
      durationDays: typeof row.duration_days === "number" ? row.duration_days : null,
      startOn: parseDay(String(row.start_on ?? "")),
      endWhen:
        row.end_when && typeof row.end_when === "object"
          ? (row.end_when as CitySimEvent["endWhen"])
          : null,
      active: row.active !== false,
    });
  }
  return { actors, events: events.filter((event) => Number.isFinite(event.startOn)) };
}
