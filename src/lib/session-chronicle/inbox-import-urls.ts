import { LOCATION_TYPES } from "@/src/lib/lore-types";
import type { ChronicleInboxItem } from "./types";

export type ChronicleImportQuery = {
  chronicle_session: string;
  chronicle_kind: "npc" | "location" | "quest";
  chronicle_index: number;
};

export type InboxImportUrlContext = {
  campaignId: string;
  sessionId: string;
  worldId: string | null;
  /** Optional: NSC-Namen für Questgeber-Matching */
  npcNames?: Array<{ id: string; name: string }>;
};

function appendChronicleParams(
  params: URLSearchParams,
  sessionId: string,
  item: ChronicleInboxItem,
): void {
  params.set("chronicle_session", sessionId);
  params.set("chronicle_kind", item.kind);
  params.set("chronicle_index", String(item.index));
}

function normalizeLocationType(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (t && (LOCATION_TYPES as readonly string[]).includes(t)) return t;
  return "Ort";
}

function buildNpcDescription(draft: ChronicleInboxItem & { kind: "npc" }): string {
  const parts: string[] = [];
  const d = draft.draft;
  if (d.appearance?.trim()) parts.push(`Aussehen: ${d.appearance.trim()}`);
  if (d.behavior?.trim()) parts.push(`Verhalten: ${d.behavior.trim()}`);
  const stats = d.estimated_stats;
  if (stats?.race || stats?.class) {
    parts.push(
      `Geschätzt: ${[stats.race, stats.class].filter(Boolean).join(" · ")}`,
    );
  }
  if (d.located_in?.trim()) parts.push(`Ort in Session: ${d.located_in.trim()}`);
  return parts.join("\n\n");
}

function matchQuestGiverId(
  giverName: string | undefined,
  npcs: Array<{ id: string; name: string }> | undefined,
): string | undefined {
  const needle = (giverName ?? "").trim().toLowerCase();
  if (!needle || !npcs?.length) return undefined;
  const hit = npcs.find((n) => n.name.trim().toLowerCase() === needle);
  return hit?.id;
}

export function buildChronicleImportUrl(
  ctx: InboxImportUrlContext,
  item: ChronicleInboxItem,
): string | null {
  const params = new URLSearchParams();
  appendChronicleParams(params, ctx.sessionId, item);

  if (item.kind === "npc") {
    params.set("prefill_name", item.draft.detected_name);
    const desc = buildNpcDescription(item);
    if (desc) params.set("prefill_description", desc);
    if (item.draft.estimated_stats?.class) {
      params.set("prefill_relationship", item.draft.estimated_stats.class);
    }
    return `/dashboard/campaigns/${ctx.campaignId}/npcs/new?${params.toString()}`;
  }

  if (item.kind === "location") {
    if (!ctx.worldId) return null;
    params.set("name", item.draft.name);
    params.set("type", normalizeLocationType(item.draft.type));
    if (item.draft.description?.trim()) {
      params.set("description", item.draft.description.trim());
    }
    return `/dashboard/worlds/${ctx.worldId}/lore/new?${params.toString()}`;
  }

  if (item.draft.title.trim()) {
    params.set("prefill_title", item.draft.title.trim());
  }
  if (item.draft.objective?.trim()) {
    params.set("prefill_description", item.draft.objective.trim());
  }
  const giverId = matchQuestGiverId(item.draft.giver, ctx.npcNames);
  if (giverId) params.set("quest_giver_id", giverId);
  return `/dashboard/campaigns/${ctx.campaignId}/quests/new?${params.toString()}`;
}

export function parseChronicleImportFromSearchParams(sp: {
  chronicle_session?: string;
  chronicle_kind?: string;
  chronicle_index?: string;
}): ChronicleImportQuery | null {
  const sessionId = sp.chronicle_session?.trim();
  const kind = sp.chronicle_kind;
  const indexRaw = sp.chronicle_index;
  if (!sessionId || !kind || indexRaw == null) return null;
  const index = Number(indexRaw);
  if (!Number.isFinite(index) || index < 0) return null;
  if (kind !== "npc" && kind !== "location" && kind !== "quest") return null;
  return { chronicle_session: sessionId, chronicle_kind: kind, chronicle_index: index };
}
