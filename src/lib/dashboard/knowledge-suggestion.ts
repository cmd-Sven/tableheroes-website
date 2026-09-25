import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isLocationType } from "@/src/lib/lore-types";
import { getBerlinParts } from "@/src/lib/datetime/berlin";
import type { DashboardLoreEntry } from "@/src/lib/types/dashboard-widgets";

const PREF_KEY = "knowledge_suggestion";
const ACTIVE_MEMBER = ["Approved", "Active"];

type StoredSuggestion = {
  entityId: string;
  entityType: DashboardLoreEntry["type"];
  campaignId: string;
  name: string;
  imageUrl: string | null;
  campaignName: string;
  openedAt: string | null;
};

export type KnowledgeSuggestionResult = {
  entry: DashboardLoreEntry | null;
  consumedToday: boolean;
};

function berlinDayKey(date: Date): string {
  const parts = getBerlinParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseStored(preferences: unknown): StoredSuggestion | null {
  if (!preferences || typeof preferences !== "object") return null;
  const raw = (preferences as Record<string, unknown>)[PREF_KEY];
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const entityType = row.entityType;
  if (
    typeof row.entityId !== "string" ||
    typeof row.campaignId !== "string" ||
    typeof row.name !== "string" ||
    (entityType !== "lore" &&
      entityType !== "npc" &&
      entityType !== "faction" &&
      entityType !== "location")
  ) {
    return null;
  }
  return {
    entityId: row.entityId,
    entityType,
    campaignId: row.campaignId,
    name: row.name,
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
    campaignName: typeof row.campaignName === "string" ? row.campaignName : "Kampagne",
    openedAt: typeof row.openedAt === "string" ? row.openedAt : null,
  };
}

function toEntry(stored: StoredSuggestion): DashboardLoreEntry {
  return {
    id: stored.entityId,
    name: stored.name,
    imageUrl: stored.imageUrl,
    type: stored.entityType,
    campaignId: stored.campaignId,
    campaignName: stored.campaignName,
  };
}

async function loadPool(userId: string): Promise<DashboardLoreEntry[]> {
  const supabase = await createClient();
  const db = tryCreateAdminClient() ?? supabase;
  const { data: memberships } = await (supabase.from("campaign_members") as any)
    .select("campaign_id")
    .eq("user_id", userId)
    .in("status", ACTIVE_MEMBER);

  const campaignIds = [
    ...new Set(((memberships as { campaign_id?: string }[]) || []).map((m) => m.campaign_id).filter(Boolean)),
  ] as string[];
  if (campaignIds.length === 0) return [];

  const [{ data: campaigns }, { data: visibilityRows }] = await Promise.all([
    (db.from("campaigns") as any).select("id, name, world_id").in("id", campaignIds),
    (db.from("campaign_visibility") as any)
      .select("campaign_id, entity_id, entity_type")
      .in("campaign_id", campaignIds)
      .eq("is_revealed", true)
      .in("entity_type", ["lore", "npc", "faction"]),
  ]);

  const campaignById = new Map<string, { name: string; worldId: string | null }>();
  for (const camp of (campaigns as { id: string; name?: string | null; world_id?: string | null }[]) || []) {
    campaignById.set(camp.id, { name: camp.name ?? "Kampagne", worldId: camp.world_id ?? null });
  }

  const idsByType = { lore: new Set<string>(), npc: new Set<string>(), faction: new Set<string>() };
  const campaignsByEntity = new Map<string, string[]>();
  for (const row of (visibilityRows as { campaign_id: string; entity_id: string; entity_type: string }[]) || []) {
    if (row.entity_type !== "lore" && row.entity_type !== "npc" && row.entity_type !== "faction") continue;
    idsByType[row.entity_type].add(row.entity_id);
    const key = `${row.entity_type}:${row.entity_id}`;
    const list = campaignsByEntity.get(key) ?? [];
    list.push(row.campaign_id);
    campaignsByEntity.set(key, list);
  }

  const pool: DashboardLoreEntry[] = [];
  const pushForCampaigns = (
    entityType: "lore" | "npc" | "faction" | "location",
    entityId: string,
    name: string,
    imageUrl: string | null,
    worldId?: string | null,
  ) => {
    const lookup = entityType === "location" ? "lore" : entityType;
    const campaignIdsForEntity = campaignsByEntity.get(`${lookup}:${entityId}`) ?? [];
    for (const campaignId of campaignIdsForEntity) {
      const campaign = campaignById.get(campaignId);
      if (!campaign) continue;
      if (worldId && campaign.worldId && campaign.worldId !== worldId) continue;
      pool.push({
        id: entityId,
        name,
        imageUrl,
        type: entityType,
        campaignId,
        campaignName: campaign.name,
      });
    }
  };

  const loreIds = [...idsByType.lore];
  const npcIds = [...idsByType.npc];
  const factionIds = [...idsByType.faction];
  const [loreRes, npcRes, factionRes] = await Promise.all([
    loreIds.length
      ? (db.from("world_lore") as any).select("id, name, image_url, type, world_id").in("id", loreIds)
      : Promise.resolve({ data: [] }),
    npcIds.length
      ? (db.from("npcs") as any).select("id, name, image_url, world_id").in("id", npcIds)
      : Promise.resolve({ data: [] }),
    factionIds.length
      ? (db.from("factions") as any).select("id, name, image_url, world_id").in("id", factionIds)
      : Promise.resolve({ data: [] }),
  ]);

  for (const row of (loreRes.data as any[]) || []) {
    const kind = isLocationType(String(row.type ?? "")) ? "location" : "lore";
    pushForCampaigns(kind, row.id, row.name ?? (kind === "location" ? "Ort" : "Lore"), row.image_url ?? null, row.world_id);
  }
  for (const row of (npcRes.data as any[]) || []) {
    pushForCampaigns("npc", row.id, row.name ?? "NPC", row.image_url ?? null, row.world_id);
  }
  for (const row of (factionRes.data as any[]) || []) {
    pushForCampaigns("faction", row.id, row.name ?? "Fraktion", row.image_url ?? null, row.world_id);
  }

  return pool;
}

async function readPreferences(userId: string): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data } = await (supabase.from("users") as any)
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();
  const preferences = (data as { preferences?: unknown } | null)?.preferences;
  return preferences && typeof preferences === "object" ? { ...(preferences as Record<string, unknown>) } : {};
}

