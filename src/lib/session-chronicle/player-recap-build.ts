import type { EntityForSmartText } from "@/src/components/ui/SmartText";
import type { VisibilityEntityType } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-queries";
import { getVisibilityForCampaign } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-queries";
import type { PlayerRecapPayload, SessionChronicleState } from "./types";
import { emptyPlayerRecapPayload } from "./player-recap-types";
import { buildRecapStarterMarkdown } from "./player-recap-starter";

export type ArchiveRef = { id?: string | null; name?: string | null };

type BuildInput = {
  campaignId: string;
  chronicleState: SessionChronicleState | null;
  encounteredNpcs: ArchiveRef[];
  visitedLocations: ArchiveRef[];
  visibility: Record<VisibilityEntityType, Record<string, boolean>>;
  npcNames: Map<string, string>;
  loreNames: Map<string, { name: string; type: string }>;
  factionNames: Map<string, string>;
  revealedQuestIds: Set<string>;
};

function isRevealed(
  visibility: Record<string, boolean>,
  entityId: string | null | undefined,
): boolean {
  if (!entityId) return false;
  return visibility[entityId] === true;
}

function pushLinkEntity(
  list: EntityForSmartText[],
  seen: Set<string>,
  entity: EntityForSmartText | null,
) {
  if (!entity || seen.has(entity.id)) return;
  seen.add(entity.id);
  list.push(entity);
}

