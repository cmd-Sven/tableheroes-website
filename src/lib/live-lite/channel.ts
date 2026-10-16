/**
 * BroadcastChannel zwischen Spielleiter-Fenster und Spieler-Board im selben Browser.
 */
import {
  EMPTY_LITE_BOARD,
  type LiteBoardState,
  type LiteStageItem,
} from "@/src/lib/live-lite/types";

export type LiteChannelMessage =
  | { type: "state"; state: LiteBoardState }
  | { type: "hello" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStageItem(value: unknown): value is LiteStageItem {
  if (!isRecord(value) || typeof value.kind !== "string" || typeof value.id !== "string") {
    return false;
  }
  if (value.kind === "npc") return isRecord(value.npc);
  if (value.kind === "beast") return isRecord(value.creature);
  if (value.kind === "scene") return isRecord(value.scene);
  if (value.kind === "faction") return isRecord(value.faction);
  if (value.kind === "location") return isRecord(value.location);
  return false;
}

export function parseLiteBoardState(value: unknown): LiteBoardState | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items.filter(isStageItem);
  const background = isRecord(value.background)
    ? {
        locationId: String(value.background.locationId ?? ""),
        name: String(value.background.name ?? "Ort"),
        imageUrl:
          typeof value.background.imageUrl === "string" && value.background.imageUrl.trim()
            ? value.background.imageUrl
            : null,
      }
    : null;
  const diceLogs = Array.isArray(value.diceLogs)
    ? value.diceLogs.filter(
        (entry): entry is LiteBoardState["diceLogs"][number] =>
          isRecord(entry) && typeof entry.id === "string" && typeof entry.at === "string",
      )
    : [];
  return {
    items,
    background: background && background.locationId ? background : null,
    diceLogs: diceLogs.slice(-1),
    resultLabel: typeof value.resultLabel === "string" ? value.resultLabel : null,
  };
}

export function parseLiteChannelMessage(value: unknown): LiteChannelMessage | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "hello") return { type: "hello" };
  if (value.type === "state") {
    const state = parseLiteBoardState(value.state) ?? EMPTY_LITE_BOARD;
    return { type: "state", state };
  }
  return null;
}
