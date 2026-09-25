import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { getVisibilityForCampaign } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-queries";
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
  const { data: memberships } = await (supabase.from("campaign_members") as any)
    .select("campaign_id")
    .eq("user_id", userId)
    .in("status", ACTIVE_MEMBER);

  const campaignIds = [
    ...new Set(((memberships as { campaign_id?: string }[]) || []).map((m) => m.campaign_id).filter(Boolean)),
  ] as string[];
  if (campaignIds.length === 0) return [];

  const { data: campaigns } = await (supabase.from("campaigns") as any)
    .select("id, name, world_id")
    .in("id", campaignIds);

  const pool: DashboardLoreEntry[] = [];

  await Promise.all(
    ((campaigns as { id: string; name?: string | null; world_id?: string | null }[]) || []).map(
      async (camp) => {
        const campaignId = camp.id;
        const campaignName = camp.name ?? "Kampagne";
        const worldId = camp.world_id ?? null;
        const [loreVisibility, npcVisibility, factionVisibility] = await Promise.all([
          getVisibilityForCampaign(campaignId, "lore"),
          worldId ? getVisibilityForCampaign(campaignId, "npc") : Promise.resolve({}),
          getVisibilityForCampaign(campaignId, "faction"),
        ]);

        const loreIds = Object.entries(loreVisibility)
          .filter(([, revealed]) => revealed)
          .map(([id]) => id);
        if (worldId && loreIds.length > 0) {
          const { data: loreRows } = await (supabase.from("world_lore") as any)
            .select("id, name, image_url, type")
            .in("id", loreIds)
            .eq("world_id", worldId);
          for (const row of (loreRows as any[]) || []) {
            const kind = isLocationType(String(row.type ?? "")) ? "location" : "lore";
            pool.push({
              id: row.id,
              name: row.name ?? (kind === "location" ? "Ort" : "Lore"),
              imageUrl: row.image_url ?? null,
              type: kind,
              campaignId,
              campaignName,
            });
          }
        }

        const npcIds = Object.entries(npcVisibility)
          .filter(([, revealed]) => revealed)
          .map(([id]) => id);
        if (worldId && npcIds.length > 0) {
          const { data: npcRows } = await (supabase.from("npcs") as any)
            .select("id, name, image_url")
            .in("id", npcIds)
            .eq("world_id", worldId);
          for (const row of (npcRows as any[]) || []) {
            pool.push({
              id: row.id,
              name: row.name ?? "NPC",
              imageUrl: row.image_url ?? null,
              type: "npc",
              campaignId,
              campaignName,
            });
          }
        }

        const factionIds = Object.entries(factionVisibility)
          .filter(([, revealed]) => revealed)
          .map(([id]) => id);
        if (factionIds.length > 0) {
          const { data: factionRows } = await (supabase.from("factions") as any)
            .select("id, name, image_url")
            .in("id", factionIds)
            .eq("campaign_id", campaignId);
          for (const row of (factionRows as any[]) || []) {
            pool.push({
              id: row.id,
              name: row.name ?? "Fraktion",
              imageUrl: row.image_url ?? null,
              type: "faction",
              campaignId,
              campaignName,
            });
          }
        }
      },
    ),
  );

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