async function writeSuggestion(userId: string, suggestion: StoredSuggestion | null) {
  const admin = tryCreateAdminClient();
  const supabase = admin ?? (await createClient());
  const current = await readPreferences(userId);
  const next = { ...current };
  if (suggestion) next[PREF_KEY] = suggestion;
  else delete next[PREF_KEY];
  await (supabase.from("users") as any).update({ preferences: next }).eq("id", userId);
}

function stillInPool(stored: StoredSuggestion, pool: DashboardLoreEntry[]): boolean {
  return pool.some(
    (entry) => entry.id === stored.entityId && entry.type === stored.entityType && entry.campaignId === stored.campaignId,
  );
}

export async function getKnowledgeSuggestion(userId: string): Promise<KnowledgeSuggestionResult> {
  const preferences = await readPreferences(userId);
  const stored = parseStored(preferences);
  const today = berlinDayKey(new Date());

  if (stored?.openedAt && berlinDayKey(new Date(stored.openedAt)) === today) {
    return { entry: null, consumedToday: true };
  }

  const pool = await loadPool(userId);
  if (stored && !stored.openedAt && stillInPool(stored, pool)) {
    return { entry: toEntry(stored), consumedToday: false };
  }

  if (pool.length === 0) return { entry: null, consumedToday: false };

  const avoidId = stored?.entityId;
  const candidates = pool.filter((entry) => entry.id !== avoidId);
  const source = candidates.length > 0 ? candidates : pool;
  const picked = source[Math.floor(Math.random() * source.length)]!;
  const suggestion: StoredSuggestion = {
    entityId: picked.id,
    entityType: picked.type,
    campaignId: picked.campaignId,
    name: picked.name,
    imageUrl: picked.imageUrl,
    campaignName: picked.campaignName,
    openedAt: null,
  };
  await writeSuggestion(userId, suggestion);
  return { entry: picked, consumedToday: false };
}

export async function claimKnowledgeSuggestion(
  userId: string,
  entry: Pick<DashboardLoreEntry, "id" | "type" | "campaignId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const preferences = await readPreferences(userId);
  const stored = parseStored(preferences);
  if (
    !stored ||
    stored.entityId !== entry.id ||
    stored.entityType !== entry.type ||
    stored.campaignId !== entry.campaignId
  ) {
    return { ok: false, error: "Dieser Vorschlag ist nicht mehr aktuell." };
  }
  if (stored.openedAt) return { ok: true };

  const pool = await loadPool(userId);
  if (!stillInPool(stored, pool)) {
    return { ok: false, error: "Dieser Eintrag ist für dich nicht freigegeben." };
  }

  const admin = tryCreateAdminClient();
  if (!admin) return { ok: false, error: "Punkte konnten nicht gutgeschrieben werden." };

  const marker = `Wissen ist Macht ${stored.entityType} ${stored.entityId}`;
  const { data: existing } = await (admin.from("points_log") as any)
    .select("id")
    .eq("user_id", userId)
    .eq("reason", marker)
    .limit(1);
  if (!((existing as unknown[]) || []).length) {
    const { error } = await (admin as any).rpc("award_points_safe", {
      target_user_id: userId,
      points_amount: 5,
      award_reason: marker,
      awarded_by: userId,
      related_campaign_id: stored.campaignId,
      catalog_id: null,
    });
    if (error) return { ok: false, error: error.message };
  }

  await writeSuggestion(userId, { ...stored, openedAt: new Date().toISOString() });
  return { ok: true };
}
