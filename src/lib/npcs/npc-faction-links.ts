/**
 * World-faction membership via npc_faction_links.
 * npcs.faction_id remains the primary faction (first selected id, or null).
 */

export type WorldFactionRef = {
  id: string;
  name: string;
  type: string | null;
};

type FactionIdSource = {
  faction_id?: string | null;
  faction_ids?: string[] | null;
  world_factions?: Array<{ id: string }> | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export function normalizeFactionIds(ids: Array<string | null | undefined> | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids ?? []) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Primary faction first, then additional memberships, without duplicates. */
export function resolveWorldFactionIds(
  source: FactionIdSource | null | undefined,
  defaultFactionId?: string | null,
): string[] {
  const fromExplicit = Array.isArray(source?.faction_ids) ? source.faction_ids : [];
  const fromWorld = Array.isArray(source?.world_factions)
    ? source.world_factions.map((faction) => faction.id)
    : [];
  const seed = fromExplicit.length > 0 ? fromExplicit : fromWorld;
  const ids = normalizeFactionIds(seed);
  const primary = typeof source?.faction_id === "string" ? source.faction_id.trim() : "";
  if (primary) {
    return [primary, ...ids.filter((id) => id !== primary)];
  }
  if (ids.length > 0) return ids;
  const fallback = typeof defaultFactionId === "string" ? defaultFactionId.trim() : "";
  return fallback ? [fallback] : [];
}

export function mergeWorldFactions(
  primary: WorldFactionRef | null,
  extra: WorldFactionRef[],
): WorldFactionRef[] {
  const out: WorldFactionRef[] = [];
  const seen = new Set<string>();
  const push = (faction: WorldFactionRef | null | undefined) => {
    if (!faction?.id || seen.has(faction.id)) return;
    seen.add(faction.id);
    out.push({
      id: faction.id,
      name: faction.name,
      type: faction.type ?? null,
    });
  };
  push(primary);
  for (const faction of extra) push(faction);
  return out;
}

export async function syncNpcFactionLinks(
  supabase: SupabaseLike,
  npcId: string,
  factionIds: string[],
): Promise<void> {
  const desired = normalizeFactionIds(factionIds);
  const { data: existing, error: loadError } = await supabase
    .from("npc_faction_links")
    .select("faction_id")
    .eq("npc_id", npcId);
  if (loadError) {
    throw new Error(`Welt-Fraktionen konnten nicht gespeichert werden: ${loadError.message}`);
  }

  const current = new Set<string>(
    (existing ?? []).map((row: { faction_id: string }) => row.faction_id),
  );
  const desiredSet = new Set(desired);
  const toDelete = [...current].filter((id) => !desiredSet.has(id));
  const toInsert = desired.filter((id) => !current.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("npc_faction_links")
      .delete()
      .eq("npc_id", npcId)
      .in("faction_id", toDelete);
    if (error) {
      throw new Error(`Welt-Fraktionen konnten nicht gespeichert werden: ${error.message}`);
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("npc_faction_links").insert(
      toInsert.map((faction_id) => ({ npc_id: npcId, faction_id })),
    );
    if (error) {
      throw new Error(`Welt-Fraktionen konnten nicht gespeichert werden: ${error.message}`);
    }
  }
}

export async function ensureNpcFactionLink(
  supabase: SupabaseLike,
  npcId: string,
  factionId: string,
): Promise<void> {
  const { error } = await supabase.from("npc_faction_links").upsert(
    { npc_id: npcId, faction_id: factionId },
    { onConflict: "npc_id,faction_id", ignoreDuplicates: true },
  );
  if (error) {
    throw new Error(`Welt-Fraktion konnte nicht verknüpft werden: ${error.message}`);
  }
}

/**
 * Adds a membership link. Sets faction_id only when the NPC has no primary faction yet.
 */
export async function attachNpcFactionMembership(
  supabase: SupabaseLike,
  npcId: string,
  factionId: string,
): Promise<void> {
  const { data: npcRow, error: npcError } = await supabase
    .from("npcs")
    .select("id, faction_id")
    .eq("id", npcId)
    .maybeSingle();
  if (npcError) {
    throw new Error(npcError.message);
  }
  if (!npcRow) {
    throw new Error("NPC nicht gefunden.");
  }

  await ensureNpcFactionLink(supabase, npcId, factionId);

  if (!npcRow.faction_id) {
    const { error } = await supabase
      .from("npcs")
      .update({ faction_id: factionId })
      .eq("id", npcId);
    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function loadWorldFactionsForNpc(
  supabase: SupabaseLike,
  npcId: string,
  primary: WorldFactionRef | null,
): Promise<WorldFactionRef[]> {
  const { data, error } = await supabase
    .from("npc_faction_links")
    .select("faction_id, factions:faction_id (id, name, type)")
    .eq("npc_id", npcId);
  if (error) {
    throw new Error(`Welt-Fraktionen konnten nicht geladen werden: ${error.message}`);
  }

  const linked: WorldFactionRef[] = [];
  for (const row of data ?? []) {
    const faction = row?.factions as { id?: string; name?: string; type?: string | null } | null;
    if (!faction?.id || !faction.name) continue;
    linked.push({
      id: faction.id,
      name: faction.name,
      type: faction.type ?? null,
    });
  }
  return mergeWorldFactions(primary, linked);
}

export type FactionMemberNpc = {
  id: string;
  name: string;
  title?: string | null;
  role?: string | null;
  race?: string | null;
  status?: string | null;
  image_url?: string | null;
};

export async function loadLinkedNpcsForFaction(
  supabase: SupabaseLike,
  factionId: string,
): Promise<FactionMemberNpc[]> {
  const { data, error } = await supabase
    .from("npc_faction_links")
    .select("npcs:npc_id (id, name, title, role, race, status, image_url)")
    .eq("faction_id", factionId);
  if (error) {
    throw new Error(`Fraktionsmitglieder konnten nicht geladen werden: ${error.message}`);
  }

  const members: FactionMemberNpc[] = [];
  for (const row of data ?? []) {
    const npc = row?.npcs as FactionMemberNpc | null;
    if (npc?.id) members.push(npc);
  }
  return members;
}

export function mergeFactionMembers<T extends { id: string; name?: string | null }>(
  primaryMembers: T[],
  linkedMembers: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const npc of primaryMembers) {
    if (npc?.id) byId.set(npc.id, npc);
  }
  for (const npc of linkedMembers) {
    if (npc?.id && !byId.has(npc.id)) byId.set(npc.id, npc);
  }
  return [...byId.values()].sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), "de"),
  );
}
