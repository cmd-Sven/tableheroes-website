"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { anyLocationInCitySimulation } from "@/src/components/city/aurenfurt/location-in-city-sim";

export type LocationNpcPlacement = "resident" | "guest";

export type LocationNpcSearchHit = {
  id: string;
  name: string;
  role: string | null;
  homeHere: boolean;
  guestHere: boolean;
};

const HIT_LIMIT = 8;

function normalizeSearchQuery(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/[,%_()*."\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (cleaned.length < 2) return null;
  return cleaned;
}

async function assertCanEditWorld(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("id, gm_id").eq("id", worldId).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);

  const isAdmin = (profile as { primary_role?: string } | null)?.primary_role === "Admin";
  const isGm =
    (world as { gm_id?: string | null } | null)?.gm_id != null &&
    String((world as { gm_id: string }).gm_id) === user.id;
  if (!world || (!isGm && !isAdmin)) {
    throw new Error("Keine Berechtigung für diese Welt.");
  }
  return supabase;
}

async function loadAssignableLocation(supabase: Awaited<ReturnType<typeof createClient>>, worldId: string, locationId: string) {
  const { data: location, error } = await (supabase.from("locations") as any)
    .select(
      "id, world_id, name, type, description, image_url, map_u, map_v, map_district_id, aurenfurt_street_id, created_via_map_editor, parent_location_id, map_poi_kind, map_poi_influences",
    )
    .eq("id", locationId)
    .maybeSingle();

  if (error || !location || location.world_id !== worldId) {
    throw new Error("Ort nicht gefunden.");
  }

  const fromEditor = Boolean(location.created_via_map_editor);
  const isPoi = Boolean(location.map_poi_kind);
  const hasStreet = Boolean(String(location.aurenfurt_street_id ?? "").trim());
  if (fromEditor && !isPoi && !hasStreet) {
    throw new Error("Gebäude ohne Straßen-Zuordnung ist inaktiv.");
  }

  const inCitySimulation = await anyLocationInCitySimulation(supabase as any, [locationId]);
  return { inCitySimulation };
}

export async function searchWorldNpcsForLocation(
  worldId: string,
  locationId: string,
  rawQuery: string,
): Promise<{ hits: LocationNpcSearchHit[]; citySimulationOnly: boolean }> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return { hits: [], citySimulationOnly: false };

  const supabase = await assertCanEditWorld(worldId);
  const { inCitySimulation } = await loadAssignableLocation(supabase, worldId, locationId);

  const pattern = `%${query.replace(/\s+/g, "%")}%`;
  let request = (supabase.from("npcs") as any)
    .select("id, name, role, home_location_id, current_location_id, for_city_simulation")
    .eq("world_id", worldId);

  if (inCitySimulation) {
    request = request.eq("for_city_simulation", true);
  }

  const { data, error } = await request
    .or(`name.ilike.${pattern},role.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(HIT_LIMIT);
  if (error) {
    console.error("searchWorldNpcsForLocation:", error);
    throw new Error("NPC-Suche fehlgeschlagen.");
  }

  const hits: LocationNpcSearchHit[] = ((data ?? []) as Array<{
    id: string;
    name: string | null;
    role: string | null;
    home_location_id: string | null;
    current_location_id: string | null;
    for_city_simulation: boolean | null;
  }>)
    .filter((npc) => (inCitySimulation ? npc.for_city_simulation === true : true))
    .map((npc) => ({
      id: npc.id,
      name: npc.name?.trim() || "Unbenannt",
      role: npc.role?.trim() ? npc.role.trim() : null,
      homeHere: npc.home_location_id === locationId,
      guestHere: npc.current_location_id === locationId && npc.home_location_id !== locationId,
    }));

  return { hits, citySimulationOnly: inCitySimulation };
}

export async function assignExistingNpcToLocation(
  worldId: string,
  locationId: string,
  npcId: string,
  placement: LocationNpcPlacement,
) {
  const supabase = await assertCanEditWorld(worldId);
  const { inCitySimulation } = await loadAssignableLocation(supabase, worldId, locationId);

  const { data: npc, error: npcError } = await (supabase.from("npcs") as any)
    .select("id, world_id, home_location_id, current_location_id, for_city_simulation")
    .eq("id", npcId)
    .maybeSingle();

  if (npcError || !npc || npc.world_id !== worldId) {
    throw new Error("NPC nicht gefunden.");
  }

  if (inCitySimulation && npc.for_city_simulation !== true) {
    throw new Error("Dieser NPC ist nicht für die Stadtsimulation vorgesehen.");
  }

  if (placement === "resident") {
    if (npc.home_location_id === locationId) return { ok: true as const };
    const { error } = await (supabase.from("npcs") as any)
      .update({ home_location_id: locationId })
      .eq("id", npcId);
    if (error) throw new Error(error.message);
  } else {
    if (npc.home_location_id === locationId) {
      throw new Error("Dieser NPC ist hier bereits ansässig.");
    }
    if (npc.current_location_id === locationId) return { ok: true as const };
    const { error } = await (supabase.from("npcs") as any)
      .update({ current_location_id: locationId })
      .eq("id", npcId);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/dashboard/worlds/${worldId}/locations/${locationId}`);
  revalidatePath(`/dashboard/worlds/${worldId}/lore/${locationId}`);
  revalidatePath(`/dashboard/worlds/${worldId}/npcs/${npcId}`);
  return { ok: true as const };
}
