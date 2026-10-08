"use server";

import { createClient } from "@/src/lib/supabase/server";
import type { CityBond } from "./aurenfurt-bonds";
import { AURENFURT_WORLD_ID } from "./aurenfurt-district-lore-ids";
import { allAurenfurtNpcs } from "./aurenfurt-npcs";

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
