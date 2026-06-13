import type {
  ChronicleInboxItem,
  SessionChronicleState,
  SpontaneousLocationDraft,
  SpontaneousNpcDraft,
  SpontaneousQuestDraft,
} from "./types";

function isPending<T extends { isImported: boolean; isDismissed?: boolean }>(
  row: T,
): boolean {
  return row.isImported !== true && row.isDismissed !== true;
}

/** Alle noch nicht importierten Vorschläge aus dem laufenden Chronicle-State. */
export function listChronicleInboxItems(
  state: SessionChronicleState | null | undefined,
): ChronicleInboxItem[] {
  if (!state) return [];

  const items: ChronicleInboxItem[] = [];

  state.spontaneous_npcs.forEach((draft, index) => {
    if (isPending(draft)) items.push({ kind: "npc", draft, index });
  });
  state.spontaneous_locations.forEach((draft, index) => {
    if (isPending(draft)) items.push({ kind: "location", draft, index });
  });
  state.spontaneous_quests.forEach((draft, index) => {
    if (isPending(draft)) items.push({ kind: "quest", draft, index });
  });

  return items;
}

export function countPendingInboxItems(
  state: SessionChronicleState | null | undefined,
): number {
  return listChronicleInboxItems(state).length;
}

export function inboxItemTitle(item: ChronicleInboxItem): string {
  if (item.kind === "npc") return item.draft.detected_name;
  if (item.kind === "location") return item.draft.name;
  return item.draft.title;
}

export function markNpcImported(
  state: SessionChronicleState,
  index: number,
  entityId: string,
): SessionChronicleState {
  return patchDraft(state, "spontaneous_npcs", index, {
    isImported: true,
    imported_entity_id: entityId,
  });
}

export function markLocationImported(
  state: SessionChronicleState,
  index: number,
  entityId: string,
): SessionChronicleState {
  return patchDraft(state, "spontaneous_locations", index, {
    isImported: true,
    imported_entity_id: entityId,
  });
}

export function markQuestImported(
  state: SessionChronicleState,
  index: number,
  entityId: string,
): SessionChronicleState {
  return patchDraft(state, "spontaneous_quests", index, {
    isImported: true,
    imported_entity_id: entityId,
  });
}

export function dismissNpc(
  state: SessionChronicleState,
  index: number,
): SessionChronicleState {
  return patchDraft(state, "spontaneous_npcs", index, { isDismissed: true });
}

export function dismissLocation(
  state: SessionChronicleState,
  index: number,
): SessionChronicleState {
  return patchDraft(state, "spontaneous_locations", index, { isDismissed: true });
}

export function dismissQuest(
  state: SessionChronicleState,
  index: number,
): SessionChronicleState {
  return patchDraft(state, "spontaneous_quests", index, { isDismissed: true });
}

/** Alle noch offenen Vorschläge der Session verwerfen. */
export function dismissAllPendingInboxItems(
  state: SessionChronicleState,
): SessionChronicleState {
  return {
    ...state,
    spontaneous_npcs: state.spontaneous_npcs.map((draft) =>
      isPending(draft) ? { ...draft, isDismissed: true } : draft,
    ),
    spontaneous_locations: state.spontaneous_locations.map((draft) =>
      isPending(draft) ? { ...draft, isDismissed: true } : draft,
    ),
    spontaneous_quests: state.spontaneous_quests.map((draft) =>
      isPending(draft) ? { ...draft, isDismissed: true } : draft,
    ),
  };
}

function patchDraft<
  K extends "spontaneous_npcs" | "spontaneous_locations" | "spontaneous_quests",
>(
  state: SessionChronicleState,
  key: K,
  index: number,
  patch: Partial<
    K extends "spontaneous_npcs"
      ? SpontaneousNpcDraft
      : K extends "spontaneous_locations"
        ? SpontaneousLocationDraft
        : SpontaneousQuestDraft
  >,
): SessionChronicleState {
  const rows = [...state[key]] as Array<
    SpontaneousNpcDraft | SpontaneousLocationDraft | SpontaneousQuestDraft
  >;
  if (index < 0 || index >= rows.length) return state;
  rows[index] = { ...rows[index], ...patch } as (typeof rows)[number];
  return { ...state, [key]: rows };
}
