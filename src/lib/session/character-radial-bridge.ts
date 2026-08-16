/** Öffnet das Live-Avatar-Radialmenü an Bildschirmkoordinaten (z. B. Battlemap-Token). */
export const OPEN_CHARACTER_RADIAL_EVENT = "th:open-character-radial";

/** Signalisiert, dass sich das Anzeige-Token (Gemüt/Zustand) geändert hat. */
export const CHARACTER_DISPLAY_CHANGED_EVENT = "th:character-display-changed";

/** Session-Broadcast-Event (alle Clients in session_live_*). */
export const CHARACTER_DISPLAY_CHANGED_BROADCAST = "character_display_changed";
export const BATTLEMAP_TOKENS_CHANGED_BROADCAST = "battlemap_tokens_changed";

export type OpenCharacterRadialDetail = {
  characterId: string;
  clientX: number;
  clientY: number;
  /** Battlemap-Token-Einstellungen (wenn von Map geöffnet) */
  battlemapToken?: {
    tokenId: string;
    showHpBar: boolean;
    sizeCells: number;
  };
};

/** Sofort anwendbarer Snapshot für Map-Token-Anzeige (ohne Server-Roundtrip). */
export type CharacterDisplaySnapshot = {
  url: string | null;
  activeConditions: string[];
  hpCurrent: number;
  hpMax: number;
  moodTokenUrls?: Record<string, string>;
};

export type CharacterDisplayChangedDetail = {
  characterId: string;
  /** true = von anderem Client empfangen — nicht erneut broadcasten */
  remote?: boolean;
  snapshot?: CharacterDisplaySnapshot;
};

export type BattlemapTokenSyncOp = "upsert" | "delete" | "refresh";

export type BattlemapTokensChangedDetail = {
  battlemapId: string;
  op?: BattlemapTokenSyncOp;
  /** Vollständiges Token für JIT-Upsert */
  token?: Record<string, unknown> | null;
  tokenId?: string | null;
  /** Absender — Empfänger mit gleicher userId können lokal überspringen */
  senderId?: string | null;
};

export function dispatchOpenCharacterRadial(detail: OpenCharacterRadialDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CHARACTER_RADIAL_EVENT, { detail }));
}

export function dispatchCharacterDisplayChanged(
  detail: CharacterDisplayChangedDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHARACTER_DISPLAY_CHANGED_EVENT, { detail }));
}