function matchImportedNpcNote(draft: {
  appearance?: string;
  behavior?: string;
  located_in?: string;
}): string | undefined {
  const parts = [draft.appearance, draft.behavior, draft.located_in].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function buildPlayerRecapPayload(input: BuildInput): PlayerRecapPayload {
  const base = emptyPlayerRecapPayload();
  const linkSeen = new Set<string>();
  const linkEntities: EntityForSmartText[] = [];

  const summaryParts: string[] = [];
  if (input.chronicleState?.story_recap?.trim()) {
    summaryParts.push(input.chronicleState.story_recap.trim());
  }

  for (const npc of input.encounteredNpcs) {
    const id = npc.id ? String(npc.id) : null;
    const name = String(npc.name ?? "").trim();
    if (!name) continue;
    base.sections.npcs.push({ entity_id: id, name });
    if (id && isRevealed(input.visibility.npc, id)) {
      pushLinkEntity(linkEntities, linkSeen, {
        id,
        name: input.npcNames.get(id) ?? name,
        type: "npc",
      });
    }
  }

  for (const loc of input.visitedLocations) {
    const id = loc.id ? String(loc.id) : null;
    const name = String(loc.name ?? "").trim();
    if (!name) continue;
    const meta = id ? input.loreNames.get(id) : null;
    base.sections.locations.push({
      entity_id: id,
      name,
      type: meta?.type,
    });
    if (id && isRevealed(input.visibility.lore, id)) {
      pushLinkEntity(linkEntities, linkSeen, {
        id,
        name: meta?.name ?? name,
        type: "location",
      });
    }
  }

  const state = input.chronicleState;
  if (state) {
    for (const draft of state.spontaneous_npcs) {
      if (!draft.isImported || !draft.imported_entity_id) continue;
      const id = String(draft.imported_entity_id);
      if (base.sections.npcs.some((n) => n.entity_id === id)) continue;
      const name = input.npcNames.get(id) ?? draft.detected_name;
      base.sections.npcs.push({
        entity_id: id,
        name,
        note: matchImportedNpcNote(draft),
      });
      if (isRevealed(input.visibility.npc, id)) {
        pushLinkEntity(linkEntities, linkSeen, { id, name, type: "npc" });
      }
    }

    for (const draft of state.spontaneous_locations) {
      if (!draft.isImported || !draft.imported_entity_id) continue;
      const id = String(draft.imported_entity_id);
      if (base.sections.locations.some((l) => l.entity_id === id)) continue;
      const meta = input.loreNames.get(id);
      base.sections.locations.push({
        entity_id: id,
        name: meta?.name ?? draft.name,
        type: meta?.type ?? draft.type,
        note: draft.description,
      });
      if (isRevealed(input.visibility.lore, id)) {
        pushLinkEntity(linkEntities, linkSeen, {
          id,
          name: meta?.name ?? draft.name,
          type: "location",
        });
      }
    }

    for (const draft of state.spontaneous_quests) {
      if (!draft.isImported || !draft.imported_entity_id) continue;
      const questId = String(draft.imported_entity_id);
      if (!input.revealedQuestIds.has(questId)) continue;
      base.sections.quests_new.push({
        title: draft.title,
        objective: draft.objective,
        quest_id: questId,
      });
    }

    base.sections.loot = [...state.discovered_loot].filter(Boolean);
  }

  base.summary_md =
    summaryParts.join("\n\n") ||
    buildRecapStarterMarkdown({
      visitedLocations: input.visitedLocations,
      encounteredNpcs: input.encounteredNpcs,
    });
  base.link_entities = linkEntities;
  base.generated_at = new Date().toISOString();
  return base;
}

type SupabaseLike = { from: (t: string) => any };

export async function loadPlayerRecapBuildInput(
  supabase: SupabaseLike,
  campaignId: string,
  sessionId: string,
  archive: {
    encountered_npcs?: ArchiveRef[] | null;
    visited_locations?: ArchiveRef[] | null;
  },
): Promise<BuildInput> {
  const [npcVis, loreVis, factionVis] = await Promise.all([
    getVisibilityForCampaign(campaignId, "npc"),
    getVisibilityForCampaign(campaignId, "lore"),
    getVisibilityForCampaign(campaignId, "faction"),
  ]);

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const worldId = (campaignRaw as { world_id?: string | null } | null)?.world_id ?? null;

  const npcNames = new Map<string, string>();
  const loreNames = new Map<string, { name: string; type: string }>();
  const factionNames = new Map<string, string>();
  const revealedQuestIds = new Set<string>();

  if (worldId) {
    const [{ data: npcRows }, { data: loreRows }, { data: factionRows }] =
      await Promise.all([
        (supabase.from("npcs") as any).select("id, name").eq("world_id", worldId),
        (supabase.from("world_lore") as any)
          .select("id, name, type")
          .eq("world_id", worldId),
        (supabase.from("factions") as any)
          .select("id, name")
          .eq("world_id", worldId),
      ]);

    for (const row of (npcRows ?? []) as Array<{ id: string; name: string }>) {
      npcNames.set(String(row.id), String(row.name ?? ""));
    }
    for (const row of (loreRows ?? []) as Array<{ id: string; name: string; type: string }>) {
      loreNames.set(String(row.id), {
        name: String(row.name ?? ""),
        type: String(row.type ?? "Ort"),
      });
    }
    for (const row of (factionRows ?? []) as Array<{ id: string; name: string }>) {
      factionNames.set(String(row.id), String(row.name ?? ""));
    }
  }

  const { data: questRows } = await (supabase.from("quests") as any)
    .select("id, is_revealed")
    .eq("campaign_id", campaignId)
    .eq("is_revealed", true);
  for (const row of (questRows ?? []) as Array<{ id: string }>) {
    revealedQuestIds.add(String(row.id));
  }

  const { data: stateRaw } = await (supabase as any)
    .from("session_chronicle_state")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const { parseChronicleStateRow } = await import("./parse-db");
  const chronicleState = parseChronicleStateRow(stateRaw);

  return {
    campaignId,
    chronicleState,
    encounteredNpcs: archive.encountered_npcs ?? [],
    visitedLocations: archive.visited_locations ?? [],
    visibility: { npc: npcVis, lore: loreVis, faction: factionVis, bestarium: {} },
    npcNames,
    loreNames,
    factionNames,
    revealedQuestIds,
  };
}
